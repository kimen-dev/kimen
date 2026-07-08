# Implementation Notes: ki-tooltip

## RED Runs

- T007 mock-doc RED: `pnpm --filter @kimen/elements run test` exits 1 because
  S1 expects the default trigger slot and tooltip bubble, while the scaffold
  still renders only the placeholder label span.
- T008 browser RED:
  `pnpm --filter @kimen/elements exec vitest run --config vitest.browser.config.ts browser-tests/ki-tooltip.browser.spec.ts`
  exits 1 because the built scaffold does not render the default trigger slot,
  so real pointer-path fixtures fail before hover.
