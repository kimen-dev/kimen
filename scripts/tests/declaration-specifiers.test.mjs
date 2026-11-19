import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
  extensionlessRelativeSpecifiers,
  normalizeDeclarationDirectories,
  rewriteDeclarationSpecifiers,
} from '../lib/declaration-specifiers.mjs';

const file = '/package/dist/types/components.d.ts';
const present = (...paths) => {
  const known = new Set(paths);
  return (path) => known.has(path);
};

test('names the sibling declaration file an extensionless import points at', () => {
  const result = rewriteDeclarationSpecifiers(
    'import { JSXBase } from "./stencil-public-runtime";\n',
    file,
    present('/package/dist/types/stencil-public-runtime.d.ts'),
  );

  assert.equal(result.text, 'import { JSXBase } from "./stencil-public-runtime.js";\n');
  assert.equal(result.rewritten, 1);
});

test('names the file for every form a declaration uses to reach another module', () => {
  const source = [
    "import type { A } from './a';",
    "export * from '../b';",
    "export { C } from './nested/c';",
    "export type D = import('./d').D;",
    "import e = require('./e');",
    '',
  ].join('\n');

  const result = rewriteDeclarationSpecifiers(
    source,
    file,
    present(
      '/package/dist/types/a.d.ts',
      '/package/dist/b.d.ts',
      '/package/dist/types/nested/c.d.ts',
      '/package/dist/types/d.d.ts',
      '/package/dist/types/e.d.ts',
    ),
  );

  assert.equal(
    result.text,
    [
      "import type { A } from './a.js';",
      "export * from '../b.js';",
      "export { C } from './nested/c.js';",
      "export type D = import('./d.js').D;",
      "import e = require('./e.js');",
      '',
    ].join('\n'),
  );
  assert.equal(result.rewritten, 5);
});

test('names the index file when the specifier points at a directory', () => {
  const exists = present(
    '/package/dist/types/utils/index.d.ts',
    '/package/dist/types/index.d.ts',
    '/package/dist/index.d.ts',
  );

  const result = rewriteDeclarationSpecifiers(
    [
      "export * from './utils';",
      "export * from './utils/';",
      "export * from '.';",
      "export * from '..';",
      '',
    ].join('\n'),
    file,
    exists,
  );

  assert.equal(
    result.text,
    [
      "export * from './utils/index.js';",
      "export * from './utils/index.js';",
      "export * from './index.js';",
      "export * from '../index.js';",
      '',
    ].join('\n'),
  );
});

test('prefers the file over a directory that shares its name', () => {
  const result = rewriteDeclarationSpecifiers(
    "import type { Components } from '../types/components';\n",
    '/package/dist/components/ki-badge.d.ts',
    present('/package/dist/types/components.d.ts', '/package/dist/types/components/index.d.ts'),
  );

  assert.equal(result.text, "import type { Components } from '../types/components.js';\n");
});

test('keeps a dotted file name whole and appends the extension after it', () => {
  const result = rewriteDeclarationSpecifiers(
    "import { KiAlertTone } from './ki-alert.tone';\n",
    '/package/dist/types/components/ki-alert/ki-alert.d.ts',
    present('/package/dist/types/components/ki-alert/ki-alert.tone.d.ts'),
  );

  assert.equal(result.text, "import { KiAlertTone } from './ki-alert.tone.js';\n");
});

test('leaves package specifiers and explicit file names exactly as written', () => {
  const source = [
    'import { h } from "@stencil/core";',
    "import type { A } from './a.js';",
    "import data from './data.json';",
    "export * from './legacy.cjs';",
    "export * from './module.mjs';",
    '',
  ].join('\n');

  const result = rewriteDeclarationSpecifiers(source, file, () => {
    throw new Error('no file lookup is needed for an explicit specifier');
  });

  assert.equal(result.text, source);
  assert.equal(result.rewritten, 0);
});

