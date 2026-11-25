import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { it, onTestFinished } from 'vitest';

import {
  closure,
  decodeSegment,
  encodeValue,
  fileReferences,
  importedSpecifiers,
  locateRuntime,
  OUTPUT_TARGET,
  rewriteRuntimeImports,
  shiftLine,
  shiftSourceMap,
  VENDOR_DIRECTORY,
  vendoredLayout,
  vendorRuntime,
} from '../../packages/react/scripts/vendor-runtime.mjs';

// The daily mutation run executes this directory only, so the cases of
// packages/react/scripts/vendor-runtime.test.mjs are repeated here on the
// runner it uses, followed by the ones that pin details a mutant can change
// without breaking those.

const TARGET = 'node_modules/@stencil/react-output-target';
const encode = (lines) =>
  lines
    .map((segments) => segments.map((values) => values.map(encodeValue).join('')).join(','))
    .join(';');

async function temporary() {
  const root = await mkdtemp(join(tmpdir(), 'kimen-react-runtime-spec-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  return root;
}

async function writeTree(root, files) {
  for (const [path, contents] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), contents);
  }
}

const targetManifest = (exports) =>
  JSON.stringify({ name: OUTPUT_TARGET, version: '1.8.1', exports });
const RUNTIME_EXPORT = {
  types: './dist/runtime/index.d.ts',
  import: './dist/runtime.js',
  require: './dist/runtime.cjs',
};
const WRAPPER_MODULE = [
  "'use client';",
  "import { createComponent } from '@stencil/react-output-target/runtime';",
  "export const KiExample = createComponent({ tagName: 'ki-example' });",
  '//# sourceMappingURL=ki-example.js.map',
].join('\n');
const WRAPPER_MAP = {
  version: 3,
  file: 'ki-example.js',
  sources: ['../src/ki-example.ts'],
  names: [],
  mappings: encode([
    [[0, 0, 0, 0]],
    [
      [0, 0, 1, 0],
      [32, 0, 0, 32],
      [38, 0, 0, 38],
    ],
    [[0, 0, 1, -70]],
  ]),
  // tsc embeds the source, which still imports the output target: the pass
  // re-points the compiled module, never the source it came from.
  sourcesContent: [
    "'use client';\nimport { createComponent } from '@stencil/react-output-target/runtime';\n",
  ],
};

async function wrapperPackage({ dependencies = { '@lit/react': '1.0.8' }, files = {} } = {}) {
  const root = await temporary();
  await writeTree(root, {
    'package.json': JSON.stringify({
      name: '@kimen/react',
      dependencies,
      peerDependencies: { react: '^19' },
    }),
    [`${TARGET}/package.json`]: targetManifest({ './runtime': RUNTIME_EXPORT }),
    [`${TARGET}/dist/runtime.cjs`]: 'module.exports = {};\n',
    [`${TARGET}/dist/runtime.js`]:
      'import { c as r } from "./create-component-AbC1.js";\nexport { r as createComponent };\n//# sourceMappingURL=runtime.js.map\n',
    [`${TARGET}/dist/runtime.js.map`]: '{"version":3,"sources":[],"mappings":";"}',
    [`${TARGET}/dist/create-component-AbC1.js`]:
      'import n from "react";\nimport { createComponent as h } from "@lit/react";\nexport { h as c };\n//# sourceMappingURL=create-component-AbC1.js.map\n',
    [`${TARGET}/dist/create-component-AbC1.js.map`]:
      '{"version":3,"sources":["a.ts"],"mappings":"AAAA"}',
    [`${TARGET}/dist/runtime/index.d.ts`]:
      "export type { EventName } from '@lit/react';\nexport { createComponent } from './create-component.js';\n",
    [`${TARGET}/dist/runtime/create-component.d.ts`]:
      "import { default as React } from 'react';\nexport declare const createComponent: () => React.FC;\n",
    'dist/ki-example.js': WRAPPER_MODULE,
    'dist/ki-example.js.map': JSON.stringify(WRAPPER_MAP),
    'dist/ki-example.d.ts':
      'import type { StencilReactComponent } from "@stencil/react-output-target/runtime";\nexport declare const KiExample: StencilReactComponent<HTMLElement>;\n',
    'dist/index.js': "export * from './ki-example.js';\n",
    ...files,
  });
  return root;
}

