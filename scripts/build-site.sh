#!/usr/bin/env bash
# Assemble the public docs site for GitHub Pages:
#   site-dist/            ← landing (site/index.html, landing.css, landing.js, favicon.svg)
#   site-dist/assets/     ← built token CSS + the @kimen/elements browser build
#                           + the generated custom-elements.json manifest
#   site-dist/playground/ ← the static theme playground (site/playground/)
#   site-dist/docs/       ← the Astro/Starlight docs site (site/docs/dist)
#   site-dist/storybook/  ← the Storybook static build (optional locally)
#
# Prerequisites: `pnpm exec nx run-many -t build` (tokens + elements dist),
# `pnpm --filter @kimen/docs build` (docs site) and, for the full site,
# `pnpm --filter @kimen/elements build-storybook`.
# Usage: bash scripts/build-site.sh [--skip-storybook]
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

OUT=site-dist
SKIP_STORYBOOK="${1:-}"

for required in \
  packages/tokens/dist/css/tokens.css \
  packages/tokens/dist/css/tokens.material3.css \
  packages/elements/dist/kimen/kimen.esm.js \
  packages/elements/generated/custom-elements.json \
  site/playground/index.html \
  site/docs/dist/index.html; do
  if [ ! -f "$required" ]; then
    echo "build-site: FAIL — missing $required (run: pnpm exec nx run-many -t build && pnpm --filter @kimen/docs build)"
    exit 1
  fi
done

rm -rf "$OUT"
mkdir -p "$OUT/assets/tokens" "$OUT/assets/elements" "$OUT/playground" "$OUT/docs"

# Landing: top-level files only — site/docs/ is the docs-site source tree
# (node_modules, dist) and must never be copied wholesale into the artifact.
find site -maxdepth 1 -type f -exec cp {} "$OUT/" \;
# Playground source is intentionally self-contained and shares the generated
# token/element assets from the artifact root; never copy the design handoff.
cp -R site/playground/. "$OUT/playground/"
cp packages/tokens/dist/css/tokens.css packages/tokens/dist/css/tokens.material3.css "$OUT/assets/tokens/"
cp -R packages/elements/dist/kimen "$OUT/assets/elements/kimen"
# The generated manifest, for api viewers and machine consumers.
cp packages/elements/generated/custom-elements.json "$OUT/assets/elements/custom-elements.json"
# Source maps are dev artifacts; keep the published site lean (and strip the
# sourceMappingURL pointers so devtools do not chase 404s).
find "$OUT/assets/elements" -name '*.map' -delete
find "$OUT/assets/elements" -name '*.js' -exec sed -i.bak 's|^//# sourceMappingURL=.*$||' {} + 2>/dev/null \
  || find "$OUT/assets/elements" -name '*.js' -exec sed -i '' 's|^//# sourceMappingURL=.*$||' {} +
find "$OUT/assets/elements" -name '*.js.bak' -delete

# Docs site (Astro build is already base-aware: /kimen/docs/).
cp -R site/docs/dist/. "$OUT/docs/"

if [ "$SKIP_STORYBOOK" != "--skip-storybook" ]; then
  if [ ! -f packages/elements/storybook-static/index.html ]; then
    echo "build-site: FAIL — storybook-static missing (run: pnpm --filter @kimen/elements build-storybook, or pass --skip-storybook)"
    exit 1
  fi
  mkdir -p "$OUT/storybook"
  cp -R packages/elements/storybook-static/. "$OUT/storybook/"
fi

echo "build-site: OK — $(du -sh "$OUT" | cut -f1) in $OUT/"
