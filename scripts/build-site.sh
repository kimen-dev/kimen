#!/usr/bin/env bash
# Assemble the public docs site for Cloudflare Pages, served from the domain
# root at https://kimen.dev:
#   site-dist/            ← landing (site/index.html, landing.css, landing.js, favicon.svg)
#   site-dist/assets/     ← built token CSS + the @kimen/elements browser build
#                           + the generated custom-elements.json manifest
#   site-dist/playground/ ← the static theme playground (site/playground/)
#   site-dist/docs/       ← the Astro/Starlight docs site (site/docs/dist)
#   site-dist/storybook/  ← the Storybook static build (optional locally)
#   site-dist/privacy/    ← the static privacy page (site/privacy/)
#
# Prerequisites: `pnpm exec nx run-many -t build` (tokens + elements dist),
# `pnpm --filter @kimen/docs build` (docs site) and, for the full site,
# `pnpm --filter @kimen/elements build-storybook`.
# Usage: bash scripts/build-site.sh [--skip-storybook]
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# The artifact directory. Overridable so a test can assemble into a scratch
# directory instead of clobbering the checkout's site-dist/ — the publishing
# workflow never sets it, so CI and local runs keep assembling site-dist/.
OUT="${KIMEN_SITE_OUT:-site-dist}"
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
mkdir -p "$OUT/assets/tokens" "$OUT/assets/elements" "$OUT/assets/fonts" "$OUT/playground" "$OUT/docs" "$OUT/privacy"

# Landing: top-level files only — site/docs/ is the docs-site source tree
# (node_modules, dist) and must never be copied wholesale into the artifact.
find site -maxdepth 1 -type f -exec cp {} "$OUT/" \;
# Playground source is intentionally self-contained and shares the generated
# token/element assets from the artifact root; never copy the design handoff.
cp -R site/playground/. "$OUT/playground/"
cp -R site/privacy/. "$OUT/privacy/"
cp -R site/assets/fonts/. "$OUT/assets/fonts/"
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

# Docs site (Astro build is already base-aware: /docs/).
cp -R site/docs/dist/. "$OUT/docs/"

# Analytics is a BUILD gate, not a runtime one: prerendered pages decide at
# build time, so only an explicit marker set by the publishing workflow may
# emit the tag. Without it no page carries analytics — identical locally, in
# CI and in the browser tests.
if [ "${KIMEN_ANALYTICS:-}" = "1" ]; then
  SCRIPT_URL=$(node -p "require('./site/analytics.json').scriptUrl")
  WEBSITE_ID=$(node -p "require('./site/analytics.json').websiteId")
  DOMAINS=$(node -p "require('./site/analytics.json').domains")
  TAG="<script defer src=\"$SCRIPT_URL\" data-website-id=\"$WEBSITE_ID\" data-domains=\"$DOMAINS\"></script>"
  for page in "$OUT/index.html" "$OUT/playground/index.html" "$OUT/privacy/index.html"; do
    node -e 'const {readFileSync,writeFileSync}=require("node:fs");const [p,tag]=process.argv.slice(1);const s=readFileSync(p,"utf8");if(!s.includes("<!-- kimen:analytics -->"))throw new Error(`missing analytics marker: ${p}`);writeFileSync(p,s.replace("<!-- kimen:analytics -->",tag))' "$page" "$TAG"
  done
  echo "build-site: analytics enabled for $DOMAINS"
else
  echo "build-site: analytics disabled (KIMEN_ANALYTICS unset)"
fi

if [ "$SKIP_STORYBOOK" != "--skip-storybook" ]; then
  if [ ! -f packages/elements/storybook-static/index.html ]; then
    echo "build-site: FAIL — storybook-static missing (run: pnpm --filter @kimen/elements build-storybook, or pass --skip-storybook)"
    exit 1
  fi
  mkdir -p "$OUT/storybook"
  cp -R packages/elements/storybook-static/. "$OUT/storybook/"
fi

echo "build-site: OK — $(du -sh "$OUT" | cut -f1) in $OUT/"
