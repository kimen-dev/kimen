#!/usr/bin/env bash
# Gate: scenario-to-test traceability (constitution Art. II).
# Every scenario ID S<n> in the feature file appears in at least one test file.
# Usage: check-traceability.sh [feature-file] [test-root=packages]
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

FEATURE="${1:-}"
TEST_ROOT="${2:-packages}"
if [ -z "$FEATURE" ]; then
  FEATURE=$(ls -t specs/*/feature.feature specs/*/*.feature 2>/dev/null | head -1 || true)
fi
if [ -z "$FEATURE" ] || [ ! -f "$FEATURE" ]; then
  echo "GATE traceability: FAIL — no feature file found"
  exit 1
fi
IDS=$(grep -oE '^[[:space:]]*# S[0-9]+' "$FEATURE" | grep -oE 'S[0-9]+' | sort -u)
if [ -z "$IDS" ]; then
  echo "GATE traceability: FAIL — no scenario IDs in $FEATURE"
  exit 1
fi
FAIL=0
for id in $IDS; do
  if ! grep -rqE "\b$id\b" "$TEST_ROOT" --include='*.spec.ts' --include='*.spec.tsx' --include='*.e2e.ts' 2>/dev/null; then
    echo "  FAIL: $id has no test referencing it under $TEST_ROOT/"
    FAIL=1
  fi
done
[ "$FAIL" -eq 0 ] && echo "GATE traceability: PASS (every scenario ID is referenced by a test)"
exit $FAIL
