// The package API gate: an exported name or signature of a generative package
// cannot change unless the committed snapshot changes in the same pull
// request. Each case builds a small package in a temporary folder.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { checkPackageApi } from '../gates/check-package-api.mjs';
import { GENERATIVE_PACKAGES } from '../lib/package-api-snapshot.mjs';

const fixturePackage = Object.freeze({
  name: '@kimen/fixture',
  directory: 'packages/fixture',
  snapshot: 'changes/api/packages/fixture.json',
  dataExports: Object.freeze({}),
});

const baseDeclarations = {
  'dist/index.d.ts': [
    "export { render } from './render.js';",
    "export type { RenderOptions } from './render.js';",
    'export declare const PROTOCOL_VERSION = "1.0";',
    '',
  ].join('\n'),
  'dist/render.d.ts': [
    'export interface RenderOptions {',
    '    readonly budget?: number;',
    '}',
    'export declare function render(spec: unknown, options?: RenderOptions): boolean;',
    '',
  ].join('\n'),
};

async function put(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

async function aRepository(t, declarations = baseDeclarations) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-package-api-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  await put(
    root,
    'packages/fixture/package.json',
    `${JSON.stringify({
      name: '@kimen/fixture',
      version: '0.0.0',
      type: 'module',
      exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
    })}\n`,
  );
  await writeDeclarations(root, declarations);
  return root;
}

async function writeDeclarations(root, declarations) {
  for (const [path, contents] of Object.entries(declarations)) {
    await put(root, join('packages/fixture', path), contents);
  }
}

const check = (root, options = {}) =>
  checkPackageApi({ root, packages: [fixturePackage], ...options });

async function aSnapshottedRepository(t, declarations) {
  const root = await aRepository(t, declarations);
  await check(root, { write: true });
  return root;
}

const readSnapshot = async (root) =>
  JSON.parse(await readFile(join(root, fixturePackage.snapshot), 'utf8'));

test('the snapshot records every exported name with its kinds and signature', async (t) => {
  const root = await aSnapshottedRepository(t);

  const { modules } = await readSnapshot(root);

  assert.deepEqual(Object.keys(modules), ['.']);
  assert.deepEqual(Object.keys(modules['.'].symbols), [
    'PROTOCOL_VERSION',
    'RenderOptions',
    'render',
  ]);
  assert.deepEqual(modules['.'].symbols.render.kinds, ['value']);
  assert.match(modules['.'].symbols.render.signature, /options\?: RenderOptions\): boolean/u);
  assert.deepEqual(modules['.'].symbols.RenderOptions.kinds, ['type']);
  assert.match(modules['.'].symbols.RenderOptions.signature, /readonly budget\?: number/u);
  assert.match(modules['.'].symbols.PROTOCOL_VERSION.signature, /"1\.0"/u);
});

test('an unchanged surface passes', async (t) => {
  const root = await aSnapshottedRepository(t);

  assert.deepEqual(await check(root), { problems: [] });
});

test('a removed export fails and names it', async (t) => {
  const root = await aSnapshottedRepository(t);
  await writeDeclarations(root, {
    'dist/index.d.ts': [
      "export { render } from './render.js';",
      "export type { RenderOptions } from './render.js';",
      '',
    ].join('\n'),
  });

  const { problems } = await check(root);

  assert.equal(problems.length, 1);
  assert.match(problems[0], /@kimen\/fixture/u);
  assert.match(problems[0], /removed PROTOCOL_VERSION/u);
  assert.match(problems[0], /pnpm api:snapshot/u);
});

test('a renamed export fails and names the old and the new name', async (t) => {
  const root = await aSnapshottedRepository(t);
  await writeDeclarations(root, {
    'dist/index.d.ts': baseDeclarations['dist/index.d.ts'].replace(
      'export { render }',
      'export { render as renderSpec }',
    ),
  });

  const [problem] = (await check(root)).problems;

  assert.match(problem, /removed render\b/u);
  assert.match(problem, /added renderSpec\b/u);
});

test('a changed signature fails and names the symbol', async (t) => {
  const root = await aSnapshottedRepository(t);
  await writeDeclarations(root, {
    'dist/render.d.ts': baseDeclarations['dist/render.d.ts'].replace(
      'readonly budget?: number;',
      'readonly budget: number;',
    ),
  });

  const [problem] = (await check(root)).problems;

  assert.match(problem, /changed RenderOptions/u);
  assert.doesNotMatch(problem, /changed render\b/u);
});

