#!/usr/bin/env bash
# Gate: scenario-to-test traceability (constitution Art. II).
#
# Every scenario ID S<n> in EVERY specs/<feature>/ feature file must be
# referenced by at least one test that is traceable TO THAT FEATURE.
#
# Traceability convention (Kimen): a test file declares which feature(s) it
# traces with a file-level marker containing the feature directory basename:
#
#     // @spec:007-ki-button
#
# Bare scenario IDs (S1, S2, ...) inside a marked file then count toward that
# feature ONLY. S-IDs are feature-scoped: S1 of feature A never satisfies S1
# of feature B. A file may carry several @spec: markers when it covers
# scenarios from more than one feature. The marker is matched literally
# (colon, no space), so keep it exactly as `@spec:<feature-dir>`.
#
# Usage: check-traceability.sh [feature-dir] [test-root-override]
#   - no args: iterate over ALL specs/*/ feature dirs (the CI-gate mode used
#     by gates-suite.sh).
#   - by default, tests are discovered only below the declared roots:
#     packages, scripts, .github, sandbox and tools. The optional second
#     argument narrows discovery to one root for fixture/backward compatibility.
#   - SKIP (exit 0, loud) when specs/ is absent or contains no feature files
#     yet (pre-Fase-2 state). An explicit feature-dir arg never skips.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh

ONLY="${1:-}"
TEST_ROOT_OVERRIDE="${2:-}"
if [ -n "$TEST_ROOT_OVERRIDE" ]; then
  TEST_ROOTS=("$TEST_ROOT_OVERRIDE")
else
  TEST_ROOTS=(packages scripts .github sandbox tools)
fi

append_executable_lines() {
  local source_file="$1"
  local destination="$2"
  awk '
    BEGIN { in_block = 0 }
    {
      line = $0
      if (in_block) {
        if (match(line, /\*\//)) {
          line = substr(line, RSTART + RLENGTH)
          in_block = 0
        } else {
          next
        }
      }
      while (match(line, /\/\*/)) {
        prefix = substr(line, 1, RSTART - 1)
        suffix = substr(line, RSTART + RLENGTH)
        if (match(suffix, /\*\//)) {
          line = prefix substr(suffix, RSTART + RLENGTH)
        } else {
          line = prefix
          in_block = 1
          break
        }
      }
      sub(/[[:space:]]*\/\/.*/, "", line)
      sub(/[[:space:]]*#.*/, "", line)
      if (line !~ /^[[:space:]]*$/) print line
    }
  ' "$source_file" >> "$destination"
}

discover_marked_tests() {
  local feature_id="$1"
  local root candidate
  for root in "${TEST_ROOTS[@]}"; do
    [ -d "$root" ] || continue
    while IFS= read -r -d '' candidate; do
      if grep -qE "@spec:${feature_id}([^A-Za-z0-9_-]|$)" "$candidate"; then
        printf '%s\0' "$candidate"
      fi
    done < <(
      find "$root" \
        \( -type d \( \
          -name node_modules -o -name dist -o -name generated -o -name coverage -o \
          -name storybook-static -o -name fixtures -o -name .stryker-tmp -o \
          -name reports -o -name test-results -o -name playwright-report \
        \) -prune \) -o \
        \( -type f \( \
          -name '*.spec.ts' -o -name '*.spec.tsx' -o \
          -name '*.test.ts' -o -name '*.test.tsx' -o \
          -name '*.e2e.ts' -o -name '*.e2e.tsx' -o \
          -name '*.test.mjs' -o -name '*.spec.mjs' -o \
          -name '*.test.cjs' -o -name '*.spec.cjs' -o \
          -name '*.test.js' -o -name '*.spec.js' -o \
          -name '*.test.sh' -o -name '*.spec.sh' \
        \) -print0 \)
    )
  done
}

FEATURES=()
if [ -n "$ONLY" ]; then
  [ -f "$ONLY" ] && ONLY=$(dirname "$ONLY")
  ONLY="${ONLY%/}"
  if [ ! -d "$ONLY" ]; then
    echo "GATE traceability: FAIL — feature dir not found: $ONLY"
    exit 1
  fi
  f=$(ls "$ONLY"/feature.feature 2>/dev/null || ls "$ONLY"/*.feature 2>/dev/null | head -1 || true)
  if [ -z "$f" ]; then
    echo "GATE traceability: FAIL — no feature file in $ONLY"
    exit 1
  fi
  FEATURES+=("$f")
else
  if [ -d specs ]; then
    for d in specs/*/; do
      [ -d "$d" ] || continue
      f=$(ls "${d%/}"/feature.feature 2>/dev/null || ls "${d%/}"/*.feature 2>/dev/null | head -1 || true)
      [ -n "$f" ] && FEATURES+=("$f")
    done
  fi
fi

if [ "${#FEATURES[@]}" -eq 0 ]; then
  echo "GATE traceability: SKIP — no specs/*/ feature files yet (pre-Fase-2 state); nothing to trace. This gate arms itself with the first committed feature."
  exit 0
fi

FAIL=0
CHECKED=0
for FEATURE in "${FEATURES[@]}"; do
  FID=$(basename "$(dirname "$FEATURE")")
  IDS=$(grep -oE '^[[:space:]]*# S[0-9]+' "$FEATURE" | grep -oE 'S[0-9]+' | sort -u)
  if [ -z "$IDS" ]; then
    echo "  FAIL [$FID]: no scenario IDs in $FEATURE"
    FAIL=1
    continue
  fi
  # Test files traceable to this feature: file-level @spec:<feature-dir> marker.
  MARKED=()
  while IFS= read -r -d '' marked_file; do
    MARKED+=("$marked_file")
  done < <(discover_marked_tests "$FID")
  if [ "${#MARKED[@]}" -eq 0 ]; then
    echo "  FAIL [$FID]: no test file under declared roots (${TEST_ROOTS[*]}) carries the marker '@spec:${FID}'"
    FAIL=1
    continue
  fi
  # S-IDs count ONLY on non-comment lines: a comment listing scenario IDs
  # is not a test. (Hardened 2026-07-06 after an unattended loop gamed this
  # gate with a "Traceability anchor: S1..S7" comment block, Art. X.)
  #
  # The filter writes to a temp file instead of piping into `grep -q`: under
  # `set -o pipefail`, `grep -q` exits on the first match and the upstream
  # grep dies of SIGPIPE (141), failing the pipeline even though the ID was
  # found — a timing-dependent flake (surfaced 2026-07-07 as intermittent
  # FAILs on late-stream IDs; a flaky gate is a bug, Art. X).
  NON_COMMENT=$(mktemp)
  : > "$NON_COMMENT"
  for marked_file in "${MARKED[@]}"; do
    append_executable_lines "$marked_file" "$NON_COMMENT"
  done
  for id in $IDS; do
    if ! grep -qE "(^|[^A-Za-z0-9_])${id}([^A-Za-z0-9_]|$)" "$NON_COMMENT"; then
      echo "  FAIL [$FID]: $id has no reference in code lines of the tests marked '@spec:${FID}' (comments do not count)"
      FAIL=1
    fi
  done
  rm -f "$NON_COMMENT"
  CHECKED=$((CHECKED + 1))
done

if [ "$FAIL" -eq 0 ]; then
  echo "GATE traceability: PASS ($CHECKED feature(s); every scenario ID referenced by a test traceable to its own feature)"
fi
exit $FAIL
