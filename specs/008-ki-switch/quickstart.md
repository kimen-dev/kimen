# Quickstart validation: ki-switch

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

Gates that specifically prove this feature: `traceability` (S1–S21 ↔
tests), `tokens-sync` (switch component tokens regenerated and committed),
`contrast` (extended sweep: thumb-on-track non-text pairs at 3:1 across
theme × scheme, research D8), `styles` (token allowlist + logical
properties on ki-switch.css), `budgets` (new ki-switch size-limit
entries), `test` and `test-browser` (mock-doc + real-browser suites, axe
across state × theme × scheme).

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
bash scripts/gates/check-traceability.sh specs/008-ki-switch
```

## Manual validation scenarios

1. **Flip a setting (US1)** — serve a page importing `@kimen/tokens/css` +
   the built `dist/components/ki-switch.js`; render
   `<ki-switch>Email notifications</ki-switch>`. Click it: it turns on
   with exactly one `input` and one `change` observed (S1); click again:
   off (S2). Click the label text instead of the track: it toggles with
   one `change` (S17). Add `disabled`: clicks change nothing and Tab skips
   it (S3, S20). Set `el.checked = true` from the console: state and
   attribute update, no events fire (FR-002). Declare `checked="maybe"` in
   markup: renders on and stays operable (S4).
2. **Keyboard walkthrough** — Tab reaches the switch with a visible focus
   ring on the track (S5); Space toggles it (S6); Enter does nothing
   (approved surface is Space only). Keyboard covers 100% of pointer
   behavior (SC-005). No APG walkthrough documentation is required (not
   flagged by the batch charter; plan.md Art. V).
3. **Accessibility tree** — inspect: role switch named "Email
   notifications", off state (S7); toggle it and the tree shows on (S8);
   disabled exposes unavailable (S9).
4. **Forms (US2)** — a form with
   `<ki-switch name="newsletter" checked>Newsletter</ki-switch>` and a
   submit button: submit and inspect FormData — `newsletter=on` (S10);
   toggle off and submit — no `newsletter` entry (S11); reset after
   toggling — the load-time state returns in both directions (S12, S21);
   `value="weekly"` submits `newsletter=weekly` when on (S18); wrap in
   `<fieldset disabled>` — no toggle, no entry (S13).
5. **Re-theme in one step (US3)** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: both switch states restyle,
   markup untouched (S14). Add `data-ki-color-scheme="dark"` under onmars:
   dark values apply (S15). Set `dir="rtl"`: label and control mirror and
   the on-state thumb rests at the track's inline end (S16). Enable
   reduced motion (OS setting or DevTools emulation) and toggle: the state
   changes instantly with no thumb travel animation (S19).
6. **Agent contract (US4)** — open `generated/docs.json`: every ki-switch
   member carries when-to-use/when-NOT-to-use including the
   switch-vs-checkbox distinction; the boolean-presence note is there
   (S4's robustness contract).
7. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → all gates green — done is done (Art. III).
- axe: zero violations across checked × disabled × theme × scheme.
- contrast: thumb-on-track ≥ 3:1 in every non-disabled cell, both themes,
  both schemes.
- size-limit: ki-switch marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- `git status` clean after a fresh build (generated artifacts in sync).
