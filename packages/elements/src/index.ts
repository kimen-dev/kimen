// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js → .tsx at compile time.
export { KiButton } from './components/ki-button/ki-button.js';
export type * from './components/ki-button/ki-button.js';
export { KiTabs } from './components/ki-tabs/ki-tabs.js';
export type * from './components/ki-tabs/ki-tabs.js';
export { KiTab } from './components/ki-tab/ki-tab.js';
export type * from './components/ki-tab/ki-tab.js';
export { KiTabPanel } from './components/ki-tab-panel/ki-tab-panel.js';
export type * from './components/ki-tab-panel/ki-tab-panel.js';
