# Quickstart validation: ki-tabs

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

Gates that specifically prove this feature: `traceability` (S1–S18 ↔
tests), `tokens-sync` (tabs + tab + tab-panel component tokens
regenerated and committed), `contrast` (label pairs at 4.5:1 and the
indicator pair at 3:1 — sweep extended to `--ki-tab-*`, research D8),
`styles` (token allowlist + logical properties on ki-tabs.css,
ki-tab.css AND ki-tab-panel.css), `budgets` (composite-trio size-limit
entries), `test` and `test-browser` (mock-doc + real-browser suites, axe
across selection × disabled × theme).

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
bash scripts/gates/check-traceability.sh specs/014-ki-tabs
```

## Manual validation scenarios

1. **Switch between views (US1)** — serve a page importing
   `@kimen/tokens/css` + the built `dist/components/ki-tabs.js`,
   `dist/components/ki-tab.js` and `dist/components/ki-tab-panel.js`;
   render

   ```html
   <ki-tabs label="Settings" value="email">
     <ki-tab value="email">Email</ki-tab>
     <ki-tab value="notifications">Notifications</ki-tab>
     <ki-tab value="billing" disabled>Billing</ki-tab>
     <ki-tab-panel value="email">Email settings…</ki-tab-panel>
     <ki-tab-panel value="notifications">Notification settings…</ki-tab-panel>
     <ki-tab-panel value="billing">Billing settings…</ki-tab-panel>
   </ki-tabs>
   ```

   Click "Notifications": its panel shows, the "Email" panel hides, and
   exactly one `ki-change` with `detail.value === "notifications"` fires
   (S1). Click "Billing" (disabled): nothing changes, no event (S2).
   Click the already-selected tab: no event. Declare `value="nope"` on a
   fresh group: the first tab is selected and its panel shows (S3);
   declare the disabled tab's value: the first NON-disabled tab wins
   (S12). Disable every tab: nothing is selected, no panel is visible
   (S18). Set `tabs.value = 'email'` from the console: display updates,
   no `ki-change`. Remove a panel: its tab still selects, no panel shows,
   nothing breaks (FR-014). Check the serialized markup: `selected` sits
   on exactly one tab and `hidden` on every other panel (group-managed
   output).
2. **Keyboard (US2)** — with the page above: Tab lands on the selected
   tab with a visible focus ring; ArrowRight moves focus AND selection to
   the next tab, its panel shows (S4 — automatic activation); arrows wrap
   past the ends and skip the disabled tab (S13); End jumps to the last
   enabled tab (S5) and Home back to the first (S14); Tab from the strip
   skips the remaining tabs and lands in the visible panel (S6) — even
   when the panel has no focusable content (the panel itself is focused,
   S15). Set `dir="rtl"` on the document: ArrowLeft now moves to the NEXT
   tab (S16). With every tab disabled, Tab skips the strip entirely (S18).
3. **Accessibility tree** — inspect: a tab list named "Settings"
   containing tabs named by their slotted labels, the selected one
   exposed as selected (S7); the visible panel exposed as a tab panel
   named "Email" (S8); the disabled tab exposed as unavailable. The
   indicator is decorative (`aria-hidden`). No tabpanel is exposed INSIDE
   the tab list (the auto-assignment containment, research D1). Verify
   the announced "tab, 2 of 3, selected" with a real screen reader — the
   first named verification point of the manual APG walkthrough
   (research D1/D10).
4. **Re-theme in one step (US3)** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: strip, tabs, indicator and
   panel restyle across the full selection × interaction matrix, markup
   untouched (S9). Add `data-ki-color-scheme="dark"` under onmars: dark
   values apply (S10). Set `dir="rtl"`: the "Email" tab leads from the
   right and the strip flows right to left (S11). Emulate
   `prefers-reduced-motion: reduce` and switch tabs: the panel switch is
   instant, no transition or animation (S17 — v1 ships zero motion by
   construction).
5. **Agent composition (US4)** — feed
   `packages/elements/generated/docs.json` to the when-to-use rules: tabs
   for view switching, ki-radio-group for value selection, links for
   navigation; `selected` documented output-only. Render a group with an
   unknown `value` and observe the documented fallback (S3, verified in
   step 1).
6. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → all gates green — done is done (Art. III).
- axe: zero violations across selection × disabled × theme × scheme —
  including no `aria-required-children` finding on the tablist (the
  containment guarantee); manual APG walkthrough documented in the PR
  (spec-mandated — new interaction pattern).
- size-limit: composite trio marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- contrast: extended sweep matches ≥ 1 `--ki-tab-*` pair in every theme ×
  scheme — label pairs at 4.5:1, the indicator pair at 3:1 (the
  zero-match guard proves the pattern did not drift).
- `git status` clean after a fresh build (generated artifacts in sync).
