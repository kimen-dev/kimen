# Quickstart validation: ki-list

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

Gates that specifically prove this feature: `traceability` (S1–S11 ↔ tests),
`tokens-sync` (list component tokens regenerated and committed), `contrast`
(primary/secondary ink on the list surface, 4.5:1), `styles` (token
allowlist + logical properties on ki-list.css and ki-list-item.css),
`budgets` (new ki-list + ki-list-item size-limit entries), `test` and
`test-browser` (mock-doc + real-browser suites, axe across region subsets ×
themes × schemes × directions).

## Focused runs while iterating

```bash
# Tokens: rebuild + verify the committed CSS contract
pnpm --filter @kimen/tokens build && git diff --stat packages/tokens/dist/css

# Component: build + fast specs + real-browser suite
pnpm exec nx run @kimen/elements:build
pnpm --filter @kimen/elements run test
pnpm --filter @kimen/elements run test-browser

# Scenario spot-checks
bash scripts/gates/check-traceability.sh specs/016-ki-list
```

## Manual validation scenarios

1. **Source order & regions** — serve a page importing `@kimen/tokens/css`
   + the built `dist/components/ki-list.js` and
   `dist/components/ki-list-item.js`; render a list with the items "Email",
   "Notifications", "Storage": they appear as one vertical list in source
   order (S1). Give one item an avatar in `start`, primary text, an email
   in `secondary` and a timestamp in `end`: avatar leads, primary sits
   above secondary, timestamp trails (S2). Strip an item down to primary
   text only: no holes, no reserved space (S3).
2. **Wrap & grow** — give an item a secondary text longer than the list
   width: it wraps and the item grows vertically; no truncation, no
   internal scrolling (S10). The one-line items around it keep the one-line
   min-height (FR-003's discriminator is slotted content, not wrapping).
3. **Transparency** — slot a `ki-switch` in an item's `end` slot as the
   page's only interactive element; Tab: exactly one stop, the switch —
   never the list or an item (S5); activate it with the keyboard: exactly
   one toggle (S11); inspect the accessibility tree: a list of exactly
   three items, each named by its text, no interactive role from list or
   items (S6).
4. **Re-theme in one step** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: spacing, separation (the M3
   divider appears between items, never after the last) and text styles
   restyle — markup untouched (S7). Add `data-ki-color-scheme="dark"` under
   onmars: dark values apply (S8).
5. **RTL** — set `dir="rtl"` with an icon in `start` and a timestamp in
   `end`: the icon leads and the timestamp trails the item's text (S9,
   logical properties).
6. **Robustness** — set `variant="two-line"` (foreign vocabulary) on the
   list: nothing changes, items render with the default appearance (S4).
7. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → `ALL GATES GREEN — done is done (Art. III)`.
- axe: zero violations across region subsets × themes × schemes ×
  directions.
- size-limit: ki-list and ki-list-item marginal entries ≤ 9 KB gzipped each
  (expected far under — SC-005's "low single-digit KB for the pair"); worst
  case ≤ 25 KB; token stylesheets within their 9 KB caps.
- `git status` clean after a fresh build (generated artifacts in sync).