it('decodes and encodes base64 VLQ values, signs and continuations', () => {
  assert.deepEqual(decodeSegment('AAAA'), [0, 0, 0, 0]);
  assert.deepEqual(decodeSegment('CADgB'), [1, 0, -1, 16]);
  assert.deepEqual(decodeSegment('sC'), [38]);
  assert.deepEqual(decodeSegment('/+//B'), [-1048559]);
  assert.deepEqual(decodeSegment('6/B'), [1021]);
  assert.deepEqual(decodeSegment(''), []);
  assert.equal(encodeValue(0), 'A');
  assert.equal(encodeValue(1), 'C');
  assert.equal(encodeValue(-1), 'D');
  assert.equal(encodeValue(15), 'e');
  assert.equal(encodeValue(16), 'gB');
  assert.equal(encodeValue(-16), 'hB');
  assert.equal(encodeValue(38), 'sC');
  assert.equal(encodeValue(1000), 'w+B');
  for (const value of [0, 1, -1, 15, 16, -16, 31, 32, 511, 512, -100_000, 1_073_741_823]) {
    assert.deepEqual(decodeSegment(encodeValue(value)), [value]);
  }
  assert.throws(
    () => decodeSegment('A!'),
    (error) => error.message === 'vendor React runtime: invalid source-map digit "!"',
  );
  assert.throws(
    () => decodeSegment('Ag'),
    (error) => error.message === 'vendor React runtime: truncated source-map segment "Ag"',
  );
});

it('moves the generated column of each segment after the specifier, and only those', () => {
  assert.equal(shiftLine('AACA,gCAAgC,sCAAsC', 32, -8), 'AACA,gCAAgC,8BAAsC');
  assert.equal(shiftLine('AACA,gCAAgC,sCAAsC', 32, 5), 'AACA,gCAAgC,2CAAsC');
  // A segment exactly at the specifier stays: it maps the specifier itself.
  assert.equal(shiftLine('AACA,gCAAgC', 32, 5), 'AACA,gCAAgC');
  // Two segments after it: the second keeps its distance from the first.
  assert.equal(shiftLine('AAAA,gCAAgC,sCAAsC,CAAC', 31, -8), 'AAAA,wBAAgC,sCAAsC,CAAC');
  assert.equal(shiftLine('AACA,gCAAgC,sCAAsC', 32, 0), 'AACA,gCAAgC,sCAAsC');
  assert.equal(shiftLine('', 32, -8), '');
  // A single-field segment keeps its single field.
  assert.equal(shiftLine('A,sC', 0, 2), 'A,wC');
});

it('rewrites every import of the runtime subpath, in any quote, and reports each edit', () => {
  const source = [
    "import { createComponent } from '@stencil/react-output-target/runtime';",
    'import type { EventName } from "@stencil/react-output-target/runtime";',
    "import '@stencil/react-output-target/runtime'; import {x} from'@stencil/react-output-target/runtime';",
    "import { renderToString } from '@stencil/react-output-target/ssr';",
    "import { runtime } from '@stencil/react-output-target/runtime-extra';",
    "export const name = '@stencil/react-output-target/runtime';",
    "export * from '@stencil/react-output-target/runtime';",
    'import { y } from \'@stencil/react-output-target/runtime";',
  ].join('\n');

  const { source: rewritten, edits } = rewriteRuntimeImports(source, './copy.js');

  assert.equal(
    rewritten,
    [
      "import { createComponent } from './copy.js';",
      'import type { EventName } from "./copy.js";',
      "import './copy.js'; import {x} from'./copy.js';",
      "import { renderToString } from '@stencil/react-output-target/ssr';",
      "import { runtime } from '@stencil/react-output-target/runtime-extra';",
      "export const name = '@stencil/react-output-target/runtime';",
      "export * from './copy.js';",
      'import { y } from \'@stencil/react-output-target/runtime";',
    ].join('\n'),
  );
  assert.deepEqual(edits, [
    { line: 0, column: 32, delta: -27 },
    { line: 1, column: 31, delta: -27 },
    { line: 2, column: 7, delta: -27 },
    { line: 2, column: 62, delta: -27 },
    { line: 6, column: 14, delta: -27 },
  ]);
  assert.deepEqual(rewriteRuntimeImports('export {};\n', './copy.js'), {
    source: 'export {};\n',
    edits: [],
  });
  assert.equal(
    rewriteRuntimeImports(
      "import a from '@stencil/react-output-target/runtime';",
      './a-much-longer-relative-path-than-the-package-specifier/runtime.js',
    ).edits[0].delta,
    31,
  );
});

