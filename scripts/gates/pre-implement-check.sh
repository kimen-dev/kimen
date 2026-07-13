#!/usr/bin/env bash
# Gate: preflight for /speckit-implement (kimen-gates extension hook).
#
# Validates the selected contract and constitution before the optional Spec Kit
# implementation path. Founder intent is confirmed in conversation or PR, not
# encoded as an approval artifact.
#
# Checks: synchronized contract pair → constitution digest in sync.
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
  echo "GATE pre-implement: FAIL — synchronized contract preconditions are red for $DIR"
  exit 1
fi

if ! bash scripts/gates/constitution-check.sh; then
  echo "GATE pre-implement: FAIL — constitution check is red"
  exit 1
fi

echo "GATE pre-implement: PASS — synchronized contract and constitution in sync for $DIR"
