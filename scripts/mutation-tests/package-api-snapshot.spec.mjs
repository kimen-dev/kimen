import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { it, onTestFinished } from 'vitest';

import { checkPackageApi } from '../gates/check-package-api.mjs';
import {
  buildPackageApiSnapshot,
  describeSnapshotChanges,
  GENERATIVE_PACKAGES,
} from '../lib/package-api-snapshot.mjs';

// The daily mutation run executes this directory only, so the cases of
// scripts/tests/package-api-snapshot.test.mjs are repeated here on the runner
// it uses, followed by the ones that pin details a mutant can change without
// breaking those.

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

async function writeDeclarations(root, declarations, directory = 'packages/fixture') {
  for (const [path, contents] of Object.entries(declarations)) {
    await put(root, join(directory, path), contents);
  }
}

async function aRepository(declarations = baseDeclarations) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-package-api-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
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

const check = (root, options = {}) =>
  checkPackageApi({ root, packages: [fixturePackage], ...options });

async function aSnapshottedRepository(declarations) {
  const root = await aRepository(declarations);
  await check(root, { write: true });
  return root;
}

const readSnapshot = async (root) =>
  JSON.parse(await readFile(join(root, fixturePackage.snapshot), 'utf8'));

const snapshotOf = async (root, dataExports = {}) =>
  buildPackageApiSnapshot({
    name: '@kimen/fixture',
    packageRoot: join(root, 'packages/fixture'),
    packageJson: JSON.parse(await readFile(join(root, 'packages/fixture/package.json'), 'utf8')),
    dataExports,
  });

it('the snapshot records every exported name with its kinds and signature', async () => {
  const root = await aSnapshottedRepository();

  const snapshot = await readSnapshot(root);

  assert.equal(snapshot.package, '@kimen/fixture');
  assert.deepEqual(Object.keys(snapshot.modules), ['.']);
  assert.equal(snapshot.modules['.'].declaration, './dist/index.d.ts');
  assert.equal(snapshot.modules['.'].target, './dist/index.js');
  assert.deepEqual(snapshot.modules['.'].symbols, {
    PROTOCOL_VERSION: {
      kinds: ['value'],
      signature: 'export declare const PROTOCOL_VERSION = "1.0";',
    },
    RenderOptions: {
      kinds: ['type'],
      signature: 'interface RenderOptions {\n    readonly budget?: number;\n}',
    },
    render: {
      kinds: ['value'],
      signature: 'export declare function render(spec: unknown, options?: RenderOptions): boolean;',
    },
  });
});

it('writes canonical JSON and creates the snapshot folder', async () => {
  const root = await aRepository();

  assert.deepEqual(await check(root, { write: true }), { problems: [] });

  const text = await readFile(join(root, fixturePackage.snapshot), 'utf8');
  assert.equal(text, `${JSON.stringify(JSON.parse(text), null, 2)}\n`);
});

it('an unchanged surface passes', async () => {
  const root = await aSnapshottedRepository();

  assert.deepEqual(await check(root), { problems: [] });
});

it('a removed export fails with a message that names it and the fix', async () => {
  const root = await aSnapshottedRepository();
  await writeDeclarations(root, {
    'dist/index.d.ts': [
      "export { render } from './render.js';",
      "export type { RenderOptions } from './render.js';",
      '',
    ].join('\n'),
  });

  assert.deepEqual(await check(root), {
    problems: [
      '@kimen/fixture: the public API changed (removed PROTOCOL_VERSION) but changes/api/packages/fixture.json did not; review the change, run `pnpm api:snapshot` and commit the snapshot with it',
    ],
  });
});

it('a renamed export fails and names the old and the new name', async () => {
  const root = await aSnapshottedRepository();
  await writeDeclarations(root, {
    'dist/index.d.ts': baseDeclarations['dist/index.d.ts'].replace(
      'export { render }',
      'export { render as renderSpec }',
    ),
  });

  const [problem] = (await check(root)).problems;

  assert.match(problem, /\(removed render; added renderSpec\)/u);
});

it('a changed signature fails and names only that symbol', async () => {
  const root = await aSnapshottedRepository();
  await writeDeclarations(root, {
    'dist/render.d.ts': baseDeclarations['dist/render.d.ts'].replace(
      'readonly budget?: number;',
      'readonly budget: number;',
    ),
  });

  const [problem] = (await check(root)).problems;

  assert.match(problem, /\(changed RenderOptions\)/u);
});

it('a changed literal value of an exported constant fails', async () => {
  const root = await aSnapshottedRepository();
  await writeDeclarations(root, {
    'dist/index.d.ts': baseDeclarations['dist/index.d.ts'].replace('"1.0"', '"1.1"'),
  });

  const [problem] = (await check(root)).problems;

  assert.match(problem, /\(changed PROTOCOL_VERSION\)/u);
});

