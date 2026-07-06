# Quickstart: validating 001-tokens-theming

Runnable checks that prove the feature end-to-end. Prerequisites: `pnpm
install` done, Playwright Chromium installed
(`pnpm --filter @kimen/elements exec playwright install chromium`).

## Build the themes

```bash
pnpm --filter @kimen/tokens build
# expect: dist/css/tokens.css and dist/css/tokens.material3.css written
```

## Run the scenario suite (S1-S7)

```bash
pnpm --filter @kimen/elements test:browser -- tokens-theming
# expect: S1-S7 green in Chromium (light and dark projects)
```

## Run the feature gates

```bash
pnpm --filter @kimen/tokens contrast   # FR-009: pairs ≥ 4.5:1 per theme × scheme
pnpm --filter @kimen/tokens size       # ≤ 9 KB gz per stylesheet
bash scripts/gates/gates-suite.sh      # the full definition of done (Art. III)
```

## Manual smoke (optional)

Serve any page that loads both stylesheets from
`packages/tokens/dist/css/` and toggle:

```html
<html>                                      <!-- onmars light (S1) -->
<html data-ki-color-scheme="dark">          <!-- onmars dark forced (S3) -->
<html data-ki-theme="material3">            <!-- material3, follows system (S5) -->
<html data-ki-theme="acme">                 <!-- unknown → onmars (S7) -->
```

Expected anchors: onmars brand `#845abe`, onmars dark surface `#0a0a0a`,
material3 primary `#6750a4` (see
[contracts/theming-contract.md](./contracts/theming-contract.md) and
[data-model.md](./data-model.md) for the full mapping).
