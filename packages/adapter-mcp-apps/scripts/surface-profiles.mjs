// The published surface profiles (spec 165, approved 2026-11-25): each one is
// a predeclared, self-contained document that carries one subset of the
// catalog. `components` is what the profile names. The generator completes it
// with the parts of its composites and the native primitives, and the result
// is the only set a spec may name in that document (FR-003).
//
// `budget` holds the document's raw, gzip and brotli bytes (Art. IV): the size
// measured after shortening vDOM keys and sharing shadow styles, plus
// 0.1 % raw and 1 % compressed.
// tests/subset-documents.spec.ts enforces it. Re-measure changes to a profile's
// components here. Shared token growth is recorded by each component.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const budgetTool = fileURLToPath(
  new URL('../../../scripts/lib/bundle-size-budget.mjs', import.meta.url),
);
const {
  mcpAppsProfileStylesheet: { raw: stylesheetBytes },
} = JSON.parse(execFileSync(process.execPath, [budgetTool], { encoding: 'utf8' }));

export const SURFACE_PROFILES = Object.freeze({
  data: Object.freeze({
    components: Object.freeze(['ki-badge', 'ki-skeleton', 'ki-stack', 'ki-table']),
    budget: Object.freeze({ raw: 342_450 + stylesheetBytes, gzip: 70_950, brotli: 60_516 }),
  }),
  form: Object.freeze({
    components: Object.freeze([
      'ki-button',
      'ki-card',
      'ki-checkbox',
      'ki-input',
      'ki-select',
      'ki-skeleton',
      'ki-stack',
      'ki-textarea',
    ]),
    budget: Object.freeze({ raw: 431_801 + stylesheetBytes, gzip: 86_346, brotli: 71_987 }),
  }),
});
