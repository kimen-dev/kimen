# Quickstart validation: ki-progress

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

Gates that specifically prove this feature: `traceability` (S1–S15 ↔
tests), `tokens-sync` (progress component tokens regenerated and
committed, including the first motion token), `contrast` (the
indicator-on-track pair at the WCAG 1.4.11 non-text 3:1 minimum in all four
theme × scheme contexts — research D7), `styles` (token allowlist + logical
properties on ki-progress.css; the indeterminate animation declared only
under `prefers-reduced-motion: no-preference`), `budgets` (new ki-progress
size-limit entries), `test` and `test-browser` (mock-doc + real-browser
suites: geometry, `getAnimations()` oracles, ARIA exposure, axe across
shape × mode × theme × scheme).

## Focused runs while iterating

```bash
# Tokens: rebuild + verify the committed CSS contract + contrast pair
pnpm --filter @kimen/tokens build && git diff --stat packages/tokens/dist/css
pnpm --filter @kimen/tokens contrast

# Component: build + fast specs + real-browser suite
pnpm exec nx run @kimen/elements:build
pnpm --filter @kimen/elements run test
pnpm --filter @kimen/elements run test-browser

# Scenario spot-checks
bash scripts/gates/check-traceability.sh specs/015-ki-progress
```

## Manual validation scenarios

1. **Determinate fill** — serve a page importing `@kimen/tokens/css` + the
   built `dist/components/ki-progress.js`; render
   `<ki-progress label="Uploading report.pdf" value="40" max="100">` in
   both shapes: the bar fills 40% of the track (S1) and the ring covers 40%
   of its circumference starting at the top (S2). Set `value="250"`: both
   render completely full (S4). Advance `value` to 80 from the console: the
   fill and the exposed `aria-valuenow` follow (S13).
2. **Malformed values** — declare the S14 table rows (`value="-10"`,
   `value="abc"`, `max="0"`, `max="-5"`, `max="abc"`): every indicator
   renders the documented safe fallback, nothing breaks; `shape="banana"`
   renders the linear shape (S5).
3. **Indeterminate + reduced motion** — render
   `<ki-progress indeterminate label="Loading messages">` in both shapes:
   continuous sweep, no fraction (S3); with a declared `value="40"` the
   presentation does not change and no value is exposed (S15). Enable
   reduced motion (macOS: Reduce Motion; or DevTools → Rendering → emulate
   `prefers-reduced-motion`): the indication stills — inspect
   `$0.shadowRoot` animations: zero running infinite animations (S6,
   FR-009's oracle).
4. **Assistive tech + keyboard** — inspect the accessibility tree: a
   progressbar named "Uploading report.pdf" with value 40 of 100 (S8); the
   indeterminate one exposes no current value (S9); remove `label`: no
   accessible name (documented audit failure, spec edge case). Place the
   progress between two buttons and Tab: focus skips it (S7).
5. **Re-theme in one step** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: every indicator in the shape ×
   mode matrix restyles, markup untouched (S10). Add
   `data-ki-color-scheme="dark"` under onmars: dark values apply (S11).
6. **RTL** — set `dir="rtl"`: the linear filled portion grows from the
   right edge (S12); the ring still starts at the top and sweeps clockwise
   (spec assumption — not mirrored).
7. **Parts ladder** — restyle via `ki-progress::part(track)` /
   `::part(indicator)` in both shapes: both surfaces respond (FR-013).
8. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → `ALL GATES GREEN — done is done (Art. III)`.
- axe: zero violations across shape × mode × theme × scheme.
- contrast: indicator-on-track ≥ 3:1 in onmars/material3 × light/dark. If
  the pair fails in any context, STOP: the fix changes 001-shipped semantic
  values and requires founder sign-off at the merge gate (002 precedent;
  research D7).
- size-limit: ki-progress marginal ≤ 9 KB gzipped (expected low); worst
  case ≤ 25 KB; token stylesheets within their 9 KB caps.
- `git status` clean after a fresh build (generated artifacts in sync).
