#!/usr/bin/env bash
# Gate: deterministic Gherkin extraction (constitution Art. II).
#
# The spec's ```gherkin block IS the behavior contract; the lint and
# traceability gates run against specs/<feature>/feature.feature. This script
# makes the link deterministic: it extracts the FIRST ```gherkin fenced block
# from spec.md into feature.feature. Idempotent: the file is rewritten only
# when content differs. Fails loudly when spec.md has no gherkin block
# (behavior enters the system exactly once, in the spec — Art. II).
#
# Usage: extract-feature.sh [feature-dir]
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh

DIR=$(kimen_resolve_feature_dir "${1:-}") || {
  echo "GATE extract-feature: FAIL — no feature directory (arg, SPECIFY_FEATURE_DIRECTORY, .specify/feature.json or specs/*/)"
  exit 1
}
SPEC="$DIR/spec.md"
if [ ! -f "$SPEC" ]; then
  echo "GATE extract-feature: FAIL — $SPEC not found"
  exit 1
fi

BLOCK=$(awk '
  /^```gherkin[[:space:]]*$/ && !found { grab = 1; next }
  /^```[[:space:]]*$/ && grab { grab = 0; found = 1; next }
  grab { print }
' "$SPEC")

if [ -z "$BLOCK" ]; then
  echo "GATE extract-feature: FAIL — no \`\`\`gherkin block in $SPEC. The Gherkin Scenarios section is mandatory (Art. II); write it before anything downstream runs."
  exit 1
fi

OUT="$DIR/feature.feature"
if [ -f "$OUT" ] && [ "$(cat "$OUT")" = "$BLOCK" ]; then
  echo "GATE extract-feature: PASS — $OUT already in sync with $SPEC (no write)"
else
  printf '%s\n' "$BLOCK" > "$OUT"
  echo "GATE extract-feature: PASS — wrote $OUT from the first gherkin block in $SPEC"
fi
