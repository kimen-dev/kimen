// @spec:166-tokens-core-and-component-sheets
//
// The pure logic behind the core and per-tag token sheets: which component
// source a token belongs to, which sources a tag's sheet carries, and how a
// tag sheet is written. The built sheets are checked in
// scripts/tests/token-sheets.test.mjs.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  componentSourceOf,
  declaredNames,
  expandReferences,
  isFoundation,
  isPrivateFoundationToken,
  pick,
  pickModes,
  PUBLISHED_FOUNDATIONS,
  tagSources,
  unresolvedReferences,
} from './component-sheets.mjs';
import { compactTokenStylesheet, MODES, renderComponentStylesheet } from './theme-stylesheet.mjs';

const usageOf = (entries) =>
  new Map(
    Object.entries(entries).map(([tag, { tokens = [], renders = [] }]) => [
      tag,
      { tokens: new Set(tokens), renders: new Set(renders) },
    ]),
  );

test('a token belongs to the component source of the file that defines it', () => {
  assert.equal(componentSourceOf('tokens/component/button.tokens.json'), 'button');
  assert.equal(
    componentSourceOf('tokens/component/code-block.material3.tokens.json'),
    'code-block',
  );
  assert.equal(
    componentSourceOf('/abs/packages/tokens/tokens/component/fab-menu.tokens.json'),
    'fab-menu',
  );
  assert.equal(componentSourceOf('tokens/semantic.tokens.json'), null);
  assert.equal(componentSourceOf('tokens/themes/onmars-v2.tokens.json'), null);
  assert.equal(isFoundation('--ki-foundation-material3-palette-primary40'), true);
  assert.equal(isFoundation('--ki-surface-s0'), false);
});

test('only the onmars v1 glass images stay published foundations', () => {
  assert.deepEqual(PUBLISHED_FOUNDATIONS, [
    '--ki-foundation-onmars-v1-dialog-bg-image',
    '--ki-foundation-onmars-v1-tooltip-arrow-end',
    '--ki-foundation-onmars-v1-tooltip-arrow-start',
    '--ki-foundation-onmars-v1-tooltip-bg-image',
  ]);
  assert.ok(Object.isFrozen(PUBLISHED_FOUNDATIONS));
  for (const name of PUBLISHED_FOUNDATIONS) assert.equal(isPrivateFoundationToken(name), false);
  assert.equal(
    isPrivateFoundationToken(
      '--ki-foundation-migrated-component-button-button-tertiary-hover-shadow',
    ),
    true,
  );
  assert.equal(isPrivateFoundationToken('--ki-foundation-onmars-v1-dialog-bg'), true);
  assert.equal(isPrivateFoundationToken('--ki-button-tertiary-hover-shadow'), false);
});

test('a theme keeps the value of a private foundation by carrying its expression', () => {
  const source = new Map([
    ['--ki-foundation-key', 'light-dark(var(--ki-color-black-24), var(--ki-color-black-32))'],
    ['--ki-foundation-level', '0 1px 2px var(--ki-foundation-key)'],
    ['--ki-foundation-kept', '1px'],
    ['--ki-color-black-24', 'rgba(0, 0, 0, 0.24)'],
  ]);
  const overrides = new Map([
    ['--ki-button-shadow', 'var(--ki-foundation-level), var(--ki-foundation-key)'],
    ['--ki-button-width', 'var(--ki-foundation-kept)'],
    ['--ki-button-ink', 'var(--ki-color-black-24)'],
  ]);
  const expand = (name) => name !== '--ki-foundation-kept' && isFoundation(name);
  assert.deepEqual(
    [...expandReferences(overrides, source, expand)],
    [
      [
        '--ki-button-shadow',
        '0 1px 2px light-dark(var(--ki-color-black-24), var(--ki-color-black-32)), light-dark(var(--ki-color-black-24), var(--ki-color-black-32))',
      ],
      ['--ki-button-width', 'var(--ki-foundation-kept)'],
      ['--ki-button-ink', 'var(--ki-color-black-24)'],
    ],
  );
});

test('expanding a private foundation fails on a cycle or a name the theme lacks', () => {
  const cycle = new Map([
    ['--ki-foundation-a', 'var(--ki-foundation-b)'],
    ['--ki-foundation-b', 'var(--ki-foundation-a)'],
  ]);
  assert.throws(
    () => expandReferences(new Map([['--ki-x', 'var(--ki-foundation-a)']]), cycle, isFoundation),
    /^Error: --ki-x -> --ki-foundation-a -> --ki-foundation-b -> --ki-foundation-a is a cycle$/u,
  );
  assert.throws(
    () => expandReferences(new Map([['--ki-x', 'var(--ki-foundation-z)']]), cycle, isFoundation),
    /^Error: --ki-x reads --ki-foundation-z, which is not declared$/u,
  );
});

test('S1 a tag sheet carries the sources of the tokens the tag reads, and no other', () => {
  const sourceOf = new Map([
    ['--ki-button-md-height', 'button'],
    ['--ki-alert-shell-bg', 'alert'],
  ]);
  const sources = tagSources({
    usage: usageOf({ 'ki-button': { tokens: ['--ki-button-md-height', '--ki-surface-s0'] } }),
    sourceOf,
    expressions: [],
  });
  assert.deepEqual(sources.get('ki-button'), ['button']);
});

