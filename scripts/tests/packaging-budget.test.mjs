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
import { packageContentRules } from '../lib/package-contents.mjs';
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
    mcpApps: { raw: 541_336, gzip: 99_026, brotli: 76_054 },
    mcpServer: { raw: 1_811_324, gzip: 337_323, brotli: 304_294 },
    genuiHost: { raw: 125_581, gzip: 29_774, brotli: 26_193 },
    tokenStylesheets: { onmars: 13_278, material3: 5_600, base: 250 },
    tokenSheets: { core: 7_000, buttonPage: 8_300, tenComponentPage: 11_400, tagSheet: 2_200 },
    pages: { button: 18_566, tenComponents: 48_157 },
    fullSheetPages: { button: 31_339, tenComponents: 57_747 },
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
        pages: { tenComponents: 40 },
        fullSheetPages: { button: 30 },
      },
    },
  };
  const second = {
    tag: 'ki-beta',
    metadata: { sizeBudget: { mcpApps: { raw: 1000 }, tokenStylesheets: { onmars: 70 } } },
  };

  assert.deepEqual(deriveBundleSizeBudgets([first, second]), {
    mcpApps: { raw: 543_536, gzip: 99_206, brotli: 76_219 },
    mcpServer: { raw: 1_812_624, gzip: 337_513, brotli: 304_469 },
    genuiHost: { raw: 125_581, gzip: 29_774, brotli: 26_193 },
    tokenStylesheets: { onmars: 13_448, material3: 5_650, base: 250 },
    tokenSheets: { core: 7_000, buttonPage: 8_300, tenComponentPage: 11_400, tagSheet: 2_200 },
    pages: { button: 18_566, tenComponents: 48_197 },
    fullSheetPages: { button: 31_369, tenComponents: 57_747 },
  });
});

test('standalone packaging re-enters through the isolated cache environment', async () => {
  const manifest = JSON.parse(await readFile(`${workspaceRoot}/package.json`, 'utf8'));

  assert.match(
    manifest.scripts.packaging,
    /^bash scripts\/gates\/cache-env\.sh -- node scripts\/gates\/check-packaging\.mjs$/u,
  );
});

// The budgets gate (nx run-many -t size) weighs a browser GenUI host: the
// packed catalog bundled for validateUiSpec and renderUiSpec, against the
// genuiHost base, so neither the guidance prose nor classic zod returns.
test('the catalog size target weighs a GenUI host built from its packed tarball', async () => {
  const manifest = JSON.parse(
    await readFile(`${workspaceRoot}/packages/catalog/package.json`, 'utf8'),
  );
  const nx = JSON.parse(await readFile(`${workspaceRoot}/nx.json`, 'utf8'));

  assert.equal(manifest.scripts.size, 'node scripts/host-weight.mjs');
  assert.deepEqual(manifest.nx.targets.size.inputs, ['default', '^default', 'componentBudget']);
  assert.deepEqual(nx.targetDefaults.size.dependsOn, ['build']);
  assert.ok(
    nx.namedInputs.componentBudget.includes('{workspaceRoot}/scripts/lib/bundle-size-budget.mjs'),
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
    // The published maps carry their sources, which the package does not ship.
    assert.equal(
      parsed.options.sourceMap === true && parsed.options.inlineSources === true,
      true,
      `${name} must emit source maps with inlineSources`,
    );
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

// Founder decision of 2026-11-25: @kimen/elements publishes its ESM entry
// points only. The Stencil collection, the CommonJS build and the browser
// build in dist/kimen (which the site still serves) are not published, and
// no manifest field points at them.
test('elements publishes no collection, CommonJS or CDN build', async () => {
  const manifest = JSON.parse(
    await readFile(`${workspaceRoot}/packages/elements/package.json`, 'utf8'),
  );
  for (const field of ['main', 'collection', 'collection:main', 'unpkg', 'jsdelivr', 'browser']) {
    assert.equal(Object.hasOwn(manifest, field), false, `${field} must not be declared`);
  }
  for (const entry of manifest.files) {
    assert.doesNotMatch(
      entry,
      /^(?:dist|loader)$|^dist\/(?:cjs|collection|kimen)\b|\.cjs\.js$/u,
      `${entry} would publish an unpublished build`,
    );
  }
  assert.equal(JSON.stringify(manifest.exports).includes('require'), false);
  assert.equal(
    manifest.sideEffects.some((pattern) => pattern.includes('/cjs/')),
    false,
  );
  const stencil = await readFile(`${workspaceRoot}/packages/elements/stencil.config.ts`, 'utf8');
  assert.match(stencil, /type: 'dist',[^}]*collectionDir: null/u);
});

// The release candidate refuses a tarball over its package budget
// (scripts/lib/package-contents.mjs). The bases are the sizes measured on
// 2026-11-25 plus about 3 %; raising one needs the founder's approval, so it
// changes here and there together.
test('each release package has its pinned tarball and unpacked size budget', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(packageContentRules).map(([name, { budget }]) => [name, { ...budget }]),
    ),
    {
      // Lowered for the install trims (one glyph declaration, no package llms-full.txt).
      '@kimen/elements': { packed: 2_738_176, unpacked: 12_694_528 },
      // Raised for spec 166's split token sheets, approved by the founder on 2026-11-25.
      '@kimen/tokens': { packed: 276_736, unpacked: 1_226_400 },
      '@kimen/mcp-server': { packed: 659_456, unpacked: 3_331_072 },
      '@kimen/catalog': { packed: 320_512, unpacked: 1_376_256 },
      '@kimen/emitter': { packed: 43_008, unpacked: 151_552 },
      '@kimen/adapter-a2ui': { packed: 102_400, unpacked: 413_696 },
      // Spec 165 profiles, re-measured under the approved ceiling once #634 and #636 landed.
      '@kimen/adapter-mcp-apps': { packed: 525_312, unpacked: 2_376_704 },
      '@kimen/react': { packed: 48_128, unpacked: 392_192 },
      '@kimen/vue': { packed: 36_864, unpacked: 236_544 },
      '@kimen/angular': { packed: 56_320, unpacked: 649_216 },
    },
  );
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
  assert.equal(config[0].limit, '8700 B');
  assert.equal(config[1].limit, '12600 B');
});

test('each exported generated token stylesheet has one size budget outside the package manifest', async () => {
  const tokens = new URL('../../packages/tokens/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('package.json', tokens), 'utf8'));
  assert.equal(Object.hasOwn(manifest, 'size-limit'), false);

  const { default: limits } = await import(new URL('.size-limit.mjs', tokens).href);
  // A pattern export (spec 166 `./css/ki-*`) is every file it resolves to.
  const built = await readdir(new URL('dist/css/', tokens));
  const exported = Object.values(manifest.exports)
    .filter((target) => target.startsWith('./dist/css/'))
    .flatMap((target) => {
      if (!target.includes('*')) return [target];
      const [prefix, suffix] = target.slice('./dist/css/'.length).split('*');
      return built
        .filter((file) => file.startsWith(prefix) && file.endsWith(suffix))
        .map((file) => `./dist/css/${file}`);
    });
  const sheets = limits.filter(({ path }) => typeof path === 'string' && path.startsWith('dist/'));
  assert.deepEqual(sheets.map(({ path }) => `./${path}`).sort(), exported.sort());
  // Spec 166's page budgets measure one bundle of the sheets a page loads.
  assert.deepEqual(
    limits
      .filter((entry) => !sheets.includes(entry))
      .map(({ path }) => path)
      .sort(),
    ['size-limit/button-page.css', 'size-limit/ten-component-page.css'],
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
