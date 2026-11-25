import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  closure,
  decodeSegment,
  encodeValue,
  locateRuntime,
  rewriteRuntimeImports,
  shiftLine,
  vendorRuntime,
} from './vendor-runtime.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

async function writeTree(root, files) {
  for (const [path, contents] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), contents);
  }
}

const encode = (lines) =>
  lines
    .map((segments) => segments.map((values) => values.map(encodeValue).join('')).join(','))
    .join(';');

// A wrapper package as tsc leaves it, beside an installed output target
// shaped like @stencil/react-output-target 1.8.1.
const WRAPPER_MODULE = [
  "'use client';",
  "import { createComponent } from '@stencil/react-output-target/runtime';",
  "export const KiExample = createComponent({ tagName: 'ki-example' });",
  '//# sourceMappingURL=ki-example.js.map',
].join('\n');
// Line 2: the statement (col 0), the specifier (col 32) and the semicolon
// after it (col 70); line 3: the declaration (col 0).
const WRAPPER_MAP = {
  version: 3,
  file: 'ki-example.js',
  sourceRoot: '',
  sources: ['../src/ki-example.ts'],
  names: [],
  mappings: encode([
    [[0, 0, 0, 0]],
    [
      [0, 0, 1, 0],
      [32, 0, 0, 32],
      [38, 0, 0, 38],
    ],
    [[0, 0, 2, -70]],
  ]),
  sourcesContent: ['// the wrapper source\n'],
};
const TARGET = 'node_modules/@stencil/react-output-target';

