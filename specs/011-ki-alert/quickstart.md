# Quickstart validation: ki-alert

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

Gates that specifically prove this feature: `traceability` (S1–S19 ↔
tests), `tokens-sync` (alert component tokens regenerated and committed),
`contrast` (extended sweep: five tone fg-on-bg text pairs at 4.5:1 plus
dismiss-glyph-on-tone-bg non-text pairs at 3:1, across theme × scheme —
research D8), `styles` (token allowlist + logical properties on
ki-alert.css), `budgets` (new ki-alert size-limit entries), `test` and
`test-browser` (mock-doc + real-browser suites, axe across
tone × dismissible × theme × scheme).

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
bash scripts/gates/check-traceability.sh specs/011-ki-alert
```

## Manual validation scenarios

1. **Perceive the message (US1)** — serve a page importing
   `@kimen/tokens/css` + the built `dist/components/ki-alert.js`; render
   `<ki-alert tone="danger">We could not save your changes</ki-alert>`:
   the message is visible with the danger appearance (S1). Render the
   five-tone row side by side: each tone is visually distinct. Add
   `heading="Update available"`: the emphasized title renders before the
   message and the document outline gains no heading (S2). Set
   `tone="banana"`: neutral appearance, nothing breaks (S5). Render
   `<ki-alert></ki-alert>`: empty surface, no phantom announcement.
2. **Live exposure (US1)** — with DevTools' accessibility panel: append a
   danger alert dynamically — the a11y tree shows an `alert` node scoping
   only the heading and message, and focus did not move (S9); repeat with
   warning (`alert`, S17), success/info/neutral (`status`, S10/S18). An
   alert present since page load is in the tree with its role (Edge
   Cases: announcement not guaranteed).
3. **Dismiss (US2)** — render
   `<ki-alert dismissible>Backup completed</ki-alert>` followed by a
   Save button. Click the dismiss control: the alert disappears and the
   page observes exactly ONE `ki-dismiss` (bubbles, composed,
   `detail: null`; `preventDefault()` changes nothing — not cancelable)
   (S3). Tab: focus reaches the dismiss control with a visible ring (S6);
   Enter or Space dismisses with one event (S7) and focus lands on the
   Save button, never inside the hidden alert (S16). Remove the
   `dismissed` attribute from the console: the alert re-appears and
   re-announces (S19). Render a non-dismissible alert before the button:
   no control (S4) and Tab lands directly on Save (S8).
4. **Dismiss label (US2)** — inspect the a11y tree: the control is a
   button named "Dismiss" (S11); set `dismiss-label="Descartar"` and the
   name follows (S12).
5. **Re-theme in one step (US3)** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: all five tones restyle,
   markup untouched (S13). Add `data-ki-color-scheme="dark"` under
   onmars: dark values apply (S14). Set `dir="rtl"`: the message leads
   and the dismiss control trails the writing direction (S15).
6. **Agent contract (US4)** — open `generated/docs.json`: every ki-alert
   member carries when-to-use/when-NOT-to-use including the
   alert-vs-toast/badge/dialog boundaries and the dynamic-insertion
   announcement note; `tone="banana"` rendering neutral is S5's
   robustness contract (already automated).
7. **Manual screen-reader pass (spec Art. V surface, mandatory)** — with
   VoiceOver/NVDA: dynamically appearing danger and warning alerts
   announce immediately; success/info/neutral announce politely; each
   announcement contains ONLY the heading and message (never "Dismiss");
   a re-shown alert re-announces; an empty alert announces nothing.
   Document the pass in the PR (tasks.md T022).
8. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`.

## Expected outcomes

- `gates-suite.sh` → all gates green — done is done (Art. III).
- axe: zero violations across tone × dismissible × theme × scheme.
- contrast: every tone fg-on-bg ≥ 4.5:1 and every dismiss ink on every
  tone bg ≥ 3:1, both themes, both schemes (including material3's
  inherited info/warning cells — research D7).
- size-limit: ki-alert marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- `git status` clean after a fresh build (generated artifacts in sync).
