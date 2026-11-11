import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// @spec:018-project-integrity-hardening

const mutationPolicyUrl = new URL('../lib/mutation-policy.mjs', import.meta.url);
const mutationCliPath = fileURLToPath(new URL('../gates/mutation-changed.mjs', import.meta.url));
const generatedSyncUrl = new URL('../gates/check-generated-sync.mjs', import.meta.url);

const loadMutationPolicy = () => import(mutationPolicyUrl.href);

const aHash = (character) => character.repeat(64);

// Component sources exercised by the weekly full-elements scope: two
// implementation files, one co-located core .ts helper, plus spec and css
// files the classifier must keep out of the mutate set.
const componentFixtureFiles = {
  'packages/elements/vitest.browser.config.ts': 'export default {};\n',
  'packages/elements/vitest.config.ts': 'export default {};\n',
  'packages/elements/vitest.coverage.config.ts': 'export default {};\n',
  'scripts/gates/build-mutation-elements.sh': '#!/usr/bin/env bash\n',
  'packages/elements/src/components/ki-button/ki-button.css': ':host { display: block; }\n',
  'packages/elements/src/components/ki-button/ki-button.spec.tsx': 'export const spec = 1;\n',
  'packages/elements/src/components/ki-button/ki-button.tsx': 'export const button = 1;\n',
  'packages/elements/src/components/ki-progress/ki-progress.math.ts': 'export const math = 1;\n',
  'packages/elements/src/components/ki-progress/ki-progress.tsx': 'export const progress = 1;\n',
};

const createCliFixture = async (t) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'kimen-mutation-policy-'));
  t.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  await Promise.all([
    writeFile(join(workspaceRoot, 'stryker.node.config.mjs'), 'export default {};\n'),
    writeFile(join(workspaceRoot, 'stryker.elements.config.mjs'), 'export default {};\n'),
    writeFile(join(workspaceRoot, 'vitest.mutation.config.ts'), 'export default {};\n'),
    writeFile(join(workspaceRoot, 'vitest.mutation.elements.config.ts'), 'export default {};\n'),
    writeFile(join(workspaceRoot, 'vitest.mutation.node.config.ts'), 'export default {};\n'),
    writeFile(join(workspaceRoot, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n'),
  ]);
  await Promise.all(
    Object.entries(componentFixtureFiles).map(async ([path, contents]) => {
      const absolutePath = join(workspaceRoot, path);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, contents);
    }),
  );
  return workspaceRoot;
};

const runMutationCli = ({ workspaceRoot, paths = [], input }) =>
  spawnSync(process.execPath, [mutationCliPath, ...paths], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    input,
  });

const scopeInput = {
  files: [
    {
      path: 'scripts/lib/zeta.mjs',
      classification: 'core',
      runner: 'node',
    },
    {
      path: 'scripts/lib/alpha.mjs',
      classification: 'core',
      runner: 'node',
    },
  ],
  policyHash: aHash('a'),
  configHashes: {
    node: aHash('b'),
    elements: aHash('c'),
  },
  lockfileHash: aHash('d'),
};

test('@spec:018 S3 changed core files are sorted and assigned to named runners', async () => {
  const { classifyChangedFiles } = await loadMutationPolicy();

  const classified = classifyChangedFiles([
    'scripts/lib/canonical-json.mjs',
    'packages/elements/src/components/ki-button/ki-button.tsx',
  ]);

  assert.deepEqual(classified, [
    {
      path: 'packages/elements/src/components/ki-button/ki-button.tsx',
      classification: 'core',
      runner: 'elements',
    },
    {
      path: 'scripts/lib/canonical-json.mjs',
      classification: 'core',
      runner: 'node',
    },
  ]);
});

test('@spec:018 S3 non-core presentation files carry an explicit exclusion reason', async () => {
  const { classifyChangedFiles } = await loadMutationPolicy();

  const classified = classifyChangedFiles([
    'packages/elements/src/components/ki-button/ki-button.css',
  ]);

  assert.equal(classified.length, 1);
  assert.equal(classified[0].path, 'packages/elements/src/components/ki-button/ki-button.css');
  assert.equal(classified[0].classification, 'excluded');
  assert.match(classified[0].reason, /\S/);
});

test('@spec:018 S3 local agent tooling is classified explicitly without mutating user files', async () => {
  const { classifyChangedFiles } = await loadMutationPolicy();

  const classified = classifyChangedFiles(['.agents/skills/example/SKILL.md']);

  assert.equal(classified[0].classification, 'excluded');
  assert.match(classified[0].reason, /agent tooling/i);
});

test('@spec:018 S3 an unclassified executable file fails before mutation starts', async () => {
  const { classifyChangedFiles } = await loadMutationPolicy();

  assert.throws(
    () => classifyChangedFiles(['experimental/new-core.ts']),
    /unclassified.*experimental\/new-core\.ts|experimental\/new-core\.ts.*unclassified/i,
  );
});

