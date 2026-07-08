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
