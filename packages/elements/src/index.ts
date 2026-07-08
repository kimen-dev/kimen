// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js → .tsx at compile time.
export { KiButton } from './components/ki-button/ki-button.js';
export type {
  KiButtonSize,
  KiButtonTone,
  KiButtonType,
  KiButtonVariant,
} from './components/ki-button/ki-button.js';
export { KiProgress } from './components/ki-progress/ki-progress.js';
export type { KiProgressShape } from './components/ki-progress/ki-progress.js';