// The daily run of 07-11-2026 mutated the regenerated React and Angular
// wrappers as hand-written core and scored 60%. The exclusion comes from the
// generated-sync contract itself, so an output declared there tomorrow is
// excluded without a second list to update.
test('@spec:018 S3 outputs the generated-sync contract declares are excluded, hand-written shells stay core', async () => {
  const { classifyChangedFiles } = await loadMutationPolicy();
  const { generatedGroups, generatedOutputs } = await import(generatedSyncUrl.href);
  const wrapperOutputs = generatedOutputs.filter((path) =>
    generatedGroups.wrappers.required.includes(path),
  );

  assert.ok(wrapperOutputs.includes('packages/react/src/components.ts'));
  assert.ok(wrapperOutputs.includes('packages/angular/src/directives/proxies.ts'));
  for (const file of classifyChangedFiles(generatedOutputs)) {
    assert.equal(file.classification, 'excluded', `${file.path} is generated output`);
  }
  for (const file of classifyChangedFiles(wrapperOutputs)) {
    assert.match(file.reason, /generated-sync contract/i, file.path);
  }
  assert.deepEqual(classifyChangedFiles(generatedGroups.wrappers.handWritten), [
    { path: 'packages/angular/src/index.ts', classification: 'core', runner: 'node' },
    { path: 'packages/react/src/index.ts', classification: 'core', runner: 'node' },
  ]);
});

test('@spec:018 S3 CLI keeps the generated wrappers of a changed set out of every runner group', async (t) => {
  const workspaceRoot = await createCliFixture(t);
  const result = runMutationCli({
    workspaceRoot,
    paths: [
      'packages/angular/src/directives/angular-component-lib/boolean-attribute.ts',
      'packages/react/src/components.ts',
      'packages/react/src/ki-alert.ts',
      'scripts/gates/check-generated-sync.mjs',
    ],
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).groups, {
    elements: [],
    node: ['scripts/gates/check-generated-sync.mjs'],
  });
});

test('@spec:018 S3 mutation score 69 fails and exactly 70 passes', async () => {
  const { evaluateMutationScore } = await loadMutationPolicy();

  assert.deepEqual(evaluateMutationScore(69), {
    score: 69,
    threshold: 70,
    decision: 'fail',
  });
  assert.deepEqual(evaluateMutationScore(70), {
    score: 70,
    threshold: 70,
    decision: 'pass',
  });
});

test('@spec:018 S3 scope hash is canonical across file and config key ordering', async () => {
  const { hashMutationScope } = await loadMutationPolicy();
  const reordered = {
    ...scopeInput,
    files: [...scopeInput.files].reverse(),
    configHashes: {
      elements: scopeInput.configHashes.elements,
      node: scopeInput.configHashes.node,
    },
  };

  const first = hashMutationScope(scopeInput);
  const second = hashMutationScope(reordered);

  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, second);
});

test('@spec:018 S3 scope hash binds files, policy, configs and lockfile', async () => {
  const { hashMutationScope } = await loadMutationPolicy();
  const baseline = hashMutationScope(scopeInput);

  assert.notEqual(
    hashMutationScope({
      ...scopeInput,
      files: [{ ...scopeInput.files[0], path: 'scripts/lib/changed.mjs' }],
    }),
    baseline,
  );
  assert.notEqual(hashMutationScope({ ...scopeInput, policyHash: aHash('e') }), baseline);
  assert.notEqual(
    hashMutationScope({
      ...scopeInput,
      configHashes: { ...scopeInput.configHashes, node: aHash('e') },
    }),
    baseline,
  );
  assert.notEqual(hashMutationScope({ ...scopeInput, lockfileHash: aHash('e') }), baseline);
});

