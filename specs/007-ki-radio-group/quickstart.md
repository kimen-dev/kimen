# Quickstart validation: ki-radio-group

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

Gates that specifically prove this feature: `traceability` (S1–S25 ↔
tests), `tokens-sync` (radio + radio-group component tokens regenerated
and committed), `contrast` (3:1 non-text arithmetic on the selected dot
inks — sweep extended to `--ki-radio-*`, research D8), `styles` (token
allowlist + logical properties on ki-radio.css AND ki-radio-group.css),
`budgets` (composite-pair size-limit entries), `test` and `test-browser`
(mock-doc + real-browser suites, axe across selection × disabled ×
required/invalid × theme).

## Focused runs while iterating

```bash
# Tokens: rebuild + verify the committed CSS contract + the extended sweep
pnpm --filter @kimen/tokens build && git diff --stat packages/tokens/dist/css
pnpm --filter @kimen/tokens contrast

# Components: build + fast specs + real-browser suite
pnpm exec nx run @kimen/elements:build
pnpm --filter @kimen/elements run test
pnpm --filter @kimen/elements run test-browser

# Scenario spot-checks
bash scripts/gates/check-traceability.sh specs/007-ki-radio-group
```

## Manual validation scenarios

1. **Exactly one choice (US1)** — serve a page importing
   `@kimen/tokens/css` + the built `dist/components/ki-radio-group.js`
   and `dist/components/ki-radio.js`; render

   ```html
   <ki-radio-group label="Contact preference" name="contact">
     <ki-radio value="email">Email</ki-radio>
     <ki-radio value="sms">SMS</ki-radio>
     <ki-radio value="phone">Phone</ki-radio>
   </ki-radio-group>
   ```

   Click "Email": it selects, an `input` event precedes a composed
   `change` on the group, and `group.value` reads `"email"` (S1). Click
   "SMS": "Email" releases (S2). Click a `disabled` option: nothing
   changes (S3). Click the already-selected option: no events. Declare
   `value="nope"` on a fresh group: nothing renders selected, the group
   still works (S4). Set `group.value = 'sms'` from the console: display
   updates, no change event. Disable the whole group: no selection
   changes possible (S19).
2. **Keyboard (US2)** — with the page above: Tab lands on the selected
   option with a visible focus ring (S5) — on a group with no selection,
   Tab lands on the first ENABLED option and selects nothing (S25).
   ArrowDown moves focus AND selection to the next option (S6); arrows
   wrap past the ends and skip disabled options (S7); Space selects a
   focused unselected option (S8); Tab leaves the group in one step (S9);
   a fully disabled group is skipped entirely (S20). Set `dir="rtl"` on
   the document: ArrowLeft now moves to the NEXT option (S21).
3. **Forms (US3)** — wrap the group in a form with a submit button:
   submit with "Email" selected and inspect FormData — `contact=email`
   (S12); mark the group `required` with no selection — submission
   blocked, the group reported invalid, and `aria-invalid` appears on the
   radiogroup only AFTER the attempt (S13, S23); the blocked-submission
   message is the platform's own localized radio message (no hardcoded
   strings); reset after changing the selection — the load-time selection
   returns (S14); wrap in `<fieldset disabled>` — inert, no entry (S15).
   Disable the selected option: the dot stays, `group.value` unchanged,
   but submission carries NO `contact` entry and required stays satisfied
   (S24).
4. **Accessibility tree** — inspect: a radiogroup named
   "Contact preference" containing three radios named by their slotted
   labels, the selected one exposed as selected (S10); a disabled option
   exposed as unavailable (S11); `required` exposed on the group (S22).
   Option-level ARIA is zero except `aria-hidden` on the decorative
   control span. Verify the announced position in set ("2 of 3") with a
   real screen reader — this is the manual APG walkthrough's named
   verification point (research D1/D10).
5. **Re-theme in one step (US4)** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: every group restyles across
   the full selection × interaction matrix, markup untouched (S16). Add
   `data-ki-color-scheme="dark"` under onmars: dark values apply (S17).
   Set `dir="rtl"`: each option's control leads its label right-to-left
   and the stack keeps its order (S18). Emulate
   `prefers-reduced-motion: reduce` and change selection: states apply
   instantly, no transition (FR-014, edge-case contract).
6. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → all gates green — done is done (Art. III).
- axe: zero violations across selection × disabled × required/invalid ×
  theme; manual APG walkthrough documented in the PR (spec-mandated —
  first roving-tabindex composite).
- size-limit: composite pair marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- contrast: extended sweep matches ≥ 1 `--ki-radio-*` pair in every theme
  × scheme at the 3:1 non-text minimum (the zero-match guard proves the
  pattern did not drift).
- `git status` clean after a fresh build (generated artifacts in sync).
