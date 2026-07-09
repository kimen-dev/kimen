// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js → .tsx at compile time.
export { KiButton } from './components/ki-button/ki-button.js';
export type * from './components/ki-button/ki-button.js';
export { KiTooltip } from './components/ki-tooltip/ki-tooltip.js';
// Only the placement union is public API; the positioning module's rect /
// input / direction geometry types are internal and must not enter the
// package's public type contract (review 013 Important — export type * would
// lock them in as MAJOR-versioned surface on first publish).
export type { KiTooltipPlacement } from './components/ki-tooltip/ki-tooltip.position.js';
