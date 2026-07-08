# Implementation Notes: ki-tooltip

## RED Runs

- T007 mock-doc RED: `pnpm --filter @kimen/elements run test` exits 1 because
  S1 expects the default trigger slot and tooltip bubble, while the scaffold
  still renders only the placeholder label span.
