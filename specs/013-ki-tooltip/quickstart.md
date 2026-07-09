# Quickstart validation: ki-tooltip

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

Gates that specifically prove this feature: `traceability` (S1–S17 ↔
tests), `tokens-sync` (tooltip component tokens regenerated and committed),
`contrast` (extended sweep: `--ki-tooltip-fg` over `--ki-tooltip-bg` at
4.5:1, every theme × scheme), `styles` (token allowlist + logical
properties on ki-tooltip.css), `budgets` (new ki-tooltip size-limit
entries), `test` and `test-browser` (mock-doc + real-browser suites — real
hover and real Tab focus, light/dark/reduced-motion instances, axe across
placements).

## Focused runs while iterating

```bash
# Tokens: rebuild + verify the committed CSS contract
pnpm --filter @kimen/tokens build && git diff --stat packages/tokens/dist/css
pnpm --filter @kimen/tokens contrast

# Component: build + fast specs + real-browser suite
pnpm exec nx run @kimen/elements:build
pnpm --filter @kimen/elements run test
pnpm --filter @kimen/elements run test-browser

# Scenario spot-checks
bash scripts/gates/check-traceability.sh specs/013-ki-tooltip
```

## Manual validation scenarios

1. **Hover and dismiss** — serve a page importing `@kimen/tokens/css` +
   the built `dist/components/ki-tooltip.js` with
   `<ki-tooltip label="Send immediately"><button>Send</button></ki-tooltip>`:
   hover the button — the tooltip appears above it after the hover-intent
   delay (S1); move the pointer onto the tooltip — it stays (S12); move
   away — it hides (S2); an empty `label` shows nothing (S13).
2. **Keyboard parity** — Tab to the button: the tooltip appears
   immediately, no delay (S4); press Escape: it hides, focus stays on the
   button, the button does not activate (S5); Tab on: it hides (S6).
3. **Description semantics** — in devtools' accessibility panel: the
   button's name is "Send", its description "Send immediately" (S7); while
   visible, the bubble exposes `role="tooltip"` (S8).
4. **Placement & viewport** — set `placement` to each of
   `top`/`bottom`/`start`/`end` and an unknown value (falls back to top,
   S3); place the trigger against the top viewport edge with
   `placement="top"` — the tooltip flips below and stays fully visible
   (S14); under `dir="rtl"`, `placement="start"` renders on the right
   (S11).
5. **Escape precedence** — put the wrapped trigger inside a native
   `<dialog>` opened with `showModal()`; reveal the tooltip and press
   Escape: only the tooltip hides, the dialog stays open (S16); a second
   Escape closes the dialog.
6. **Re-theme in one step** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: the tooltip restyles, markup
   untouched (S9). Add `data-ki-color-scheme="dark"`: dark values apply
   (S10). Emulate `prefers-reduced-motion: reduce`: reveal is instant, no
   animated movement (S17).
7. **APG walkthrough (documented in the PR — mandatory, new pattern)** —
   full pass per research.md D10, including NVDA + VoiceOver announcing
   the trigger's unchanged name followed by the tooltip text as its
   description (the `aria-description` verification point, with the
   recorded light-DOM fallback contingency), and the composite-trigger
   check (ki-button as trigger).
8. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`
   (this is where `aria-description` exposure is measured on Firefox and
   WebKit, research D2).

## Expected outcomes

- `gates-suite.sh` → `ALL GATES GREEN — done is done (Art. III)`.
- axe: zero violations across placements × themes × schemes, shown and
  hidden.
- size-limit: ki-tooltip marginal ≤ 9 KB gzipped; worst case ≤ 25 KB;
  token stylesheets within their 9 KB caps.
- `git status` clean after a fresh build (generated artifacts in sync).
