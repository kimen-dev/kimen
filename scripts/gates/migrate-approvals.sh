#!/usr/bin/env bash
# One-time safe migration from spec-only approval v1 to dual-hash marker v2.
# The full selected set is preflighted before any marker is modified.
# Usage: migrate-approvals.sh [feature-dir]
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh
export LC_ALL=C

ONLY="${1:-}"
DIRS=()
if [ -n "$ONLY" ]; then
  DIR=$(kimen_resolve_feature_dir "$ONLY") || {
    echo "GATE migrate-approvals: FAIL — feature directory not found: $ONLY"
    exit 1
  }
  if ! kimen_validate_feature_dir "$DIR"; then
    echo "GATE migrate-approvals: FAIL — unsafe feature directory: $DIR"
    exit 1
  fi
  DIRS+=("$DIR")
else
  for DIR in specs/*; do
    [ -d "$DIR" ] || continue
    if ! kimen_validate_feature_dir "$DIR"; then
      echo "GATE migrate-approvals: FAIL — unsafe feature directory: $DIR"
      exit 1
    fi
    DIRS+=("$DIR")
  done
fi

ACTIONS=()
APPROVED_TIMES=()
SPEC_HASHES=()
FEATURE_HASHES=()
MARKER_HASHES=()
FAIL=0

# Preflight every marker and contract. No writes are permitted in this pass.
for INDEX in "${!DIRS[@]}"; do
  DIR="${DIRS[$INDEX]}"
  MARKER="$DIR/.approved"
  SPEC="$DIR/spec.md"
  FEATURE="$DIR/feature.feature"
  if grep -q '^approval-version:' "$MARKER" 2>/dev/null; then
    if ! kimen_parse_approval_v2 "$MARKER"; then
      FAIL=1
      continue
    fi
    if ! bash scripts/gates/check-spec-contracts.sh "$DIR" >/dev/null; then
      echo "  FAIL [$DIR]: spec.md and feature.feature are not synchronized for v2"
      FAIL=1
      continue
    fi
    if [ "$KIMEN_APPROVAL_SPEC_SHA256" != "$(kimen_sha256 "$SPEC")" ]; then
      echo "  FAIL [$DIR]: spec-sha256 mismatch; v2 spec.md approval is stale"
      FAIL=1
      continue
    fi
    if [ "$KIMEN_APPROVAL_FEATURE_SHA256" != "$(kimen_sha256 "$FEATURE")" ]; then
      echo "  FAIL [$DIR]: feature-sha256 mismatch; v2 feature.feature approval is stale"
      FAIL=1
      continue
    fi
    ACTIONS[$INDEX]="skip"
    APPROVED_TIMES[$INDEX]="$KIMEN_APPROVED_AT"
    SPEC_HASHES[$INDEX]="$KIMEN_APPROVAL_SPEC_SHA256"
    FEATURE_HASHES[$INDEX]="$KIMEN_APPROVAL_FEATURE_SHA256"
    MARKER_HASHES[$INDEX]="$(kimen_sha256 "$MARKER")"
    continue
  fi

  if ! kimen_parse_approval_v1 "$MARKER"; then
    FAIL=1
    continue
  fi
  CURRENT_SPEC_SHA=$(kimen_sha256 "$SPEC")
  if [ "$KIMEN_LEGACY_SPEC_SHA256" != "$CURRENT_SPEC_SHA" ]; then
    echo "  FAIL [$DIR]: legacy spec-sha256 mismatch; spec.md approval is stale"
    FAIL=1
    continue
  fi
  if ! bash scripts/gates/check-spec-contracts.sh "$DIR" >/dev/null; then
    echo "  FAIL [$DIR]: spec.md canonical Gherkin bytes do not match feature.feature"
    FAIL=1
    continue
  fi
  ACTIONS[$INDEX]="migrate"
  APPROVED_TIMES[$INDEX]="$KIMEN_LEGACY_APPROVED_AT"
  SPEC_HASHES[$INDEX]="$CURRENT_SPEC_SHA"
  FEATURE_HASHES[$INDEX]="$(kimen_sha256 "$FEATURE")"
  MARKER_HASHES[$INDEX]="$(kimen_sha256 "$MARKER")"
done

if [ "$FAIL" -ne 0 ]; then
  echo "GATE migrate-approvals: FAIL — preflight failed; no approval marker was modified"
  exit 1
fi

MIGRATED=0
SKIPPED=0
for INDEX in "${!DIRS[@]}"; do
  DIR="${DIRS[$INDEX]}"
  MARKER="$DIR/.approved"
  if [ "$(kimen_sha256 "$MARKER")" != "${MARKER_HASHES[$INDEX]}" ] ||
     [ "$(kimen_sha256 "$DIR/spec.md")" != "${SPEC_HASHES[$INDEX]}" ] ||
     [ "$(kimen_sha256 "$DIR/feature.feature")" != "${FEATURE_HASHES[$INDEX]}" ]; then
    echo "GATE migrate-approvals: FAIL — $DIR changed after preflight; no further markers written"
    exit 1
  fi
  if [ "${ACTIONS[$INDEX]}" = "skip" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  if ! kimen_write_approval_v2 \
    "$MARKER" \
    "${APPROVED_TIMES[$INDEX]}" \
    "${SPEC_HASHES[$INDEX]}" \
    "${FEATURE_HASHES[$INDEX]}" \
    1; then
    echo "GATE migrate-approvals: FAIL — could not atomically write $MARKER"
    exit 1
  fi
  MIGRATED=$((MIGRATED + 1))
done

echo "GATE migrate-approvals: PASS — migrated $MIGRATED marker(s); $SKIPPED valid v2 marker(s) unchanged"