it('applies edits right to left on each line they name', () => {
  // Specifiers at 7 and 25 on line 1, and segments at 7, 20, 27 and 40. The
  // first edit would carry 27 below 25 if it ran before the second.
  const line = [
    [7, 0, 1, 0],
    [13, 0, 0, 13],
    [7, 0, 0, 7],
    [13, 0, 0, 13],
  ];
  const map = { file: 'x.js', mappings: encode([[[0, 0, 0, 0]], line]) };
  const edits = [
    { line: 1, column: 7, delta: -3 },
    { line: 1, column: 25, delta: 4 },
  ];

  const shifted = shiftSourceMap(map, edits);

  // 7 stays, 20 becomes 17, 27 becomes 28 and 40 becomes 41.
  assert.deepEqual(shifted, {
    file: 'x.js',
    mappings: encode([
      [[0, 0, 0, 0]],
      [
        [7, 0, 1, 0],
        [10, 0, 0, 13],
        [11, 0, 0, 7],
        [13, 0, 0, 13],
      ],
    ]),
  });
  assert.deepEqual(shiftSourceMap(map, edits.toReversed()), shifted);
  assert.equal(map.mappings, encode([[[0, 0, 0, 0]], line]));
  assert.deepEqual(shiftSourceMap({ file: 'x.js', mappings: 'AAAA' }, []), {
    file: 'x.js',
    mappings: 'AAAA',
  });
  assert.throws(
    () => shiftSourceMap({ file: 'x.js', mappings: 'AAAA' }, [{ line: 1, column: 0, delta: 1 }]),
    (error) => error.message === 'vendor React runtime: the source map of x.js has no line 2',
  );
});

it('names what a file imports and refuses an import() it cannot follow', () => {
  const source = [
    "import a from 'a';",
    'import "./side.js";',
    "export * from './star.js';",
    "export { b } from '@scope/b/sub';",
    "import {c} from'c-tight';",
    "const lazy = () => import( './lazy.js' );",
    "const spaced = () => import ('./spaced.js');",
    'type T = import("@types/t").T;',
    '//# sourceMappingURL=file.js.map',
  ].join('\n');

  assert.deepEqual(importedSpecifiers(source), [
    'a',
    './side.js',
    './star.js',
    '@scope/b/sub',
    'c-tight',
    './lazy.js',
    './spaced.js',
    '@types/t',
  ]);
  assert.deepEqual(fileReferences(source, 'file.js'), {
    specifiers: importedSpecifiers(source),
    sourceMap: 'file.js.map',
  });
  assert.equal(fileReferences('export {};', 'file.js').sourceMap, undefined);
  for (const unlinked of [
    'export {};\n//# sourceMappingURL=a.js.map trailing',
    'export {}; //# sourceMappingURL=a.js.map',
  ]) {
    assert.equal(fileReferences(unlinked, 'file.js').sourceMap, undefined);
  }
  assert.throws(
    () => fileReferences('const load = (name) => import(name);', 'chunk.js'),
    (error) => error.message === 'vendor React runtime: chunk.js imports a module it does not name',
  );
  assert.throws(() => fileReferences('import(`./${name}.js`);', 'chunk.js'), /does not name/u);
});

it('lays the modules beside the module entry and the declarations beside it under its name', () => {
  const runtime = { module: 'dist/runtime.js', types: 'dist/runtime/index.d.ts' };
  const layout = vendoredLayout(
    runtime,
    new Map([
      ['dist/runtime.js', 'm'],
      ['dist/chunks/a.js', 'c'],
    ]),
    new Map([
      ['dist/runtime/index.d.ts', 'd'],
      ['dist/runtime/create-component.d.ts', 'e'],
      ['dist/runtime/deep/types.d.ts', 'f'],
    ]),
  );

  assert.deepEqual(
    [...layout],
    [
      ['runtime.js', 'dist/runtime.js'],
      ['chunks/a.js', 'dist/chunks/a.js'],
      ['runtime.d.ts', 'dist/runtime/index.d.ts'],
      ['create-component.d.ts', 'dist/runtime/create-component.d.ts'],
      ['deep/types.d.ts', 'dist/runtime/deep/types.d.ts'],
    ],
  );
  assert.throws(
    () => vendoredLayout(runtime, new Map([['other/x.js', '']]), new Map()),
    (error) =>
      error.message ===
      "vendor React runtime: other/x.js lies outside the runtime entry's directory",
  );
  assert.throws(
    () =>
      vendoredLayout(
        runtime,
        new Map([['dist/runtime.d.ts', '']]),
        new Map([['dist/runtime/index.d.ts', '']]),
      ),
    (error) =>
      error.message ===
      'vendor React runtime: dist/runtime/index.d.ts and another runtime file would both be runtime.d.ts',
  );
});

