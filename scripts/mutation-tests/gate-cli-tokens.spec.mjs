// @spec:018-project-integrity-hardening#S11
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { expect, it, onTestFinished } from 'vitest';

import {
  assertBaseBeforeOverride,
  buildComposition,
  checkTokens,
  collectCssIssues,
  cssFilesBelow,
  issueDiagnostic,
  orderedSources,
  runTokenCli,
  sourceMetadata,
} from '../gates/check-tokens.mjs';

const primitiveSource = 'tokens/primitive.tokens.json';
const primitiveDocument = `${JSON.stringify({
  ki: {
    color: {
      $type: 'color',
      brand: { $value: '#123456' },
    },
  },
})}\n`;

const fourConfigs = Object.freeze({
  lightConfig: { source: [primitiveSource] },
  darkConfig: { include: [primitiveSource], source: [] },
  material3LightConfig: { source: [primitiveSource] },
  material3DarkConfig: { source: [primitiveSource] },
});

async function temporaryWorkspace() {
  const root = await mkdtemp(join(tmpdir(), 'kimen-gate-cli-tokens-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  return root;
}

async function put(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

it.each([
  [primitiveSource, { layer: 'primitive', component: null, overlay: false }],
  ['tokens/themes/onmars.tokens.json', { layer: 'theme', component: null, overlay: false }],
  ['tokens/themes/material3.tokens.json', { layer: 'theme', component: null, overlay: true }],
  ['tokens/modes/dark.tokens.json', { layer: 'theme', component: null, overlay: true }],
  ['tokens/semantic.tokens.json', { layer: 'semantic', component: null, overlay: false }],
  ['tokens/semantic/material3.tokens.json', { layer: 'semantic', component: null, overlay: true }],
  [
    'tokens/component/button.tokens.json',
    { layer: 'component', component: 'button', overlay: false },
  ],
  [
    'tokens/component/radio-group.material3.tokens.json',
    { layer: 'component', component: 'radio-group', overlay: true },
  ],
])('classifies %s', (sourcePath, expected) => {
  expect(sourceMetadata(sourcePath)).toEqual(expected);
});

it('rejects token sources outside the closed source taxonomy', () => {
  expect(() => sourceMetadata('tokens/unknown.tokens.json')).toThrowError(
    'unsupported-token-source tokens/unknown.tokens.json',
  );
});

it('orders includes before sources without mutating either list', () => {
  const include = ['tokens/primitive.tokens.json'];
  const source = ['tokens/semantic.tokens.json'];

  expect(orderedSources({ include, source })).toEqual([...include, ...source]);
  expect(include).toEqual(['tokens/primitive.tokens.json']);
  expect(source).toEqual(['tokens/semantic.tokens.json']);
});

it('treats omitted include and source arrays as empty', () => {
  expect(orderedSources({})).toEqual([]);
});

it.each([
  [{ include: 'tokens/primitive.tokens.json', source: [] }],
  [{ include: [], source: 'tokens/semantic.tokens.json' }],
])('rejects non-array Style Dictionary source declarations', (config) => {
  expect(() => orderedSources(config)).toThrowError('include/source must be arrays');
});

it('accepts a component overlay only after its exact base', () => {
  expect(() =>
    assertBaseBeforeOverride([
      'tokens/component/button.tokens.json',
      'tokens/component/button.material3.tokens.json',
    ]),
  ).not.toThrow();
});

it.each([
  [['tokens/component/button.material3.tokens.json']],
  [['tokens/component/button.material3.tokens.json', 'tokens/component/button.tokens.json']],
])('rejects a component overlay without an earlier base', (sources) => {
  expect(() => assertBaseBeforeOverride(sources)).toThrowError(
    /override-before-base.*button\.material3/u,
  );
});

it('builds a composition from normalized workspace-relative source records', async () => {
  const reads = [];
  const composition = await buildComposition({
    id: 'fixture-light',
    theme: 'fixture',
    scheme: 'light',
    config: { source: [primitiveSource] },
    workspaceRoot: '/workspace',
    readText: async (path, encoding) => {
      reads.push([path, encoding]);
      return primitiveDocument;
    },
  });

  expect(composition.id).toBe('fixture-light');
  expect(composition.theme).toBe('fixture');
  expect(composition.scheme).toBe('light');
  expect(composition.records).toHaveLength(1);
  expect(composition.records[0].filePath).toBe('packages/tokens/tokens/primitive.tokens.json');
  expect(reads).toEqual([['/workspace/packages/tokens/tokens/primitive.tokens.json', 'utf8']]);
});

it('finds nested CSS files in deterministic order and ignores other entries', async () => {
  const root = await temporaryWorkspace();
  await Promise.all([
    put(root, 'z.css', ''),
    put(root, 'nested/a.css', ''),
    put(root, 'nested/ignored.txt', ''),
  ]);

  expect(await cssFilesBelow(root)).toEqual([join(root, 'nested/a.css'), join(root, 'z.css')]);
  expect(await cssFilesBelow(join(root, 'missing'))).toEqual([]);
});

it('formats token diagnostics with related paths and the offending record value', () => {
  const composition = {
    records: [{ path: 'ki.alias', value: '{ki.missing}' }],
  };

  expect(
    issueDiagnostic(
      {
        code: 'unresolved-reference',
        filePath: 'tokens/semantic.tokens.json',
        path: 'ki.alias',
        related: ['ki.missing'],
      },
      composition,
    ),
  ).toBe('unresolved-reference tokens/semantic.tokens.json ki.alias ki.missing "{ki.missing}"');
});

it('formats token diagnostics even when no matching record exists', () => {
  expect(
    issueDiagnostic(
      { code: 'duplicate-token', filePath: 'a.json', path: 'ki.x', related: [] },
      { records: [] },
    ),
  ).toBe('duplicate-token a.json ki.x');
});

it('reports unresolved, forbidden-layer, motion, and visual CSS literals', () => {
  const records = new Map([
    ['--ki-primitive', { layer: 'primitive' }],
    ['--ki-theme', { layer: 'theme' }],
    ['--ki-semantic', { layer: 'semantic' }],
  ]);
  const contents = `
    color: var(--KI-UNRESOLVED);
    border-color: var(--ki-primitive);
    background: var(--ki-theme);
    outline-color: var(--ki-semantic);
    transition: 120ms;
    animation-duration: 0.5s;
    box-shadow: #abc;
    fill: rgb(1 2 3);
    stroke: hsla(0 0% 0% / 50%);
  `;

  expect(
    collectCssIssues('/workspace/components/a.css', contents, records, {
      workspaceRoot: '/workspace',
    }),
  ).toEqual([
    'unresolved-css-token components/a.css --ki-unresolved',
    'primitive-css-consumption components/a.css --ki-primitive',
    'theme-css-consumption components/a.css --ki-theme',
    'hardcoded-motion-literal components/a.css 120ms',
    'hardcoded-motion-literal components/a.css 0.5s',
    'hardcoded-visual-literal components/a.css #abc',
    'hardcoded-visual-literal components/a.css rgb(1 2 3)',
    'hardcoded-visual-literal components/a.css hsla(0 0% 0% / 50%)',
  ]);
});

it('checks all four configured compositions with the injected config and reader', async () => {
  const loaded = [];
  const reads = [];
  const result = await checkTokens({
    workspaceRoot: '/workspace',
    loadConfig: async (href) => {
      loaded.push(href);
      return fourConfigs;
    },
    readText: async (path) => {
      reads.push(path);
      return primitiveDocument;
    },
  });

  expect(result.compositions.map(({ id }) => id)).toEqual([
    'onmars-light',
    'onmars-dark',
    'material3-light',
    'material3-dark',
  ]);
  expect(result.recordsByCssName.size).toBe(1);
  expect(result.diagnostics).toEqual([]);
  expect(loaded).toHaveLength(1);
  expect(loaded[0]).toMatch(/style-dictionary\.config\.mjs\?contract=\d+$/u);
  expect(reads).toHaveLength(4);
});

it('fails closed when any required composition is absent', async () => {
  await expect(
    checkTokens({
      workspaceRoot: '/workspace',
      loadConfig: async () => ({ ...fourConfigs, material3DarkConfig: undefined }),
      readText: async () => primitiveDocument,
    }),
  ).rejects.toThrowError(
    'missing-composition material3-dark packages/tokens/style-dictionary.config.mjs',
  );
});

it('writes the successful composition and CSS-name counts', async () => {
  const output = [];
  const result = await runTokenCli({
    workspaceRoot: '/workspace',
    stdout: { write: (value) => output.push(value) },
    loadConfig: async () => fourConfigs,
    readText: async () => primitiveDocument,
  });

  expect(result.diagnostics).toEqual([]);
  expect(output).toEqual(['PASS tokens: 4 compositions, 1 CSS names\n']);
});

it('deduplicates and sorts diagnostics before setting a failing exit code', async () => {
  const root = await temporaryWorkspace();
  await put(
    root,
    'packages/elements/src/components/ki-a/a.css',
    'color: #fff; background: #fff;\n',
  );
  const errors = [];
  const exitCodes = [];

  const result = await runTokenCli({
    workspaceRoot: root,
    stderr: { write: (value) => errors.push(value) },
    setExitCode: (value) => exitCodes.push(value),
    loadConfig: async () => fourConfigs,
    readText: async (path) =>
      path.endsWith('.css') ? 'color: #fff; background: #fff;\n' : primitiveDocument,
  });

  expect(result.diagnostics).toEqual([
    'hardcoded-visual-literal packages/elements/src/components/ki-a/a.css #fff',
    'hardcoded-visual-literal packages/elements/src/components/ki-a/a.css #fff',
  ]);
  expect(errors).toEqual([
    'check-tokens: hardcoded-visual-literal packages/elements/src/components/ki-a/a.css #fff\n',
  ]);
  expect(exitCodes).toEqual([1]);
});
