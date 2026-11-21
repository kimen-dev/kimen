import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

import {
  RUNTIME_SPECIFIER,
  VENDORED_RUNTIME,
  relinkModule,
  vendorRuntime,
} from './vendor-stencil-client.mjs';

const elements = new URL('../', import.meta.url);
const components = new URL('dist/components/', elements);
const require = createRequire(new URL('package.json', elements));

// The production bundler of the elements size gate, as icon-modules.test.mjs
// resolves it.
function esbuild() {
  const preset = createRequire(require.resolve('@size-limit/preset-small-lib'));
  return createRequire(preset.resolve('@size-limit/esbuild'))('esbuild');
}

test('integrator feedback 0.1.1 item 7: per-component imports bundle without a warning', async () => {
  const { build } = esbuild();
  const tags = ['ki-switch', 'ki-top-nav', 'ki-radio-group', 'ki-segmented-control'];
  for (const format of ['esm', 'iife']) {
    const result = await build({
      absWorkingDir: new URL('.', elements).pathname,
      bundle: true,
      format,
      logLevel: 'silent',
      minify: true,
      write: false,
      stdin: {
        contents: tags
          .map(
            (tag, index) =>
              `import { defineCustomElement as d${String(index)} } from '@kimen/elements/${tag}';\nd${String(index)}();`,
          )
          .join('\n'),
        resolveDir: new URL('.', elements).pathname,
        sourcefile: 'consumer-entry.js',
      },
    });
    // esbuild read Stencil's lazy-loader import as the empty glob
    // `./**/*.entry.js*` and warned `empty-glob` on every consumer build.
    assert.deepEqual(
      result.warnings.map(({ id, text }) => `${id}: ${text}`),
      [],
      `${format} bundle warned`,
    );
  }
});

test('every per-component module imports the shipped runtime, never Stencil’s', async () => {
  const names = (await readdir(components)).filter((name) => name.endsWith('.js'));
  assert.ok(names.includes(VENDORED_RUNTIME));
  for (const name of names.filter((file) => file !== VENDORED_RUNTIME)) {
    const source = await readFile(new URL(name, components), 'utf8');
    assert.equal(
      source.includes(RUNTIME_SPECIFIER),
      false,
      `${name} still imports Stencil's client`,
    );
  }
  const runtime = await readFile(new URL(VENDORED_RUNTIME, components), 'utf8');
  assert.match(runtime, /\/\* webpackIgnore: true \*\//u);
  assert.equal(runtime.includes('`./${bundleId}.entry.js'), false);
});

test('the pass refuses a Stencil runtime whose lazy import changed shape', () => {
  assert.throws(() => vendorRuntime('export const loadModule = () => import("./x.entry.js");'), {
    message: /expected one lazy-loader import/u,
  });
});

test('relinking names only the shipped runtime and refuses unknown forms', () => {
  assert.equal(
    relinkModule(`import{h as i}from"${RUNTIME_SPECIFIER}";`, 'a.js'),
    `import{h as i}from"./${VENDORED_RUNTIME}";`,
  );
  assert.equal(relinkModule('export const a = 1;', 'b.js'), 'export const a = 1;');
  assert.throws(() => relinkModule(`import(\`${RUNTIME_SPECIFIER}\`);`, 'c.js'), {
    message: /unknown form/u,
  });
});
