// Vite's eager `import.meta.glob`, as token-sheets.browser.spec.ts uses it to
// read every published tag sheet (spec 166). The suite does not load
// `vite/client` types, so only the one overload it calls is declared here.
interface ImportMeta {
  glob<T>(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, T>;
}
