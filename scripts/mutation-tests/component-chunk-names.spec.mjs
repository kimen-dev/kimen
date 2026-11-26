import { describe, expect, it } from 'vitest';

import {
  componentChunkNames,
  RUNTIME_CHUNK,
} from '../../packages/elements/scripts/component-chunk-names.mjs';

// The per-component build's chunk names (packages/elements/stencil.config.ts).
const runtime = '/r/node_modules/@stencil/core/internal/client/index.js';
const customElements = {
  banner: '/* x */',
  chunkFileNames: 'p-[hash].js',
  entryFileNames: '[name].js',
  format: 'esm',
  hoistTransitiveImports: false,
  sourcemap: true,
};

describe('component-chunk-names', () => {
  it("names the per-component build's chunks after their module, and Stencil's runtime once", () => {
    expect(RUNTIME_CHUNK).toBe('stencil-client.js');
    expect(componentChunkNames.name).toBe('kimen-component-chunk-names');
    const options = componentChunkNames.outputOptions(customElements);
    expect({ ...options, chunkFileNames: undefined }).toEqual({
      ...customElements,
      chunkFileNames: undefined,
    });
    const name = (moduleIds) => options.chunkFileNames({ moduleIds });
    expect(name([runtime])).toBe('stencil-client.js');
    expect(name(['\0app-data', `${runtime}?app-data=conditional`])).toBe('stencil-client.js');
    expect(name(['C:\\r\\node_modules\\@stencil\\core\\internal\\client\\index.js'])).toBe(
      'stencil-client.js',
    );
    for (const moduleIds of [
      ['/r/src/utils/field-message.ts'],
      ['/r/node_modules/@stencil/core/internal/client/patch-browser.js'],
      [`${runtime}.map`],
      [],
    ]) {
      expect(name(moduleIds)).toBe('[name].js');
    }
  });

  it("leaves Stencil's other builds alone", () => {
    for (const options of [
      // The lazy ESM build behind the loader.
      { entryFileNames: '[name].js', format: 'es' },
      // The browser build the site serves.
      { chunkFileNames: 'p-[hash].js', entryFileNames: '[name].esm.js', format: 'es' },
      { ...customElements, hoistTransitiveImports: true },
      { ...customElements, hoistTransitiveImports: undefined },
      { ...customElements, entryFileNames: '[name].cjs.js' },
    ]) {
      expect(componentChunkNames.outputOptions(options)).toBeNull();
    }
  });
});