it('writing the snapshot makes a changed surface pass', async () => {
  const root = await aSnapshottedRepository();
  await writeDeclarations(root, {
    'dist/index.d.ts': `${baseDeclarations['dist/index.d.ts']}export declare const EXTRA = 1;\n`,
  });
  assert.equal((await check(root)).problems.length, 1);

  await check(root, { write: true });

  assert.deepEqual(await check(root), { problems: [] });
  assert.deepEqual((await readSnapshot(root)).modules['.'].symbols.EXTRA, {
    kinds: ['value'],
    signature: 'export declare const EXTRA = 1;',
  });
});

it('a missing committed snapshot fails and says how to write it', async () => {
  const root = await aRepository();

  assert.deepEqual(await check(root), {
    problems: [
      '@kimen/fixture: no committed snapshot at changes/api/packages/fixture.json; run `pnpm api:snapshot` and commit it',
    ],
  });
});

it('a committed snapshot with the same content but other bytes fails', async () => {
  const root = await aSnapshottedRepository();
  const path = join(root, fixturePackage.snapshot);
  await writeFile(path, JSON.stringify(JSON.parse(await readFile(path, 'utf8'))), 'utf8');

  const [problem] = (await check(root)).problems;

  assert.match(problem, /\(the snapshot bytes differ\)/u);
});

it('a committed snapshot that cannot be read is an error, not a missing file', async () => {
  const root = await aRepository();
  await mkdir(join(root, fixturePackage.snapshot), { recursive: true });

  await assert.rejects(check(root), /EISDIR/u);
});

it('checks each package of the list, in order', async () => {
  const root = await aSnapshottedRepository();
  await writeDeclarations(root, baseDeclarations, 'packages/other');
  await put(
    root,
    'packages/other/package.json',
    `${JSON.stringify({
      name: '@kimen/other',
      version: '0.0.0',
      exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
    })}\n`,
  );
  const other = {
    name: '@kimen/other',
    directory: 'packages/other',
    snapshot: 'changes/api/packages/other.json',
    dataExports: {},
  };

  const { problems } = await checkPackageApi({ root, packages: [fixturePackage, other] });

  assert.equal(problems.length, 1);
  assert.match(problems[0], /^@kimen\/other: no committed snapshot/u);
});

it('the package name must match its package.json', async () => {
  const root = await aRepository();
  const packages = [{ ...fixturePackage, name: '@kimen/elsewhere' }];

  await assert.rejects(checkPackageApi({ root, packages }), /@kimen\/elsewhere/u);
});

