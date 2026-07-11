import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOrderedTokenInventory,
  deriveConsumedPublicCssProperties,
  parseTokenComposition,
} from '../lib/token-inventory.mjs';

const source = (filePath, layer, contents, options = {}) => ({
  filePath,
  layer,
  contents,
  ...options,
});

const composition = (sources) =>
  parseTokenComposition({
    id: 'onmars-light',
    theme: 'onmars',
    scheme: 'light',
    sources,
  });

const token = (value, options = {}) => ({ $value: value, ...options });

test('composes sources in explicit order with last occurrence winning', () => {
  const result = composition([
    source('primitive.tokens.json', 'primitive', {
      ki: { color: { $type: 'color', brand: token('#112233') } },
    }),
    source('brand.tokens.json', 'primitive', {
      ki: { color: { $type: 'color', brand: token('#445566') } },
    }),
  ]);

  assert.deepEqual(result.records, [
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
  ]);
  assert.deepEqual(result.issues, []);
});

test('inherits group types and maps a DTCG $root token to the group path', () => {
  const result = composition([
    source('primitive.tokens.json', 'primitive', {
      ki: {
        color: {
          $type: 'color',
          accent: {
            $root: token('#123456'),
            strong: token('#000000'),
          },
        },
      },
    }),
  ]);

  assert.deepEqual(
    result.records.map(({ path, type }) => ({ path, type })),
    [
      { path: 'ki.color.accent', type: 'color' },
      { path: 'ki.color.accent.strong', type: 'color' },
    ],
  );
});

test('resolves recursive and forward references after the complete composition', () => {
  const result = composition([
    source('semantic.tokens.json', 'semantic', {
      ki: {
        text: {
          $type: 'color',
          action: token('{ki.text.interactive}', { $description: 'Action text' }),
          interactive: token('{ki.color.brand}', { $description: 'Interactive text' }),
        },
      },
    }),
    source('primitive.tokens.json', 'primitive', {
      ki: { color: { $type: 'color', brand: token('#336699') } },
    }),
  ]);

  const byPath = new Map(result.records.map((record) => [record.path, record]));
  assert.equal(byPath.get('ki.text.action').resolvedValue, '#336699');
  assert.deepEqual(byPath.get('ki.text.action').references, ['ki.text.interactive']);
  assert.equal(byPath.get('ki.text.interactive').resolvedValue, '#336699');
  assert.deepEqual(result.issues, []);
});

test('extracts and resolves multiple embedded references after merge while retaining literal evidence', () => {
  const result = composition([
    source('primitive-base.tokens.json', 'primitive', {
      ki: { space: { $type: 'dimension', base: token('0.5rem') } },
    }),
    source('semantic.tokens.json', 'semantic', {
      ki: {
        layout: {
          $type: 'dimension',
          gap: token('calc({ki.space.base} + {ki.space.forward})', {
            $description: 'Composed layout gap',
          }),
        },
      },
    }),
    source('primitive-forward.tokens.json', 'primitive', {
      ki: { space: { $type: 'dimension', forward: token('1rem') } },
    }),
  ]);

  const gap = result.records.find(({ path }) => path === 'ki.layout.gap');
  assert.deepEqual(gap.references, ['ki.space.base', 'ki.space.forward']);
  assert.equal(gap.resolvedValue, 'calc(0.5rem + 1rem)');
  assert.deepEqual(
    result.issues.map(({ code, path, related }) => ({ code, path, related })),
    [
      {
        code: 'non-primitive-literal',
        path: 'ki.layout.gap',
        related: ['$value'],
      },
    ],
  );
});

test('an overlay inherits the existing public contract and may not add tokens', () => {
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
              $description: 'An overlay must not replace the public contract',
            }),
            added: token('{ki.color.brandDark}'),
          },
          color: { brandDark: token('#654321', { $type: 'color' }) },
        },
      },
      { overlay: true },
    ),
  ]);

  const action = result.records.find((record) => record.path === 'ki.text.action');
  assert.equal(action.layer, 'semantic');
  assert.equal(action.type, 'color');
  assert.equal(action.description, 'Action text');
  assert.equal(action.public, true);
  assert.deepEqual(
    result.issues.filter(({ code }) => code === 'overlay-new-token').map(({ path }) => path),
    ['ki.color.brandDark', 'ki.text.added'],
  );
});

test('reports unresolved and upward references with stable issue codes', () => {
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

  assert.deepEqual(
    result.issues.map(({ code, path, related }) => ({ code, path, related })),
    [
      {
        code: 'unresolved-reference',
        path: 'ki.text.missing',
        related: ['ki.color.missing'],
      },
      {
        code: 'upward-reference',
        path: 'ki.text.upward',
        related: ['ki.button.label'],
      },
    ],
  );
});

