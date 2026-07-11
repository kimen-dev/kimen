import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// @spec:018-project-integrity-hardening

const mutationPolicyUrl = new URL('../lib/mutation-policy.mjs', import.meta.url);
const mutationCliPath = fileURLToPath(new URL('../gates/mutation-changed.mjs', import.meta.url));

const loadMutationPolicy = () => import(mutationPolicyUrl.href);

const aHash = (character) => character.repeat(64);

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

  const classified = classifyChangedFiles([
    '.agents/skills/requesting-code-review/scripts/review-package.sh',
  ]);

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
