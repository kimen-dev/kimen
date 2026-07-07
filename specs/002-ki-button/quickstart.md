# Quickstart validation: ki-button

Runnable checks that prove the feature end to end. Done is defined by the
gate suite, not by this guide (Art. III).

## Prerequisites (once per machine)

```bash
pnpm install --frozen-lockfile
pnpm --filter @kimen/elements exec playwright install chromium
```

## Full verdict (the only "done")

```bash
bash scripts/gates/gates-suite.sh   # all 15 gates must exit 0
```

Gates that specifically prove this feature: `traceability` (S1–S11 ↔ tests),
`tokens-sync` (component token layer regenerated and committed), `styles`
(token allowlist + logical properties on ki-button.css), `budgets`
(ki-button replaced ki-hello's size-limit entries), `test` and
`test-browser` (mock-doc + real-browser suites, axe across the matrix).

## Focused runs while iterating

```bash
# Tokens: rebuild + verify the committed CSS contract
pnpm --filter @kimen/tokens build && git diff --stat packages/tokens/dist/css

# Component: build + fast specs + real-browser suite
pnpm exec nx run @kimen/elements:build
pnpm --filter @kimen/elements run test
pnpm --filter @kimen/elements run test-browser

# Scenario spot-checks
bash scripts/gates/check-traceability.sh specs/002-ki-button
```

## Manual validation scenarios

1. **Matrix render** — serve a page importing
   `@kimen/tokens/css` + the built `dist/components/ki-button.js`; render
   the 5×3×5 variant × tone × size matrix; every cell styled, no two
   variants identical within a tone (S1 family visual sanity).
2. **Re-theme in one step** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: every button restyles, markup
   untouched (S9). Add `data-ki-color-scheme="dark"`: dark values apply
   (S10).
3. **Keyboard walkthrough (APG, documented in the PR)** — Tab reaches each
   button with a visible ring (S3); Enter and Space both activate exactly
   once (S4); a disabled button is skipped (S2).
4. **Forms** — a form with a text input + `<ki-button type="submit"
   name="op" value="save">`: submitting carries `op=save` plus the field
   (S7); `type="button"` never submits (S8); `type="reset"` restores
   defaults.
5. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → `ALL GATES GREEN — done is done (Art. III)`.
- axe: zero violations across the rendered matrix.
- size-limit: ki-button marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- `git status` clean after a fresh build (generated artifacts in sync).
