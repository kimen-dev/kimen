// The published surface profiles (spec 165, approved 2026-11-25): each one is
// a predeclared, self-contained document that carries one subset of the
// catalog. `components` is what the profile names. The generator completes it
// with the parts of its composites and the native primitives, and the result
// is the only set a spec may name in that document (FR-003).
//
// tests/subset-documents.spec.ts enforces the raw, gzip and Brotli limits
// from scripts/lib/bundle-size-budget.mjs.
export const SURFACE_PROFILES = Object.freeze({
  data: Object.freeze({
    components: Object.freeze(['ki-badge', 'ki-skeleton', 'ki-stack', 'ki-table']),
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
  }),
});
