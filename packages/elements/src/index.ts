// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js → .tsx at compile time.
export { KiAlert } from './components/ki-alert/ki-alert.js';
export type * from './components/ki-alert/ki-alert.tone.js';
export { KiButton } from './components/ki-button/ki-button.js';
export type {
  KiButtonSize,
  KiButtonTone,
  KiButtonType,
  KiButtonVariant,
} from './components/ki-button/ki-button.js';
