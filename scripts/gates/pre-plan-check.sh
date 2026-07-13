#!/usr/bin/env bash
# Gate: preflight for /speckit-plan (kimen-gates extension hook, Art. II).
#
# Direct skill invocations require one synchronized, lint-green contract pair
# before the optional planning path.
# Registered as a mandatory
# before_plan hook in .specify/extensions.yml (command kimen.gates.pre-plan,
# skill /kimen-gates-pre-plan).
#
# Usage: pre-plan-check.sh [feature-dir]
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh

DIR=$(kimen_resolve_feature_dir "${1:-}") || {
  echo "GATE pre-plan: FAIL — no feature directory (arg, SPECIFY_FEATURE_DIRECTORY, .specify/feature.json or specs/*/). Run /speckit-specify first."
  exit 1
}
if ! bash scripts/gates/check-spec-contracts.sh "$DIR"; then
  echo "GATE pre-plan: FAIL — spec.md/feature.feature contract is missing, desynchronized or lint-red for $DIR"
  exit 1
fi
echo "GATE pre-plan: PASS — synchronized lint-green contract for $DIR"
