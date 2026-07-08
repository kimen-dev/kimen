// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js -> .tsx at compile time.
// Deliberate barrel surface (review 004/006): named class exports plus
// type-only star re-exports — a bare `export *` silently drops ambiguous
// names (each custom-elements module exports its own defineCustomElement).
export { KiButton } from './components/ki-button/ki-button.js';
export type * from './components/ki-button/ki-button.js';
export { KiTextarea } from './components/ki-textarea/ki-textarea.js';
export type * from './components/ki-textarea/ki-textarea.js';
