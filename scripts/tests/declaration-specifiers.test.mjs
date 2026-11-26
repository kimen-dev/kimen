import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
  dropGlyphImports,
  extensionlessRelativeSpecifiers,
  normalizeDeclarationDirectories,
  rebaseDeclarationSpecifiers,
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

// Stencil copies src/ into dist/types/ one directory deeper, so a specifier
// that leaves src/ points one directory short of its file.
const label = '/package/dist/types/components/ki-ai-label/ki-ai-label.d.ts';
const mirror = { outputRoot: '/package/dist/types', sourceRoot: '/package/src' };

test('re-bases a specifier that names a file only the source location answers', () => {
  const result = rebaseDeclarationSpecifiers(
    "import '../../../icons/sparkles.js';\nimport { A } from '../../utils/a.js';\n",
    label,
    mirror,
    present('/package/icons/sparkles.d.ts', '/package/dist/types/utils/a.d.ts'),
  );

  assert.equal(
    result.text,
    "import '../../../../icons/sparkles.js';\nimport { A } from '../../utils/a.js';\n",
  );
  assert.equal(result.rewritten, 1);
});

test('reads the declaration of each runtime extension and a named JSON file as is', () => {
  const result = rebaseDeclarationSpecifiers(
    [
      "import '../../../icons/a.mjs';",
      "import '../../../icons/b.cjs';",
      "import data from '../../../icons/c.json';",
      "import '../../../icons/d.js';",
      '',
    ].join('\n'),
    label,
    mirror,
    present(
      '/package/icons/a.d.mts',
      '/package/icons/b.d.cts',
      '/package/icons/c.json',
      '/package/icons/d.d.ts',
    ),
  );

  assert.equal(result.rewritten, 4);
  assert.match(result.text, /'\.\.\/\.\.\/\.\.\/\.\.\/icons\/c\.json'/u);
});

test('a re-based specifier stays put on a second pass, and a sibling keeps its dot', () => {
  const exists = present('/package/icons/x.d.ts', '/package/dist/types/components/ki-x/y.d.ts');
  const first = rebaseDeclarationSpecifiers(
    "import '../../../icons/x.js';\nimport './y.js';\n",
    '/package/dist/types/components/ki-x/ki-x.d.ts',
    mirror,
    exists,
  );
  const second = rebaseDeclarationSpecifiers(
    first.text,
    '/package/dist/types/components/ki-x/ki-x.d.ts',
    mirror,
    exists,
  );

  assert.equal(first.text, "import '../../../../icons/x.js';\nimport './y.js';\n");
  assert.equal(second.text, first.text);
  assert.equal(second.rewritten, 0);
});

test('re-bases onto a sibling-relative path with a leading dot', () => {
  // dist/types/a.d.ts mirrors src/a.ts; src/sibling.js resolves only in the
  // source, and its re-based path from dist/types/ stays a relative path.
  const result = rebaseDeclarationSpecifiers(
    "import './sibling.js';\n",
    '/package/dist/types/a.d.ts',
    { outputRoot: '/package/dist/types', sourceRoot: '/package/dist/types/nested' },
    present('/package/dist/types/nested/sibling.d.ts'),
  );

  assert.equal(result.text, "import './nested/sibling.js';\n");
});

test('refuses a named specifier that neither location answers, or one with no source root', () => {
  const missing = "import '../../../icons/gone.js';\n";
  for (const roots of [mirror, {}, { outputRoot: '/package/dist/types' }]) {
    assert.throws(
      () => rebaseDeclarationSpecifiers(missing, label, roots, present()),
      (error) =>
        error instanceof Error &&
        error.message ===
          `${label}: relative specifier '../../../icons/gone.js' has no declaration file behind it; refusing to guess`,
    );
  }
});

test('leaves extensionless and package specifiers to the naming pass', () => {
  const source = "import { h } from '@stencil/core';\nexport * from './elsewhere';\n";
  const result = rebaseDeclarationSpecifiers(source, label, mirror, present());

  assert.deepEqual(result, { text: source, rewritten: 0 });
});

