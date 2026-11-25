import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

import { lazyFallbackImport, unanalysedFallbackImport } from './lazy-fallback-import.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(join(packageRoot, 'package.json'));
const runtimeSource = (): Promise<string> =>
  readFile(require.resolve('@stencil/core/internal/client'), 'utf8');
const TEMPLATE_IMPORT = '`./${bundleId}.entry.js';

// The few members of esbuild's and Vite's APIs these checks call; neither is
// a dependency of this package, so their types are not either.
interface Esbuild {
  build(options: object): Promise<{
    errors: unknown[];
    warnings: { id: string }[];
    outputFiles: { path: string }[];
  }>;
}
interface ViteOutput {
  output: { fileName: string }[];
}
interface Vite {
  build(options: object): Promise<ViteOutput | ViteOutput[]>;
}

describe('the lazy runtime fallback import', () => {
  it("assembles the specifier of Stencil's own runtime at run time, line for line", async () => {
    const source = await runtimeSource();
    const rewritten = unanalysedFallbackImport(source);

    expect(source).toContain(TEMPLATE_IMPORT);
    expect(rewritten).not.toContain(TEMPLATE_IMPORT);
    expect(rewritten).toContain(
      'return import(/* webpackIgnore: true */\n    /* @vite-ignore */\n    /* turbopackIgnore: true */\n',
    );
    expect(rewritten).toContain(
      '["./", bundleId, ".entry.js", cacheBustParams ? "?" + cacheBustParams : ""].join("")',
    );
    expect(rewritten).not.toMatch(/webpack(?:Include|Exclude|Mode)/u);
    // No line moves, so the module keeps its source map.
    expect(rewritten.split('\n')).toHaveLength(source.split('\n').length);
    // Stencil's import switch, which names every bundle statically, stays.
    expect(rewritten).toContain('/*!__STENCIL_STATIC_IMPORT_SWITCH__*/');
  });

  it('refuses a runtime whose lazy import changed shape', async () => {
    const source = await runtimeSource();
    expect(() =>
      unanalysedFallbackImport('export const load = () => import("./x.entry.js");'),
    ).toThrow(/expected one lazy-entry import.*found 0/u);
    expect(() => unanalysedFallbackImport(`${source}\n${source}`)).toThrow(/found 2/u);
  });

  it('transforms the client runtime the Stencil compiler resolves, and nothing else', async () => {
    const source = await runtimeSource();
    const transform = (code: string, id: string) => lazyFallbackImport.transform(code, id);
    const runtime = '/repo/node_modules/@stencil/core/internal/client/index.js';

    for (const id of [
      runtime,
      `${runtime}?app-data=conditional`,
      'C:\\repo\\node_modules\\@stencil\\core\\internal\\client\\index.js',
    ]) {
      expect(transform(source, id)).toEqual({ code: unanalysedFallbackImport(source), map: null });
    }
    for (const id of [
      '/repo/node_modules/@stencil/core/internal/client/patch-browser.js',
      '/repo/node_modules/@stencil/core/internal/hydrate/index.js',
      '/repo/packages/elements/src/components/ki-button/ki-button.tsx',
    ]) {
      expect(transform(source, id)).toBeNull();
    }
  });
});

// What a consumer's bundler reads is the built lazy build, so the rest of
// this file asserts dist/esm, the directory behind `@kimen/elements/loader`.
describe('the published lazy loader', () => {
  const esm = join(packageRoot, 'dist/esm');

  it('names every component bundle in a static import and analyses no other', async () => {
    const files = await readdir(esm);
    const entries = files
      .filter((file) => file.endsWith('.entry.js'))
      .map((file) => file.slice(0, -'.entry.js'.length));
    const cores = [];
    for (const file of files.filter((name) => name.endsWith('.js'))) {
      const code = await readFile(join(esm, file), 'utf8');
      if (code.includes('cmpModules.set(bundleId')) cores.push(code);
    }
    expect(entries.length).toBeGreaterThan(100);
    expect(cores).toHaveLength(1);
    const core = cores[0] ?? '';
    for (const bundle of entries) {
      expect(core).toContain(
        `case '${bundle}':\n                    return import(\n                      /* webpackMode: "lazy" */\n                      './${bundle}.entry.js')`,
      );
    }
    expect(core).not.toContain(TEMPLATE_IMPORT);
  });

  const directories: string[] = [];
  afterAll(() =>
    Promise.all(directories.map((path) => rm(path, { force: true, recursive: true }))),
  );
  const consumerEntry =
    "import { defineCustomElements } from '@kimen/elements/loader';\ndefineCustomElements();\n";
  const componentChunks = (names: string[]) =>
    names.filter((name) => /(?:^|\/)ki-button\.entry[-.]/u.test(name));

  it('bundles with esbuild into one chunk per component, with no error', async () => {
    // The production bundler of the elements size gate.
    const preset = createRequire(require.resolve('@size-limit/preset-small-lib'));
    const { build } = createRequire(preset.resolve('@size-limit/esbuild'))('esbuild') as Esbuild;
    const result = await build({
      absWorkingDir: packageRoot,
      bundle: true,
      format: 'esm',
      logLevel: 'silent',
      minify: true,
      outdir: join(packageRoot, 'loader-consumer'),
      platform: 'browser',
      splitting: true,
      stdin: { contents: consumerEntry, resolveDir: packageRoot, sourcefile: 'consumer-entry.js' },
      write: false,
    });
    // Rollup lists each chunk's transitive imports in it, for the browser to
    // fetch early; esbuild drops those of side-effect-free helpers and says
    // so only for code outside node_modules, which is where this check reads
    // the package. An installed package reports nothing (the consumer
    // contract bundles one at release).
    expect(result.errors).toEqual([]);
    expect(result.warnings.filter(({ id }) => id !== 'ignored-bare-import')).toEqual([]);
    expect(componentChunks(result.outputFiles.map(({ path }) => path))).toHaveLength(1);
  });

  it('bundles with Vite into one chunk per component', async () => {
    // Vite as the workspace installs it, for vitest.
    const fromVitest = createRequire(require.resolve('vitest/package.json'));
    const vite = (await import(pathToFileURL(fromVitest.resolve('vite')).href)) as Vite;
    const cacheDir = await mkdtemp(join(tmpdir(), 'kimen-loader-vite-'));
    directories.push(cacheDir);
    const entry = '\0kimen-loader-consumer';
    const output = await vite.build({
      build: { rollupOptions: { input: 'kimen-loader-consumer' }, write: false },
      cacheDir,
      configFile: false,
      logLevel: 'silent',
      plugins: [
        {
          name: 'kimen-loader-consumer',
          resolveId: (id: string) => (id === 'kimen-loader-consumer' ? entry : null),
          load: (id: string) => (id === entry ? consumerEntry : null),
        },
      ],
      root: packageRoot,
    });
    const outputs = Array.isArray(output) ? output : [output];
    const names = outputs.flatMap(({ output: files }) => files.map(({ fileName }) => fileName));
    expect(componentChunks(names)).toHaveLength(1);
    expect(names.filter((name) => name.endsWith('.js')).length).toBeGreaterThan(100);
  });
});
