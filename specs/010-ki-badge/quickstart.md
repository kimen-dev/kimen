# Quickstart validation: ki-badge

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
`tokens-sync` (badge component tokens regenerated and committed), `contrast`
(the five badge tone fg-on-bg pairs — the first sweep of the info/warning
ramps in the material3 contexts, research D4), `styles` (token allowlist +
logical properties on ki-badge.css), `budgets` (new ki-badge size-limit
entries), `test` and `test-browser` (mock-doc + real-browser suites, axe
across tone × size × theme × scheme).

## Focused runs while iterating

```bash
# Tokens: rebuild + verify the committed CSS contract + tone contrast
pnpm --filter @kimen/tokens build && git diff --stat packages/tokens/dist/css
pnpm --filter @kimen/tokens contrast

# Component: build + fast specs + real-browser suite
pnpm exec nx run @kimen/elements:build
pnpm --filter @kimen/elements run test
pnpm --filter @kimen/elements run test-browser

# Scenario spot-checks
bash scripts/gates/check-traceability.sh specs/010-ki-badge
```

## Manual validation scenarios

1. **Tone × size matrix** — serve a page importing `@kimen/tokens/css` + the
   built `dist/components/ki-badge.js`; render the full matrix (5 tones × 2
   sizes) with labels like "Active", "Payment failed": every label is
   visible inside a tone-styled pill (S1), the danger badge visibly takes
   the danger tone (S2), and sm pills are smaller than md pills in height,
   padding and type. Confirm the info and warning pills render distinctly —
   the first component-layer consumption of those ramps.
2. **Behavioral transparency** — place a badge between two buttons; Tab from
   the first: focus lands on the second button, never the badge (S4);
   inspect the accessibility tree: the label is plain static text with no
   interactive role or state (S5); change a badge's text at runtime: no
   announcement occurs (no live region, spec-approved).
3. **Re-theme in one step** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: every badge in the matrix
   restyles — including info and warning, which resolve through the
   inherited shared ramps — markup untouched (S6). Add
   `data-ki-color-scheme="dark"` under onmars: dark values apply (S7).
4. **Robustness** — set `tone="banana" size="giant"` on a badge: it renders
   with the neutral/md appearance, nothing breaks (S3). Render `<ki-badge>
   </ki-badge>` (empty): the page renders without error and the badge
   exposes nothing to assistive technology (S8).
5. **Long label** — render a badge with a long label: it stays on one line
   and the pill grows; no truncation, no wrapping (spec Assumptions).
6. **RTL** — set `dir="rtl"` on the page: inline padding mirrors via logical
   properties (FR-010); with only a default slot there is no start/end order
   to observe (spec Assumptions — no RTL scenario exists).
7. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → `ALL GATES GREEN — done is done (Art. III)`.
- axe: zero violations across tone × size × theme × scheme.
- contrast: all five badge tone pairs ≥ 4.5:1 in onmars/material3 ×
  light/dark. If an info/warning pair fails in a material3 context, STOP:
  the fix changes 001-shipped semantic values and requires founder sign-off
  at the merge gate (002 precedent; research D4).
- size-limit: ki-badge marginal ≤ 9 KB gzipped (expected far under); worst
  case ≤ 25 KB; token stylesheets within their 9 KB caps.
- `git status` clean after a fresh build (generated artifacts in sync).
