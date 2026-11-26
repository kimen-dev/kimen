import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { it, onTestFinished } from 'vitest';

import {
  DECLARATION_DIRECTORIES,
  DECLARATION_SOURCE_ROOTS,
  GLYPH_DIRECTORY,
  normalizePackageDeclarations,
} from '../../packages/elements/scripts/normalize-declaration-specifiers.mjs';
import {
  dropGlyphImports,
  extensionlessRelativeSpecifiers,
  normalizeDeclarationDirectories,
  rebaseDeclarationSpecifiers,
  rewriteDeclarationSpecifiers,
} from '../lib/declaration-specifiers.mjs';

// The daily mutation run executes this directory only, so the cases of
// scripts/tests/declaration-specifiers.test.mjs are repeated here on the
// runner it uses, followed by the ones that pin details a mutant can change
// without breaking those.

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

const file = '/package/dist/types/components.d.ts';
const present = (...paths) => {
  const known = new Set(paths);
  return (path) => known.has(path);
};

it('names the sibling declaration file an extensionless import points at', () => {
  const result = rewriteDeclarationSpecifiers(
    'import { JSXBase } from "./stencil-public-runtime";\n',
    file,
    present('/package/dist/types/stencil-public-runtime.d.ts'),
  );

  assert.equal(result.text, 'import { JSXBase } from "./stencil-public-runtime.js";\n');
  assert.equal(result.rewritten, 1);
});