test('S3 a tag sheet carries the sources of every tag it renders, transitively', () => {
  const sourceOf = new Map([
    ['--ki-pagination-gap', 'pagination'],
    ['--ki-icon-button-md-size', 'icon-button'],
    ['--ki-button-md-height', 'button'],
    ['--ki-icon-size-md', 'icon'],
  ]);
  const sources = tagSources({
    usage: usageOf({
      'ki-pagination': { tokens: ['--ki-pagination-gap'], renders: ['ki-icon-button'] },
      'ki-icon-button': {
        tokens: ['--ki-icon-button-md-size', '--ki-button-md-height'],
        renders: ['ki-icon'],
      },
      'ki-icon': { tokens: ['--ki-icon-size-md'] },
    }),
    sourceOf,
    expressions: [],
  });
  assert.deepEqual(sources.get('ki-pagination'), ['button', 'icon', 'icon-button', 'pagination']);
  assert.deepEqual(sources.get('ki-icon'), ['icon']);
});

test('a source another source aliases, in any theme, travels with it', () => {
  const sourceOf = new Map([
    ['--ki-fab-menu-bg', 'fab-menu'],
    ['--ki-fab-bg', 'fab'],
    ['--ki-card-bg', 'card'],
  ]);
  const sources = tagSources({
    usage: usageOf({ 'ki-fab-menu': { tokens: ['--ki-fab-menu-bg'] } }),
    sourceOf,
    expressions: [
      new Map([['--ki-fab-menu-bg', 'var(--ki-surface-s0)']]),
      new Map([['--ki-fab-menu-bg', 'var(--ki-fab-bg)']]),
    ],
  });
  assert.deepEqual(sources.get('ki-fab-menu'), ['fab', 'fab-menu']);
});

test('a name cut by a template literal stands for every token with that prefix', () => {
  const sourceOf = new Map([
    ['--ki-layout-spacing-md', 'layout'],
    ['--ki-stack-gap', 'stack'],
  ]);
  const sources = tagSources({
    usage: usageOf({ 'ki-grid': { tokens: ['--ki-layout-spacing-'] } }),
    sourceOf,
    expressions: [],
  });
  assert.deepEqual(sources.get('ki-grid'), ['layout']);
});

test('a render cycle ends, and every tag in it gets the whole cycle', () => {
  const sourceOf = new Map([
    ['--ki-tree-gap', 'tree'],
    ['--ki-tree-item-gap', 'tree-item'],
  ]);
  const sources = tagSources({
    usage: usageOf({
      'ki-tree': { tokens: ['--ki-tree-gap'], renders: ['ki-tree-item'] },
      'ki-tree-item': { tokens: ['--ki-tree-item-gap'], renders: ['ki-tree'] },
    }),
    sourceOf,
    expressions: [],
  });
  assert.deepEqual(sources.get('ki-tree'), ['tree', 'tree-item']);
  assert.deepEqual(sources.get('ki-tree-item'), ['tree', 'tree-item']);
});

test('rendering a tag that is not a component fails', () => {
  assert.throws(
    () =>
      tagSources({
        usage: usageOf({ 'ki-a': { renders: ['ki-missing'] } }),
        sourceOf: new Map(),
        expressions: [],
      }),
    /ki-missing/u,
  );
});

test('S5 a tag sheet declares its tokens at zero specificity, then its mode rules', () => {
  const declarations = new Map([
    ['--ki-card-border-color', 'var(--ki-outline-low-em)'],
    ['--ki-contrast-more-card-border-color', 'var(--ki-outline-strong)'],
  ]);
  const contrastMore = MODES.find(({ name }) => name === 'contrast-more');
  const modes = [
    {
      mode: contrastMore,
      declarations: new Map([
        ['--ki-card-border-color', 'var(--ki-contrast-more-card-border-color)'],
      ]),
    },
  ];
  const css = renderComponentStylesheet(declarations, { modes });
  assert.ok(css.startsWith(':where(:root),\n:where([data-ki-theme]) {\n'), css);
  assert.match(css, /@media \(prefers-contrast: more\) \{/u);
  assert.match(
    css,
    /--ki-card-border-color: var\(--ki-contrast-more-card-border-color\) !important;/u,
  );
  assert.equal(renderComponentStylesheet(new Map()), '');
});

test('picking keeps declaration order and limits every mode', () => {
  const declarations = new Map([
    ['--ki-a', '1'],
    ['--ki-b', '2'],
    ['--ki-c', '3'],
  ]);
  assert.deepEqual(
    [...pick(declarations, (name) => name !== '--ki-b').keys()],
    ['--ki-a', '--ki-c'],
  );
  const [mode] = MODES;
  assert.deepEqual(
    [...pickModes([{ mode, declarations }], (name) => name === '--ki-b')[0].declarations],
    [['--ki-b', '2']],
  );
});

test('a rendered sheet reports what it declares and what it reads without declaring', () => {
  const css = ':root {\n  --ki-a: var(--ki-b);\n  --ki-c: var(--ki-d);\n}\n';
  assert.deepEqual([...declaredNames(css)], ['--ki-a', '--ki-c']);
  assert.deepEqual(unresolvedReferences(css, new Set(['--ki-a', '--ki-c', '--ki-b'])), ['--ki-d']);
});

test('S6 a transitive compaction inlines a foundation built from other foundations', () => {
  const declarations = new Map([
    ['--ki-foundation-key', 'rgba(0,0,0,0.3)'],
    ['--ki-foundation-level', '0 1px 2px var(--ki-foundation-key)'],
    ['--ki-elevation-e1', 'var(--ki-foundation-level)'],
  ]);
  const css = ':root {\n  --ki-elevation-e1: var(--ki-foundation-level);\n}\n';
  const options = { declarations, modes: [], inline: isFoundation };
  assert.equal(
    compactTokenStylesheet(css, options),
    ':root {\n  --ki-elevation-e1:var(--ki-foundation-level);\n}\n',
    'the default sheet keeps its single pass',
  );
  assert.equal(
    compactTokenStylesheet(css, { ...options, transitive: true }),
    ':root {\n  --ki-elevation-e1:0 1px 2px rgba(0,0,0,0.3);\n}\n',
  );
});
