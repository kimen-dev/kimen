// Explicit .js extension: dist/types must resolve under node16 ESM (Art. IX,
// packaging correctness); TS maps .js → .tsx at compile time.
export * from './components/ki-hello/ki-hello.js';
