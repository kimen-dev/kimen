import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const elements = new URL('../', import.meta.url);

test('@spec:069-ki-icon#S10 imports register only the selected names', async (t) => {
  const { generateIconModules } = await import(new URL('scripts/generate-icons.mjs', elements));
  const { getIcon } = await import(new URL('src/utils/icon-registry.mjs', elements));
  const { icons } = JSON.parse(
    await readFile(new URL('vendor/lucide-1.63.0.json', elements), 'utf8'),
  );
  const directory = await mkdtemp(join(tmpdir(), 'kimen-icon-modules-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, 'package.json'),
    await readFile(new URL('package.json', elements)),
  );
  const output = join(directory, 'icons');
  await generateIconModules({ output });

  // One module per glyph, their shared registry and their one declaration.
  const files = new Set(await readdir(output));
  assert.equal(files.size, 2193 + 2);
  assert.equal(await readFile(join(output, '_glyph.d.ts'), 'utf8'), 'export {};\n');
  for (const name of Object.keys(icons)) {
    assert.ok(files.has(`${name}.js`), `missing module for ${name}`);
  }
  assert.equal(getIcon('circle-check'), undefined);
  await import(pathToFileURL(join(output, 'check-circle-2.js')));
  assert.equal(getIcon('circle-check'), undefined);
  assert.equal(getIcon('check-circle-2'), icons['circle-check']);
  await import(pathToFileURL(join(output, 'circle-check.js')));
  assert.equal(getIcon('circle-check'), icons['circle-check']);
  assert.equal(getIcon('triangle-alert'), undefined);
  assert.equal(getIcon('__proto__'), undefined);

  // Exercise the same production bundler used by the elements size gate.
  const require = createRequire(new URL('package.json', elements));
  const preset = createRequire(require.resolve('@size-limit/preset-small-lib'));
  const bundler = createRequire(preset.resolve('@size-limit/esbuild'));
  const { build } = bundler('esbuild');
  const bundled = await build({
    absWorkingDir: directory,
    bundle: true,
    format: 'esm',
    minify: true,
    metafile: true,
    write: false,
    stdin: {
      resolveDir: directory,
      contents: `
        import '@kimen/elements/icons/circle-check';
        import '@kimen/elements/icons/alert-triangle';
      `,
    },
  });
  const outputReport = Object.values(bundled.metafile.outputs)[0];
  assert.deepEqual(
    Object.keys(outputReport.inputs)
      .filter((path) => path.startsWith('icons/'))
      .sort(),
    ['icons/_registry.mjs', 'icons/alert-triangle.js', 'icons/circle-check.js'],
  );
  await import(`data:text/javascript,${encodeURIComponent(bundled.outputFiles[0].text)}`);
  assert.equal(getIcon('alert-triangle'), icons['triangle-alert']);
  assert.equal(getIcon('triangle-alert'), undefined);
});

test('@spec:069-ki-icon#S10 the package exports side-effectful glyph modules individually', async () => {
  const manifest = JSON.parse(await readFile(new URL('package.json', elements), 'utf8'));

  assert.deepEqual(manifest.exports['./icons/*'], {
    types: './icons/_glyph.d.ts',
    import: './icons/*.js',
  });
  assert.ok(manifest.files.includes('icons'));
  // The public glyph modules, then the chunks each published bundler-facing
  // build gives the glyphs components draw themselves (scripts/glyph-chunks.ts).
  assert.deepEqual(manifest.sideEffects, [
    './icons/*.js',
    './dist/components/glyph-*.js',
    './dist/esm/glyph-*.js',
  ]);
  assert.ok(manifest.nx.targets.build.outputs.includes('{projectRoot}/icons'));
});