it('follows modules, their maps and declarations, and stops where the package does', async () => {
  const root = await temporary();
  await writeTree(root, {
    'dist/entry.js':
      "import './a.js';\nimport 'bare';\nimport 'bare/sub';\nimport '@scope/pkg/deep';\n//# sourceMappingURL=entry.js.map\n",
    'dist/entry.js.map': 'import "./never-followed.js"',
    'dist/a.js': "import './entry.js';\nexport {};\n",
    'dist/types/index.d.ts':
      "export * from './b.js';\nexport * from './c';\nexport * from './d';\nimport 'x';\n",
    // A cycle back to the entry, through a name with three candidates.
    'dist/types/b.d.ts': "import './index.js';\nexport {};\n",
    'dist/types/c.d.ts': 'export {};\n',
    'dist/types/d/index.d.ts': "import '../b.js';\n",
    'dist/escape.js': "import '../../outside.js';\n",
    'dist/broken.js': "import './missing.js';\n",
    'dist/types/maps.d.ts': '//# sourceMappingURL=maps.d.ts.map\nexport {};\n',
  });

  const modules = await closure(root, 'dist/entry.js', 'module');
  assert.deepEqual([...modules.files.keys()], ['dist/entry.js', 'dist/entry.js.map', 'dist/a.js']);
  assert.equal(modules.files.get('dist/a.js').toString(), "import './entry.js';\nexport {};\n");
  assert.deepEqual([...modules.packages], ['bare', '@scope/pkg']);

  const declarations = await closure(root, 'dist/types/index.d.ts', 'declaration');
  assert.deepEqual([...declarations.files.keys()].sort(), [
    'dist/types/b.d.ts',
    'dist/types/c.d.ts',
    'dist/types/d/index.d.ts',
    'dist/types/index.d.ts',
  ]);
  assert.deepEqual([...declarations.packages], ['x']);
  // A declaration's map link is not followed: only modules ship maps here.
  assert.deepEqual(
    [...(await closure(root, 'dist/types/maps.d.ts', 'declaration')).files.keys()],
    ['dist/types/maps.d.ts'],
  );

  await assert.rejects(
    closure(root, 'dist/escape.js', 'module'),
    (error) =>
      error.message ===
      `vendor React runtime: dist/escape.js reaches ../outside.js, outside ${OUTPUT_TARGET}`,
  );
  await assert.rejects(
    closure(root, 'dist/broken.js', 'module'),
    (error) =>
      error.message ===
      `vendor React runtime: ${OUTPUT_TARGET} has no dist/missing.js, which its runtime reaches`,
  );
});

