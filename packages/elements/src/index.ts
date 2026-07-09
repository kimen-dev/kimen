// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js → .tsx at compile time.
export { KiAlert } from './components/ki-alert/ki-alert.js';
// Only the documented tone union is public; KiAlertLiveRole is an internal
// helper type and must not leak from the package root (codex review).
export type { KiAlertTone } from './components/ki-alert/ki-alert.tone.js';
export { KiButton } from './components/ki-button/ki-button.js';
export type {
  KiButtonSize,
  KiButtonTone,
  KiButtonType,
  KiButtonVariant,
} from './components/ki-button/ki-button.js';
