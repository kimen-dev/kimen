#!/usr/bin/env bash
# Gate: preflight for /speckit-implement (kimen-gates extension hook).
#
# Enforces HUMAN GATE 1 outside the workflow runner (constitution Workflow):
# implementation may not start until the founder approved the spec. The
# approval marker is specs/<feature>/.approved containing the sha256 of the
# approved spec.md — written by the kimen workflow's record-approval step, or
# by the founder running 'bash scripts/gates/record-approval.sh' when driving
# the /speckit-* skills directly. A sha mismatch means spec.md changed after
# approval: re-approval required. Registered as a mandatory before_implement
# hook in .specify/extensions.yml (command kimen.gates.pre-implement, skill
# /kimen-gates-pre-implement).
#
# Checks: pre-plan gate (feature.feature + lint) → .approved present and
# matching spec.md → constitution digest in sync.
#
# Usage: pre-implement-check.sh [feature-dir]
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh

DIR=$(kimen_resolve_feature_dir "${1:-}") || {
  echo "GATE pre-implement: FAIL — no feature directory (arg, SPECIFY_FEATURE_DIRECTORY, .specify/feature.json or specs/*/). Run /speckit-specify first."
  exit 1
}

if ! bash scripts/gates/pre-plan-check.sh "$DIR"; then
  echo "GATE pre-implement: FAIL — spec lint preconditions are red for $DIR"
  exit 1
fi

MARKER="$DIR/.approved"
if [ ! -f "$MARKER" ]; then
  echo "GATE pre-implement: FAIL — founder approval marker missing: $MARKER. Human gate 1 (spec approval) has not happened. After the founder approves spec + Gherkin, record it with 'bash scripts/gates/record-approval.sh $DIR'."
  exit 1
fi
SHA=$(kimen_sha256 "$DIR/spec.md")
if ! grep -q "$SHA" "$MARKER"; then
  echo "GATE pre-implement: FAIL — spec.md changed since founder approval (sha256 in $MARKER does not match). Re-approval required (Art. II), then re-run record-approval.sh."
  exit 1
fi

if ! bash scripts/gates/constitution-check.sh; then
  echo "GATE pre-implement: FAIL — constitution check is red"
  exit 1
fi

echo "GATE pre-implement: PASS — spec approved by founder (marker matches spec.md) and constitution in sync for $DIR"