it('finds the installed output target and its runtime entries, or says why not', async () => {
  const root = await wrapperPackage();
  const runtime = await locateRuntime(root);
  assert.deepEqual(
    { ...runtime, directory: runtime.directory.endsWith(TARGET) },
    {
      directory: true,
      version: '1.8.1',
      module: 'dist/runtime.js',
      types: 'dist/runtime/index.d.ts',
    },
  );

  // pnpm's NODE_PATH can reach a stray copy, so the failing package is one
  // that is installed but exports no runtime.
  const unexported = await temporary();
  await writeTree(unexported, {
    'package.json': '{"name":"@kimen/react"}',
    [`${TARGET}/package.json`]: targetManifest({ '.': './dist/index.js' }),
  });
  await assert.rejects(
    locateRuntime(unexported),
    (error) =>
      error.message.startsWith(
        `vendor React runtime: cannot resolve ${OUTPUT_TARGET}/runtime from ${unexported}: `,
      ) && error.message.includes('./runtime'),
  );

  for (const exports of [
    { './runtime': { ...RUNTIME_EXPORT, import: './dist/runtime.mjs' } },
    { './runtime': { ...RUNTIME_EXPORT, import: './dist/runtime.jsx' } },
    { './runtime': { ...RUNTIME_EXPORT, types: './dist/runtime.ts' } },
    { './runtime': { ...RUNTIME_EXPORT, types: './dist/runtime.d.tsx' } },
    { './runtime': { require: './dist/runtime.cjs' } },
    // Reached through a pattern: no './runtime' entry to read.
    { './*': { require: './dist/*.cjs' } },
  ]) {
    const odd = await temporary();
    await writeTree(odd, {
      'package.json': '{"name":"@kimen/react"}',
      [`${TARGET}/package.json`]: targetManifest(exports),
      [`${TARGET}/dist/runtime.cjs`]: '',
    });
    await assert.rejects(
      locateRuntime(odd),
      (error) =>
        error.message ===
        `vendor React runtime: ${OUTPUT_TARGET} 1.8.1 exports no .js module and .d.ts types at ./runtime`,
    );
  }

  // A target without an exports map resolves its subpaths as files.
  const legacy = await temporary();
  await writeTree(legacy, {
    'package.json': '{"name":"@kimen/react"}',
    [`${TARGET}/package.json`]: JSON.stringify({ name: OUTPUT_TARGET, version: '1.0.0' }),
    [`${TARGET}/runtime.js`]: '',
  });
  await assert.rejects(
    locateRuntime(legacy),
    (error) =>
      error.message ===
      `vendor React runtime: ${OUTPUT_TARGET} 1.0.0 exports no .js module and .d.ts types at ./runtime`,
  );

  // A directory of that name holding another package is not the target.
  const impostor = await temporary();
  await writeTree(impostor, {
    'package.json': '{"name":"@kimen/react"}',
    [`${TARGET}/package.json`]: JSON.stringify({
      name: 'someone-else',
      exports: { './runtime': RUNTIME_EXPORT },
    }),
    [`${TARGET}/dist/runtime.cjs`]: '',
  });
  await assert.rejects(
    locateRuntime(impostor),
    (error) =>
      error.message.startsWith(`vendor React runtime: no ${OUTPUT_TARGET} package encloses `) &&
      error.message.endsWith('/dist/runtime.cjs'),
  );

  // A nested package.json inside the target is not the target.
  const nested = await temporary();
  await writeTree(nested, {
    'package.json': '{"name":"@kimen/react"}',
    [`${TARGET}/package.json`]: targetManifest({ './runtime': RUNTIME_EXPORT }),
    [`${TARGET}/dist/package.json`]: '{"type":"module"}',
    [`${TARGET}/dist/runtime.cjs`]: '',
  });
  assert.equal((await locateRuntime(nested)).version, '1.8.1');
});

it('copies the runtime, re-points the wrappers and their maps, and is idempotent', async () => {
  const root = await wrapperPackage({
    files: { [`dist/${VENDOR_DIRECTORY}/stale.js`]: 'left by an older build' },
  });

  const report = await vendorRuntime(root);

  assert.equal(VENDOR_DIRECTORY, 'stencil-runtime');
  assert.deepEqual(report, {
    version: '1.8.1',
    files: [
      'create-component-AbC1.js',
      'create-component-AbC1.js.map',
      'create-component.d.ts',
      'runtime.d.ts',
      'runtime.js',
      'runtime.js.map',
    ],
    repointed: 2,
  });
  const read = (path) => readFile(join(root, path), 'utf8');
  assert.deepEqual((await readdir(join(root, 'dist', VENDOR_DIRECTORY))).sort(), report.files);
  assert.equal(
    await read('dist/ki-example.js'),
    WRAPPER_MODULE.replace(`${OUTPUT_TARGET}/runtime`, './stencil-runtime/runtime.js'),
  );
  assert.equal(
    await read('dist/ki-example.d.ts'),
    'import type { StencilReactComponent } from "./stencil-runtime/runtime.js";\nexport declare const KiExample: StencilReactComponent<HTMLElement>;\n',
  );
  assert.equal(
    await read('dist/ki-example.js.map'),
    JSON.stringify({
      ...WRAPPER_MAP,
      mappings: encode([
        [[0, 0, 0, 0]],
        [
          [0, 0, 1, 0],
          [32, 0, 0, 32],
          [30, 0, 0, 38],
        ],
        [[0, 0, 1, -70]],
      ]),
    }),
  );
  assert.equal(await read('dist/index.js'), "export * from './ki-example.js';\n");
  for (const [copy, original] of [
    ['runtime.js', 'dist/runtime.js'],
    ['runtime.js.map', 'dist/runtime.js.map'],
    ['create-component-AbC1.js', 'dist/create-component-AbC1.js'],
    ['create-component-AbC1.js.map', 'dist/create-component-AbC1.js.map'],
    ['runtime.d.ts', 'dist/runtime/index.d.ts'],
    ['create-component.d.ts', 'dist/runtime/create-component.d.ts'],
  ]) {
    assert.equal(await read(`dist/stencil-runtime/${copy}`), await read(`${TARGET}/${original}`));
  }

  const before = await Promise.all(
    ['dist/ki-example.js', 'dist/ki-example.js.map', 'dist/ki-example.d.ts'].map(read),
  );
  const again = await vendorRuntime(root);
  assert.deepEqual(again, { ...report, repointed: 0 });
  assert.deepEqual(
    await Promise.all(
      ['dist/ki-example.js', 'dist/ki-example.js.map', 'dist/ki-example.d.ts'].map(read),
    ),
    before,
  );
});

