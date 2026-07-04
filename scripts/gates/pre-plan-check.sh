#!/usr/bin/env bash
# Gate: preflight for /speckit-plan (kimen-gates extension hook, Art. II).
#
# Direct skill invocations must meet the same bar as the kimen workflow's
# lint-spec step: the Gherkin behavior contract exists and lints green
# (stable S-IDs, one When each, five scenario families covered or
# N/A-justified) BEFORE any planning happens. Registered as a mandatory
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
FEATURE="$DIR/feature.feature"
if [ ! -f "$FEATURE" ]; then
  echo "GATE pre-plan: FAIL — $FEATURE missing (Art. II: specs before code). Finish the spec's Gherkin section, then run 'bash scripts/gates/extract-feature.sh'."
  exit 1
fi
if ! bash scripts/gates/lint-feature.sh "$FEATURE"; then
  echo "GATE pre-plan: FAIL — Gherkin lint is red for $FEATURE"
  exit 1
fi
if ! bash scripts/gates/check-scenario-families.sh "$DIR"; then
  echo "GATE pre-plan: FAIL — scenario-family coverage is red for $DIR"
  exit 1
fi
echo "GATE pre-plan: PASS — feature.feature present and spec lint green for $DIR"
