#!/usr/bin/env bash
# Records HUMAN GATE 1 (founder spec approval, constitution Workflow) as a
# verifiable marker: specs/<feature>/.approved with UTC date + spec.md sha256.
#
# Run automatically by the kimen workflow right after its approve-spec human
# gate, or by the founder directly when driving the /speckit-* skills without
# the workflow runner. pre-implement-check.sh verifies the recorded sha256
# still matches spec.md, so approval is bound to the exact approved content.
#
# Usage: record-approval.sh [feature-dir]
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh

DIR=$(kimen_resolve_feature_dir "${1:-}") || {
  echo "GATE record-approval: FAIL — no feature directory (arg, SPECIFY_FEATURE_DIRECTORY, .specify/feature.json or specs/*/)"
  exit 1
}
SPEC="$DIR/spec.md"
if [ ! -f "$SPEC" ]; then
  echo "GATE record-approval: FAIL — $SPEC not found; nothing to approve"
  exit 1
fi
SHA=$(kimen_sha256 "$SPEC")
{
  echo "approved-at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "spec-sha256: $SHA"
} > "$DIR/.approved"
echo "GATE record-approval: PASS — wrote $DIR/.approved (spec.md sha256 $SHA)"
