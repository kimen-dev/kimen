#!/usr/bin/env bash
# Gate: five-scenario-family coverage for UI components (constitution Art. II).
#
# The spec-template override mandates a "Scenario Family Coverage" table for
# UI components: core behavior, keyboard path, assistive-tech outcome, form
# participation, theming. This gate enforces it:
#   - table present  → every family row needs scenario IDs (S<n>) OR a
#     non-empty N/A justification; the template placeholder `S_` counts as
#     empty. Every referenced S-ID must exist as a `# S<n>` ID in
#     feature.feature.
#   - table absent   → applicability heuristic: if spec.md/plan.md reference
#     component surfaces (packages/elements or ki-* custom elements) the spec
#     is a UI component and the missing table FAILS; otherwise PASS with a
#     note (non-UI feature, families not applicable).
#
# Usage: check-scenario-families.sh [feature-dir]
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh

DIR=$(kimen_resolve_feature_dir "${1:-}") || {
  echo "GATE scenario-families: FAIL — no feature directory (arg, SPECIFY_FEATURE_DIRECTORY, .specify/feature.json or specs/*/)"
  exit 1
}
SPEC="$DIR/spec.md"
FEATURE="$DIR/feature.feature"
if [ ! -f "$SPEC" ]; then
  echo "GATE scenario-families: FAIL — $SPEC not found"
  exit 1
fi

FAMILIES=("Core behavior" "Keyboard path" "Assistive-tech outcome" "Form participation" "Theming")

if ! grep -qE '^\|[[:space:]]*Family[[:space:]]*\|' "$SPEC"; then
  # No family table: only acceptable when the feature has no UI-component surface.
  UI_PATTERN='(packages/elements|\bki-[a-z0-9])'
  TOUCHES=""
  for f in "$SPEC" "$DIR/plan.md"; do
    [ -f "$f" ] || continue
    if grep -qE "$UI_PATTERN" "$f"; then
      TOUCHES="$f"
      break
    fi
  done
  if [ -n "$TOUCHES" ]; then
    echo "GATE scenario-families: FAIL — $TOUCHES references a component surface (packages/elements / ki-*) but $SPEC has no Scenario Family Coverage table (mandatory for UI components, Art. II)"
    exit 1
  fi
  echo "GATE scenario-families: PASS — no family table and no UI-component surface detected in $DIR (families not applicable to non-UI features)"
  exit 0
fi

# Table present: enforce it fully.
FEATURE_IDS=""
if [ -f "$FEATURE" ]; then
  FEATURE_IDS=$(grep -oE '^[[:space:]]*# S[0-9]+' "$FEATURE" | grep -oE 'S[0-9]+' | sort -u)
fi

FAIL=0
for family in "${FAMILIES[@]}"; do
  ROW=$(grep -E "^\|[[:space:]]*${family}[[:space:]]*\|" "$SPEC" | head -1 || true)
  if [ -z "$ROW" ]; then
    echo "  FAIL: family row missing from the coverage table: $family"
    FAIL=1
    continue
  fi
  IDS_COL=$(printf '%s\n' "$ROW" | awk -F'|' '{print $3}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  JUST_COL=$(printf '%s\n' "$ROW" | awk -F'|' '{print $4}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  IDS=$(printf '%s\n' "$IDS_COL" | grep -oE 'S[0-9]+' | sort -u || true)
  if [ -z "$IDS" ] && [ -z "$JUST_COL" ]; then
    echo "  FAIL: '$family' has neither scenario IDs nor an N/A justification (placeholder 'S_' counts as empty)"
    FAIL=1
    continue
  fi
  if [ -n "$IDS" ]; then
    if [ ! -f "$FEATURE" ]; then
      echo "  FAIL: '$family' references scenario IDs but $FEATURE does not exist — run 'bash scripts/gates/extract-feature.sh'"
      FAIL=1
      continue
    fi
    for id in $IDS; do
      if ! printf '%s\n' "$FEATURE_IDS" | grep -qx "$id"; then
        echo "  FAIL: '$family' references $id, which is not a scenario ID in $FEATURE"
        FAIL=1
      fi
    done
  fi
done

if [ "$FAIL" -eq 0 ]; then
  echo "GATE scenario-families: PASS (all five families covered or N/A-justified, referenced IDs exist in $FEATURE)"
fi
exit $FAIL
