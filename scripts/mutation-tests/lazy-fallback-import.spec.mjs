import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import {
  LAZY_ENTRY_IMPORT,
  lazyFallbackImport,
  unanalysedFallbackImport,
} from '../../packages/elements/scripts/lazy-fallback-import.mjs';

// The elements build's Rollup plugin for the lazy runtime's fallback import.
const require = createRequire(new URL('../../packages/elements/package.json', import.meta.url));
const stencilRuntime = () => readFile(require.resolve('@stencil/core/internal/client'), 'utf8');

const shipped = [
  '  /*!__STENCIL_STATIC_IMPORT_SWITCH__*/',
  '  return import(',
  '    /* @vite-ignore */',
  '    /* turbopackIgnore: true */',
  '    /* webpackInclude: /\\.entry\\.js$/ */',
  '    /* webpackExclude: /\\.system\\.entry\\.js$/ */',
  '    /* webpackMode: "lazy" */',
  '    `./${bundleId}.entry.js${cacheBustParams ? "?" + cacheBustParams : ""}`',
  '  ).then(load);',
].join('\n');

describe('lazy-fallback-import', () => {
  it('rewrites exactly the shipped import, line for line', () => {
    expect(unanalysedFallbackImport(`const a = 1;\n${shipped}\nconst b = 2;`)).toBe(
      [
        'const a = 1;',
        '  /*!__STENCIL_STATIC_IMPORT_SWITCH__*/',
        '  return import(/* webpackIgnore: true */',
        '    /* @vite-ignore */',
        '    /* turbopackIgnore: true */',
        '    ',
        '    ',
        '    ',
        '    ["./", bundleId, ".entry.js", cacheBustParams ? "?" + cacheBustParams : ""].join("")',
        '  ).then(load);',
        'const b = 2;',
      ].join('\n'),
    );
  });

  it("matches Stencil's own runtime once", async () => {
    const source = await stencilRuntime();
    expect(source.match(LAZY_ENTRY_IMPORT)).toHaveLength(1);
    const rewritten = unanalysedFallbackImport(source);
    expect(rewritten.split('\n')).toHaveLength(source.split('\n').length);
    expect(rewritten.match(LAZY_ENTRY_IMPORT)).toBeNull();
    expect(rewritten).toContain('.join("")');
  });

  it.each([
    ['no lazy import', 'export const load = () => import("./x.entry.js");', 0],
    ['a template without the cache-bust suffix', 'return import(`./${bundleId}.entry.js`)', 0],
    ['two lazy imports', `${shipped}\n${shipped}`, 2],
  ])('refuses %s', (_label, source, found) => {
    expect(() => unanalysedFallbackImport(source)).toThrowError(
      `lazy-fallback-import: expected one lazy-entry import in Stencil's client runtime, found ${String(found)}`,
    );
  });

  it('transforms only the client runtime module, keeping its source map', () => {
    const runtime = '/r/node_modules/@stencil/core/internal/client/index.js';
    expect(lazyFallbackImport.name).toBe('kimen-lazy-fallback-import');
    for (const id of [
      runtime,
      `${runtime}?app-data=conditional`,
      'C:\\r\\node_modules\\@stencil\\core\\internal\\client\\index.js',
    ]) {
      expect(lazyFallbackImport.transform(shipped, id)).toEqual({
        code: unanalysedFallbackImport(shipped),
        map: null,
      });
    }
    for (const id of [
      `${runtime}.map`,
      `${runtime}x`,
      '/r/node_modules/@stencil/core/internal/client/patch-browser.js',
      '/r/node_modules/@stencil/core/internal/hydrate/index.js',
      '/r/node_modules/@other/core/internal/client/index.js',
      '/r/src/index.js',
    ]) {
      expect(lazyFallbackImport.transform(shipped, id)).toBeNull();
    }
  });
});
