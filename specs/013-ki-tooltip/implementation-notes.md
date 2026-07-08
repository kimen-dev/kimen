# Implementation Notes: ki-tooltip

## RED Runs

- T007 mock-doc RED: `pnpm --filter @kimen/elements run test` exits 1 because
  S1 expects the default trigger slot and tooltip bubble, while the scaffold
  still renders only the placeholder label span.
- T008 browser RED:
  `pnpm --filter @kimen/elements exec vitest run --config vitest.browser.config.ts browser-tests/ki-tooltip.browser.spec.ts`
  exits 1 because the built scaffold does not render the default trigger slot,
  so real pointer-path fixtures fail before hover.
- T009 browser RED: the same focused run exits 1 after adding S5/S13 because
  the built scaffold still has no default trigger slot, so Escape and
  blank-label browser paths cannot interact with a rendered trigger.
- T013 browser RED: the focused tooltip browser run exits 1 on S6 because
  after real Tab moves focus to the next button, the tooltip remains visible.
