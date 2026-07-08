#!/usr/bin/env bash
# Assemble the public docs site for GitHub Pages:
#   site-dist/            ← site/ (landing: index.html, landing.css, landing.js)
#   site-dist/assets/     ← built token CSS + the @kimen/elements browser build
#   site-dist/storybook/  ← the Storybook static build (optional locally)
#
# Prerequisites: `pnpm exec nx run-many -t build` (tokens + elements dist) and,
# for the full site, `pnpm --filter @kimen/elements build-storybook`.
# Usage: bash scripts/build-site.sh [--skip-storybook]
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

OUT=site-dist
SKIP_STORYBOOK="${1:-}"

for required in \
  packages/tokens/dist/css/tokens.css \
  packages/tokens/dist/css/tokens.material3.css \
  packages/elements/dist/kimen/kimen.esm.js; do
  if [ ! -f "$required" ]; then
    echo "build-site: FAIL — missing $required (run: pnpm exec nx run-many -t build)"
    exit 1
  fi
done

rm -rf "$OUT"
mkdir -p "$OUT/assets/tokens" "$OUT/assets/elements"

cp -R site/. "$OUT/"
cp packages/tokens/dist/css/tokens.css packages/tokens/dist/css/tokens.material3.css "$OUT/assets/tokens/"
cp -R packages/elements/dist/kimen "$OUT/assets/elements/kimen"
# Source maps are dev artifacts; keep the published site lean (and strip the
# sourceMappingURL pointers so devtools do not chase 404s).
find "$OUT/assets/elements" -name '*.map' -delete
find "$OUT/assets/elements" -name '*.js' -exec sed -i.bak 's|^//# sourceMappingURL=.*$||' {} + 2>/dev/null \
  || find "$OUT/assets/elements" -name '*.js' -exec sed -i '' 's|^//# sourceMappingURL=.*$||' {} +
find "$OUT/assets/elements" -name '*.js.bak' -delete

if [ "$SKIP_STORYBOOK" != "--skip-storybook" ]; then
  if [ ! -f packages/elements/storybook-static/index.html ]; then
    echo "build-site: FAIL — storybook-static missing (run: pnpm --filter @kimen/elements build-storybook, or pass --skip-storybook)"
    exit 1
  fi
  mkdir -p "$OUT/storybook"
  cp -R packages/elements/storybook-static/. "$OUT/storybook/"
fi

echo "build-site: OK — $(du -sh "$OUT" | cut -f1) in $OUT/"