test('@spec:018 S3 CLI classifies every argument and groups core files deterministically', async (t) => {
  const workspaceRoot = await createCliFixture(t);

  const result = runMutationCli({
    workspaceRoot,
    paths: [
      'scripts/lib/canonical-json.mjs',
      'packages/elements/src/components/ki-button/ki-button.css',
      'packages/elements/src/components/ki-button/ki-button.tsx',
    ],
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(
    report.files.map(({ path }) => path),
    [
      'packages/elements/src/components/ki-button/ki-button.css',
      'packages/elements/src/components/ki-button/ki-button.tsx',
      'scripts/lib/canonical-json.mjs',
    ],
  );
  assert.deepEqual(report.groups, {
    elements: ['packages/elements/src/components/ki-button/ki-button.tsx'],
    node: ['scripts/lib/canonical-json.mjs'],
  });
  assert.match(report.scopeHash, /^[0-9a-f]{64}$/);
  assert.match(report.policyHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(Object.keys(report.configHashes), [
    'elements',
    'elements-browser',
    'elements-build',
    'elements-coverage',
    'elements-unit',
    'node',
    'vitest',
    'vitest-elements',
    'vitest-node',
  ]);
  assert.match(report.lockfileHash, /^[0-9a-f]{64}$/);
});

test('@spec:018 S3 CLI JSON stdin is canonical and rejects unclassified executable paths', async (t) => {
  const workspaceRoot = await createCliFixture(t);
  const paths = [
    'scripts/lib/canonical-json.mjs',
    'packages/elements/src/components/ki-button/ki-button.tsx',
  ];

  const fromArguments = runMutationCli({ workspaceRoot, paths });
  const fromJson = runMutationCli({
    workspaceRoot,
    input: JSON.stringify({ paths: [...paths].reverse() }),
  });
  const unclassified = runMutationCli({
    workspaceRoot,
    input: JSON.stringify({ paths: ['experimental/new-core.ts'] }),
  });

  assert.equal(fromArguments.status, 0, fromArguments.stderr);
  assert.equal(fromJson.status, 0, fromJson.stderr);
  assert.equal(JSON.parse(fromArguments.stdout).scopeHash, JSON.parse(fromJson.stdout).scopeHash);
  assert.notEqual(unclassified.status, 0);
  assert.equal(unclassified.stdout, '');
  assert.match(unclassified.stderr, /unclassified.*experimental\/new-core\.ts/i);
});

test('editing an imported browser config invalidates the elements mutation cache', async (t) => {
  const workspaceRoot = await createCliFixture(t);
  const paths = ['packages/elements/src/components/ki-button/ki-button.tsx'];
  const before = runMutationCli({ workspaceRoot, paths });
  assert.equal(before.status, 0, before.stderr);

  await writeFile(
    join(workspaceRoot, 'packages/elements/vitest.browser.config.ts'),
    'export default { test: { browser: { enabled: true } } };\n',
  );
  const after = runMutationCli({ workspaceRoot, paths });
  assert.equal(after.status, 0, after.stderr);
  assert.notEqual(
    JSON.parse(before.stdout).runnerScopes.elements,
    JSON.parse(after.stdout).runnerScopes.elements,
  );
});

test('@spec:018 S3 CLI full-elements scope mutates every component implementation through the classifier', async (t) => {
  const workspaceRoot = await createCliFixture(t);

  const result = runMutationCli({ workspaceRoot, paths: ['--scope', 'full-elements'] });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.groups, {
    elements: [
      'packages/elements/src/components/ki-button/ki-button.tsx',
      'packages/elements/src/components/ki-progress/ki-progress.math.ts',
      'packages/elements/src/components/ki-progress/ki-progress.tsx',
    ],
    node: [],
  });
  const spec = report.files.find(({ path }) => path.endsWith('ki-button.spec.tsx'));
  assert.equal(spec?.classification, 'excluded');
  assert.equal(
    report.files.some(({ path }) => path.endsWith('.css')),
    false,
    'full-elements discovery collects only executable component sources',
  );
  assert.match(report.runnerScopes.elements, /^[0-9a-f]{64}$/);
  assert.equal(report.runnerScopes.node, null);
});

test('@spec:018 S3 CLI full-elements scope narrows to named components and rejects unknown names', async (t) => {
  const workspaceRoot = await createCliFixture(t);

  const filtered = runMutationCli({
    workspaceRoot,
    paths: ['--scope', 'full-elements', 'ki-progress'],
  });
  const unknown = runMutationCli({
    workspaceRoot,
    paths: ['--scope', 'full-elements', 'ki-missing'],
  });

  assert.equal(filtered.status, 0, filtered.stderr);
  assert.deepEqual(JSON.parse(filtered.stdout).groups.elements, [
    'packages/elements/src/components/ki-progress/ki-progress.math.ts',
    'packages/elements/src/components/ki-progress/ki-progress.tsx',
  ]);
  assert.notEqual(unknown.status, 0);
  assert.equal(unknown.stdout, '');
  assert.match(unknown.stderr, /no component directory named.*ki-missing/i);
});

test('@spec:018 S3 CLI rejects an unknown or missing mutation scope before any mutation work', async (t) => {
  const workspaceRoot = await createCliFixture(t);

  const unknownScope = runMutationCli({ workspaceRoot, paths: ['--scope', 'everything'] });
  const missingValue = runMutationCli({ workspaceRoot, paths: ['--scope'] });

  assert.notEqual(unknownScope.status, 0);
  assert.match(unknownScope.stderr, /unknown mutation scope.*everything/i);
  assert.notEqual(missingValue.status, 0);
  assert.match(missingValue.stderr, /--scope requires a value/i);
});
