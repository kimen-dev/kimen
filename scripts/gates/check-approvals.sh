#!/usr/bin/env bash
# Gate: strict approval marker v2 validation bound to exact spec+feature bytes.
# Usage: check-approvals.sh [feature-dir]
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh
export LC_ALL=C

ONLY="${1:-}"
FEATURE_DIRS=()
if [ -n "$ONLY" ]; then
  DIR=$(kimen_resolve_feature_dir "$ONLY") || {
    echo "GATE approvals: FAIL — feature directory not found: $ONLY"
    exit 1
  }
  if ! kimen_validate_feature_dir "$DIR"; then
    echo "GATE approvals: FAIL — unsafe feature directory: $DIR"
    exit 1
  fi
  FEATURE_DIRS+=("$DIR")
else
  for DIR in specs/*; do
    [ -d "$DIR" ] || continue
    if ! kimen_validate_feature_dir "$DIR"; then
      echo "GATE approvals: FAIL — unsafe feature directory: $DIR"
      exit 1
    fi
    FEATURE_DIRS+=("$DIR")
  done
fi

if [ "${#FEATURE_DIRS[@]}" -eq 0 ]; then
  echo "GATE approvals: FAIL — no feature directories found"
  exit 1
fi

FAIL=0
CHECKED=0
for DIR in "${FEATURE_DIRS[@]}"; do
  SPEC="$DIR/spec.md"
  FEATURE="$DIR/feature.feature"
  MARKER="$DIR/.approved"
  if [ ! -f "$SPEC" ] || [ -L "$SPEC" ]; then
    echo "  FAIL [$DIR]: spec.md is missing or is a symlink"
    FAIL=1
    continue
  fi
  if [ ! -f "$FEATURE" ] || [ -L "$FEATURE" ]; then
    echo "  FAIL [$DIR]: feature.feature is missing or is a symlink"
    FAIL=1
    continue
  fi
  if ! kimen_parse_approval_v2 "$MARKER"; then
    FAIL=1
    continue
  fi

  SPEC_SHA=$(kimen_sha256 "$SPEC")
  FEATURE_SHA=$(kimen_sha256 "$FEATURE")
  DIR_FAIL=0
  if [ "$KIMEN_APPROVAL_SPEC_SHA256" != "$SPEC_SHA" ]; then
    echo "  FAIL [$DIR]: spec-sha256 mismatch; spec.md approval is stale"
    DIR_FAIL=1
  fi
  if [ "$KIMEN_APPROVAL_FEATURE_SHA256" != "$FEATURE_SHA" ]; then
    echo "  FAIL [$DIR]: feature-sha256 mismatch; feature.feature approval is stale"
    DIR_FAIL=1
  fi
  if [ "$DIR_FAIL" -ne 0 ]; then
    FAIL=1
    continue
  fi
  CHECKED=$((CHECKED + 1))
done

if [ "$FAIL" -eq 0 ]; then
  echo "GATE approvals: PASS ($CHECKED current dual-hash marker(s))"
fi
exit "$FAIL"
