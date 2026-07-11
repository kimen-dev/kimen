#!/usr/bin/env bash
# Records HUMAN GATE 1 (founder spec approval, constitution Workflow) as a
# verifiable marker v2 bound to exact spec.md + feature.feature bytes.
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
FEATURE="$DIR/feature.feature"
if ! kimen_validate_feature_dir "$DIR"; then
  echo "GATE record-approval: FAIL — unsafe feature directory: $DIR"
  exit 1
fi
if ! bash scripts/gates/check-spec-contracts.sh "$DIR"; then
  echo "GATE record-approval: FAIL — contract pair is missing, desynchronized or lint-red"
  exit 1
fi
SPEC_SHA=$(kimen_sha256 "$SPEC")
FEATURE_SHA=$(kimen_sha256 "$FEATURE")
APPROVED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TMP=$(mktemp "$DIR/.approved.tmp.XXXXXX") || exit 1
cleanup_approval_tmp() {
  [ -n "${TMP:-}" ] && rm -f "$TMP"
}
trap cleanup_approval_tmp EXIT INT TERM
{
  echo "approval-version: 2"
  echo "approved-at: $APPROVED_AT"
  echo "spec-sha256: $SPEC_SHA"
  echo "feature-sha256: $FEATURE_SHA"
} > "$TMP"

# Refuse a contract changed concurrently between validation and marker write.
if [ "$SPEC_SHA" != "$(kimen_sha256 "$SPEC")" ] || [ "$FEATURE_SHA" != "$(kimen_sha256 "$FEATURE")" ]; then
  rm -f "$TMP"
  echo "GATE record-approval: FAIL — contract bytes changed during approval recording"
  exit 1
fi
mv "$TMP" "$DIR/.approved"
TMP=""
trap - EXIT INT TERM
echo "GATE record-approval: PASS — wrote marker v2 for exact spec.md + feature.feature bytes in $DIR"
