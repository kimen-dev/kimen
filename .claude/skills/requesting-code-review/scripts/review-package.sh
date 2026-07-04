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
#   .claude/skills/requesting-code-review/scripts/review-package.sh \
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
#                 changes per the Workflow section of the constitution
#
# Exit codes: 0 packet ready; 1 precondition failed (missing spec/feature,
# empty diff, red gates). A red gate is not a packaging problem — the work is
# simply not reviewable yet.
set -euo pipefail

SPEC_DIR="${1:?usage: review-package.sh <spec-dir> [base-ref] [head-ref]}"
BASE_REF="${2:-origin/main}"
HEAD_REF="${3:-HEAD}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

SPEC_MD="$SPEC_DIR/spec.md"
FEATURE_FILE="$SPEC_DIR/feature.feature"

[ -d "$SPEC_DIR" ] || { echo "ERROR: spec dir not found: $SPEC_DIR" >&2; exit 1; }
[ -f "$SPEC_MD" ] || { echo "ERROR: missing $SPEC_MD — no spec, no review (Art. II)" >&2; exit 1; }
[ -f "$FEATURE_FILE" ] || { echo "ERROR: missing $FEATURE_FILE — Gherkin is the behavior contract (Art. II)" >&2; exit 1; }

PACKET="${PACKET_DIR:-$SPEC_DIR/review-packet}"
rm -rf "$PACKET"
mkdir -p "$PACKET"

# ── 1. The diff under review ────────────────────────────────────────────────
git diff --stat "$BASE_REF".."$HEAD_REF" > "$PACKET/diff.stat"
git diff "$BASE_REF".."$HEAD_REF" > "$PACKET/diff.patch"
if [ ! -s "$PACKET/diff.patch" ]; then
  echo "ERROR: empty diff $BASE_REF..$HEAD_REF — nothing to review" >&2
  rm -rf "$PACKET"
  exit 1
fi

# ── 2. The behavior contract ────────────────────────────────────────────────
cp "$SPEC_MD" "$PACKET/spec.md"
cp "$FEATURE_FILE" "$PACKET/feature.feature"
# S-IDs appear as "# S<n>" comment lines above scenarios (spec template).
grep -oE '^[[:space:]]*#[[:space:]]*S[0-9]+' "$FEATURE_FILE" \
  | grep -oE 'S[0-9]+' | sort -uV > "$PACKET/scenario-ids.txt" || true
if [ ! -s "$PACKET/scenario-ids.txt" ]; then
  echo "WARN: no S-IDs found in $FEATURE_FILE — reviewer cannot build the compliance table" >&2
fi

# ── 3. Constitutional Surface section from spec.md ──────────────────────────
awk 'f && /^## / { exit } /^## Constitutional Surface/ { f = 1 } f' \
  "$SPEC_MD" > "$PACKET/constitutional-surface.md"
if [ ! -s "$PACKET/constitutional-surface.md" ]; then
  echo "WARN: spec.md has no '## Constitutional Surface' section (template requires it)" >&2
fi

# ── 4. Gates output — review starts only from green gates (Art. III/X) ──────
if [ -n "${GATES_LOG:-}" ]; then
  [ -f "$GATES_LOG" ] || { echo "ERROR: GATES_LOG not found: $GATES_LOG" >&2; exit 1; }
  cp "$GATES_LOG" "$PACKET/gates-output.txt"
else
  echo "Running scripts/gates/gates-suite.sh (set GATES_LOG to reuse a green run)..." >&2
  if ! bash scripts/gates/gates-suite.sh > "$PACKET/gates-output.txt" 2>&1; then
    echo "ERROR: gates-suite.sh failed — not reviewable until gates exit 0 (Art. III)." >&2
    echo "       Log kept at $PACKET/gates-output.txt for debugging." >&2
    exit 1
  fi
fi
if ! grep -q "ALL GATES GREEN" "$PACKET/gates-output.txt"; then
  echo "ERROR: gates log does not end green — not reviewable (Art. III/X)" >&2
  exit 1
fi

# ── 5. Rendered evidence (mandatory for UI-affecting changes, Workflow) ─────
if [ -n "${EVIDENCE_DIR:-}" ]; then
  [ -d "$EVIDENCE_DIR" ] || { echo "ERROR: EVIDENCE_DIR not found: $EVIDENCE_DIR" >&2; exit 1; }
  mkdir -p "$PACKET/evidence"
  cp -R "$EVIDENCE_DIR"/. "$PACKET/evidence/"
  EVIDENCE_NOTE="included ($(find "$PACKET/evidence" -type f | wc -l | tr -d ' ') files)"
else
  EVIDENCE_NOTE="NOT included — required if this change affects rendered UI (Workflow)"
fi

# ── 6. Manifest ──────────────────────────────────────────────────────────────
{
  echo "# Review Packet"
  echo
  echo "- Spec dir: \`$SPEC_DIR\`"
  echo "- Diff range: \`$BASE_REF\`..\`$HEAD_REF\`"
  echo "- Base SHA: \`$(git rev-parse "$BASE_REF")\`"
  echo "- Head SHA: \`$(git rev-parse "$HEAD_REF")\`"
  echo "- Assembled: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- Scenario IDs: $(paste -sd ' ' "$PACKET/scenario-ids.txt" 2>/dev/null || echo 'NONE')"
  echo "- Rendered evidence: $EVIDENCE_NOTE"
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
  echo "| evidence/ | Rendered UI evidence, when applicable (Workflow) |"
  echo
  echo "## Reviewer scope reminder"
  echo
  echo "Review ONLY what gates cannot catch: spec compliance per S-ID"
  echo "(Art. II), API design (Art. IX/I), accessibility semantics (Art. V),"
  echo "simplicity (Art. VII). Gate-decidable findings are gate gaps, not"
  echo "review comments. This review's verdict never closes work: done ="
  echo "gates exit 0; merge is the founder's gate."
} > "$PACKET/MANIFEST.md"

echo "review packet ready: $PACKET"
