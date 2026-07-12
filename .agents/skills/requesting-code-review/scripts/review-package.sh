#!/usr/bin/env bash
# review-package.sh — assemble the clean-context review packet (Kimen Workflow).
#
# Kimen-original script implementing the review-packet pattern of the
# requesting-code-review skill (adapted from obra/superpowers v5.1.0, which
# describes the pattern but ships no assembly script). MIT-attributed skill;
# see /NOTICE. Audited, deterministic, NETWORK-FREE: reads only the working
# tree and local git history.
#
# Usage:
#   .agents/skills/requesting-code-review/scripts/review-package.sh \
#     <spec-dir> [<base-ref>] [<head-ref>]
#
#   <spec-dir>   feature spec directory (e.g. specs/012-ki-button)
#   <base-ref>   diff base (default: origin/main)
#   <head-ref>   diff head (default: HEAD)
#
# Environment:
#   PACKET_DIR    output directory (default: <spec-dir>/review-packet)
#   GATES_LOG     path to an existing gates-suite.sh log to reuse; when unset
#                 the suite runs here (review requires green gates, Art. III/X)
#   EVIDENCE_DIR  directory of rendered evidence to include (screenshots,
#                 visual-regression diffs) — MANDATORY input for UI-affecting
#                 changes per the Workflow section of the constitution. It
#                 must contain review-evidence.json schema v1, bound to the
#                 frozen baseSha/headSha, with surfaces[] entries shaped as
#                 {id, paths[], states:[{name,image,sha256}]}. Every classified
#                 UI path and every regular schema-v1 PNG must be covered.
#
# Exit codes: 0 packet ready; 1 precondition failed (missing spec/feature,
# empty diff, red gates). A red gate is not a packaging problem — the work is
# simply not reviewable yet. Success also emits the SHA-256 of the canonical
# packet-manifest.json; use that digest as attestation.packetSha256 and submit
# the exact manifest bytes as packet_manifest_base64 to the completion workflow.
set -euo pipefail

SPEC_DIR="${1:?usage: review-package.sh <spec-dir> [base-ref] [head-ref]}"
BASE_REF="${2:-origin/main}"
HEAD_REF="${3:-HEAD}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
REPO_ROOT="$(cd "$REPO_ROOT" && pwd -P)"
cd "$REPO_ROOT"

[ -d "$SPEC_DIR" ] || { echo "ERROR: spec dir not found: $SPEC_DIR" >&2; exit 1; }

BASE_SHA="$(git rev-parse --verify "${BASE_REF}^{commit}" 2>/dev/null)" || {
  echo "ERROR: review base does not resolve to a commit: $BASE_REF" >&2
  exit 1
}
HEAD_SHA="$(git rev-parse --verify "${HEAD_REF}^{commit}" 2>/dev/null)" || {
  echo "ERROR: review head does not resolve to a commit: $HEAD_REF" >&2
  exit 1
}
CURRENT_HEAD="$(git rev-parse --verify 'HEAD^{commit}' 2>/dev/null)" || {
  echo "ERROR: current worktree HEAD does not resolve to a commit" >&2
  exit 1
}
if [ "$HEAD_SHA" != "$CURRENT_HEAD" ]; then
  echo "ERROR: review head $HEAD_SHA is not the current worktree revision $CURRENT_HEAD" >&2
  exit 1
fi
if git merge-base --is-ancestor "$BASE_SHA" "$HEAD_SHA"; then
  :
else
  ancestry_status="$?"
  if [ "$ancestry_status" -eq 1 ]; then
    echo "ERROR: review base must be an ancestor of the frozen review head" >&2
  else
    echo "ERROR: git merge-base failed while validating review ancestry" >&2
  fi
  exit 1
fi

assert_clean_review_worktree() {
  local untracked_files

  if ! git diff --cached --quiet HEAD -- .; then
    echo "ERROR: review index must be clean and identical to frozen HEAD (staged/index drift)" >&2
    return 1
  fi
  if ! git diff --quiet -- .; then
    echo "ERROR: review worktree must be clean and identical to the index (tracked worktree drift)" >&2
    return 1
  fi
  untracked_files="$(git ls-files --others --exclude-standard -- .)"
  if [ -n "$untracked_files" ]; then
    echo "ERROR: review worktree must be clean and identical to frozen HEAD (untracked files)" >&2
    return 1
  fi
}

