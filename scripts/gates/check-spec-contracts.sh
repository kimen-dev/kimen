#!/usr/bin/env bash
# Gate: every spec's canonical Gherkin block and committed feature are one
# byte-identical, lint-green behavior contract (constitution Art. II).
# Validation is read-only: extraction always targets a temporary file.
#
# Usage: check-spec-contracts.sh [feature-dir]
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh
export LC_ALL=C

ONLY="${1:-}"
FEATURE_DIRS=()
if [ -n "$ONLY" ]; then
  DIR=$(kimen_resolve_feature_dir "$ONLY") || {
    echo "GATE spec-contracts: FAIL — feature directory not found: $ONLY"
    exit 1
  }
  if ! kimen_validate_feature_dir "$DIR"; then
    echo "GATE spec-contracts: FAIL — unsafe feature directory: $DIR"
    exit 1
  fi
  FEATURE_DIRS+=("$DIR")
else
  for DIR in specs/*; do
    [ -d "$DIR" ] || continue
    if ! kimen_validate_feature_dir "$DIR"; then
      echo "GATE spec-contracts: FAIL — unsafe feature directory: $DIR"
      exit 1
    fi
    FEATURE_DIRS+=("$DIR")
  done
fi

if [ "${#FEATURE_DIRS[@]}" -eq 0 ]; then
  echo "GATE spec-contracts: FAIL — no specs/*/spec.md contracts found"
  exit 1
fi

FAIL=0
CHECKED=0
for DIR in "${FEATURE_DIRS[@]}"; do
  SPEC="$DIR/spec.md"
  FEATURE="$DIR/feature.feature"
  if [ ! -f "$SPEC" ] || [ -L "$SPEC" ]; then
    echo "  FAIL [$DIR]: spec.md is missing"
    FAIL=1
    continue
  fi
  if [ ! -f "$FEATURE" ] || [ -L "$FEATURE" ]; then
    echo "  FAIL [$DIR]: feature.feature is missing"
    FAIL=1
    continue
  fi

  EXTRACTED=$(mktemp)
  if ! kimen_extract_feature_bytes "$SPEC" "$EXTRACTED"; then
    echo "  FAIL [$DIR]: spec.md has no complete canonical \`\`\`gherkin block"
    rm -f "$EXTRACTED"
    FAIL=1
    continue
  fi
  if ! cmp -s "$EXTRACTED" "$FEATURE"; then
    echo "  FAIL [$DIR]: spec.md canonical Gherkin bytes do not match feature.feature"
    rm -f "$EXTRACTED"
    FAIL=1
    continue
  fi
  rm -f "$EXTRACTED"

  if ! bash scripts/gates/lint-feature.sh "$FEATURE"; then
    echo "  FAIL [$DIR]: feature.feature shape lint is red"
    FAIL=1
    continue
  fi
  if ! bash scripts/gates/check-scenario-families.sh "$DIR"; then
    echo "  FAIL [$DIR]: scenario-family coverage is red"
    FAIL=1
    continue
  fi
  CHECKED=$((CHECKED + 1))
done

if [ "$FAIL" -eq 0 ]; then
  echo "GATE spec-contracts: PASS ($CHECKED synchronized, lint-green contract pair(s))"
fi
exit "$FAIL"
