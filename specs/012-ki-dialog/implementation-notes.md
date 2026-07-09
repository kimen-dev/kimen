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
