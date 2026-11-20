// @spec:068-component-discovery
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createSizeLimitConfig,
  renderCompositeEntry,
} from '../../packages/elements/scripts/run-size-limit.mjs';
import { checkPackaging, createAttwPlan } from '../gates/check-packaging.mjs';
import { deriveBundleSizeBudgets } from '../lib/bundle-size-budget.mjs';

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
    ],
  );
  const componentAttw = calls.filter(
    ({ args }) => args[1] === 'attw' && args.some((arg) => arg.startsWith('./ki-')),
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
    mcpApps: { raw: 781_383, gzip: 177_349, brotli: 140_306 },
    mcpServer: { raw: 2_573_176, gzip: 484_697, brotli: 380_341 },
    tokenStylesheets: { onmars: 12_930, material3: 5_600, base: 250 },
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
    mcpApps: { raw: 783_583, gzip: 177_529, brotli: 140_471 },
    mcpServer: { raw: 2_574_476, gzip: 484_887, brotli: 380_516 },
    tokenStylesheets: { onmars: 13_100, material3: 5_650, base: 250 },
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