test('a changed literal value of an exported constant fails', async (t) => {
  const root = await aSnapshottedRepository(t);
  await writeDeclarations(root, {
    'dist/index.d.ts': baseDeclarations['dist/index.d.ts'].replace('"1.0"', '"1.1"'),
  });

  const [problem] = (await check(root)).problems;

  assert.match(problem, /changed PROTOCOL_VERSION/u);
});

test('writing the snapshot makes a changed surface pass', async (t) => {
  const root = await aSnapshottedRepository(t);
  await writeDeclarations(root, {
    'dist/index.d.ts': `${baseDeclarations['dist/index.d.ts']}export declare const EXTRA = 1;\n`,
  });
  assert.equal((await check(root)).problems.length, 1);

  await check(root, { write: true });

  assert.deepEqual(await check(root), { problems: [] });
  assert.ok(Object.hasOwn((await readSnapshot(root)).modules['.'].symbols, 'EXTRA'));
});

test('a missing committed snapshot fails and says how to write it', async (t) => {
  const root = await aRepository(t);

  const [problem] = (await check(root)).problems;

  assert.match(problem, /changes\/api\/packages\/fixture\.json/u);
  assert.match(problem, /pnpm api:snapshot/u);
});

// A signature names the types it uses, not their members, so a type the entry
// point does not export would change unseen. The gate requires every
// package-local type a public signature reaches to be exported itself.
for (const [label, declarations] of [
  [
    'a type of another file that the entry point does not re-export',
    {
      'dist/index.d.ts': "export { render } from './render.js';\n",
    },
  ],
  [
    // tsc writes `export {};` into a declaration file that keeps a
    // declaration private; without it every declaration would be exported.
    'a module-private interface of the entry point',
    {
      'dist/index.d.ts': [
        'interface RenderOptions {',
        '    readonly budget?: number;',
        '}',
        'export declare function render(options: RenderOptions): void;',
        'export {};',
        '',
      ].join('\n'),
    },
  ],
  [
    'an inline import type',
    {
      'dist/index.d.ts': "export declare function render(): import('./render.js').RenderOptions;\n",
    },
  ],
]) {
  test(`a public signature that reaches ${label} is rejected`, async (t) => {
    const root = await aRepository(t, { ...baseDeclarations, ...declarations });

    await assert.rejects(check(root, { write: true }), /RenderOptions.*not export/su);
  });
}

test('a data export is recorded without its value, so a new value passes', async (t) => {
  const packages = [{ ...fixturePackage, dataExports: { DOCUMENT: 'built from the elements' } }];
  const declarations = {
    'dist/index.d.ts': 'export declare const DOCUMENT = "<!doctype html><p>one</p>";\n',
  };
  const root = await aRepository(t, declarations);
  await checkPackageApi({ root, packages, write: true });

  const { signature } = (await readSnapshot(root)).modules['.'].symbols.DOCUMENT;
  await writeDeclarations(root, {
    'dist/index.d.ts': 'export declare const DOCUMENT = "<!doctype html><p>two</p>";\n',
  });

  assert.doesNotMatch(signature, /doctype/u);
  assert.match(signature, /built from the elements/u);
  assert.deepEqual(await checkPackageApi({ root, packages }), { problems: [] });
});

test('a data export that names no exported value is rejected', async (t) => {
  const root = await aRepository(t);
  const packages = [{ ...fixturePackage, dataExports: { RenderOptions: 'not a value' } }];

  await assert.rejects(
    checkPackageApi({ root, packages, write: true }),
    /RenderOptions.*not an exported value/su,
  );
});

test('the gate covers the four generative packages and nothing else', () => {
  assert.deepEqual(
    GENERATIVE_PACKAGES.map(({ name, directory, snapshot }) => ({ name, directory, snapshot })),
    [
      {
        name: '@kimen/catalog',
        directory: 'packages/catalog',
        snapshot: 'changes/api/packages/catalog.json',
      },
      {
        name: '@kimen/emitter',
        directory: 'packages/emitter',
        snapshot: 'changes/api/packages/emitter.json',
      },
      {
        name: '@kimen/adapter-a2ui',
        directory: 'packages/adapter-a2ui',
        snapshot: 'changes/api/packages/adapter-a2ui.json',
      },
      {
        name: '@kimen/adapter-mcp-apps',
        directory: 'packages/adapter-mcp-apps',
        snapshot: 'changes/api/packages/adapter-mcp-apps.json',
      },
    ],
  );
  assert.equal(Object.isFrozen(GENERATIVE_PACKAGES), true);
});
