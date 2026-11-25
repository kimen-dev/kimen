// The published surface profiles (spec 165, approved 2026-11-25): each one is
// a predeclared, self-contained document that carries one subset of the
// catalog. `components` is what the profile names. The generator completes it
// with the parts of its composites and the native primitives, and the result
// is the only set a spec may name in that document (FR-003).
//
// `budget` holds the document's raw, gzip and brotli bytes (Art. IV): the size
// measured when it was set plus about 1 % for Linux CI's zlib and brotli.
// tests/subset-documents.spec.ts enforces it. A change that grows a profile's
// components re-measures its budget here.
export const SURFACE_PROFILES = Object.freeze({
  data: Object.freeze({
    components: Object.freeze(['ki-badge', 'ki-skeleton', 'ki-stack', 'ki-table']),
    budget: Object.freeze({ raw: 481_109, gzip: 108_518, brotli: 92_998 }),
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
    budget: Object.freeze({ raw: 602_702, gzip: 132_408, brotli: 111_487 }),
  }),
});
