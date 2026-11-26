// The per-component build's chunk names. A Rollup plugin of the Stencil build
// (stencil.config.ts); nothing it names is edited by hand.
//
// The per-component modules (`dist/components`, behind `@kimen/elements/ki-*`,
// `./components`, the framework wrappers and the MCP Apps surface) bundle
// Stencil's client runtime compiled for Kimen's own components
// (`externalRuntime: false`). Stencil then names that build's shared chunks
// `p-<hash>.js`, the runtime among them. This plugin keeps the names a reader
// can follow: each shared chunk is named after its first module, and the one
// holding the runtime `stencil-client.js`. Stack traces and bundle analysis
// show those names, the size gate leaves the runtime out of a component's
// marginal cost by its name, and the glyph plugin that runs after this one
// prefixes the chunks `sideEffects` declares.
//
// Stencil generates that build, alone among its builds, with
// `hoistTransitiveImports: false` and `[name].js` entries; the lazy builds keep
// the names their loader and Stencil's import injection expect.

import { isStencilClientRuntime } from './stencil-client-runtime.mjs';

/** The chunk of `dist/components` that holds Stencil's client runtime. */
export const RUNTIME_CHUNK = 'stencil-client.js';

export const componentChunkNames = {
  name: 'kimen-component-chunk-names',
  outputOptions(options) {
    if (options.hoistTransitiveImports !== false || options.entryFileNames !== '[name].js') {
      return null;
    }
    return {
      ...options,
      chunkFileNames: ({ moduleIds }) =>
        moduleIds.some(isStencilClientRuntime) ? RUNTIME_CHUNK : '[name].js',
    };
  },
};