it('shifts the map a rewritten file links, declaration maps included, and no other', async () => {
  // The declaration's specifier starts at 31: the segments at 32 and 70 move.
  const declarationMap = { version: 3, file: 'ki-mapped.d.ts', mappings: 'AAAA,gCAAgC,sCAAsC' };
  const root = await wrapperPackage({
    files: {
      'dist/ki-plain.js':
        "import { createComponent } from '@stencil/react-output-target/runtime';\n",
      'dist/ki-plain.js.map': 'not json: a map no file links is never read',
      'dist/ki-mapped.d.ts':
        "import type { EventName } from '@stencil/react-output-target/runtime';\n//# sourceMappingURL=ki-mapped.d.ts.map\n",
      'dist/ki-mapped.d.ts.map': JSON.stringify(declarationMap),
    },
  });

  const report = await vendorRuntime(root);

  assert.equal(report.repointed, 4);
  const read = (path) => readFile(join(root, path), 'utf8');
  assert.equal(
    await read('dist/ki-plain.js'),
    "import { createComponent } from './stencil-runtime/runtime.js';\n",
  );
  assert.equal(await read('dist/ki-plain.js.map'), 'not json: a map no file links is never read');
  assert.equal(
    await read('dist/ki-mapped.d.ts.map'),
    JSON.stringify({ ...declarationMap, mappings: 'AAAA,wBAAgC,sCAAsC' }),
  );
});

it('refuses a runtime that imports a package the wrapper neither depends on nor peers', async () => {
  const root = await wrapperPackage({ dependencies: { '@kimen/elements': '0.2.1' } });

  await assert.rejects(
    vendorRuntime(root),
    (error) =>
      error.message ===
      `vendor React runtime: the ${OUTPUT_TARGET} 1.8.1 runtime imports @lit/react, which @kimen/react neither depends on nor peers`,
  );
  await assert.rejects(readdir(join(root, 'dist', VENDOR_DIRECTORY)), /ENOENT/u);

  const peerless = await wrapperPackage();
  const manifest = JSON.parse(await readFile(join(peerless, 'package.json'), 'utf8'));
  await writeFile(
    join(peerless, 'package.json'),
    JSON.stringify({ name: manifest.name, dependencies: manifest.dependencies }),
  );
  await assert.rejects(vendorRuntime(peerless), /imports react, which/u);

  const neither = await wrapperPackage();
  await writeFile(join(neither, 'package.json'), '{"name":"@kimen/react"}');
  await assert.rejects(vendorRuntime(neither), /imports @lit\/react, react, which/u);
});

it('refuses to publish a file that still imports the output target', async () => {
  const root = await wrapperPackage({
    files: {
      'dist/nested/ki-other.js':
        "import React from 'react';\nimport { x } from '@stencil/react-output-target/ssr';\n",
      'dist/nested/ki-other.d.ts': "export * from '@stencil/react-output-target';\n",
      'dist/nested/notes.txt': "import '@stencil/react-output-target';",
    },
  });

  await assert.rejects(
    vendorRuntime(root),
    (error) =>
      error.message ===
      `vendor React runtime: dist/nested/ki-other.d.ts, dist/nested/ki-other.js still import ${OUTPUT_TARGET}`,
  );
});
