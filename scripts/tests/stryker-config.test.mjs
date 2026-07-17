import assert from 'node:assert/strict';
import { isAbsolute } from 'node:path';
import test from 'node:test';

// @spec:018-project-integrity-hardening

const loadConfig = async (relativePath) => {
  const module = await import(new URL(`../../${relativePath}`, import.meta.url));
  return await module.default;
};

const assertCommonMutationPolicy = (config, configFile) => {
  assert.equal(config.testRunner, 'vitest');
  assert.equal(config.coverageAnalysis, 'perTest');
  assert.deepEqual(config.thresholds, { high: 70, low: 70, break: 70 });
  assert.deepEqual(config.reporters, ['clear-text', 'json']);
  assert.deepEqual(config.plugins, ['@stryker-mutator/vitest-runner']);
  assert.deepEqual(config.ignorePatterns, [
    // /.claude keeps the tracked .claude/skills directory symlink out of
    // Stryker sandboxes: fs.copyFile follows the link into a directory and
    // fails (ENOTSUP on macOS, EISDIR on Linux), which broke every elements
    // mutation run. Agent tooling is classified out of mutation scope anyway.
    '/.claude',
    '/.nx',
    '/.stryker-tmp',
    '/packages/*/dist',
    '/packages/elements/loader',
    '/reports',
    '/storybook-static',
    '/site-dist',
  ]);
  assert.equal(config.incremental, true);
  assert.equal(config.allowEmpty, false);
  assert.equal(config.vitest.configFile, configFile);
  assert.equal(
    Object.hasOwn(config, 'testFiles'),
    false,
    'Vitest 4 receives project includes; Stryker must not pass glob text as literal file filters',
  );

  for (const dynamicOption of [
    'mutate',
    'incrementalFile',
    'jsonReporter',
    'tempDirName',
    'force',
  ]) {
    assert.equal(
      Object.hasOwn(config, dynamicOption),
      false,
      `${dynamicOption} is derived by mutation-changed, not frozen in a runner config`,
    );
  }
};

test('@spec:018 S3 node mutation config is strict, incremental and independently scoped', async () => {
  const config = await loadConfig('stryker.node.config.mjs');

  assertCommonMutationPolicy(config, 'vitest.mutation.node.config.ts');
  assert.equal(config.vitest.related, false);
  assert.equal(config.vitest.dir, '.');
  assert.equal(Object.hasOwn(config, 'buildCommand'), false);
});

test('@spec:018 S3 elements mutation config rebuilds Stencil and never relies on related mode', async () => {
  const config = await loadConfig('stryker.elements.config.mjs');

  assertCommonMutationPolicy(config, 'vitest.mutation.elements.config.ts');
  assert.equal(config.vitest.related, false);
  assert.equal(
    config.vitest.dir,
    '.',
    'the standalone config owns its root-relative include; narrowing --dir duplicates the package prefix in Stryker sandboxes',
  );
  assert.equal(config.buildCommand, 'pnpm --filter @kimen/elements exec stencil build');
});

test('@spec:018 S3 mutation Vitest config keeps node and Stencil suites separate', async () => {
  const config = await loadConfig('vitest.mutation.config.ts');
  const projects = config.test?.projects;

  assert.ok(Array.isArray(projects));
  assert.equal(projects.length, 2);

  const nodeProject = projects.find((project) => project.test?.name === 'node-mutation');
  const elementsProject = projects.find((project) => project.test?.name === 'elements-mutation');

  assert.deepEqual(nodeProject?.test?.include, ['scripts/mutation-tests/**/*.spec.mjs']);
  assert.equal(nodeProject?.test?.environment, 'node');
  assert.deepEqual(nodeProject?.test?.setupFiles ?? [], []);

  assert.deepEqual(elementsProject?.test?.include, ['packages/elements/src/**/*.spec.{ts,tsx}']);
  assert.match(
    elementsProject?.test?.environment ?? '',
    /@stencil[/+]vitest.*environments[/\\]stencil\.js$/,
  );
  assert.deepEqual(elementsProject?.test?.setupFiles, ['./packages/elements/vitest.setup.mjs']);
  assert.equal(elementsProject?.test?.browser?.enabled ?? false, false);
});

test('@spec:018 S3 each Stryker runner has one exact Vitest project', async () => {
  const nodeConfig = await loadConfig('vitest.mutation.node.config.ts');
  const elementsConfig = await loadConfig('vitest.mutation.elements.config.ts');

  assert.deepEqual(
    [nodeConfig.cacheDir, elementsConfig.cacheDir],
    ['reports/cache/vite/mutation-node', 'reports/cache/vite/mutation-elements'],
  );
  for (const cacheDir of [nodeConfig.cacheDir, elementsConfig.cacheDir]) {
    assert.equal(isAbsolute(cacheDir), false, 'Stryker cache must resolve inside each sandbox');
    assert.doesNotMatch(cacheDir, /node_modules/);
  }

  assert.equal(nodeConfig.test?.name, 'node-mutation');
  assert.deepEqual(nodeConfig.test?.include, ['scripts/mutation-tests/**/*.spec.mjs']);
  assert.equal(nodeConfig.test?.environment, 'node');

  assert.equal(elementsConfig.test?.name, 'elements-mutation');
  assert.deepEqual(elementsConfig.test?.include, ['packages/elements/src/**/*.spec.{ts,tsx}']);
  assert.match(elementsConfig.test?.environment ?? '', /@stencil[/+]vitest/);
  assert.deepEqual(elementsConfig.test?.setupFiles, ['./packages/elements/vitest.setup.mjs']);
});