for (const [label, declarations] of [
  [
    'a type of another file that the entry point does not re-export',
    { 'dist/index.d.ts': "export { render } from './render.js';\n" },
  ],
  [
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
  [
    'a heritage clause',
    {
      'dist/index.d.ts': [
        "import type { RenderOptions } from './render.js';",
        'export interface StrictOptions extends RenderOptions {',
        '    readonly strict: true;',
        '}',
        '',
      ].join('\n'),
    },
  ],
  [
    'a type query of a value',
    {
      'dist/index.d.ts': [
        "import { render } from './render.js';",
        'export declare const renderer: typeof render;',
        '',
      ].join('\n'),
    },
  ],
  [
    'a type reached only through another unexported type',
    {
      'dist/index.d.ts': [
        "import type { RenderOptions } from './render.js';",
        'interface Wrapper {',
        '    readonly options: RenderOptions;',
        '}',
        'export declare function wrap(): Wrapper;',
        'export {};',
        '',
      ].join('\n'),
    },
  ],
]) {
  it(`a public signature that reaches ${label} is rejected with its name and file`, async () => {
    const root = await aRepository({ ...baseDeclarations, ...declarations });

    await assert.rejects(
      check(root, { write: true }),
      (error) =>
        error instanceof Error &&
        error.message.startsWith('@kimen/fixture: public signatures reach ') &&
        /\b(?:RenderOptions|render) \(dist\/(?:index|render)\.d\.ts\)/u.test(error.message) &&
        error.message.endsWith(
          ', which the package does not export. Export each from the entry point, or keep it out of public signatures.',
        ),
    );
  });
}

it('lists every unexported type once, sorted', async () => {
  const root = await aRepository({
    'dist/index.d.ts': [
      'interface Zeta {',
      '    readonly a: Alpha;',
      '}',
      'interface Alpha {',
      '    readonly z: Zeta;',
      '}',
      'export declare function first(): Zeta;',
      'export declare function second(): Alpha;',
      'export {};',
      '',
    ].join('\n'),
  });

  await assert.rejects(
    snapshotOf(root),
    /reach Alpha \(dist\/index\.d\.ts\), Zeta \(dist\/index\.d\.ts\), which/u,
  );
});

it('type parameters, built-in types, dependencies and files outside the package pass', async () => {
  const root = await aRepository({
    'dist/index.d.ts': [
      "import type { Shared } from '../../shared/types.js';",
      "import type { Remote } from 'remote';",
      'export declare function identity<T>(value: T): Promise<T>;',
      'export declare function shared(value: Shared, remote: Remote): Record<string, Element>;',
      '',
    ].join('\n'),
    'node_modules/remote/package.json': '{ "name": "remote", "types": "./index.d.ts" }\n',
    'node_modules/remote/index.d.ts': 'export interface Remote {\n    readonly id: string;\n}\n',
  });
  await put(root, 'shared/types.d.ts', 'export interface Shared {\n    readonly id: string;\n}\n');

  const snapshot = await snapshotOf(root);

  assert.deepEqual(Object.keys(snapshot.modules['.'].symbols), ['identity', 'shared']);
});

it('a data export is recorded without its value, so a new value passes', async () => {
  const packages = [{ ...fixturePackage, dataExports: { DOCUMENT: 'built from the elements' } }];
  const root = await aRepository({
    'dist/index.d.ts': 'export declare const DOCUMENT = "<!doctype html><p>one</p>";\n',
  });
  await checkPackageApi({ root, packages, write: true });

  const recorded = (await readSnapshot(root)).modules['.'].symbols.DOCUMENT;
  await writeDeclarations(root, {
    'dist/index.d.ts': 'export declare const DOCUMENT = "<!doctype html><p>two</p>";\n',
  });

  assert.deepEqual(recorded, {
    kinds: ['value'],
    signature: 'generated data: built from the elements',
  });
  assert.deepEqual(await checkPackageApi({ root, packages }), { problems: [] });
});

it('a data export must name an exported value', async () => {
  const root = await aRepository();

  for (const name of ['RenderOptions', 'MISSING']) {
    await assert.rejects(
      snapshotOf(root, { [name]: 'not a value' }),
      (error) =>
        error instanceof Error &&
        error.message === `@kimen/fixture: data export ${name} is not an exported value`,
    );
  }
});

it('describes added and removed modules and moved files', () => {
  const symbols = { a: { kinds: ['value'], signature: 'a' } };
  const before = {
    modules: {
      '.': { target: './dist/index.js', declaration: './dist/index.d.ts', symbols },
      './old': { target: './dist/old.js', declaration: './dist/old.d.ts', symbols },
    },
  };
  const after = {
    modules: {
      '.': { target: './dist/main.js', declaration: './dist/index.d.ts', symbols },
      './new': { target: './dist/new.js', declaration: './dist/new.d.ts', symbols },
    },
  };

  assert.deepEqual(describeSnapshotChanges(before, after), [
    'changed the files of module .',
    'added module ./new',
    'removed module ./old',
  ]);
  assert.deepEqual(
    describeSnapshotChanges(
      { modules: { '.': { ...before.modules['.'], declaration: './dist/other.d.ts' } } },
      { modules: { '.': before.modules['.'] } },
    ),
    ['changed the files of module .'],
  );
});

it('names a symbol of another subpath with its subpath, and a kinds change as a change', () => {
  const module = (symbols) => ({
    target: './dist/x.js',
    declaration: './dist/x.d.ts',
    symbols,
  });
  const before = {
    modules: {
      './x': module({
        a: { kinds: ['type'], signature: 's' },
        b: { kinds: ['value'], signature: 'b' },
      }),
    },
  };
  const after = {
    modules: {
      './x': module({
        a: { kinds: ['type', 'value'], signature: 's' },
        c: { kinds: ['value'], signature: 'c' },
      }),
    },
  };

  assert.deepEqual(describeSnapshotChanges(before, after), [
    'changed ./x a',
    'removed ./x b',
    'added ./x c',
  ]);
  assert.deepEqual(describeSnapshotChanges(before, before), []);
});

it('the gate covers the four generative packages with their data exports', () => {
  assert.deepEqual(GENERATIVE_PACKAGES, [
    {
      name: '@kimen/catalog',
      directory: 'packages/catalog',
      snapshot: 'changes/api/packages/catalog.json',
      dataExports: {
        catalogData: 'the catalog generated from the elements manifest, sealed by catalog-sync',
      },
    },
    {
      name: '@kimen/emitter',
      directory: 'packages/emitter',
      snapshot: 'changes/api/packages/emitter.json',
      dataExports: {},
    },
    {
      name: '@kimen/adapter-a2ui',
      directory: 'packages/adapter-a2ui',
      snapshot: 'changes/api/packages/adapter-a2ui.json',
      dataExports: {},
    },
    {
      name: '@kimen/adapter-mcp-apps',
      directory: 'packages/adapter-mcp-apps',
      snapshot: 'changes/api/packages/adapter-mcp-apps.json',
      dataExports: {
        SURFACE_DOCUMENT: 'the surface document built from the elements bundle on every build',
      },
    },
  ]);
  assert.equal(Object.isFrozen(GENERATIVE_PACKAGES), true);
  for (const entry of GENERATIVE_PACKAGES) {
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(Object.isFrozen(entry.dataExports), true);
  }
});
