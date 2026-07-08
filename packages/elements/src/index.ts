// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js → .tsx at compile time.
export { KiButton } from './components/ki-button/ki-button.js';
export type * from './components/ki-button/ki-button.js';
export { KiTooltip } from './components/ki-tooltip/ki-tooltip.js';
export type * from './components/ki-tooltip/ki-tooltip.position.js';
