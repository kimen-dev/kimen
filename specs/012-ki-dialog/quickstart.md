# Quickstart validation: ki-dialog

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
tests), `tokens-sync` (dialog component tokens regenerated and committed),
`contrast` (extended sweep: `--ki-dialog-fg` on `--ki-dialog-bg` at 4.5:1
plus the focus-ring non-text pair at 3:1, across theme × scheme — research
D9), `styles` (token allowlist + logical properties on ki-dialog.css),
`budgets` (new ki-dialog size-limit entries), `test` and `test-browser`
(mock-doc + real-browser suites, axe in open and closed states across
theme × scheme). Reminder: mock-doc has no `showModal()` — every open-state
scenario is proven by `test-browser`, never by `test` (research D10).

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
bash scripts/gates/check-traceability.sh specs/012-ki-dialog
```

## Manual validation scenarios

1. **Interrupt safely (US1)** — serve a page importing `@kimen/tokens/css`
   + the built `dist/components/ki-dialog.js`; render a "Delete account"
   button wired to `dialog.show()` and
   `<ki-dialog heading="Delete account?">…<ki-button slot="footer">Cancel</ki-button>…</ki-dialog>`.
   Activate the button: the dialog appears above a dimmed page (S1); click
   and Tab at the page behind — nothing reacts (inert). Click the backdrop:
   the dialog stays open (S3). Wire Cancel to `close()` and activate it:
   the dialog closes and the page observes exactly ONE `ki-close` with
   `detail.reason === 'method'` (S2, S15; `preventDefault()` changes
   nothing — not cancelable). Add `close-on-backdrop` and click the
   backdrop: it closes with `reason: 'backdrop'` (S4). Press inside the
   dialog, drag out, release on the backdrop: it stays open (D4 misfire
   guard). Call `show()` twice / `close()` twice from the console: no
   duplicate events (FR-002). Put a tall `<div>` in the body: the body
   region scrolls, the dialog never exceeds the viewport (FR-015).
2. **Keyboard and AT (US2)** — keyboard-only: open with Enter on the
   invoker — focus lands inside with a visible indication (S6; with
   `autofocus` on the Cancel action, it lands there); Tab past the last
   action — focus stays inside, never reaching the page (S7); press
   Escape — the dialog closes, `reason: 'escape'`, and focus is back on
   the "Delete account" button (S8). DevTools accessibility panel with the
   dialog open: a modal `dialog` node named "Delete account?" (S9), and
   the page's "Settings" link is absent from the tree (S10). Remove the
   invoker from the DOM before closing: focus falls to the body without
   scrolling (FR-005 fallback). Render a dialog with no focusable content:
   focus sits on the dialog surface with the token focus ring, and Escape
   still closes (Edge Cases).
3. **Re-theme in one step (US3)** — add `@kimen/tokens/css/material3` and
   `data-ki-theme="material3"` on `<html>`: surface, radius, elevation,
   scrim and heading typography restyle, and the dialog gains the M3
   entrance fade — markup untouched (S11). Add
   `data-ki-color-scheme="dark"` under onmars: dark values apply,
   including the backdrop (S12). Set `dir="rtl"`: footer actions mirror to
   the writing direction (S13). Enable "reduce motion" in system settings
   under material3 and reopen: the dialog appears instantly, no fade
   (S14).
4. **Agent contract (US4)** — open `generated/docs.json`: every ki-dialog
   member carries when-to-use/when-NOT-to-use including the
   dialog-vs-alert/tooltip/full-flow boundaries, the "wire footer actions
   to close()" and "omit close-on-backdrop instead of setting it false"
   guidance. Render `<ki-dialog variant="fullscreen" open="maybe">`: the
   dialog renders closed with defaults, nothing breaks (S5 — automated).
5. **Manual APG walkthrough (mandatory, spec Art. V surface)** — walk the
   APG Dialog (Modal) checklist with keyboard + screen reader: focus entry
   for all three FR-005 priorities; containment under Tab AND Shift+Tab;
   Escape from every focus position; focus return on every close path
   (footer action, Escape, backdrop opt-in, programmatic); role, name and
   modal state announced on open; background unreachable via the SR
   virtual cursor. Document the pass in the PR (tasks.md T021).
6. **Engine matrix (pre-release)** —
   `KIMEN_BROWSER_MATRIX=1 pnpm --filter @kimen/elements run test-browser`
   (also pins the through-shadow focus restore, `::backdrop` token
   inheritance and `@starting-style` across engines — research D3/D7/D8).

## Expected outcomes

- `gates-suite.sh` → all gates green — done is done (Art. III).
- axe: zero violations, open and closed, both themes × both schemes.
- contrast: `--ki-dialog-fg`/`--ki-dialog-bg` ≥ 4.5:1 and
  `--ki-dialog-focus-ring-color`/`--ki-dialog-bg` ≥ 3:1, both themes, both
  schemes.
- size-limit: ki-dialog marginal ≤ 9 KB gzipped; worst case ≤ 25 KB.
- `git status` clean after a fresh build (generated artifacts in sync).