async function fixture(t, { dependencies = { '@lit/react': '1.0.8' }, extra = {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-react-runtime-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  await writeTree(root, {
    'package.json': JSON.stringify({
      name: '@kimen/react',
      dependencies,
      peerDependencies: { react: '^19' },
    }),
    [`${TARGET}/package.json`]: JSON.stringify({
      name: '@stencil/react-output-target',
      version: '1.8.1',
      exports: {
        './runtime': {
          types: './dist/runtime/index.d.ts',
          import: './dist/runtime.js',
          require: './dist/runtime.cjs',
        },
      },
    }),
    [`${TARGET}/dist/runtime.cjs`]: 'module.exports = {};\n',
    [`${TARGET}/dist/runtime.js`]:
      'import { c as r } from "./create-component-AbC1.js";\nexport {\n  r as createComponent\n};\n//# sourceMappingURL=runtime.js.map\n',
    [`${TARGET}/dist/runtime.js.map`]:
      '{"version":3,"sources":[],"sourcesContent":[],"mappings":";"}',
    [`${TARGET}/dist/create-component-AbC1.js`]:
      'import { createComponent as h } from "@lit/react";\nimport n from "react";\nexport { h as c };\n//# sourceMappingURL=create-component-AbC1.js.map\n',
    [`${TARGET}/dist/create-component-AbC1.js.map`]:
      '{"version":3,"sources":["x.ts"],"sourcesContent":["x"],"mappings":"AAAA"}',
    [`${TARGET}/dist/runtime/index.d.ts`]:
      "export type { EventName } from '@lit/react';\nexport { createComponent } from './create-component.js';\n",
    [`${TARGET}/dist/runtime/create-component.d.ts`]:
      "import { default as React } from 'react';\nexport declare const createComponent: () => React.FC;\n",
    [`${TARGET}/dist/runtime/ssr.d.ts`]: 'export {};\n',
    'dist/ki-example.js': WRAPPER_MODULE,
    'dist/ki-example.js.map': JSON.stringify(WRAPPER_MAP),
    'dist/ki-example.d.ts':
      'import type { StencilReactComponent } from "@stencil/react-output-target/runtime";\nexport declare const KiExample: StencilReactComponent<HTMLElement>;\n',
    'dist/index.js': "export * from './ki-example.js';\n",
    ...extra,
  });
  return root;
}

test('VLQ digits decode and encode the source-map way', () => {
  assert.deepEqual(decodeSegment('AAAA'), [0, 0, 0, 0]);
  assert.deepEqual(decodeSegment('CADgB'), [1, 0, -1, 16]);
  assert.deepEqual(decodeSegment('sC'), [38]);
  assert.equal([38, -8, 0, 1000].map(encodeValue).join(''), 'sCRAw+B');
  assert.throws(() => decodeSegment('A!'), /invalid source-map digit "!"/u);
  assert.throws(() => decodeSegment('g'), /truncated source-map segment "g"/u);
});

test('a specifier that changes length moves only the mappings after it', () => {
  assert.equal(shiftLine('AACA,gCAAgC,sCAAsC', 32, -8), 'AACA,gCAAgC,8BAAsC');
  assert.equal(shiftLine('AACA,gCAAgC,sCAAsC', 32, 0), 'AACA,gCAAgC,sCAAsC');
  assert.equal(shiftLine('', 32, -8), '');
});

test('only imports of the runtime subpath are rewritten, keeping their quotes', () => {
  const source = [
    "import { createComponent } from '@stencil/react-output-target/runtime';",
    'import type { EventName } from "@stencil/react-output-target/runtime";',
    "import { renderToString } from '@stencil/react-output-target/ssr';",
    "export const name = '@stencil/react-output-target/runtime';",
  ].join('\n');

  const { source: rewritten, edits } = rewriteRuntimeImports(source, './copy.js');

  assert.equal(
    rewritten,
    [
      "import { createComponent } from './copy.js';",
      'import type { EventName } from "./copy.js";',
      "import { renderToString } from '@stencil/react-output-target/ssr';",
      "export const name = '@stencil/react-output-target/runtime';",
    ].join('\n'),
  );
  assert.deepEqual(edits, [
    { line: 0, column: 32, delta: -27 },
    { line: 1, column: 31, delta: -27 },
  ]);
});

test('the installed output target runtime reaches nothing but @lit/react and React', async () => {
  const runtime = await locateRuntime(packageRoot);
  const modules = await closure(runtime.directory, runtime.module, 'module');
  const declarations = await closure(runtime.directory, runtime.types, 'declaration');

  assert.deepEqual([...modules.packages].sort(), ['@lit/react', 'react']);
  assert.deepEqual([...declarations.packages].sort(), ['@lit/react', 'react']);
});

test('the build copies the runtime and points the wrappers at it, maps included', async (t) => {
  const root = await fixture(t);

  const report = await vendorRuntime(root);

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
  assert.equal(
    await read('dist/ki-example.js'),
    WRAPPER_MODULE.replace('@stencil/react-output-target/runtime', './stencil-runtime/runtime.js'),
  );
  assert.equal(
    await read('dist/ki-example.d.ts'),
    'import type { StencilReactComponent } from "./stencil-runtime/runtime.js";\nexport declare const KiExample: StencilReactComponent<HTMLElement>;\n',
  );
  assert.deepEqual(JSON.parse(await read('dist/ki-example.js.map')), {
    ...WRAPPER_MAP,
    mappings: encode([
      [[0, 0, 0, 0]],
      [
        [0, 0, 1, 0],
        [32, 0, 0, 32],
        [30, 0, 0, 38],
      ],
      [[0, 0, 2, -70]],
    ]),
  });
  for (const [copy, original] of [
    ['runtime.js', 'dist/runtime.js'],
    ['create-component-AbC1.js.map', 'dist/create-component-AbC1.js.map'],
    ['runtime.d.ts', 'dist/runtime/index.d.ts'],
    ['create-component.d.ts', 'dist/runtime/create-component.d.ts'],
  ]) {
    assert.equal(await read(`dist/stencil-runtime/${copy}`), await read(`${TARGET}/${original}`));
  }

  const again = await vendorRuntime(root);

  assert.equal(again.repointed, 0);
  assert.deepEqual(
    (await readdir(join(root, 'dist/stencil-runtime'))).sort(),
    report.files,
    'a second pass leaves the same copy',
  );
});

test('the build stops when the runtime imports a package the wrapper does not install', async (t) => {
  const root = await fixture(t, { dependencies: {} });

  await assert.rejects(
    vendorRuntime(root),
    /runtime imports @lit\/react, which @kimen\/react neither depends on nor peers/u,
  );
});

test('the build stops when a published file still imports the output target', async (t) => {
  const root = await fixture(t, {
    extra: {
      'dist/nested/ki-other.js':
        "import { createComponent } from '@stencil/react-output-target/runtime';\n",
    },
  });

  await assert.rejects(
    vendorRuntime(root),
    /dist\/nested\/ki-other\.js still import @stencil\/react-output-target/u,
  );
});

test('the build stops when the runtime loads a module it does not name', async (t) => {
  const root = await fixture(t, {
    extra: {
      [`${TARGET}/dist/create-component-AbC1.js`]:
        'import { createComponent as h } from "@lit/react";\nexport const c = (name) => import(name);\n',
    },
  });

  await assert.rejects(
    vendorRuntime(root),
    /create-component-AbC1\.js imports a module it does not name/u,
  );
});
