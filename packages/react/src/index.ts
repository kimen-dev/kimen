/**
 * @kimen/react (spec 034): generated React bindings for the Kimen `ki-*`
 * web components — typed props from the component contract, `ki-*` custom
 * events as typed callback props, lazy per-component registration (a
 * component defines its custom element on first render, so unused
 * components tree-shake away). Client-side rendering only; the SSR/DSD bet
 * stays deferred. Everything under `./components` and the per-component
 * modules is generated from the component contract and never hand-edited
 * (constitution Art. I); this entry point is the one hand-written shell.
 */
export * from './components';
