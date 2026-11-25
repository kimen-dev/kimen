import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { GLYPH_CHUNK_PREFIX, glyphChunks } from './glyph-chunks';

const icons = '/repo/packages/elements/icons';
const glyph = `${icons}/sparkles.js`;
const copy = `${icons}/_registry.mjs`;
const registry = '/repo/packages/elements/src/utils/icon-registry.mjs';
const util = '/repo/packages/elements/src/utils/shadow-focus.ts';

type Names = string | ((chunk: { moduleIds: readonly string[] }) => string);
function chunkName(names: Names | undefined, moduleIds: readonly string[], directory = icons) {
  const { chunkFileNames } = glyphChunks(directory, registry).outputOptions(
    names === undefined ? {} : { chunkFileNames: names },
  );
  if (typeof chunkFileNames !== 'function') throw new Error('expected a naming function');
  return chunkFileNames({ moduleIds });
}

describe('glyph chunk names', () => {
  it('prefixes a chunk that holds a glyph module, whatever else it holds', () => {
    expect(chunkName('[name].js', [glyph])).toBe('glyph-[name].js');
    expect(chunkName('[name]-[hash].js', [util, glyph])).toBe('glyph-[name]-[hash].js');
    expect(chunkName('p-[hash].js', [glyph])).toBe('glyph-p-[hash].js');
  });

  it('leaves chunks without a glyph module alone, the registry included', () => {
    expect(chunkName('[name].js', [copy])).toBe('[name].js');
    expect(chunkName('[name].js', [registry, util])).toBe('[name].js');
    expect(chunkName('[name].js', [`${icons}-extra/sparkles.js`])).toBe('[name].js');
    expect(chunkName('[name].js', [`${icons}/nested/sparkles.ts`])).toBe('[name].js');
  });

  it('prefixes the file name, not a directory in the pattern', () => {
    expect(chunkName('chunks/[name].js', [glyph])).toBe('chunks/glyph-[name].js');
  });

  it("keeps a build's naming function and Rollup's default pattern", () => {
    expect(chunkName(({ moduleIds }) => `c${moduleIds.length}.js`, [util, glyph])).toBe(
      'glyph-c2.js',
    );
    expect(chunkName(undefined, [glyph])).toBe('glyph-[name]-[hash].js');
    expect(chunkName(undefined, [util])).toBe('[name]-[hash].js');
  });

  it('matches Windows module ids and a trailing separator on the directory', () => {
    expect(chunkName('[name].js', ['C:\\repo\\icons\\x.js'], 'C:\\repo\\icons\\')).toBe(
      'glyph-[name].js',
    );
  });

  it('is the prefix the package declares for each published bundler-facing build', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { sideEffects: string[] };
    expect(manifest.sideEffects).toEqual([
      './icons/*.js',
      ...['components', 'esm'].map((build) => `./dist/${build}/${GLYPH_CHUNK_PREFIX}*.js`),
    ]);
  });
});

describe('glyph registry resolution', () => {
  const { resolveId } = glyphChunks(icons, registry);

  it("links a glyph module's registry import to the source registry module", () => {
    expect(resolveId('./_registry.mjs', glyph)).toBe(registry);
  });

  it('leaves every other import to the build', () => {
    expect(resolveId('./_registry.mjs', util)).toBeNull();
    expect(resolveId('./_registry.mjs', undefined)).toBeNull();
    expect(resolveId('./other.mjs', glyph)).toBeNull();
    expect(resolveId('./_registry.mjs', copy)).toBeNull();
  });
});