test('never rewrites import-shaped text inside comments or string literals', () => {
  const source = [
    '/**',
    " * import { KiButton } from './ki-button';",
    ' */',
    'export declare const example = "import x from \'./not-code\'";',
    "export * from './real';",
    '',
  ].join('\n');

  const result = rewriteDeclarationSpecifiers(
    source,
    file,
    present('/package/dist/types/real.d.ts'),
  );

  assert.equal(
    result.text,
    [
      '/**',
      " * import { KiButton } from './ki-button';",
      ' */',
      'export declare const example = "import x from \'./not-code\'";',
      "export * from './real.js';",
      '',
    ].join('\n'),
  );
  assert.equal(result.rewritten, 1);
});

test('a second pass over its own output changes nothing', () => {
  const exists = present('/package/dist/types/a.d.ts', '/package/dist/types/utils/index.d.ts');
  const first = rewriteDeclarationSpecifiers(
    "import type { A } from './a';\nexport * from './utils';\n",
    file,
    exists,
  );

  const second = rewriteDeclarationSpecifiers(first.text, file, exists);

  assert.equal(second.text, first.text);
  assert.equal(second.rewritten, 0);
});

test('refuses a relative specifier that no declaration file answers', () => {
  assert.throws(
    () => rewriteDeclarationSpecifiers("export * from './missing';\n", file, present()),
    (error) =>
      error instanceof Error &&
      error.message.includes(file) &&
      error.message.includes("'./missing'"),
  );
});

test('lists the extensionless relative specifiers of a declaration in document order', () => {
  const source = [
    "import type { A } from './a';",
    "import type { B } from './b.js';",
    "import { h } from '@stencil/core';",
    "export type C = import('../c').C;",
    '',
  ].join('\n');

  assert.deepEqual(extensionlessRelativeSpecifiers(source, file), ['./a', '../c']);
  assert.deepEqual(extensionlessRelativeSpecifiers("export * from './a.js';\n", file), []);
});

async function writeTree(root, files) {
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents, 'utf8');
    }),
  );
}

test('normalizes every declaration under the given directories and leaves other files alone', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-specifiers-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  await writeTree(root, {
    'dist/types/components.d.ts': 'import { JSXBase } from "./stencil-public-runtime";\n',
    'dist/types/stencil-public-runtime.d.ts': 'export declare namespace JSXBase {}\n',
    'dist/components/ki-badge.d.ts': 'import type { Components } from "../types/components";\n',
    'dist/components/ki-badge.js': 'import { h } from "./runtime";\n',
    'loader/index.d.ts': "export * from '../dist/types/components';\n",
  });

  const report = await normalizeDeclarationDirectories([
    join(root, 'dist/types'),
    join(root, 'dist/components'),
    join(root, 'loader'),
  ]);

  assert.deepEqual(report, { declarations: 4, rewrittenFiles: 3, rewrittenSpecifiers: 3 });
  assert.equal(
    await readFile(join(root, 'dist/types/components.d.ts'), 'utf8'),
    'import { JSXBase } from "./stencil-public-runtime.js";\n',
  );
  assert.equal(
    await readFile(join(root, 'dist/components/ki-badge.d.ts'), 'utf8'),
    'import type { Components } from "../types/components.js";\n',
  );
  assert.equal(
    await readFile(join(root, 'loader/index.d.ts'), 'utf8'),
    "export * from '../dist/types/components.js';\n",
  );
  assert.equal(
    await readFile(join(root, 'dist/components/ki-badge.js'), 'utf8'),
    'import { h } from "./runtime";\n',
  );

  const again = await normalizeDeclarationDirectories([
    join(root, 'dist/types'),
    join(root, 'dist/components'),
    join(root, 'loader'),
  ]);

  assert.deepEqual(again, { declarations: 4, rewrittenFiles: 0, rewrittenSpecifiers: 0 });
});

test('a directory with no declaration files is a broken build, not an empty success', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-specifiers-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  await mkdir(join(root, 'dist/types'), { recursive: true });

  await assert.rejects(
    normalizeDeclarationDirectories([join(root, 'dist/types')]),
    /no declaration files/iu,
  );
});
