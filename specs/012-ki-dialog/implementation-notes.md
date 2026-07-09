# ki-dialog implementation notes

## Test boundary

Stencil mock-doc does not implement `HTMLDialogElement.showModal()`, top-layer
modal inertness, Escape close requests, or `::backdrop`. Open-state scenarios
S1-S4 and S6-S15 therefore live only in the real-browser suite; mock-doc covers
closed anatomy, S5, and pure helper logic.

## RED records

- T008 mock-doc RED: `pnpm --filter @kimen/elements run test` fails because
  the scaffold renders no internal `<dialog>`/`<h2>` anatomy, and the temporary
  helper stubs return `null`/`false` for the required focus and backdrop cases.
- T009 browser RED: `pnpm --filter @kimen/elements run test-browser` fails in
  S1/S2/S3/S4/S15/FR-015 because the built scaffold still renders only the
  placeholder label and no internal native `<dialog>` anatomy.
- T013 keyboard RED: `pnpm --filter @kimen/elements run test-browser` fails in
  S7 because focus is not observed inside the dialog after tabbing from the
  last slotted action.
- T014 assistive-tech RED: `pnpm --filter @kimen/elements run test-browser`
  fails in S10 because the background Settings link remains exposed to the
  role query while open, and the removed-invoker focus fallback lands on the
  host instead of `document.body`.

## Focus contingencies

- T015: Chromium real-browser tests exposed two shadow/slotted focus gaps:
  Tab from a slotted footer action did not wrap through the native dialog loop,
  so `ki-dialog` listens for Tab while open and wraps only among slotted
  focusable targets; and removed-invoker/initial-open close could leave focus
  on the host, so the close notification is deferred one task and host fallback
  is moved to `document.body` with `preventScroll`.
- T016: mock-doc and browser suites are green. The traceability spot-check is
  red at this point for S11-S14 only; those theming scenarios are introduced by
  T017 immediately after this checkpoint.
- T017 theming RED: `pnpm --filter @kimen/elements run test-browser` fails in
  S13 because RTL footer action geometry is not following the expected
  right-to-left ordering.

## APG Dialog Modal walkthrough record

T021 record date: 2026-07-09 UTC, unattended implementation loop.

- Focus entry: covered in the real-browser suite by S6 for the three FR-005
  priorities (`autofocus`, first focusable slotted element, dialog-surface
  fallback with visible token focus ring). Mock-doc is explicitly out of scope
  because it has no `showModal()`.
- Focus containment: covered in the real-browser suite by S7 for Tab from the
  last focusable action; the implementation also handles Shift+Tab from the
  first focusable action through the same capture-path wrap helper.
- Escape: covered in the real-browser suite by S8 and the no-focusable-content
  edge in S6; the native `cancel` event maps to one `ki-close` with
  `detail.reason === 'escape'`.
- Focus return: covered in S8 for the invoker path and S10 edges for removed
  invoker, initial-open fallback, and programmatic close while focus is already
  outside the dialog. The implementation note above records the Chromium body
  fallback contingency.
- Close paths: S2, S4, S8, S10 and S15 cover footer/method, opt-in backdrop,
  Escape, programmatic close and idempotent no-op guards, with exactly one
  `ki-close` per close.
- Backdrop behavior: S3 covers no light-dismiss by default; S4 covers
  `close-on-backdrop` plus the pointerdown-inside/release-outside misfire
  guard.
- Role/name/modal state and background unreachability: S9 and S10 cover the
  exposed modal dialog named by the internal `<h2>` and the inaccessible inert
  background; axe runs inside `<main>` for open/default and dark-theme cases.
- RTL spot-check: S13 covers writing-direction action order; T020 adds the RTL
  Storybook scenario for visual review.
- Screen reader announcement and virtual-cursor observation: requires a real
  assistive-technology session at the human review/merge gate. This unattended
  loop cannot make a truthful SR announcement claim, so the PR note must carry
  this record plus the human AT observation before merge.
