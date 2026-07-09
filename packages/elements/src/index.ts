// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js → .tsx at compile time.
export * from './components/ki-button/ki-button.js';
export * from './components/ki-card/ki-card.js';
export * from './components/ki-input/ki-input.js';
// Deliberate barrel surface (review 006, Important-2): named class export plus
// type-only star re-export. A bare `export *` silently drops ambiguous names
// (each custom-elements module exports its own defineCustomElement), and a
// public export vanishing as a side effect of an additive change is exactly
// what Art. IX forbids.
export { KiCheckbox } from './components/ki-checkbox/ki-checkbox.js';
export type * from './components/ki-checkbox/ki-checkbox.js';
export { KiTextarea } from './components/ki-textarea/ki-textarea.js';
export type * from './components/ki-textarea/ki-textarea.js';
