// @spec:068-component-discovery
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  createSizeLimitConfig,
  renderCompositeEntry,
} from '../../packages/elements/scripts/run-size-limit.mjs';
import { checkPackaging, createAttwPlan } from '../gates/check-packaging.mjs';
import { deriveBundleSizeBudgets } from '../lib/bundle-size-budget.mjs';
import { releasePackages } from '../release/release-plan.mjs';
import { builtPackageOutputs } from '../release/stage-package.mjs';

const components = ['ki-alpha', 'ki-beta', 'ki-gamma'].map((tag) => ({
  tag,
  publicSubpath: `./${tag}`,
  distModule: `./dist/components/${tag}.js`,
  budgetGroup: tag === 'ki-alpha' || tag === 'ki-beta' ? 'ki-alpha-beta' : 'default',
}));
const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

test('ATTW component entrypoints are derived and sorted from inventory', () => {
  const plan = createAttwPlan(components);

  assert.deepEqual(plan.componentEntrypoints, ['./ki-alpha', './ki-beta', './ki-gamma']);
  assert.deepEqual(plan.rootEntrypoints, ['.']);
  assert.deepEqual(plan.loaderEntrypoints, ['./loader']);
});

test('S1: packaging invokes publint once per publishable package and checks every component in one ATTW batch', async () => {
  const calls = [];
  await checkPackaging({
    workspaceRoot,
    execute(command, args, cwd) {
      calls.push({ command, args, cwd });
    },
  });

  assert.deepEqual(
    calls.filter(({ args }) => args[1] === 'publint').map(({ args }) => args[2]),
    [
      'packages/tokens',
      'packages/elements',
      'packages/catalog',
      'packages/kimen',
      'packages/emitter',
      'packages/adapter-a2ui',
      'packages/adapter-mcp-apps',
      'packages/mcp-server',
      'packages/react',
      'packages/vue',
      'packages/angular/dist',
    ],
  );
  // Each wrapper is checked as it packs, at its root and one per-component subpath.
  for (const directory of ['packages/react', 'packages/vue']) {
    assert.ok(
      calls.some(
        ({ args }) => args[1] === 'attw' && args[3] === directory && args.includes('./ki-button'),
      ),
      directory,
    );
  }
  assert.ok(
    calls.some(
      ({ args }) => args.join(' ') === 'exec attw --pack packages/angular/dist --profile esm-only',
    ),
  );
  const componentAttw = calls.filter(
    ({ args }) =>
      args[1] === 'attw' &&
      args[3] === 'packages/elements' &&
      args.some((arg) => arg.startsWith('./ki-')),
  );
  assert.equal(componentAttw.length, 1);
  const expectedSubpaths = (
    await readdir(`${workspaceRoot}/packages/elements/src/components`, {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => `./${name}`)
    .sort();
  assert.deepEqual(
    componentAttw[0].args.filter((argument) => argument.startsWith('./ki-')),
    expectedSubpaths,
  );
});

// The elements build names every file its declarations import (see
// scripts/lib/declaration-specifiers.mjs), so no entrypoint needs a rule
// switched off. An exemption here is how unresolved types shipped unnoticed:
// the checker ran, and was told not to look.
test('packaging type-checks all elements and representative glyph entrypoints', async () => {
  const calls = [];
  await checkPackaging({
    workspaceRoot,
    execute(command, args, cwd) {
      calls.push({ command, args, cwd });
    },
  });

  const elementsAttw = calls.filter(
    ({ args }) => args[1] === 'attw' && args.includes('packages/elements'),
  );
  assert.equal(elementsAttw.length, 3);
  const entrypoints = elementsAttw.map(({ args }) => args.slice(args.indexOf('--entrypoints') + 1));
  assert.deepEqual(entrypoints.slice(0, 2), [['.'], ['./loader']]);
  assert.ok(entrypoints[2].some((path) => path.startsWith('./ki-')));
  assert.deepEqual(
    entrypoints[2].filter((path) => path.startsWith('./icons/')),
    ['./icons/circle-check', './icons/alert-triangle'],
  );
  for (const { args } of elementsAttw) {
    assert.equal(args.includes('--ignore-rules'), false, args.join(' '));
  }
});

test('S4: a component with no size allowance leaves every shipped limit unchanged', () => {
  assert.deepEqual(deriveBundleSizeBudgets([{ tag: 'ki-alpha', metadata: {} }]), {
    mcpApps: { raw: 818_195, gzip: 187_416, brotli: 148_865 },
    mcpServer: { raw: 2_626_194, gzip: 498_562, brotli: 390_919 },
    tokenStylesheets: { onmars: 13_278, material3: 5_600, base: 250 },
  });
});

test('S4: each metric receives only its explicitly declared marginal byte allowances', () => {
  const first = {
    tag: 'ki-alpha',
    metadata: {
      sizeBudget: {
        mcpApps: { raw: 1200, gzip: 180, brotli: 165 },
        mcpServer: { raw: 1300, gzip: 190, brotli: 175 },
        tokenStylesheets: { onmars: 100, material3: 50 },
      },
    },
  };
  const second = {
    tag: 'ki-beta',
    metadata: { sizeBudget: { mcpApps: { raw: 1000 }, tokenStylesheets: { onmars: 70 } } },
  };

  assert.deepEqual(deriveBundleSizeBudgets([first, second]), {
    mcpApps: { raw: 820_395, gzip: 187_596, brotli: 149_030 },
    mcpServer: { raw: 2_627_494, gzip: 498_752, brotli: 391_094 },
    tokenStylesheets: { onmars: 13_448, material3: 5_650, base: 250 },
  });
});

test('standalone packaging re-enters through the isolated cache environment', async () => {
  const manifest = JSON.parse(await readFile(`${workspaceRoot}/package.json`, 'utf8'));

  assert.match(
    manifest.scripts.packaging,
    /^bash scripts\/gates\/cache-env\.sh -- node scripts\/gates\/check-packaging\.mjs$/u,
  );
});

test('elements Nx build cache owns every generated directory shipped by the package', async () => {
  const manifest = JSON.parse(
    await readFile(`${workspaceRoot}/packages/elements/package.json`, 'utf8'),
  );
  const outputs = new Set(manifest.nx.targets.build.outputs);
  const inputs = new Set(manifest.nx.targets.build.inputs);

  for (const directory of ['dist', 'generated', 'loader']) {
    assert.equal(
      outputs.has(`{projectRoot}/${directory}`),
      true,
      `${directory} must be restored by an Nx build cache hit`,
    );
  }
  assert.equal(inputs.has('!{projectRoot}/loader/**'), true);
});

// tsc writes its incremental state (*.tsbuildinfo) where tsBuildInfoFile says,
// by default into outDir: inside a packed directory it reaches every consumer,
// as it did in six packages at 0.2.1. Outside one, Nx must restore it with
// dist, or a cache hit pairs restored output with build info from another
// build and tsc -b skips files it should emit.
test('no release package writes TypeScript build info into what it packs, and Nx caches it with dist', async () => {
  const nx = JSON.parse(await readFile(`${workspaceRoot}/nx.json`, 'utf8'));
  const writers = [];
  for (const [name, manifestPath] of releasePackages) {
    const directory = join(workspaceRoot, dirname(manifestPath));
    const configPath = join(directory, 'tsconfig.json');
    if (!existsSync(configPath)) continue;
    const parsed = ts.getParsedCommandLineOfConfigFile(configPath, undefined, {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) =>
        assert.fail(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
    });
    const buildInfo = ts.getTsBuildInfoEmitOutputFilePath(parsed.options);
    if (buildInfo === undefined) continue;
    writers.push(name);
    const path = relative(directory, buildInfo);
    const manifest = JSON.parse(await readFile(join(workspaceRoot, manifestPath), 'utf8'));
    const packed = Object.hasOwn(builtPackageOutputs, name)
      ? [builtPackageOutputs[name]]
      : manifest.files;
    for (const entry of packed) {
      assert.equal(
        path === entry || path.startsWith(`${entry}/`),
        false,
        `${name} writes its build info ${path} into the packed ${entry}`,
      );
    }
    const outputs = manifest.nx?.targets?.build?.outputs ?? nx.targetDefaults.build.outputs;
    assert.equal(
      outputs.includes(`{projectRoot}/${path}`),
      true,
      `${name} Nx build outputs must restore ${path} together with dist`,
    );
  }
  assert.deepEqual(writers, [
    '@kimen/catalog',
    '@kimen/emitter',
    '@kimen/adapter-a2ui',
    '@kimen/adapter-mcp-apps',
    '@kimen/react',
    '@kimen/vue',
  ]);
});

test('size budgets derive defaults and one entry per declared composite group', () => {
  const groups = [{ id: 'ki-alpha-beta', members: ['ki-alpha', 'ki-beta'] }];
  const config = createSizeLimitConfig({ components, groups });

  assert.equal(config.length, 4);
  assert.deepEqual(
    config.map(({ name }) => name),
    [
      'ki-alpha-beta marginal cost (runtime excluded)',
      'ki-alpha-beta worst case (full Stencil runtime)',
      'ki-gamma marginal cost (runtime excluded)',
      'ki-gamma worst case (full Stencil runtime)',
    ],
  );
  assert.deepEqual(config[0].path, ['dist/components/ki-alpha.js', 'dist/components/ki-beta.js']);
  assert.equal(config[0].limit, '9 KB');
  assert.equal(config[1].limit, '25 KB');
});

test('each exported generated token stylesheet has one size budget outside the package manifest', async () => {
  const tokens = new URL('../../packages/tokens/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('package.json', tokens), 'utf8'));
  assert.equal(Object.hasOwn(manifest, 'size-limit'), false);

  const { default: limits } = await import(new URL('.size-limit.mjs', tokens).href);
  assert.deepEqual(
    limits.map(({ path }) => `./${path}`).sort(),
    Object.values(manifest.exports)
      .filter((target) => target.startsWith('./dist/css/'))
      .sort(),
  );
  for (const { limit } of limits) {
    assert.match(limit, /^[1-9]\d*(?:\.\d+)? (?:B|KB)$/u);
  }
});

test('composite budget entry invokes every member in one bundle so Stencil runtime is counted once', () => {
  assert.equal(
    renderCompositeEntry(
      { id: 'ki-alpha-beta', members: ['ki-alpha', 'ki-beta'] },
      '/workspace/packages/elements',
    ),
    [
      "import { defineCustomElement as define0 } from '/workspace/packages/elements/dist/components/ki-alpha.js';",
      "import { defineCustomElement as define1 } from '/workspace/packages/elements/dist/components/ki-beta.js';",
      '',
      'export function defineComposite(): void {',
      '  define0();',
      '  define1();',
      '}',
      '',
    ].join('\n'),
  );
});

test('size budget derivation fails closed on orphaned or partial groups', () => {
  assert.throws(
    () =>
      createSizeLimitConfig({
        components,
        groups: [{ id: 'ki-alpha-beta', members: ['ki-alpha'] }],
      }),
    /membership|group/iu,
  );
  assert.throws(
    () =>
      createSizeLimitConfig({
        components,
        groups: [{ id: 'orphan', members: ['ki-missing', 'ki-alpha'] }],
      }),
    /unknown.*ki-missing/iu,
  );
});
