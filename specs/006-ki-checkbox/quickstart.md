# Quickstart validation: ki-checkbox

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

Gates that specifically prove this feature: `traceability` (S1–S21 ↔ tests),
`tokens-sync` (checkbox component tokens regenerated and committed),
`contrast` (WCAG arithmetic on the new checked/indeterminate mark inks —
sweep extended to `--ki-checkbox-*`, research D8), `styles` (token allowlist
+ logical properties on ki-checkbox.css), `budgets` (new ki-checkbox
size-limit entries), `test` and `test-browser` (mock-doc + real-browser
suites, axe across selection × interaction × validity × theme).

## Focused runs while iterating

```bash
# Tokens: rebuild + verify the committed CSS contract + the extended sweep
pnpm --filter @kimen/tokens build && git diff --stat packages/tokens/dist/css
pnpm --filter @kimen/tokens contrast

# Component: build + fast specs + real-browser suite
pnpm exec nx run @kimen/elements:build
pnpm --filter @kimen/elements run test
pnpm --filter @kimen/elements run test-browser

# Scenario spot-checks
bash scripts/gates/check-traceability.sh specs/006-ki-checkbox
```

## Manual validation scenarios

1. **Toggle (US1)** — serve a page importing `@kimen/tokens/css` + the
   built `dist/components/ki-checkbox.js`; render
   `<ki-checkbox>Email notifications</ki-checkbox>`. Click the box: it
   checks, an input event precedes a change event (S1); click again: it
   unchecks, one change per flip. Click the label text: it toggles (S20).
   Tab to it: visible focus ring on the control (S5); Space toggles (S6);
   Enter does nothing (native parity). A disabled checkbox never changes
   and is skipped by Tab (S2). Declare `checked="false"` in markup: it
   renders CHECKED — presence semantics (S4). Set `el.checked = true` from
   the console: display updates, no change event.
2. **Forms (US2)** — a form with
   `<ki-checkbox name="newsletter" checked>Newsletter</ki-checkbox>` and a
   submit button: submit and inspect FormData — `newsletter=on` (S10);
   uncheck and submit — NO `newsletter` entry (S11); reset after toggling —
   the load-time checked state returns (S13); add `required` to an
   unchecked one — submission blocked, invalid appearance appears only
   after the attempt, never on first render (S14); wrap in
   `<fieldset disabled>` — no state change, no entry (S15). Declare a
   custom `value="yes"` — checked submits `newsletter=yes`.
3. **Partial selection (US3)** — render a "Select all"
   `<ki-checkbox indeterminate>` above two children: the parent shows the
   dash mark and the accessibility tree exposes "mixed" (S8); click it —
   it resolves to checked, dash gone, `indeterminate` attribute removed
   from the DOM (S3); set both `checked` and `indeterminate` and click —
   it resolves to unchecked (S19); submit while mixed with `checked` set —
   FormData carries the binary value `on`, never "mixed" (S12).
4. **Accessibility tree** — inspect: role checkbox with accessible name
   equal to the slotted label text (S7), checked state exposed (S7), mixed
   exposed when indeterminate (S8), disabled exposed as unavailable (S9).
   Zero ARIA attributes in the anatomy except `aria-hidden` on the SVGs.
5. **Re-theme in one step (US4)** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: every checkbox restyles across
   the full selection × interaction matrix, markup untouched (S16). Add
   `data-ki-color-scheme="dark"` under onmars: dark values apply (S17).
   Set `dir="rtl"`: the control leads and the label trails in RTL order
   (S18). Emulate `prefers-reduced-motion: reduce` and toggle: the state
   changes instantly, no mark animation (S21).
6. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → all gates green — done is done (Art. III).
- axe: zero violations across selection × interaction × validity × theme.
- size-limit: ki-checkbox marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- contrast: extended sweep matches ≥ 1 `--ki-checkbox-*` pair in every
  theme × scheme (the zero-match guard proves the pattern did not drift).
- `git status` clean after a fresh build (generated artifacts in sync).
