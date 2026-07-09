# Quickstart validation: ki-input

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

Gates that specifically prove this feature: `traceability` (S1–S28 ↔ tests),
`tokens-sync` (input component tokens regenerated and committed), `contrast`
(WCAG arithmetic on the new state inks), `styles` (token allowlist + logical
properties on ki-input.css), `budgets` (new ki-input size-limit entries),
`test` and `test-browser` (mock-doc + real-browser suites, axe across
type × state × theme).

## Focused runs while iterating

```bash
# Tokens: rebuild + verify the committed CSS contract
pnpm --filter @kimen/tokens build && git diff --stat packages/tokens/dist/css

# Component: build + fast specs + real-browser suite
pnpm exec nx run @kimen/elements:build
pnpm --filter @kimen/elements run test
pnpm --filter @kimen/elements run test-browser

# Scenario spot-checks
bash scripts/gates/check-traceability.sh specs/003-ki-input
```

## Manual validation scenarios

1. **Enter text (US1)** — serve a page importing `@kimen/tokens/css` + the
   built `dist/components/ki-input.js`; render one field per type (text,
   email, password, url, tel, search), each with a visible label (S19).
   Type into the text field: value updates live, input events observed
   during entry, change fires on blur (S1, S2). The password field obscures
   entry while `el.value` returns the plain text (S5). A disabled field
   accepts nothing (S3); a readonly field keeps its value under edit
   attempts but takes focus (S4, S22). Set `el.value = 'x'` from the
   console: display replaces, no change event (S20). An unknown
   `type="magic"` behaves as plain text (S6).
2. **Forms (US2)** — a form with
   `<ki-input label="Email" name="email" type="email" required>` and a
   submit button: submit with a valid address and inspect FormData —
   `email=<value>` (S12); Enter inside the field submits (S8); empty →
   submission blocked, invalid appearance appears only now, not on first
   render (S14, S21); `value="not-an-email"` → blocked (S28); reset
   restores the declared default (S13); wrap in `<fieldset disabled>` → no
   entry submitted (S15); a readonly field still submits (S26) and, empty +
   required, does not block (S27).
3. **Keyboard walkthrough** — Tab reaches the field with a visible focus
   ring on the enclosure (S7), also when readonly (S22); all editing is
   keyboard-operable (SC-001). No APG walkthrough documentation is required
   (native pattern, plan.md Art. V).
4. **Accessibility tree** — inspect: role textbox with accessible name equal
   to the label (S9), never the placeholder (S23); required (S10),
   disabled (S11) and readonly (S24) exposed; the internal entry control
   carries the forwarded `autocomplete` (S25).
5. **Re-theme in one step (US3)** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: every field restyles including
   the enclosure change, markup untouched (S16). Add
   `data-ki-color-scheme="dark"` under onmars: dark values apply (S17).
   Set `dir="rtl"` with icons in both slots: start leads, end trails the
   entry area (S18).
6. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → all gates green — done is done (Art. III).
- axe: zero violations across type × state × theme.
- size-limit: ki-input marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- `git status` clean after a fresh build (generated artifacts in sync).