test('allows literals only in primitives, except exact none and unitless zero', () => {
  const result = composition([
    source('primitive.tokens.json', 'primitive', {
      ki: { color: { $type: 'color', brand: token('#000000') } },
    }),
    source('semantic.tokens.json', 'semantic', {
      ki: {
        control: {
          $type: 'number',
          zero: token(0, { $description: 'Reset number' }),
          zeroString: token('0', { $description: 'String zero is not unitless zero' }),
          none: token('none', { $description: 'No visual effect' }),
          color: token('#ffffff', { $description: 'Literal color' }),
          composite: token(
            { color: '{ki.color.brand}', width: '1px' },
            { $description: 'Composite with a literal' },
          ),
        },
      },
    }),
  ]);

  assert.deepEqual(
    result.issues
      .filter(({ code }) => code === 'non-primitive-literal')
      .map(({ path, related }) => ({ path, related })),
    [
      { path: 'ki.control.color', related: ['$value'] },
      { path: 'ki.control.composite', related: ['$value.width'] },
      { path: 'ki.control.zeroString', related: ['$value'] },
    ],
  );
});

test('requires descriptions only for final semantic and component tokens', () => {
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

  assert.deepEqual(
    result.issues
      .filter(({ code }) => code === 'missing-public-description')
      .map(({ path }) => path),
    ['ki.button.label', 'ki.text.missing'],
  );
  assert.deepEqual(
    result.records.map(({ path, public: isPublic }) => [path, isPublic]),
    [
      ['ki.button.label', true],
      ['ki.color.brand', false],
      ['ki.text.documented', true],
      ['ki.text.missing', true],
      ['ki.theme.brand', false],
    ],
  );
});

test('reports reference cycles once using a deterministic canonical member list', () => {
  const result = composition([
    source('semantic.tokens.json', 'semantic', {
      ki: {
        cycle: {
          $type: 'color',
          c: token('{ki.cycle.a}', { $description: 'C' }),
          a: token('{ki.cycle.b}', { $description: 'A' }),
          b: token('{ki.cycle.c}', { $description: 'B' }),
        },
      },
    }),
  ]);

  assert.deepEqual(
    result.issues.map(({ code, path, related }) => ({ code, path, related })),
    [
      {
        code: 'circular-reference',
        path: 'ki.cycle.a',
        related: ['ki.cycle.a', 'ki.cycle.b', 'ki.cycle.c'],
      },
    ],
  );
  assert.equal(result.records.find(({ path }) => path === 'ki.cycle.a').resolvedValue, null);
});

test('returns identical sorted results for semantically unordered group keys', () => {
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

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.records.map(({ path }) => path),
    ['ki.color.a', 'ki.color.z'],
  );
});

test('builds one stable public inventory across ordered compositions', () => {
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

  const inventory = createOrderedTokenInventory([light, dark]);

  assert.deepEqual(
    inventory.compositions.map(({ id, theme, scheme }) => ({ id, theme, scheme })),
    [
      { id: 'onmars-light', theme: 'onmars', scheme: 'light' },
      { id: 'onmars-dark', theme: 'onmars', scheme: 'dark' },
    ],
  );
  assert.deepEqual(inventory.publicTokens, [
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
  ]);
});

test('derives sorted documented public properties consumed by each component stylesheet', () => {
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

  const properties = deriveConsumedPublicCssProperties({
    inventory,
    cssByTag: {
      'ki-dialog': [
        ':host { --_private: var(--ki-dialog-background); }',
        '.surface { color: var(--ki-text-body); background: var(--ki-dialog-background); }',
      ].join('\n'),
    },
  });

  assert.deepEqual(properties, {
    'ki-dialog': [
      {
        name: '--ki-dialog-background',
        description: 'Dialog background color.',
        layer: 'component',
      },
      {
        name: '--ki-text-body',
        description: 'Body text color.',
        layer: 'semantic',
      },
    ],
  });
});

test('rejects a consumed token that is not part of the public inventory', () => {
  const parsed = composition([
    source('primitive.tokens.json', 'primitive', {
      ki: { color: { $type: 'color', brand: token('#000000') } },
    }),
  ]);

  assert.throws(
    () =>
      deriveConsumedPublicCssProperties({
        inventory: createOrderedTokenInventory([parsed]),
        cssByTag: { 'ki-dialog': ':host { color: var(--ki-color-brand); }' },
      }),
    /ki-dialog.*--ki-color-brand.*not a public semantic or component token/iu,
  );
});
