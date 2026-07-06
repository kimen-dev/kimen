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
# Usage: check-traceability.sh [feature-dir] [test-root=packages]
#   - no args: iterate over ALL specs/*/ feature dirs (the CI-gate mode used
#     by gates-suite.sh).
#   - SKIP (exit 0, loud) when specs/ is absent or contains no feature files
#     yet (pre-Fase-2 state). An explicit feature-dir arg never skips.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh

ONLY="${1:-}"
TEST_ROOT="${2:-packages}"

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
  # Test files traceable to this feature: file-level @spec:<feature-dir> marker
  MARKED=$(grep -rlE "@spec:${FID}([^A-Za-z0-9_-]|\$)" "$TEST_ROOT" \
    --include='*.spec.ts' --include='*.spec.tsx' --include='*.e2e.ts' 2>/dev/null || true)
  if [ -z "$MARKED" ]; then
    echo "  FAIL [$FID]: no test file under $TEST_ROOT/ carries the marker '@spec:${FID}'"
    FAIL=1
    continue
  fi
  for id in $IDS; do
    # S-IDs count ONLY on non-comment lines: a comment listing scenario IDs
    # is not a test. (Hardened 2026-07-06 after an unattended loop gamed this
    # gate with a "Traceability anchor: S1..S7" comment block, Art. X.)
    # shellcheck disable=SC2086
    if ! grep -hvE '^[[:space:]]*(//|\*|/\*)' $MARKED 2>/dev/null | grep -qE "\b${id}\b"; then
      echo "  FAIL [$FID]: $id has no reference in code lines of the tests marked '@spec:${FID}' (comments do not count)"
      FAIL=1
    fi
  done
  CHECKED=$((CHECKED + 1))
done

if [ "$FAIL" -eq 0 ]; then
  echo "GATE traceability: PASS ($CHECKED feature(s); every scenario ID referenced by a test traceable to its own feature)"
fi
exit $FAIL
