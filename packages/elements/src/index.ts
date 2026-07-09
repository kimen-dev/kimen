// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js → .tsx at compile time.
//
// Deliberate barrel surface (review 006, Important-2): a named class export
// plus a type-only star re-export per component. A bare `export *` silently
// drops names that collide across modules (each dist custom-elements module
// exports its own `defineCustomElement`), so a public export could vanish as a
// side effect of an unrelated additive change — exactly what Art. IX forbids.
export { KiButton } from './components/ki-button/ki-button.js';
export type * from './components/ki-button/ki-button.js';
export { KiCard } from './components/ki-card/ki-card.js';
export type * from './components/ki-card/ki-card.js';
export { KiInput } from './components/ki-input/ki-input.js';
export type * from './components/ki-input/ki-input.js';
export { KiCheckbox } from './components/ki-checkbox/ki-checkbox.js';
export type * from './components/ki-checkbox/ki-checkbox.js';
export { KiTextarea } from './components/ki-textarea/ki-textarea.js';
export type * from './components/ki-textarea/ki-textarea.js';
export { KiBadge } from './components/ki-badge/ki-badge.js';
export type * from './components/ki-badge/ki-badge.js';
export { KiSwitch } from './components/ki-switch/ki-switch.js';
export type * from './components/ki-switch/ki-switch.js';
export { KiAlert } from './components/ki-alert/ki-alert.js';
export type { KiAlertTone } from './components/ki-alert/ki-alert.tone.js';
export { KiRadioGroup } from './components/ki-radio-group/ki-radio-group.js';
export type * from './components/ki-radio-group/ki-radio-group.js';
export { KiRadio } from './components/ki-radio/ki-radio.js';
export type * from './components/ki-radio/ki-radio.js';
export { KiProgress } from './components/ki-progress/ki-progress.js';
export type { KiProgressShape } from './components/ki-progress/ki-progress.js';
export { KiList } from './components/ki-list/ki-list.js';
export type * from './components/ki-list/ki-list.js';
export { KiListItem } from './components/ki-list-item/ki-list-item.js';
export type * from './components/ki-list-item/ki-list-item.js';
export { KiTooltip } from './components/ki-tooltip/ki-tooltip.js';
export type { KiTooltipPlacement } from './components/ki-tooltip/ki-tooltip.position.js';
export { KiDialog } from './components/ki-dialog/ki-dialog.js';
export type * from './components/ki-dialog/ki-dialog.js';
export { KiTabs } from './components/ki-tabs/ki-tabs.js';
export type * from './components/ki-tabs/ki-tabs.js';
export { KiTab } from './components/ki-tab/ki-tab.js';
export type * from './components/ki-tab/ki-tab.js';
export { KiTabPanel } from './components/ki-tab-panel/ki-tab-panel.js';
export type * from './components/ki-tab-panel/ki-tab-panel.js';
export { KiSelect } from './components/ki-select/ki-select.js';
export type * from './components/ki-select/ki-select.js';
export { KiOption } from './components/ki-option/ki-option.js';
export type * from './components/ki-option/ki-option.js';
