// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js -> .tsx at compile time.
// Deliberate barrel surface (review 006, Important-2): named class exports
// plus type-only star re-exports. A bare `export *` silently drops ambiguous
// names (each custom-elements module exports its own defineCustomElement),
// and a public export vanishing as a side effect of an additive change is
// exactly what Art. IX forbids.
export { KiButton } from './components/ki-button/ki-button.js';
export type * from './components/ki-button/ki-button.js';
export { KiCheckbox } from './components/ki-checkbox/ki-checkbox.js';
export type * from './components/ki-checkbox/ki-checkbox.js';