test('re-bases only in the directories given a source root, then names files', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-specifiers-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  await writeTree(root, {
    'icons/x.d.ts': 'export {};\n',
    'src/components/ki-x/ki-x.tsx': "import '../../../icons/x.js';\n",
    'dist/types/components/ki-x/ki-x.d.ts':
      "import '../../../icons/x.js';\nimport type { Y } from '../../y';\n",
    'dist/types/y.d.ts': 'export type Y = string;\n',
    'loader/index.d.ts': "export * from '../dist/types/y.js';\n",
  });
  const sourceRoots = { [join(root, 'dist/types')]: join(root, 'src') };

  const report = await normalizeDeclarationDirectories(
    [join(root, 'dist/types'), join(root, 'loader')],
    { sourceRoots },
  );

  assert.deepEqual(report, { declarations: 3, rewrittenFiles: 1, rewrittenSpecifiers: 2 });
  assert.equal(
    await readFile(join(root, 'dist/types/components/ki-x/ki-x.d.ts'), 'utf8'),
    "import '../../../../icons/x.js';\nimport type { Y } from '../../y.js';\n",
  );

  await writeFile(join(root, 'loader/index.d.ts'), "import '../icons/gone.js';\n", 'utf8');
  await assert.rejects(
    normalizeDeclarationDirectories([join(root, 'loader')], { sourceRoots }),
    /'\.\.\/icons\/gone\.js' has no declaration file behind it/u,
  );
});

// The package types every glyph with one declaration behind its `./icons/*`
// export. A relative glyph import in a declaration cannot reach it, and it
// carries no type, so the build drops it.
const glyphs = { ...mirror, glyphRoot: '/package/icons' };

test('drops each glyph side-effect import and keeps every other line as written', () => {
  const result = dropGlyphImports(
    [
      "import '../../../icons/sparkles.js';",
      "import { type EventEmitter } from '../../stencil-public-runtime';",
      'import "../../../icons/x.js";',
      'export type KiAiLabelSize = "sm" | "md";',
      '',
    ].join('\n'),
    label,
    glyphs,
  );

  assert.equal(
    result.text,
    [
      "import { type EventEmitter } from '../../stencil-public-runtime';",
      'export type KiAiLabelSize = "sm" | "md";',
      '',
    ].join('\n'),
  );
  assert.equal(result.rewritten, 2);
});

test('keeps an import with bindings, another side-effect import and a file outside the glyph root', () => {
  const source = [
    "import { registerIcon } from '../../../icons/_registry.js';",
    "import '../../utils/polyfill.js';",
    "import '../../../icons/nested/x.js';",
    "import '../../../icons/_registry.mjs';",
    "import '@kimen/elements/icons/x';",
    '',
  ].join('\n');

  assert.deepEqual(dropGlyphImports(source, label, glyphs), { text: source, rewritten: 0 });
});

test('drops nothing without the output, source and glyph roots', () => {
  const source = "import '../../../icons/x.js';\n";
  for (const roots of [mirror, { ...glyphs, sourceRoot: undefined }, {}]) {
    assert.deepEqual(dropGlyphImports(source, label, roots), { text: source, rewritten: 0 });
  }
});

test('drops the glyph imports of the mirrored directory before re-basing, once', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-glyphs-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  await writeTree(root, {
    'icons/_glyph.d.ts': 'export {};\n',
    'dist/types/components/ki-x/ki-x.d.ts':
      "import '../../../icons/x.js';\nimport type { Y } from '../../y';\n",
    'dist/types/y.d.ts': 'export type Y = string;\n',
  });
  const options = {
    sourceRoots: { [join(root, 'dist/types')]: join(root, 'src') },
    glyphRoot: join(root, 'icons'),
  };

  const report = await normalizeDeclarationDirectories([join(root, 'dist/types')], options);
  const again = await normalizeDeclarationDirectories([join(root, 'dist/types')], options);

  assert.deepEqual(report, { declarations: 2, rewrittenFiles: 1, rewrittenSpecifiers: 2 });
  assert.equal(
    await readFile(join(root, 'dist/types/components/ki-x/ki-x.d.ts'), 'utf8'),
    "import type { Y } from '../../y.js';\n",
  );
  assert.deepEqual(again, { declarations: 2, rewrittenFiles: 0, rewrittenSpecifiers: 0 });
});
