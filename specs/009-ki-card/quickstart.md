# Quickstart validation: ki-card

Runnable checks that prove the feature end to end. Done is defined by the
gate suite, not by this guide (Art. III).

## Prerequisites (once per machine)

```bash
pnpm install --frozen-lockfile
pnpm --filter @kimen/elements exec playwright install chromium
```

## Full verdict (the only "done")

```bash
bash scripts/gates/gates-suite.sh   # every gate must exit 0
```

Gates that specifically prove this feature: `traceability` (S1–S8 ↔ tests),
`tokens-sync` (card component tokens regenerated and committed), `contrast`
(card fg-on-bg pairs), `styles` (token allowlist + logical properties on
ki-card.css), `budgets` (new ki-card size-limit entries), `test` and
`test-browser` (mock-doc + real-browser suites, axe across region subsets ×
themes × schemes).

## Focused runs while iterating

```bash
# Tokens: rebuild + verify the committed CSS contract
pnpm --filter @kimen/tokens build && git diff --stat packages/tokens/dist/css

# Component: build + fast specs + real-browser suite
pnpm exec nx run @kimen/elements:build
pnpm --filter @kimen/elements run test
pnpm --filter @kimen/elements run test-browser

# Scenario spot-checks
bash scripts/gates/check-traceability.sh specs/009-ki-card
```

## Manual validation scenarios

1. **Region subsets** — serve a page importing `@kimen/tokens/css` + the
   built `dist/components/ki-card.js`; render a card with all four regions
   (image, `<h2>` in `header`, body text, `ki-button` in `footer`): reading
   order is media → header → body → footer on one distinct surface (S1).
   Remove regions one at a time down to body-only: layout collapses cleanly,
   no holes, no reserved space (S2). Media is edge-to-edge (both themes zero
   `--ki-card-media-padding`).
2. **Behavioral transparency** — Tab through the page: exactly one stop (the
   slotted button), never the card (S4); click the button: exactly one
   activation observed (S8); inspect the accessibility tree: heading and text
   exposed, the card contributes no role, name or state (S5).
3. **Re-theme in one step** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: every card restyles — surface,
   border, elevation, radius, spacing — markup untouched (S6). Add
   `data-ki-color-scheme="dark"` under onmars: dark values apply (S7).
4. **Robustness** — set `variant="elevated"` (M3 vocabulary) on a card:
   nothing changes, content renders with the default appearance (S3).
5. **RTL** — set `dir="rtl"` on the page: regions still stack in the block
   direction and per-region padding mirrors (logical properties, FR-012).
6. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → `ALL GATES GREEN — done is done (Art. III)`.
- axe: zero violations across region subsets × themes × schemes.
- size-limit: ki-card marginal ≤ 9 KB gzipped (expected far under); worst
  case ≤ 25 KB; token stylesheets within their 9 KB caps.
- `git status` clean after a fresh build (generated artifacts in sync).
