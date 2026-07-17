import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createSizeLimitConfig,
  renderCompositeEntry,
} from '../../packages/elements/scripts/run-size-limit.mjs';
import { checkPackaging, createAttwPlan } from '../gates/check-packaging.mjs';

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

test('packaging invokes publint once per publishable package and derives one ATTW component batch', async () => {
  const calls = [];
  await checkPackaging({
    workspaceRoot,
    execute(command, args, cwd) {
      calls.push({ command, args, cwd });
    },
  });

  assert.equal(calls.filter(({ args }) => args[1] === 'publint').length, 4);
  const componentAttw = calls.find(
    ({ args }) => args[1] === 'attw' && args.includes('./ki-tooltip'),
  );
  // 29 direct component subpaths after Fase N wave 1 adds ki-divider,
  // ki-status, ki-icon-button and the ki-avatar + ki-avatar-group pair,
  // and wave 2 adds ki-scroller, ki-indicator, ki-video and ki-qr.
  assert.equal(componentAttw.args.filter((argument) => argument.startsWith('./ki-')).length, 29);
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
