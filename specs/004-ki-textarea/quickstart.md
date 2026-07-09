# Quickstart validation: ki-textarea

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

Gates that specifically prove this feature: `traceability` (S1–S25 ↔ tests),
`tokens-sync` (textarea component tokens regenerated and committed),
`contrast` (WCAG arithmetic on the new state inks — the component sweep now
covers `--ki-textarea-*`, including placeholder and label inks), `styles`
(token allowlist + logical properties on ki-textarea.css), `budgets` (new
ki-textarea size-limit entries), `test` and `test-browser` (mock-doc +
real-browser suites, axe across state × theme).

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
bash scripts/gates/check-traceability.sh specs/004-ki-textarea
```

## Manual validation scenarios

1. **Capture long-form text (US1)** — serve a page importing
   `@kimen/tokens/css` + the built `dist/components/ki-textarea.js`; render
   a labeled textarea. Type two lines: the value holds both separated by
   `\n` (S1, S2); input events observed during entry, change fires on blur
   (S20). Press Enter inside a form: a new line starts, the form does NOT
   submit (S8). A `rows="6"` field is visibly taller than the default
   (S3); `rows="tall"` renders at the default height (S6); there is no
   resize handle and long content scrolls inside the field. The
   placeholder disappears on first typed character (S19). A readonly field
   keeps "No refunds after 30 days" under edit attempts (S4); a disabled
   field accepts nothing and never takes focus (S5).
2. **Forms (US2)** — a form with
   `<ki-textarea label="Comments" name="comments" required>` and a submit
   button: submit with multiline text and inspect FormData —
   `comments=<text with line breaks>` (S12); empty → submission blocked,
   missing value reported, invalid appearance appears only now, not on
   first render (S14); reset restores the declared default (S13); wrap in
   `<fieldset disabled>` → typing does nothing (S15); a disabled textarea
   contributes no entry (S16); a readonly one still submits (S23).
3. **Keyboard walkthrough** — Tab reaches the field with a visible focus
   ring on the enclosure (S7); Enter = new line, never submit (S8); Tab
   exits without inserting a character (S21); all editing is
   keyboard-operable (SC-006). No APG walkthrough documentation is
   required (native pattern, plan.md Art. V).
4. **Accessibility tree** — inspect: multiline textbox with accessible
   name equal to the label (S9); required (S10), disabled (S11) and
   readonly (S22) exposed; the internal entry control carries the
   forwarded `autocomplete="street-address"` (S25).
5. **Re-theme in one step (US3)** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: every textarea restyles
   including the enclosure change, markup untouched (S17). Add
   `data-ki-color-scheme="dark"` under onmars: dark values apply (S18).
   Set `dir="rtl"`: the label starts at the inline start edge and entered
   text follows the writing direction (S24).
6. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → all gates green — done is done (Art. III).
- axe: zero violations across state × theme × scheme.
- contrast: `--ki-textarea-*` pairs (fg, placeholder-fg on bg; label-fg on
  the page surface) ≥ 4.5:1 in every theme × scheme, disabled exempt.
- size-limit: ki-textarea marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- `git status` clean after a fresh build (generated artifacts in sync).