is_ui_affecting_path() {
  local changed_path="$1"

  # Anything under Elements production source is rendered-surface work. This
  # precedence is intentional: a production helper named *.spec.ts is still
  # shipped code and must never escape rendered-evidence review by suffix.
  case "$changed_path" in
    packages/elements/src/*) return 0 ;;
    packages/elements/stencil.config.*) return 0 ;;
  esac

  # Tests do not alter the rendered product, even when their fixture language
  # uses a UI extension. Everything else in Elements production source or a
  # component-generator UI template is treated as rendered-surface work.
  case "$changed_path" in
    *.spec.ts | *.spec.tsx | *.spec.js | *.spec.jsx | \
      *.test.ts | *.test.tsx | *.test.js | *.test.jsx) return 1 ;;
  esac

  case "$changed_path" in
    packages/tokens/* | \
      tools/kimen-plugin/src/generators/component/files/* | \
      tools/kimen-plugin/src/generators/component/files-token/* | \
      tools/kimen-plugin/src/generators/component/generator.js | \
      site/* | \
      *.css | *.scss | *.sass | *.less | *.styl | \
      *.html | *.htm | *.mdx | \
      *.tsx | *.jsx | *.vue | *.svelte | \
      *.svg | *.png | *.jpg | *.jpeg | *.webp | *.gif | *.avif) return 0 ;;
  esac

  return 1
}

ui_surface_for_path() {
  local changed_path="$1"
  local component_tail
  local component_name

  case "$changed_path" in
    packages/elements/stencil.config.*)
      printf 'elements-config'
      ;;
    packages/elements/src/components/*/*)
      component_tail="${changed_path#packages/elements/src/components/}"
      component_name="${component_tail%%/*}"
      printf 'component:%s' "$component_name"
      ;;
    tools/kimen-plugin/src/generators/component/files/* | \
      tools/kimen-plugin/src/generators/component/files-token/* | \
      tools/kimen-plugin/src/generators/component/generator.js)
      printf 'component-generator'
      ;;
    packages/tokens/*)
      printf 'tokens'
      ;;
    site/*)
      printf 'site'
      ;;
    *)
      printf 'path:%s' "$changed_path"
      ;;
  esac
}

VALIDATED_RENDERED_IMAGE_COUNT=0
VALIDATED_EVIDENCE_MANIFEST_SHA=""
validate_versioned_rendered_evidence_directory() {
  local evidence_directory="$1"
  local validation_result

  if [ -L "$evidence_directory" ]; then
    echo "ERROR: EVIDENCE_DIR must not be a symbolic link: $evidence_directory" >&2
    return 1
  fi
  if [ ! -d "$evidence_directory" ]; then
    echo "ERROR: EVIDENCE_DIR must be an existing directory: $evidence_directory" >&2
    return 1
  fi

  if ! validation_result="$(node \
    scripts/lib/review-rendered-evidence.mjs \
    "$evidence_directory" "$REQUIRED_UI_RECORDS" "$BASE_SHA" "$HEAD_SHA")"; then
    return 1
  fi

  IFS=$'\t' read -r VALIDATED_RENDERED_IMAGE_COUNT VALIDATED_EVIDENCE_MANIFEST_SHA \
    <<< "$validation_result"
}

SPEC_ABS="$(cd "$SPEC_DIR" && pwd -P)"
case "$SPEC_ABS" in
  "$REPO_ROOT"/specs/*) ;;
  *)
    echo "ERROR: spec directory must be confined below the repository specs directory: $SPEC_DIR" >&2
    exit 1
    ;;
esac
SPEC_REL="${SPEC_ABS#"$REPO_ROOT"/}"
SPEC_MD_REL="$SPEC_REL/spec.md"
FEATURE_FILE_REL="$SPEC_REL/feature.feature"
assert_frozen_contract_file() {
  local contract_path="$1"
  local contract_label="$2"
  local tree_entry

  tree_entry="$(git ls-tree "$HEAD_SHA" -- "$contract_path")"
  case "$tree_entry" in
    100644\ blob\ *$'\t'"$contract_path") ;;
    *)
      echo "ERROR: frozen review head has no regular $contract_label: $contract_path" >&2
      return 1
      ;;
  esac
}
assert_frozen_contract_file "$SPEC_MD_REL" "spec.md"
assert_frozen_contract_file "$FEATURE_FILE_REL" "feature.feature"
PACKET_REQUESTED="${PACKET_DIR:-$SPEC_DIR/review-packet}"
PACKET_PARENT_REQUESTED="$(dirname "$PACKET_REQUESTED")"
PACKET_BASENAME="$(basename "$PACKET_REQUESTED")"
if [ ! -d "$PACKET_PARENT_REQUESTED" ]; then
  echo "ERROR: PACKET_DIR parent must already exist: $PACKET_PARENT_REQUESTED" >&2
  exit 1
fi
PACKET_PARENT_ABS="$(cd "$PACKET_PARENT_REQUESTED" && pwd -P)"
PACKET="$PACKET_PARENT_ABS/$PACKET_BASENAME"
case "$PACKET" in
  "$SPEC_ABS"/*) ;;
  *)
    echo "ERROR: PACKET_DIR must be confined below the spec directory: $PACKET_REQUESTED" >&2
    exit 1
    ;;
esac
if [ -e "$PACKET_REQUESTED" ] || [ -L "$PACKET_REQUESTED" ]; then
  if [ -L "$PACKET_REQUESTED" ]; then
    echo "ERROR: PACKET_DIR already exists as a symbolic link: $PACKET_REQUESTED" >&2
  else
    echo "ERROR: PACKET_DIR already exists; refusing to replace it: $PACKET_REQUESTED" >&2
  fi
  exit 1
fi

assert_no_symlink_ancestor_within_root() {
  local requested_path="$1"
  local protected_root="$2"
  local path_label="$3"
  local current_path="/"
  local parent_physical
  local path_component
  local remaining_path
  local resolved_link

  case "$requested_path" in
    /*) remaining_path="${requested_path#/}" ;;
    *) remaining_path="${REPO_ROOT#/}/$requested_path" ;;
  esac
  while [ -n "$remaining_path" ]; do
    path_component="${remaining_path%%/*}"
    if [ "$remaining_path" = "$path_component" ]; then
      remaining_path=""
    else
      remaining_path="${remaining_path#*/}"
    fi
    [ -n "$path_component" ] || continue
    current_path="${current_path%/}/$path_component"
    if [ -L "$current_path" ]; then
      resolved_link="$(cd "$current_path" 2>/dev/null && pwd -P || true)"
      parent_physical="$(cd "$(dirname "$current_path")" 2>/dev/null && pwd -P || true)"
      case "$parent_physical:$resolved_link" in
        "$protected_root":* | "$protected_root"/*:* | *:"$protected_root" | *:"$protected_root"/*)
          echo "ERROR: $path_label ancestor is a symbolic link: $current_path" >&2
          return 1
          ;;
      esac
    fi
  done
}
assert_no_symlink_ancestor_within_root "$PACKET_REQUESTED" "$SPEC_ABS" "PACKET_DIR"

if [ -n "${EVIDENCE_DIR:-}" ]; then
  if [ -L "$EVIDENCE_DIR" ]; then
    echo "ERROR: EVIDENCE_DIR must not be a symbolic link: $EVIDENCE_DIR" >&2
    exit 1
  fi
  if [ ! -d "$EVIDENCE_DIR" ]; then
    echo "ERROR: EVIDENCE_DIR must be an existing directory: $EVIDENCE_DIR" >&2
    exit 1
  fi
  assert_no_symlink_ancestor_within_root "$EVIDENCE_DIR" "$REPO_ROOT" "EVIDENCE_DIR"
  EVIDENCE_DIR_PHYSICAL="$(cd "$EVIDENCE_DIR" && pwd -P)"
  case "$PACKET" in
    "$EVIDENCE_DIR_PHYSICAL" | "$EVIDENCE_DIR_PHYSICAL"/*)
      echo "ERROR: PACKET_DIR must not overlap EVIDENCE_DIR" >&2
      exit 1
      ;;
  esac
  case "$EVIDENCE_DIR_PHYSICAL" in
    "$PACKET" | "$PACKET"/*)
      echo "ERROR: EVIDENCE_DIR must not overlap PACKET_DIR" >&2
      exit 1
      ;;
  esac
fi

assert_clean_review_worktree

TEMP_ROOT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
PREVIOUS_UMASK="$(umask)"
umask 077
TEMP_DIR="$(mktemp -d "$TEMP_ROOT/kimen-review-packet.XXXXXX")"
umask "$PREVIOUS_UMASK"
PACKET_BUILD="$TEMP_DIR/packet"
mkdir "$PACKET_BUILD"
CURRENT_RUN_VALIDATION=""
REVIEW_IO="scripts/lib/review-package-io.mjs"
cleanup_review_package() {
  local exit_code="$?"
  if [ -n "$CURRENT_RUN_VALIDATION" ]; then
    rm -f "$CURRENT_RUN_VALIDATION" || true
  fi
  case "$TEMP_DIR" in
    "$TEMP_ROOT"/kimen-review-packet.*)
      if [ -d "$TEMP_DIR" ] && [ ! -L "$TEMP_DIR" ]; then
        rm -rf -- "$TEMP_DIR" || true
      fi
      ;;
  esac
  return "$exit_code"
}
trap cleanup_review_package EXIT

# ── 1. The diff under review ────────────────────────────────────────────────
node "$REVIEW_IO" capture 1048576 "diff.stat 1 MiB" \
  "$PACKET_BUILD/diff.stat" inherit git diff --stat "$BASE_SHA".."$HEAD_SHA"
node "$REVIEW_IO" capture 16777216 "diff.patch 16 MiB" \
  "$PACKET_BUILD/diff.patch" inherit git diff "$BASE_SHA".."$HEAD_SHA"
if [ ! -s "$PACKET_BUILD/diff.patch" ]; then
  echo "ERROR: empty diff $BASE_REF..$HEAD_REF — nothing to review" >&2
  exit 1
fi

UI_AFFECTING_DIFF="no"
REQUIRED_UI_RECORDS="$TEMP_DIR/required-ui-records.bin"
CHANGED_PATHS="$TEMP_DIR/changed-paths.bin"
: > "$REQUIRED_UI_RECORDS"
node "$REVIEW_IO" capture 4194304 "changed paths 4 MiB" \
  "$CHANGED_PATHS" inherit git diff --no-renames --name-only -z "$BASE_SHA".."$HEAD_SHA"
while IFS= read -r -d '' changed_path; do
  if is_ui_affecting_path "$changed_path"; then
    UI_AFFECTING_DIFF="yes"
    changed_surface="$(ui_surface_for_path "$changed_path")"
    printf '%s\0%s\0' "$changed_surface" "$changed_path" >> "$REQUIRED_UI_RECORDS"
  fi
done < "$CHANGED_PATHS"

if [ "$UI_AFFECTING_DIFF" = "yes" ] && [ -z "${EVIDENCE_DIR:-}" ]; then
  echo "ERROR: UI-affecting diff requires rendered evidence via EVIDENCE_DIR (Workflow)" >&2
  exit 1
fi
if [ -n "${EVIDENCE_DIR:-}" ]; then
  KIMEN_REVIEW_PACKET_TEST_MODE=0 node scripts/lib/publish-review-packet.mjs \
    "$EVIDENCE_DIR_PHYSICAL" "$PACKET_BUILD/evidence"
  validate_versioned_rendered_evidence_directory "$PACKET_BUILD/evidence"
  SOURCE_EVIDENCE_MANIFEST_SHA="$VALIDATED_EVIDENCE_MANIFEST_SHA"
fi

# ── 2. The behavior contract ────────────────────────────────────────────────
node "$REVIEW_IO" capture 4194304 "spec.md 4 MiB" \
  "$PACKET_BUILD/spec.md" inherit git show "$HEAD_SHA:$SPEC_MD_REL"
node "$REVIEW_IO" capture 4194304 "feature.feature 4 MiB" \
  "$PACKET_BUILD/feature.feature" inherit git show "$HEAD_SHA:$FEATURE_FILE_REL"
node -e '
  const [baseSha, headSha] = process.argv.slice(1);
  process.stdout.write(`${JSON.stringify({ baseSha, headSha, schemaVersion: 1 }, null, 2)}\n`);
' "$BASE_SHA" "$HEAD_SHA" > "$PACKET_BUILD/review-metadata.json"
# S-IDs appear as "# S<n>" comment lines above scenarios (spec template).
grep -oE '^[[:space:]]*#[[:space:]]*S[0-9]+' "$PACKET_BUILD/feature.feature" \
  | grep -oE 'S[0-9]+' | sort -uV > "$PACKET_BUILD/scenario-ids.txt" || true
if [ ! -s "$PACKET_BUILD/scenario-ids.txt" ]; then
  echo "WARN: no S-IDs found in frozen $FEATURE_FILE_REL — reviewer cannot build the compliance table" >&2
fi

# ── 3. Constitutional Surface section from spec.md ──────────────────────────
awk 'f && /^## / { exit } /^## Constitutional Surface/ { f = 1 } f' \
  "$PACKET_BUILD/spec.md" > "$PACKET_BUILD/constitutional-surface.md"
if [ ! -s "$PACKET_BUILD/constitutional-surface.md" ]; then
  echo "WARN: spec.md has no '## Constitutional Surface' section (template requires it)" >&2
fi

# ── 4. Gates output — review starts only from green gates (Art. III/X) ──────
if [ -n "${GATES_LOG:-}" ]; then
  [ -f "$GATES_LOG" ] || { echo "ERROR: GATES_LOG not found: $GATES_LOG" >&2; exit 1; }
  node "$REVIEW_IO" copy 16777216 "gates log 16 MiB" \
    "$PACKET_BUILD/gates-output.txt" "$GATES_LOG"
else
  echo "Running scripts/gates/gates-suite.sh (set GATES_LOG to reuse a green run)..." >&2
  if ! node "$REVIEW_IO" capture 16777216 "gates output 16 MiB" \
    "$PACKET_BUILD/gates-output.txt" merge bash scripts/gates/gates-suite.sh; then
    echo "ERROR: gates-suite.sh failed — not reviewable until gates exit 0 (Art. III)." >&2
    echo "       Partial packet removed; run gates-suite.sh directly to inspect the failure." >&2
    exit 1
  fi
fi
GATES_FENCE="$(tail -n 2 "$PACKET_BUILD/gates-output.txt" | sed -n '1p')"
EVIDENCE_FENCE="$(tail -n 1 "$PACKET_BUILD/gates-output.txt")"
CURRENT_RUN_EVIDENCE="${EVIDENCE_FENCE#CURRENT-RUN EVIDENCE: }"
case "$GATES_FENCE" in
  'LOCAL GATES GREEN — protected main still requires ci / containment' | \
    'GATES JOB GREEN — mutation delegated; Definition of Done requires ci / mutation and ci / containment') ;;
  *)
    echo "ERROR: gates log does not end green — not reviewable (Art. III/X)" >&2
    exit 1
    ;;
esac
if [[ "$EVIDENCE_FENCE" != 'CURRENT-RUN EVIDENCE: '* ]]; then
  echo "ERROR: gates log does not end green — not reviewable (Art. III/X)" >&2
  exit 1
fi

# ── 5. Current-run evidence binding
if [ -z "$CURRENT_RUN_EVIDENCE" ] || [ ! -f "$CURRENT_RUN_EVIDENCE" ] || [ -L "$CURRENT_RUN_EVIDENCE" ]; then
  echo "ERROR: current-run evidence must be an existing regular file, not a symbolic link: $CURRENT_RUN_EVIDENCE" >&2
  exit 1
fi

# gates-suite writes the status TSV named by the terminal fence and, in the
# same directory, a revision-bound capability record. Validate both: the TSV
# proves the mandatory gate states and the JSON binds those claims to the
# exact Git SHA plus canonical dirty-worktree digest.
CURRENT_RUN_EVIDENCE_SOURCE="$CURRENT_RUN_EVIDENCE"
CAPABILITY_EVIDENCE_SOURCE="$(dirname "$CURRENT_RUN_EVIDENCE_SOURCE")/capabilities-current-run.json"
if [ ! -f "$CAPABILITY_EVIDENCE_SOURCE" ] || [ -L "$CAPABILITY_EVIDENCE_SOURCE" ]; then
  echo "ERROR: revision-bound capability evidence must be an existing regular file, not a symbolic link: $CAPABILITY_EVIDENCE_SOURCE" >&2
  exit 1
fi
CURRENT_RUN_EVIDENCE="$TEMP_DIR/current-run-evidence.tsv"
CAPABILITY_EVIDENCE="$TEMP_DIR/capabilities-current-run.json"
node "$REVIEW_IO" copy 1048576 "current-run TSV 1 MiB" \
  "$CURRENT_RUN_EVIDENCE" "$CURRENT_RUN_EVIDENCE_SOURCE"
node "$REVIEW_IO" copy 1048576 "capability JSON 1 MiB" \
  "$CAPABILITY_EVIDENCE" "$CAPABILITY_EVIDENCE_SOURCE"

OBSERVED_BASE_SHA="$(git rev-parse --verify "${BASE_REF}^{commit}" 2>/dev/null || true)"
OBSERVED_HEAD_SHA="$(git rev-parse --verify "${HEAD_REF}^{commit}" 2>/dev/null || true)"
OBSERVED_CURRENT_HEAD="$(git rev-parse --verify 'HEAD^{commit}' 2>/dev/null || true)"
if [ "$OBSERVED_BASE_SHA" != "$BASE_SHA" ] || [ "$OBSERVED_HEAD_SHA" != "$HEAD_SHA" ] || \
  [ "$OBSERVED_CURRENT_HEAD" != "$HEAD_SHA" ]; then
  echo "ERROR: review refs moved after SHA freeze; rebuild gates evidence and retry" >&2
  exit 1
fi

validate_current_run_evidence() {
  if [ ! -f "$CURRENT_RUN_EVIDENCE" ] || [ -L "$CURRENT_RUN_EVIDENCE" ] || \
    [ ! -f "$CAPABILITY_EVIDENCE" ] || [ -L "$CAPABILITY_EVIDENCE" ]; then
    echo "ERROR: current-run evidence changed during packet assembly" >&2
    return 1
  fi
  if ! node scripts/gates/check-capabilities.mjs --evidence "$CAPABILITY_EVIDENCE" >/dev/null; then
    echo "ERROR: current-run evidence is stale or does not match the current review worktree" >&2
    return 1
  fi

  CURRENT_RUN_VALIDATION="$TEMP_DIR/current-run-validation.json"
  rm -f "$CURRENT_RUN_VALIDATION"
  if ! node scripts/gates/check-capabilities.mjs \
    --write-evidence "$CURRENT_RUN_VALIDATION" \
    --gate-evidence "$CURRENT_RUN_EVIDENCE" >/dev/null; then
    echo "ERROR: current-run gate evidence is malformed or incomplete for the current review worktree" >&2
    return 1
  fi
  if ! cmp -s "$CURRENT_RUN_VALIDATION" "$CAPABILITY_EVIDENCE"; then
    echo "ERROR: frozen capability JSON is not deterministically derived from the frozen current-run TSV" >&2
    return 1
  fi
  rm -f "$CURRENT_RUN_VALIDATION"
  CURRENT_RUN_VALIDATION=""
}
validate_current_run_evidence

# Rendered evidence is mandatory for UI-affecting changes (Workflow).
if [ -n "${EVIDENCE_DIR:-}" ]; then
  validate_versioned_rendered_evidence_directory "$PACKET_BUILD/evidence"
  if [ "$VALIDATED_EVIDENCE_MANIFEST_SHA" != "$SOURCE_EVIDENCE_MANIFEST_SHA" ]; then
    echo "ERROR: frozen rendered evidence changed during packet assembly" >&2
    exit 1
  fi
  EVIDENCE_NOTE="included ($VALIDATED_RENDERED_IMAGE_COUNT images; schema v1)"
else
  EVIDENCE_NOTE="not included (diff classified as non-UI)"
  SOURCE_EVIDENCE_MANIFEST_SHA="not-applicable"
fi

# ── 6. Manifest ──────────────────────────────────────────────────────────────
{
  echo "# Review Packet"
  echo
  echo "- Spec dir: \`$SPEC_REL\`"
  echo "- Diff range: \`$BASE_REF\`..\`$HEAD_REF\`"
  echo "- Base SHA: \`$BASE_SHA\`"
  echo "- Head SHA: \`$HEAD_SHA\`"
  echo "- Assembled: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- Scenario IDs: $(paste -sd ' ' "$PACKET_BUILD/scenario-ids.txt" 2>/dev/null || echo 'NONE')"
  echo "- UI-affecting diff: $UI_AFFECTING_DIFF"
  echo "- Rendered evidence: $EVIDENCE_NOTE"
  echo "- Evidence manifest SHA-256: \`$SOURCE_EVIDENCE_MANIFEST_SHA\`"
  echo
  echo "## Contents"
  echo
  echo "| File | Purpose |"
  echo "|---|---|"
  echo "| diff.stat / diff.patch | The change under review |"
  echo "| spec.md | Approved spec (Art. II) |"
  echo "| feature.feature | Gherkin behavior contract with S-IDs |"
  echo "| scenario-ids.txt | Reviewer's per-scenario compliance checklist |"
  echo "| constitutional-surface.md | Articles this feature declares it touches |"
  echo "| gates-output.txt | Proof the deterministic layer passed (Art. X) |"
  echo "| review-metadata.json | Machine-readable frozen base/head SHAs |"
  echo "| packet-manifest.json | Canonical size/SHA-256 inventory binding every other packet file |"
  echo "| evidence/ | Rendered UI evidence, when applicable (Workflow) |"
  echo
  echo "## Reviewer scope reminder"
  echo
  echo "Review ONLY what gates cannot catch: spec compliance per S-ID"
  echo "(Art. II), API design (Art. IX/I), accessibility semantics (Art. V),"
  echo "simplicity (Art. VII). Gate-decidable findings are gate gaps, not"
  echo "review comments. This review's verdict never closes work: done ="
  echo "gates exit 0; merge is the founder's gate."
} > "$PACKET_BUILD/MANIFEST.md"

if [ -n "${EVIDENCE_DIR:-}" ]; then
  validate_versioned_rendered_evidence_directory "$PACKET_BUILD/evidence"
  if [ "$VALIDATED_EVIDENCE_MANIFEST_SHA" != "$SOURCE_EVIDENCE_MANIFEST_SHA" ]; then
    echo "ERROR: frozen rendered evidence changed before packet publication" >&2
    exit 1
  fi
fi
validate_current_run_evidence

OBSERVED_BASE_SHA="$(git rev-parse --verify "${BASE_REF}^{commit}" 2>/dev/null || true)"
OBSERVED_HEAD_SHA="$(git rev-parse --verify "${HEAD_REF}^{commit}" 2>/dev/null || true)"
OBSERVED_CURRENT_HEAD="$(git rev-parse --verify 'HEAD^{commit}' 2>/dev/null || true)"
if [ "$OBSERVED_BASE_SHA" != "$BASE_SHA" ] || [ "$OBSERVED_HEAD_SHA" != "$HEAD_SHA" ] || \
  [ "$OBSERVED_CURRENT_HEAD" != "$HEAD_SHA" ]; then
  echo "ERROR: review refs moved after SHA freeze; rebuild gates evidence and retry" >&2
  exit 1
fi
assert_clean_review_worktree
if [ -e "$PACKET_REQUESTED" ] || [ -L "$PACKET_REQUESTED" ]; then
  echo "ERROR: PACKET_DIR appeared during assembly; refusing to replace it: $PACKET_REQUESTED" >&2
  exit 1
fi
assert_no_symlink_ancestor_within_root "$PACKET_REQUESTED" "$SPEC_ABS" "PACKET_DIR"
CURRENT_PACKET_PARENT_ABS="$(cd "$PACKET_PARENT_REQUESTED" 2>/dev/null && pwd -P || true)"
if [ "$CURRENT_PACKET_PARENT_ABS" != "$PACKET_PARENT_ABS" ]; then
  echo "ERROR: PACKET_DIR parent changed during assembly" >&2
  exit 1
fi
if ! PACKET_SHA256="$(node scripts/lib/publish-review-packet.mjs \
  manifest "$PACKET_BUILD" "$BASE_SHA" "$HEAD_SHA")"; then
  echo "ERROR: canonical review packet manifest generation failed" >&2
  exit 1
fi
if ! node scripts/lib/publish-review-packet.mjs "$PACKET_BUILD" "$PACKET"; then
  echo "ERROR: PACKET_DIR publication failed without deleting the destination" >&2
  exit 1
fi
echo "review packet ready: $PACKET"
echo "packet SHA-256: $PACKET_SHA256"
