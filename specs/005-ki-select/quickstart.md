# Quickstart validation: ki-select

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
tests), `tokens-sync` (select + option component tokens regenerated and
committed), `contrast` (4.5:1 text arithmetic on trigger, placeholder,
label and option-row ink pairs — sweep extended to `--ki-select-*` /
`--ki-option-*`, research D8), `styles` (token allowlist + logical
properties on ki-select.css AND ki-option.css), `budgets` (composite-pair
size-limit entries), `test` and `test-browser` (mock-doc + real-browser
suites, axe across closed/open/disabled/required-invalid × theme).

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
bash scripts/gates/check-traceability.sh specs/005-ki-select
```

## Manual validation scenarios

1. **Choose one option (US1)** — serve a page importing
   `@kimen/tokens/css` + the built `dist/components/ki-select.js` and
   `dist/components/ki-option.js`; render

   ```html
   <ki-select label="Country" name="country" placeholder="Choose a country">
     <ki-option value="es">Spain</ki-option>
     <ki-option value="fr">France</ki-option>
     <ki-option value="pt">Portugal</ki-option>
   </ki-select>
   ```

   The select renders CLOSED showing "Choose a country" (S2). Click the
   trigger: the popup opens below it. Click "France": the popup closes,
   the trigger shows "France", one composed `input` precedes one composed
   `change` on the host, and `select.value` reads `"fr"` (S1). Click
   outside an open popup: it closes, the selection unchanged (S20). A
   `disabled` select never opens (S3); a `disabled` option never selects
   (S4). Declare `value="atlantis"` on a fresh select: nothing selected,
   placeholder shown (S5). Set `select.value = 'pt'` from the console:
   display updates, NO events. Remove the selected option from the DOM:
   placeholder returns, `value` reads `""`, no events (S25).
2. **Keyboard (US2)** — with the page above: Tab reaches the trigger with
   a visible focus ring (S6). Arrow Down opens with the selected option
   highlighted (S7) — with no selection, the first enabled option (S23).
   Arrows move the highlight, skipping disabled options (S22), never
   wrapping at the ends; Home/End jump to first/last enabled (S10).
   Enter or Space commits the highlight and closes (S8); Escape closes
   without committing (S9); Tab closes DISCARDING the highlight and moves
   focus on (S21 — the spec's default discard reading, gate-1 pending).
   Typing letters does nothing — no typeahead in v1 (charter).
3. **Forms (US3)** — wrap the select in a form with a submit button:
   submit with "France" (value `fr`) selected and inspect FormData —
   `country=fr` (S13); submit with NO selection — no `country` entry at
   all (S24); mark it `required` with no selection — submission blocked,
   the select reported invalid with the PLATFORM's own localized select
   message (no hardcoded strings — research D7), and `aria-invalid`
   appears on the trigger only AFTER the attempt (S14); reset after
   changing the selection — the declared `value` selection returns,
   silently (S15); wrap in `<fieldset disabled>` — inert, unreachable, no
   entry (S16).
4. **Accessibility tree** — inspect closed: a combobox named "Country"
   (native label association), collapsed, whose value is the displayed
   selection (S11). Open it: the combobox reports expanded and a listbox
   appears whose selected option is marked selected (S12); disabled
   options are marked unavailable. Move the highlight with a screen
   reader running: each highlighted option is announced while DOM focus
   stays on the trigger — this is the manual APG walkthrough's FIRST
   named verification point (the aria-activedescendant co-shadow claim,
   research D1/D10).
5. **Re-theme in one step (US4)** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: trigger, popup and option
   states restyle — closed AND open — with markup untouched (S17). Add
   `data-ki-color-scheme="dark"` under onmars: dark values apply (S18).
   Set `dir="rtl"`: the displayed value leads and the indicator trails
   the writing direction; the popup stays anchored to the trigger (S19).
   Emulate `prefers-reduced-motion: reduce` and open/close: states apply
   instantly (FR-015, edge-case contract).
6. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → all gates green — done is done (Art. III).
- axe: zero violations across closed/open/disabled/required-invalid ×
  theme × scheme; manual APG walkthrough documented in the PR
  (spec-mandated — first popup control/combobox in the repo).
- size-limit: composite pair marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- contrast: extended sweep matches ≥ 1 pair per new pattern in every
  theme × scheme at the 4.5:1 text minimum (per-pattern zero-match guards
  prove the patterns did not drift).
- Known v1 limitation (documented, not a bug): an ancestor clipping
  overflow can clip the open popup; no viewport-edge flipping
  (research D4).
- `git status` clean after a fresh build (generated artifacts in sync).
