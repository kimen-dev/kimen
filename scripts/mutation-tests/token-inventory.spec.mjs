import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createOrderedTokenInventory,
  deriveConsumedPublicCssProperties,
  loadOrderedTokenCompositions,
  parseTokenComposition,
} from '../lib/token-inventory.mjs';

// @spec:018-project-integrity-hardening

const source = (filePath, layer, contents, options = {}) => ({
  filePath,
  layer,
  contents,
  ...options,
});

const composition = (sources, metadata = {}) =>
  parseTokenComposition({
    id: 'onmars-light',
    theme: 'onmars',
    scheme: 'light',
    sources,
    ...metadata,
  });

const token = (value, options = {}) => ({ $value: value, ...options });

describe('token inventory mutation boundary', () => {
  it('@spec:018 S3 composes ordered sources with the last definition winning', () => {
    const result = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', brand: token('#112233') } },
      }),
      source('brand.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', brand: token('#445566') } },
      }),
    ]);

    expect(result).toEqual({
      id: 'onmars-light',
      theme: 'onmars',
      scheme: 'light',
      records: [
        {
          path: 'ki.color.brand',
          cssName: '--ki-color-brand',
          layer: 'primitive',
          component: null,
          type: 'color',
          value: '#445566',
          resolvedValue: '#445566',
          references: [],
          description: null,
          public: false,
          theme: 'onmars',
          scheme: 'light',
          filePath: 'brand.tokens.json',
          sourceIndex: 1,
          overlay: false,
        },
      ],
      issues: [],
    });
  });

  it('@spec:018 S3 inherits group types and maps DTCG $root to the group path', () => {
    const result = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: {
          color: {
            $type: 'color',
            accent: {
              $root: token('#123456'),
              strong: token('#000000', { $type: 'shadow' }),
            },
          },
        },
      }),
    ]);

    expect(result.records.map(({ path, type }) => ({ path, type }))).toEqual([
      { path: 'ki.color.accent', type: 'color' },
      { path: 'ki.color.accent.strong', type: 'shadow' },
    ]);
  });

  it.each([
    [null, /sources must be an array/i],
    [[null], /source at index 0 must be an object/i],
    [[source('', 'primitive', {})], /requires filePath/i],
    [[source('x.json', 'unknown', {})], /unsupported layer unknown/i],
    [
      [source('x.json', 'primitive', {}, { component: '' })],
      /component must be a non-empty string/i,
    ],
    [[source('x.json', 'primitive', {}, { overlay: 'yes' })], /overlay must be boolean/i],
    [[source('x.json', 'primitive', [])], /contents must be a JSON object/i],
    [[source('x.json', 'primitive', '[]')], /contents must be a JSON object/i],
  ])('@spec:018 S3 rejects malformed composition %#', (sources, expected) => {
    expect(() => composition(sources)).toThrow(expected);
  });

  it.each([
    [{ ki: { accent: { $root: '#123456' } } }, /must be a token object/i],
    [{ ki: { accent: { $root: {} } } }, /must be a token object/i],
  ])('@spec:018 S3 rejects invalid DTCG $root %#', (contents, expected) => {
    expect(() => composition([source('x.json', 'primitive', contents)])).toThrow(expected);
  });

  it('@spec:018 S3 parses JSON text and preserves null-prototype composite values', () => {
    const result = composition([
      source(
        'primitive.tokens.json',
        'primitive',
        JSON.stringify({ ki: { dimensions: { $type: 'dimension', pair: token([0, '1rem']) } } }),
      ),
    ]);

    expect(result.records[0].value).toEqual([0, '1rem']);
    expect(result.records[0].resolvedValue).toEqual([0, '1rem']);
  });

  it('@spec:018 S3 resolves recursive, forward, exact and embedded references', () => {
    const result = composition([
      source('semantic.tokens.json', 'semantic', {
        ki: {
          text: {
            $type: 'color',
            exact: token('{ki.text.interactive}', { $description: 'Exact text' }),
            action: token('calc({ki.space.base} + {ki.space.forward})', {
              $description: 'Action text',
            }),
            interactive: token('{ki.color.brand}', { $description: 'Interactive text' }),
          },
        },
      }),
      source('primitive.tokens.json', 'primitive', {
        ki: {
          color: { $type: 'color', brand: token('#336699') },
          space: { $type: 'dimension', base: token('0.5rem'), forward: token(2) },
        },
      }),
    ]);
    const byPath = new Map(result.records.map((record) => [record.path, record]));

    expect(byPath.get('ki.text.exact').resolvedValue).toBe('#336699');
    expect(byPath.get('ki.text.exact').references).toEqual(['ki.text.interactive']);
    expect(byPath.get('ki.text.action').resolvedValue).toBe('calc(0.5rem + 2)');
    expect(byPath.get('ki.text.action').references).toEqual(['ki.space.base', 'ki.space.forward']);
  });

  it('@spec:018 S3 resolves references nested in sorted arrays and objects', () => {
    const result = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', brand: token('#123456') } },
      }),
      source('semantic.tokens.json', 'semantic', {
        ki: {
          composite: {
            $type: 'shadow',
            card: token(
              { z: ['none', '{ki.color.brand}'], a: { width: 0, color: '{ki.color.brand}' } },
              { $description: 'Card shadow' },
            ),
          },
        },
      }),
    ]);
    const card = result.records.find(({ path }) => path === 'ki.composite.card');

    expect(card.references).toEqual(['ki.color.brand']);
    expect(card.resolvedValue).toEqual({
      a: { color: '#123456', width: 0 },
      z: ['none', '#123456'],
    });
    expect(result.issues).toEqual([]);
  });

  it('@spec:018 S3 overlay inherits the public contract and may not add tokens', () => {
    const result = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', brand: token('#123456') } },
      }),
      source('semantic.tokens.json', 'semantic', {
        ki: {
          text: {
            $type: 'color',
            action: token('{ki.color.brand}', { $description: 'Action text' }),
          },
        },
      }),
      source(
        'dark.tokens.json',
        'theme',
        {
          ki: {
            text: {
              action: token('{ki.color.brandDark}', {
                $type: 'dimension',
                $description: 'Must not replace contract',
              }),
              added: token('{ki.color.brandDark}'),
            },
            color: { brandDark: token('#654321', { $type: 'color' }) },
          },
        },
        { component: 'ki-theme', overlay: true },
      ),
    ]);
    const action = result.records.find(({ path }) => path === 'ki.text.action');

    expect(action).toMatchObject({
      layer: 'semantic',
      component: null,
      type: 'color',
      description: 'Action text',
      public: true,
      sourceIndex: 2,
      overlay: true,
    });
    expect(
      result.issues.filter(({ code }) => code === 'overlay-new-token').map(({ path }) => path),
    ).toEqual(['ki.color.brandDark', 'ki.text.added']);
  });

  it('@spec:018 S3 reports unresolved and upward references with stable evidence', () => {
    const result = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', brand: token('#000000') } },
      }),
      source('semantic.tokens.json', 'semantic', {
        ki: {
          text: {
            $type: 'color',
            missing: token('{ki.color.missing}', { $description: 'Missing target' }),
            upward: token('{ki.button.label}', { $description: 'Invalid dependency' }),
          },
        },
      }),
      source(
        'button.tokens.json',
        'component',
        {
          ki: {
            button: {
              $type: 'color',
              label: token('{ki.color.brand}', { $description: 'Button label' }),
            },
          },
        },
        { component: 'ki-button' },
      ),
    ]);

    expect(result.issues.map(({ code, path, related }) => ({ code, path, related }))).toEqual([
      {
        code: 'unresolved-reference',
        path: 'ki.text.missing',
        related: ['ki.color.missing'],
      },
      { code: 'upward-reference', path: 'ki.text.upward', related: ['ki.button.label'] },
    ]);
    expect(result.records.find(({ path }) => path === 'ki.text.missing').resolvedValue).toBeNull();
    expect(result.records.find(({ path }) => path === 'ki.text.upward').resolvedValue).toBe(
      '#000000',
    );
  });

  it('@spec:018 S3 allows only references, none, and numeric zero outside primitives', () => {
    const result = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', brand: token('#000000') } },
      }),
      source('semantic.tokens.json', 'semantic', {
        ki: {
          control: {
            $type: 'number',
            zero: token(0, { $description: 'Reset number' }),
            zeroString: token('0', { $description: 'String zero' }),
            none: token('none', { $description: 'No visual effect' }),
            emptyArray: token([], { $description: 'Empty list' }),
            emptyObject: token({}, { $description: 'Empty object' }),
            composite: token(
              { color: '{ki.color.brand}', widths: ['{ki.color.brand}', '1px'] },
              { $description: 'Composite literal' },
            ),
          },
        },
      }),
    ]);

    expect(
      result.issues
        .filter(({ code }) => code === 'non-primitive-literal')
        .map(({ path, related }) => ({ path, related })),
    ).toEqual([
      { path: 'ki.control.composite', related: ['$value.widths[1]'] },
      { path: 'ki.control.emptyArray', related: ['$value'] },
      { path: 'ki.control.emptyObject', related: ['$value'] },
      { path: 'ki.control.zeroString', related: ['$value'] },
    ]);
  });

  it('@spec:018 S3 requires non-empty descriptions only on public final tokens', () => {
    const result = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', brand: token('#000000') } },
      }),
      source('theme.tokens.json', 'theme', {
        ki: { theme: { $type: 'color', brand: token('{ki.color.brand}') } },
      }),
      source('semantic.tokens.json', 'semantic', {
        ki: {
          text: {
            $type: 'color',
            missing: token('{ki.color.brand}'),
            blank: token('{ki.color.brand}', { $description: '  ' }),
            documented: token('{ki.color.brand}', { $description: 'Documented' }),
          },
        },
      }),
      source(
        'button.tokens.json',
        'component',
        { ki: { button: { $type: 'color', label: token('{ki.text.documented}') } } },
        { component: 'ki-button' },
      ),
    ]);

    expect(
      result.issues
        .filter(({ code }) => code === 'missing-public-description')
        .map(({ path }) => path),
    ).toEqual(['ki.button.label', 'ki.text.blank', 'ki.text.missing']);
    expect(result.records.map(({ path, public: isPublic }) => [path, isPublic])).toEqual([
      ['ki.button.label', true],
      ['ki.color.brand', false],
      ['ki.text.blank', true],
      ['ki.text.documented', true],
      ['ki.text.missing', true],
      ['ki.theme.brand', false],
    ]);
  });

  it('@spec:018 S3 reports multi-member and self cycles once in canonical order', () => {
    const result = composition([
      source('semantic.tokens.json', 'semantic', {
        ki: {
          cycle: {
            $type: 'color',
            c: token('{ki.cycle.a}', { $description: 'C' }),
            a: token('{ki.cycle.b}', { $description: 'A' }),
            b: token('{ki.cycle.c}', { $description: 'B' }),
            self: token('{ki.cycle.self}', { $description: 'Self' }),
          },
        },
      }),
    ]);

    expect(
      result.issues
        .filter(({ code }) => code === 'circular-reference')
        .map(({ path, related }) => ({ path, related })),
    ).toEqual([
      {
        path: 'ki.cycle.a',
        related: ['ki.cycle.a', 'ki.cycle.b', 'ki.cycle.c'],
      },
      { path: 'ki.cycle.self', related: ['ki.cycle.self'] },
    ]);
    expect(result.records.find(({ path }) => path === 'ki.cycle.a').resolvedValue).toBeNull();
    expect(result.records.find(({ path }) => path === 'ki.cycle.self').resolvedValue).toBeNull();
  });

  it('@spec:018 S3 returns identical sorted results for unordered group keys', () => {
    const first = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', z: token('#ffffff'), a: token('#000000') } },
      }),
    ]);
    const second = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { a: token('#000000'), z: token('#ffffff'), $type: 'color' } },
      }),
    ]);

    expect(first).toEqual(second);
    expect(first.records.map(({ path }) => path)).toEqual(['ki.color.a', 'ki.color.z']);
  });

  it('@spec:018 S9 builds an ordered cross-composition public contract', () => {
    const light = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', brand: token('#000000') } },
      }),
      source('semantic.tokens.json', 'semantic', {
        ki: {
          text: {
            $type: 'color',
            body: token('{ki.color.brand}', { $description: 'Body text color.' }),
          },
        },
      }),
      source(
        'dialog.tokens.json',
        'component',
        {
          ki: {
            dialog: {
              $type: 'color',
              background: token('{ki.color.brand}', {
                $description: 'Dialog background color.',
              }),
            },
          },
        },
        { component: 'ki-dialog' },
      ),
    ]);
    const dark = { ...light, id: 'onmars-dark', scheme: 'dark' };

    expect(createOrderedTokenInventory([light, dark])).toEqual({
      schemaVersion: 1,
      compositions: [
        { id: 'onmars-light', theme: 'onmars', scheme: 'light' },
        { id: 'onmars-dark', theme: 'onmars', scheme: 'dark' },
      ],
      publicTokens: [
        {
          path: 'ki.dialog.background',
          cssName: '--ki-dialog-background',
          layer: 'component',
          component: 'ki-dialog',
          type: 'color',
          description: 'Dialog background color.',
        },
        {
          path: 'ki.text.body',
          cssName: '--ki-text-body',
          layer: 'semantic',
          component: null,
          type: 'color',
          description: 'Body text color.',
        },
      ],
    });
  });

  it('@spec:018 S9 derives unique sorted CSS properties with descriptions', () => {
    const parsed = composition([
      source('primitive.tokens.json', 'primitive', {
        ki: { color: { $type: 'color', brand: token('#000000') } },
      }),
      source('semantic.tokens.json', 'semantic', {
        ki: {
          text: {
            $type: 'color',
            body: token('{ki.color.brand}', { $description: 'Body text color.' }),
          },
        },
      }),
      source(
        'dialog.tokens.json',
        'component',
        {
          ki: {
            dialog: {
              $type: 'color',
              background: token('{ki.color.brand}', {
                $description: 'Dialog background color.',
              }),
            },
          },
        },
        { component: 'ki-dialog' },
      ),
    ]);
    const inventory = createOrderedTokenInventory([parsed]);

    expect(
      deriveConsumedPublicCssProperties({
        inventory,
        cssByTag: {
          'ki-dialog': [
            ':host { --_bg: var(--ki-dialog-background); }',
            '.body { color: var(--ki-text-body); background: var(--ki-dialog-background); }',
          ].join('\n'),
        },
      }),
    ).toEqual({
      'ki-dialog': [
        {
          name: '--ki-dialog-background',
          description: 'Dialog background color.',
          layer: 'component',
        },
        { name: '--ki-text-body', description: 'Body text color.', layer: 'semantic' },
      ],
    });
    expect(() =>
      deriveConsumedPublicCssProperties({
        inventory,
        cssByTag: { 'ki-dialog': ':host { color: var(--ki-color-brand); }' },
      }),
    ).toThrow(/not a public semantic or component token/iu);
  });

  it.each([
    [null, /compositions must be an array/iu],
    [[null], /composition at index 0 must be an object/iu],
    [[{ id: '', records: [], issues: [] }], /requires a non-empty id/iu],
    [
      [
        { id: 'same', records: [], issues: [] },
        { id: 'same', records: [], issues: [] },
      ],
      /duplicate token composition id same/iu,
    ],
    [[{ id: 'invalid', records: [], issues: [{ code: 'bad', path: 'ki.bad' }] }], /bad ki.bad/iu],
  ])('@spec:018 S9 rejects malformed ordered inventory %#', (compositions, expected) => {
    expect(() => createOrderedTokenInventory(compositions)).toThrow(expected);
  });

  it('@spec:018 S10 exposes parsed compositions for resolved API defaults', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'kimen-token-compositions-'));
    const tokenPackageRoot = join(workspaceRoot, 'packages/tokens');
    const sourcePath = join(tokenPackageRoot, 'tokens/primitive.tokens.json');
    await mkdir(join(tokenPackageRoot, 'tokens'), { recursive: true });
    await writeFile(
      sourcePath,
      JSON.stringify({ ki: { color: { $type: 'color', base: { $value: '#123456' } } } }),
      'utf8',
    );

    try {
      const compositions = await loadOrderedTokenCompositions({
        workspaceRoot,
        tokenPackageRoot,
        configurations: [
          {
            id: 'onmars-light',
            theme: 'onmars',
            scheme: 'light',
            config: { source: ['tokens/primitive.tokens.json'] },
          },
        ],
      });

      expect(compositions).toHaveLength(1);
      expect(compositions[0]).toMatchObject({
        id: 'onmars-light',
        records: [{ path: 'ki.color.base', resolvedValue: '#123456' }],
      });
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
