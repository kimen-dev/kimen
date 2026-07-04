#!/usr/bin/env bash
# Gate: Gherkin feature lint (constitution Art. II).
# Usage: lint-feature.sh [feature-file]. Default: newest specs/*/feature.feature.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

FEATURE="${1:-}"
if [ -z "$FEATURE" ]; then
  FEATURE=$(ls -t specs/*/feature.feature specs/*/*.feature 2>/dev/null | head -1 || true)
fi
if [ -z "$FEATURE" ] || [ ! -f "$FEATURE" ]; then
  echo "GATE lint-feature: FAIL — no feature file found (expected specs/<feature>/feature.feature)"
  exit 1
fi
echo "GATE lint-feature: checking $FEATURE"
FAIL=0

SCENARIOS=$(grep -c -E '^[[:space:]]*(Scenario|Scenario Outline):' "$FEATURE" || true)
if [ "$SCENARIOS" -eq 0 ]; then
  echo "  FAIL: no scenarios found"
  FAIL=1
fi

# Every scenario must be preceded by a stable ID comment "# S<n>" (Art. II)
IDS=$(grep -oE '^[[:space:]]*# S[0-9]+' "$FEATURE" | grep -oE 'S[0-9]+' || true)
N_IDS=$(printf '%s\n' "$IDS" | grep -c . || true)
N_UNIQ=$(printf '%s\n' "$IDS" | sort -u | grep -c . || true)
if [ "$N_IDS" -ne "$SCENARIOS" ]; then
  echo "  FAIL: $SCENARIOS scenario(s) but $N_IDS ID comment(s) '# S<n>' — every scenario carries a stable ID"
  FAIL=1
fi
if [ "$N_IDS" -ne "$N_UNIQ" ]; then
  echo "  FAIL: duplicate scenario IDs detected"
  FAIL=1
fi

# Exactly one When per scenario block
awk '
  /^[[:space:]]*(Scenario|Scenario Outline):/ {
    if (in_scen && whens != 1) { printf "  FAIL: scenario \"%s\" has %d When steps (must be exactly 1)\n", name, whens; bad=1 }
    in_scen=1; whens=0; name=$0; sub(/^[[:space:]]*(Scenario|Scenario Outline):[[:space:]]*/, "", name)
  }
  /^[[:space:]]*When / { if (in_scen) whens++ }
  END {
    if (in_scen && whens != 1) { printf "  FAIL: scenario \"%s\" has %d When steps (must be exactly 1)\n", name, whens; bad=1 }
    exit bad
  }
' "$FEATURE" || FAIL=1

if [ "$FAIL" -eq 0 ]; then
  echo "GATE lint-feature: PASS ($SCENARIOS scenarios, IDs unique, one When each)"
fi
exit $FAIL