it('names the file for every form a declaration uses to reach another module', () => {
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

it('names the index file when the specifier points at a directory', () => {
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

it('prefers the file over a directory that shares its name', () => {
  const result = rewriteDeclarationSpecifiers(
    "import type { Components } from '../types/components';\n",
    '/package/dist/components/ki-badge.d.ts',
    present('/package/dist/types/components.d.ts', '/package/dist/types/components/index.d.ts'),
  );

  assert.equal(result.text, "import type { Components } from '../types/components.js';\n");
});

it('keeps a dotted file name whole and appends the extension after it', () => {
  const result = rewriteDeclarationSpecifiers(
    "import { KiAlertTone } from './ki-alert.tone';\n",
    '/package/dist/types/components/ki-alert/ki-alert.d.ts',
    present('/package/dist/types/components/ki-alert/ki-alert.tone.d.ts'),
  );

  assert.equal(result.text, "import { KiAlertTone } from './ki-alert.tone.js';\n");
});

it('leaves package specifiers and explicit file names exactly as written', () => {
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

it('never rewrites import-shaped text inside comments or string literals', () => {
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

it('a second pass over its own output changes nothing', () => {
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

it('refuses a relative specifier that no declaration file answers', () => {
  assert.throws(
    () => rewriteDeclarationSpecifiers("export * from './missing';\n", file, present()),
    (error) =>
      error instanceof Error &&
      error.message.includes(file) &&
      error.message.includes("'./missing'"),
  );
});

it('lists the extensionless relative specifiers of a declaration in document order', () => {
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

it('normalizes every declaration under the given directories and leaves other files alone', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-specifiers-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
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

it('a directory with no declaration files is a broken build, not an empty success', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-specifiers-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  await mkdir(join(root, 'dist/types'), { recursive: true });

  await assert.rejects(
    normalizeDeclarationDirectories([join(root, 'dist/types')]),
    /no declaration files/iu,
  );
});

it('treats only the four explicit runtime extensions as already named', () => {
  const exists = (path) => path.endsWith('.d.ts');
  for (const explicit of ['./a.js', './a.mjs', './a.cjs', './a.json']) {
    assert.deepEqual(extensionlessRelativeSpecifiers(`export * from '${explicit}';\n`, file), []);
  }
  // A lookalike suffix is not a file name: each of these still needs one.
  for (const implicit of ['./a.jsx', './a.ts', './a.d', './ajs', './a.js.map', './json']) {
    assert.deepEqual(extensionlessRelativeSpecifiers(`export * from '${implicit}';\n`, file), [
      implicit,
    ]);
    assert.equal(
      rewriteDeclarationSpecifiers(`export * from '${implicit}';\n`, file, exists).text,
      `export * from '${implicit}.js';\n`,
    );
  }
});

it('recognises every spelling of a relative specifier and nothing else', () => {
  const source = [
    "export * from '.';",
    "export * from '..';",
    "export * from './a';",
    "export * from '../a';",
    "export * from '.hidden';",
    "export * from '..hidden/a';",
    "export * from 'a/./b';",
    "export * from '/absolute/a';",
    '',
  ].join('\n');

  assert.deepEqual(extensionlessRelativeSpecifiers(source, file), ['.', '..', './a', '../a']);
});

it('ignores import-shaped nodes that carry no string literal', () => {
  const source = [
    'export declare const a: number;',
    'export { a as b };',
    'export type C = typeof import.meta;',
    'import d = Namespace.Member;',
    'declare namespace Namespace { const Member: number; }',
    '',
  ].join('\n');

  assert.deepEqual(extensionlessRelativeSpecifiers(source, file), []);
  assert.deepEqual(
    rewriteDeclarationSpecifiers(source, file, () => false),
    {
      text: source,
      rewritten: 0,
    },
  );
});

it('resolves the specifier against the directory of the file that holds it', () => {
  const seen = [];
  const result = rewriteDeclarationSpecifiers(
    "export * from '../shared/a';\n",
    '/package/dist/components/ki-badge.d.ts',
    (path) => {
      seen.push(path);
      return path === '/package/dist/shared/a.d.ts';
    },
  );

  assert.equal(result.text, "export * from '../shared/a.js';\n");
  assert.deepEqual(seen, ['/package/dist/shared/a.d.ts']);
});

it('a trailing slash always means the directory, even beside a file of that name', () => {
  const seen = [];
  const result = rewriteDeclarationSpecifiers("export * from './utils/';\n", file, (path) => {
    seen.push(path);
    return true;
  });

  assert.equal(result.text, "export * from './utils/index.js';\n");
  assert.deepEqual(seen, ['/package/dist/types/utils/index.d.ts']);
});

it('keeps each quote style and every character outside the specifiers', () => {
  const source = [
    '/* header */ import type { A } from "./a"; // trailing',
    "export   *   from   './b'  ;",
    'export type C = import(  "./c"  ).C;',
    '',
  ].join('\n');

  const result = rewriteDeclarationSpecifiers(source, file, () => true);

  assert.equal(
    result.text,
    [
      '/* header */ import type { A } from "./a.js"; // trailing',
      "export   *   from   './b.js'  ;",
      'export type C = import(  "./c.js"  ).C;',
      '',
    ].join('\n'),
  );
  assert.equal(result.rewritten, 3);
});

it('the default lookup accepts a declaration file and rejects a directory of that name', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-specifiers-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  await writeTree(root, {
    'types/entry.d.ts': "export * from './real';\nexport * from './folder';\n",
    'types/real.d.ts': 'export {};\n',
    'types/folder.d.ts/placeholder.txt': 'a directory that only looks like a declaration\n',
    'types/folder/index.d.ts': 'export {};\n',
  });
  const entry = join(root, 'types/entry.d.ts');

  const result = rewriteDeclarationSpecifiers(await readFile(entry, 'utf8'), entry);

  assert.equal(result.text, "export * from './real.js';\nexport * from './folder/index.js';\n");
});

it('walks nested directories, skips non-declarations and visits files in a stable order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-specifiers-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  await writeTree(root, {
    'types/z.d.ts': "export * from './a';\n",
    'types/a.d.ts': 'export {};\n',
    'types/nested/deep/b.d.ts': "export * from '../../a';\n",
    'types/notes.d.ts.txt': "export * from './missing';\n",
    'types/code.ts': "export * from './missing';\n",
    'types/styles.d.tsx': "export * from './missing';\n",
  });

  const report = await normalizeDeclarationDirectories([join(root, 'types')]);

  assert.deepEqual(report, { declarations: 3, rewrittenFiles: 2, rewrittenSpecifiers: 2 });
  assert.equal(
    await readFile(join(root, 'types/nested/deep/b.d.ts'), 'utf8'),
    "export * from '../../a.js';\n",
  );
  assert.equal(await readFile(join(root, 'types/code.ts'), 'utf8'), "export * from './missing';\n");
});

it('names the directory that produced no declarations', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-specifiers-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  await writeTree(root, { 'full/a.d.ts': 'export {};\n', 'empty/readme.txt': 'nothing here\n' });

  await assert.rejects(
    normalizeDeclarationDirectories([join(root, 'full'), join(root, 'empty')]),
    (error) =>
      error instanceof Error &&
      error.message ===
        `${join(root, 'empty')}: no declaration files found; build the package first`,
  );
});

it('the elements build pass covers exactly the three directories that ship declarations', async () => {
  assert.deepEqual([...DECLARATION_DIRECTORIES], ['dist/types', 'dist/components', 'loader']);
  assert.equal(Object.isFrozen(DECLARATION_DIRECTORIES), true);

  const packageRoot = await mkdtemp(join(tmpdir(), 'kimen-declaration-package-'));
  onTestFinished(() => rm(packageRoot, { force: true, recursive: true }));
  await writeTree(packageRoot, {
    'dist/types/components.d.ts': 'import { JSXBase } from "./stencil-public-runtime";\n',
    'dist/types/stencil-public-runtime.d.ts': 'export declare namespace JSXBase {}\n',
    'dist/components/ki-badge.d.ts': 'import type { Components } from "../types/components";\n',
    'loader/index.d.ts': "export * from '../dist/types/components';\n",
    'dist/collection/untouched.d.ts': "export * from './left-alone';\n",
  });

  const report = await normalizePackageDeclarations({ packageRoot, workspaceRoot });

  assert.deepEqual(report, { declarations: 4, rewrittenFiles: 3, rewrittenSpecifiers: 3 });
  assert.equal(
    await readFile(join(packageRoot, 'loader/index.d.ts'), 'utf8'),
    "export * from '../dist/types/components.js';\n",
  );
  assert.equal(
    await readFile(join(packageRoot, 'dist/collection/untouched.d.ts'), 'utf8'),
    "export * from './left-alone';\n",
  );
});

// Re-basing: Stencil copies src/ into dist/types/ one directory deeper, so a
// specifier that leaves src/ points one directory short of its file. The
// cases of scripts/tests/declaration-specifiers.test.mjs, then the details.
const label = '/package/dist/types/components/ki-ai-label/ki-ai-label.d.ts';
const mirror = { outputRoot: '/package/dist/types', sourceRoot: '/package/src' };

it('re-bases a specifier that names a file only the source location answers', () => {
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

it('reads the declaration of each runtime extension and a named JSON file as is', () => {
  const answers = {
    'a.mjs': 'a.d.mts',
    'b.cjs': 'b.d.cts',
    'c.json': 'c.json',
    'd.js': 'd.d.ts',
  };
  for (const [file, declaration] of Object.entries(answers)) {
    const result = rebaseDeclarationSpecifiers(
      `import '../../../icons/${file}';\n`,
      label,
      mirror,
      present(`/package/icons/${declaration}`),
    );
    assert.equal(result.text, `import '../../../../icons/${file}';\n`);
  }
  // A runtime file is not its own declaration.
  for (const file of ['a.mjs', 'b.cjs', 'd.js']) {
    assert.throws(() =>
      rebaseDeclarationSpecifiers(
        `import '../../../icons/${file}';\n`,
        label,
        mirror,
        present(`/package/icons/${file}`),
      ),
    );
  }
});

it('a re-based specifier stays put on a second pass, and a sibling keeps its dot', () => {
  const owner = '/package/dist/types/components/ki-x/ki-x.d.ts';
  const exists = present('/package/icons/x.d.ts', '/package/dist/types/components/ki-x/y.d.ts');
  const first = rebaseDeclarationSpecifiers(
    "import '../../../icons/x.js';\nimport './y.js';\n",
    owner,
    mirror,
    exists,
  );
  const second = rebaseDeclarationSpecifiers(first.text, owner, mirror, exists);

  assert.equal(first.text, "import '../../../../icons/x.js';\nimport './y.js';\n");
  assert.equal(second.text, first.text);
  assert.equal(second.rewritten, 0);
});

it('re-bases onto a sibling-relative path with a leading dot', () => {
  const result = rebaseDeclarationSpecifiers(
    "import './sibling.js';\n",
    '/package/dist/types/a.d.ts',
    { outputRoot: '/package/dist/types', sourceRoot: '/package/dist/types/nested' },
    present('/package/dist/types/nested/sibling.d.ts'),
  );

  assert.equal(result.text, "import './nested/sibling.js';\n");
});

it('refuses a named specifier that neither location answers, or one with no source root', () => {
  const missing = "import '../../../icons/gone.js';\n";
  for (const roots of [mirror, {}, undefined, { outputRoot: '/package/dist/types' }]) {
    assert.throws(
      () => rebaseDeclarationSpecifiers(missing, label, roots, present()),
      (error) =>
        error instanceof Error &&
        error.message ===
          `${label}: relative specifier '../../../icons/gone.js' has no declaration file behind it; refusing to guess`,
    );
  }
  // With only a source root, nothing mirrors: the output location must answer.
  assert.throws(() =>
    rebaseDeclarationSpecifiers(
      missing,
      label,
      { sourceRoot: '/package/src' },
      present('/package/icons/gone.d.ts'),
    ),
  );
});

it('leaves extensionless and package specifiers to the naming pass', () => {
  const source = "import { h } from '@stencil/core';\nexport * from './elsewhere';\n";
  const result = rebaseDeclarationSpecifiers(source, label, mirror, present());

  assert.deepEqual(result, { text: source, rewritten: 0 });
});

it('keeps the quote style and every character around a re-based specifier', () => {
  const result = rebaseDeclarationSpecifiers(
    'import "../../../icons/a.js"; // a\nimport \'../../../icons/b.js\';\n',
    label,
    mirror,
    present('/package/icons/a.d.ts', '/package/icons/b.d.ts'),
  );

  assert.equal(
    result.text,
    'import "../../../../icons/a.js"; // a\nimport \'../../../../icons/b.js\';\n',
  );
  assert.equal(result.rewritten, 2);
});

it('the elements build pass re-bases dist/types against src and drops its glyph imports', async () => {
  assert.deepEqual({ ...DECLARATION_SOURCE_ROOTS }, { 'dist/types': 'src' });
  assert.equal(Object.isFrozen(DECLARATION_SOURCE_ROOTS), true);
  assert.equal(GLYPH_DIRECTORY, 'icons');

  const packageRoot = await mkdtemp(join(tmpdir(), 'kimen-declaration-package-'));
  onTestFinished(() => rm(packageRoot, { force: true, recursive: true }));
  await writeTree(packageRoot, {
    'icons/_glyph.d.ts': 'export {};\n',
    'src/utils/a.d.ts': 'export type A = string;\n',
    'dist/types/components/ki-x/ki-x.d.ts':
      "import '../../../icons/x.js';\nimport type { A } from '../../../src/utils/a.js';\n",
    'dist/components/ki-x.d.ts': "export * from '../types/components/ki-x/ki-x.js';\n",
    'loader/index.d.ts': "export * from '../dist/components/ki-x.js';\n",
  });

  const report = await normalizePackageDeclarations({ packageRoot, workspaceRoot });

  assert.deepEqual(report, { declarations: 3, rewrittenFiles: 1, rewrittenSpecifiers: 2 });
  assert.equal(
    await readFile(join(packageRoot, 'dist/types/components/ki-x/ki-x.d.ts'), 'utf8'),
    "import type { A } from '../../../../src/utils/a.js';\n",
  );

  // The same escape outside dist/types has no source to answer it.
  await writeFile(join(packageRoot, 'loader/index.d.ts'), "import '../../icons/x.js';\n", 'utf8');
  await assert.rejects(normalizePackageDeclarations({ packageRoot, workspaceRoot }));
});

// Glyph imports: the cases of scripts/tests/declaration-specifiers.test.mjs,
// then the details.
const glyphs = { ...mirror, glyphRoot: '/package/icons' };

it('drops each glyph side-effect import and keeps every other line as written', () => {
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

it('keeps an import with bindings, another side-effect import and a file outside the glyph root', () => {
  const source = [
    "import { registerIcon } from '../../../icons/_registry.js';",
    "import '../../utils/polyfill.js';",
    "import '../../../icons/nested/x.js';",
    "import '../../../icons/_registry.mjs';",
    "import '@kimen/elements/icons/x';",
    "export * from '../../../icons/x.js';",
    '',
  ].join('\n');

  assert.deepEqual(dropGlyphImports(source, label, glyphs), { text: source, rewritten: 0 });
});

it('drops nothing without the output, source and glyph roots', () => {
  const source = "import '../../../icons/x.js';\n";
  for (const roots of [
    mirror,
    { ...glyphs, sourceRoot: undefined },
    { ...glyphs, outputRoot: undefined },
    {},
    undefined,
  ]) {
    assert.deepEqual(dropGlyphImports(source, label, roots), { text: source, rewritten: 0 });
  }
});

it('reads a glyph import from the source location, not the output one', () => {
  // From dist/types/components/ki-x/ the specifier names /package/dist/icons;
  // from src/components/ki-x/, the glyph root.
  const result = dropGlyphImports(
    "import '../../../icons/x.js';\n",
    '/package/dist/types/components/ki-x/ki-x.d.ts',
    glyphs,
  );
  const outputSide = dropGlyphImports(
    "import '../../icons/x.js';\n",
    '/package/dist/types/components/ki-x/ki-x.d.ts',
    glyphs,
  );

  assert.deepEqual(result, { text: '', rewritten: 1 });
  assert.deepEqual(outputSide, { text: "import '../../icons/x.js';\n", rewritten: 0 });
});

it('removes a glyph import on the last line without a line break, and the next line stays', () => {
  assert.deepEqual(dropGlyphImports("export {};\nimport '../../../icons/x.js';", label, glyphs), {
    text: 'export {};\n',
    rewritten: 1,
  });
  assert.deepEqual(
    dropGlyphImports("import '../../../icons/x.js';\n\nexport {};\n", label, glyphs),
    { text: '\nexport {};\n', rewritten: 1 },
  );
});

it('drops the glyph imports of the mirrored directory before re-basing, once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-declaration-glyphs-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
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
