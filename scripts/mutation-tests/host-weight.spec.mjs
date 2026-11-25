import { brotliCompressSync, gzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import {
  FORBIDDEN_INPUTS,
  HOST_ENTRY,
  hostWeightViolations,
  measure,
} from '../../packages/catalog/scripts/host-weight.mjs';

// @spec:027-runtime-catalog

const budget = { brotli: 300, gzip: 400, raw: 1_000 };
const within = { brotli: 300, gzip: 400, raw: 1_000 };
const catalog = (path) => `node_modules/@kimen/catalog/dist/${path}`;
const zod = (path) => `../../store/node_modules/zod/v4/${path}`;
const lean = [
  catalog('index.js'),
  catalog('validate.js'),
  catalog('render.js'),
  catalog('zod-defaults.js'),
  catalog('generated/catalog-structure.js'),
  zod('mini/schemas.js'),
  zod('core/schemas.js'),
  zod('locales/en.js'),
  'host.js',
];

describe('the GenUI host weight gate', () => {
  it('passes a lean bundle at exactly its budget', () => {
    expect(hostWeightViolations({ budget, inputs: lean, sizes: within })).toEqual([]);
  });

  it.each(['raw', 'gzip', 'brotli'])('fails a bundle one byte over its %s budget', (metric) => {
    const sizes = { ...within, [metric]: within[metric] + 1 };
    expect(hostWeightViolations({ budget, inputs: lean, sizes })).toEqual([
      `${metric} ${String(within[metric] + 1)} B is over the ${String(budget[metric])} B budget`,
    ]);
  });

  it('fails when the budget declares no limit for a metric', () => {
    expect(
      hostWeightViolations({ budget: { gzip: 400, raw: 1_000 }, inputs: lean, sizes: within }),
    ).toEqual(['the genuiHost budget declares no brotli limit']);
    expect(hostWeightViolations({ budget: undefined, inputs: [], sizes: within })).toEqual([
      'the genuiHost budget declares no raw limit',
      'the genuiHost budget declares no gzip limit',
      'the genuiHost budget declares no brotli limit',
    ]);
  });

  it.each([
    [catalog('generated/catalog-guidance.js'), 'the catalog guidance prose'],
    [catalog('generated/catalog.js'), 'catalogData, which joins the prose back'],
    [catalog('guidance.js'), 'the join of the guidance prose'],
    [zod('classic/schemas.js'), 'classic zod (the boundary parses with zod/mini)'],
    [zod('locales/fr.js'), 'a zod locale other than English'],
    [zod('core/to-json-schema.js'), 'the zod JSON Schema converters'],
    [zod('core/json-schema-processors.js'), 'the zod JSON Schema converters'],
  ])('fails a bundle that carries %s', (input, reason) => {
    expect(hostWeightViolations({ budget, inputs: [...lean, input], sizes: within })).toEqual([
      `${reason}: ${input.slice(input.lastIndexOf('node_modules/'))}`,
    ]);
  });

  it('names a forbidden input from its package directory on, and inputs outside one as they are', () => {
    const stored = '../../../../store/.pnpm/zod@4/node_modules/zod/v4/classic/schemas.js';
    expect(
      hostWeightViolations({
        budget,
        inputs: [stored, 'vendor/zod/v4/classic/a.js'],
        sizes: within,
      }),
    ).toEqual([
      'classic zod (the boundary parses with zod/mini): node_modules/zod/v4/classic/schemas.js, vendor/zod/v4/classic/a.js',
    ]);
  });

  it('groups many inputs of one reason into one line naming the first three', () => {
    const locales = ['ar', 'az', 'be', 'bg', 'bn'].map((name) => zod(`locales/${name}.js`));
    expect(hostWeightViolations({ budget, inputs: [...lean, ...locales], sizes: within })).toEqual([
      'a zod locale other than English: node_modules/zod/v4/locales/ar.js, node_modules/zod/v4/locales/az.js, node_modules/zod/v4/locales/be.js and 2 more',
    ]);
    expect(
      hostWeightViolations({ budget, inputs: [...lean, ...locales.slice(0, 3)], sizes: within }),
    ).toEqual([
      'a zod locale other than English: node_modules/zod/v4/locales/ar.js, node_modules/zod/v4/locales/az.js, node_modules/zod/v4/locales/be.js',
    ]);
  });

  it('names every forbidden input and every metric over budget together', () => {
    const inputs = [...lean, zod('classic/external.js'), catalog('generated/catalog-guidance.js')];
    const sizes = { brotli: 301, gzip: 400, raw: 1_001 };
    expect(hostWeightViolations({ budget, inputs, sizes })).toEqual([
      'classic zod (the boundary parses with zod/mini): node_modules/zod/v4/classic/external.js',
      'the catalog guidance prose: node_modules/@kimen/catalog/dist/generated/catalog-guidance.js',
      'raw 1001 B is over the 1000 B budget',
      'brotli 301 B is over the 300 B budget',
    ]);
  });

  it('keeps what a lean host legitimately carries', () => {
    for (const input of lean) {
      expect(
        FORBIDDEN_INPUTS.some(([pattern]) => pattern.test(input)),
        input,
      ).toBe(false);
    }
    // Names that only resemble a forbidden module.
    for (const input of [
      catalog('generated/catalog-structure.js'),
      catalog('guidance-notes.js'),
      zod('mini/classic.js'),
    ]) {
      expect(
        FORBIDDEN_INPUTS.some(([pattern]) => pattern.test(input)),
        input,
      ).toBe(false);
    }
  });

  it('measures raw, gzip level 9 and brotli bytes as every size budget does', () => {
    const bytes = Buffer.from('validateUiSpec renderUiSpec '.repeat(64));
    expect(measure(bytes)).toEqual({
      brotli: brotliCompressSync(bytes).length,
      gzip: gzipSync(bytes, { level: 9 }).length,
      raw: bytes.length,
    });
  });

  it('bundles a host that keeps both entry points', () => {
    expect(HOST_ENTRY).toContain("import { renderUiSpec, validateUiSpec } from '@kimen/catalog';");
    expect(HOST_ENTRY).toMatch(/globalThis\.\w+ = \{ renderUiSpec, validateUiSpec \};/u);
  });
});
