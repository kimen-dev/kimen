import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// @spec:018-project-integrity-hardening

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const runnerModuleUrl = new URL('../gates/mutation-changed.mjs', import.meta.url);
const policyModuleUrl = new URL('../lib/mutation-policy.mjs', import.meta.url);
const loadRunner = () => import(runnerModuleUrl.href);
const loadPolicy = () => import(policyModuleUrl.href);

const git = (cwd, arguments_) =>
  execFileAsync('git', arguments_, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C' },
  });

const createGitFixture = async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-mutation-git-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '--initial-branch=main']);
  await git(root, ['config', 'user.email', 'mutation@example.invalid']);
  await git(root, ['config', 'user.name', 'Mutation Fixture']);
  await mkdir(join(root, 'scripts/lib'), { recursive: true });
  await writeFile(join(root, 'README.md'), 'fixture\n');
  await writeFile(join(root, 'scripts/lib/original.mjs'), 'export const original = 1;\n');
  await git(root, ['add', '--all']);
  await git(root, ['commit', '-m', 'fixture base']);
  const { stdout } = await git(root, ['rev-parse', 'HEAD']);
  return { root, baseSha: stdout.trim() };
};

const mutationReport = ({
  files,
  statuses = [
    'Killed',
    'Killed',
    'Killed',
    'Killed',
    'Killed',
    'Killed',
    'Killed',
    'Survived',
    'NoCoverage',
    'Timeout',
  ],
}) => ({
  schemaVersion: '1.0',
  thresholds: { high: 70, low: 70, break: 70 },
  config: {
    mutate: files,
    thresholds: { high: 70, low: 70, break: 70 },
  },
  files: Object.fromEntries(
    files.map((path) => [
      path,
      {
        language: 'javascript',
        source: 'export const value = true;\n',
        mutants: statuses.map((status, index) => ({
          id: String(index),
          mutatorName: 'BooleanLiteral',
          location: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
          status,
        })),
      },
    ]),
  ),
});

test('@spec:018 S3 runner-scope hash binds runner, exact files, policy, configs and lock', async () => {
  const { hashMutationRunnerScope } = await loadPolicy();
  const input = {
    runner: 'node',
    files: ['scripts/lib/b.mjs', 'scripts/lib/a.mjs'],
    policyHash: 'a'.repeat(64),
    configHashes: {
      node: 'b'.repeat(64),
      elements: 'c'.repeat(64),
      vitest: 'd'.repeat(64),
    },
    lockfileHash: 'e'.repeat(64),
  };
  const baseline = hashMutationRunnerScope(input);

  assert.match(baseline, /^[0-9a-f]{64}$/);
  assert.equal(hashMutationRunnerScope({ ...input, files: [...input.files].reverse() }), baseline);
  assert.notEqual(hashMutationRunnerScope({ ...input, runner: 'elements' }), baseline);
  assert.notEqual(hashMutationRunnerScope({ ...input, files: ['scripts/lib/a.mjs'] }), baseline);
  assert.notEqual(
    hashMutationRunnerScope({
      ...input,
      configHashes: { ...input.configHashes, vitest: 'f'.repeat(64) },
    }),
    baseline,
  );
});

test('@spec:018 S3 report parser uses rational per-group scoring and exact file keys', async () => {
  const { evaluateMutationReport } = await loadPolicy();
  const files = ['scripts/lib/canonical-json.mjs'];
  const result = evaluateMutationReport(mutationReport({ files }), files);

  assert.deepEqual(result, {
    counts: {
      detected: 8,
      invalid: 0,
      killed: 7,
      noCoverage: 1,
      runtimeError: 0,
      compileError: 0,
      ignored: 0,
      survived: 1,
      timeout: 1,
      valid: 10,
    },
    decision: 'pass',
    score: 80,
    threshold: 70,
  });
  const at69 = mutationReport({
    files,
    statuses: [...Array(69).fill('Killed'), ...Array(31).fill('Survived')],
  });
  const at70 = mutationReport({
    files,
    statuses: [...Array(70).fill('Killed'), ...Array(30).fill('Survived')],
  });
  assert.equal(evaluateMutationReport(at69, files).decision, 'fail');
  assert.equal(evaluateMutationReport(at70, files).decision, 'pass');
  assert.throws(
    () => evaluateMutationReport(mutationReport({ files }), ['scripts/lib/other.mjs']),
    /exact files.*other\.mjs.*canonical-json\.mjs/i,
  );
});

test('@spec:018 S3 report parser fails closed on threshold drift, pending, unknown and zero valid mutants', async () => {
  const { evaluateMutationReport } = await loadPolicy();
  const files = ['scripts/lib/canonical-json.mjs'];
  const thresholdDrift = mutationReport({ files });
  thresholdDrift.thresholds.break = 69;

  assert.throws(() => evaluateMutationReport(thresholdDrift, files), /threshold.*70/i);
  assert.throws(
    () => evaluateMutationReport(mutationReport({ files, statuses: ['Pending'] }), files),
    /Pending.*not a final mutation status/i,
  );
  assert.throws(
    () => evaluateMutationReport(mutationReport({ files, statuses: ['NovelStatus'] }), files),
    /unknown mutation status.*NovelStatus/i,
  );
  assert.throws(
    () =>
      evaluateMutationReport(
        mutationReport({ files, statuses: ['CompileError', 'RuntimeError', 'Ignored'] }),
        files,
      ),
    /zero valid mutants/i,
  );
  assert.deepEqual(
    evaluateMutationReport(
      mutationReport({
        files,
        statuses: ['Killed', 'CompileError', 'RuntimeError', 'Ignored'],
      }),
      files,
    ).counts,
    {
      detected: 1,
      invalid: 3,
      killed: 1,
      noCoverage: 0,
      runtimeError: 1,
      compileError: 1,
      ignored: 1,
      survived: 0,
      timeout: 0,
      valid: 1,
    },
  );
});

test('@spec:018 S3 Git discovery includes committed, staged, unstaged and untracked paths', async (t) => {
  const { discoverChangedPaths } = await loadRunner();
  const fixture = await createGitFixture(t);
  await writeFile(join(fixture.root, 'scripts/lib/committed.mjs'), 'export const committed = 1;\n');
  await git(fixture.root, ['add', 'scripts/lib/committed.mjs']);
  await git(fixture.root, ['commit', '-m', 'committed candidate']);
  await writeFile(join(fixture.root, 'scripts/lib/staged.mjs'), 'export const staged = 1;\n');
  await git(fixture.root, ['add', 'scripts/lib/staged.mjs']);
  await writeFile(join(fixture.root, 'scripts/lib/original.mjs'), 'export const original = 2;\n');
  await writeFile(join(fixture.root, 'scripts/lib/untracked.mjs'), 'export const untracked = 1;\n');

  const discovered = await discoverChangedPaths({
    workspaceRoot: fixture.root,
    environment: { KIMEN_MUTATION_BASE: fixture.baseSha },
  });

  assert.equal(discovered.baseSha, fixture.baseSha);
  assert.equal(discovered.baseSource, 'KIMEN_MUTATION_BASE');
  assert.deepEqual(discovered.paths, [
    'scripts/lib/committed.mjs',
    'scripts/lib/original.mjs',
    'scripts/lib/staged.mjs',
    'scripts/lib/untracked.mjs',
  ]);
});

test('@spec:018 S3 Git discovery chooses origin/main merge-base then upstream then HEAD', async (t) => {
  const { discoverChangedPaths } = await loadRunner();
  const origin = await createGitFixture(t);
  await git(origin.root, ['update-ref', 'refs/remotes/origin/main', origin.baseSha]);
  await git(origin.root, ['switch', '-c', 'feature']);
  await writeFile(join(origin.root, 'feature.txt'), 'feature\n');
  await git(origin.root, ['add', 'feature.txt']);
  await git(origin.root, ['commit', '-m', 'feature']);

  const fromOrigin = await discoverChangedPaths({ workspaceRoot: origin.root, environment: {} });

  assert.equal(fromOrigin.baseSource, 'origin/main merge-base');
  assert.equal(fromOrigin.baseSha, origin.baseSha);

  const upstream = await createGitFixture(t);
  await git(upstream.root, ['branch', 'base-branch', upstream.baseSha]);
  await git(upstream.root, ['switch', '-c', 'feature']);
  await git(upstream.root, ['branch', '--set-upstream-to=base-branch']);
  await writeFile(join(upstream.root, 'feature.txt'), 'feature\n');
  await git(upstream.root, ['add', 'feature.txt']);
  await git(upstream.root, ['commit', '-m', 'feature']);

  const fromUpstream = await discoverChangedPaths({
    workspaceRoot: upstream.root,
    environment: {},
  });

  assert.equal(fromUpstream.baseSource, 'upstream merge-base');
  assert.equal(fromUpstream.baseSha, upstream.baseSha);

  const head = await createGitFixture(t);
  const fromHead = await discoverChangedPaths({ workspaceRoot: head.root, environment: {} });

  assert.equal(fromHead.baseSource, 'HEAD fallback');
  assert.equal(fromHead.baseSha, head.baseSha);
});

test('@spec:018 S3 Git discovery rejects unsafe base and unsupported type-change state', async (t) => {
  const { discoverChangedPaths } = await loadRunner();
  const fixture = await createGitFixture(t);

  await assert.rejects(
    discoverChangedPaths({
      workspaceRoot: fixture.root,
      environment: { KIMEN_MUTATION_BASE: '--exec=unsafe' },
    }),
    /KIMEN_MUTATION_BASE.*safe Git commit reference/i,
  );

  await rm(join(fixture.root, 'scripts/lib/original.mjs'));
  await symlink('../../README.md', join(fixture.root, 'scripts/lib/original.mjs'));
  await assert.rejects(
    discoverChangedPaths({
      workspaceRoot: fixture.root,
      environment: { KIMEN_MUTATION_BASE: fixture.baseSha },
    }),
    /unsupported or malformed Git status: T/i,
  );
});

test('@spec:018 S3 deleted and renamed executable paths fail before Stryker starts', async (t) => {
  const { buildReport, discoverChangedPaths, validateRunnableFiles } = await loadRunner();
  const deleted = await createGitFixture(t);
  await rm(join(deleted.root, 'scripts/lib/original.mjs'));
  const deletedDiscovery = await discoverChangedPaths({
    workspaceRoot: deleted.root,
    environment: { KIMEN_MUTATION_BASE: deleted.baseSha },
  });
  const deletedReport = await buildReport({
    paths: deletedDiscovery.paths,
    workspaceRoot: repositoryRoot,
  });

  await assert.rejects(
    validateRunnableFiles({ files: deletedReport.files, workspaceRoot: deleted.root }),
    /deleted executable path.*scripts\/lib\/original\.mjs/i,
  );

  const renamed = await createGitFixture(t);
  await git(renamed.root, ['mv', 'scripts/lib/original.mjs', 'scripts/lib/renamed.mjs']);
  const renamedDiscovery = await discoverChangedPaths({
    workspaceRoot: renamed.root,
    environment: { KIMEN_MUTATION_BASE: renamed.baseSha },
  });
  const renamedReport = await buildReport({
    paths: renamedDiscovery.paths,
    workspaceRoot: repositoryRoot,
  });

  await assert.rejects(
    validateRunnableFiles({ files: renamedReport.files, workspaceRoot: renamed.root }),
    /deleted executable path.*scripts\/lib\/original\.mjs/i,
  );
});

test('@spec:018 S3 runner isolates one cache scope, deletes stale JSON and reports empty groups loudly', async (t) => {
  const { buildReport, runMutationGroups } = await loadRunner();
  const cacheRoot = await mkdtemp(join(tmpdir(), 'kimen-mutation-cache-'));
  t.after(() => rm(cacheRoot, { recursive: true, force: true }));
  const report = await buildReport({
    paths: ['scripts/lib/canonical-json.mjs'],
    workspaceRoot: repositoryRoot,
  });
  const physicalCacheRoot = await realpath(cacheRoot);
  const scopeRoot = join(physicalCacheRoot, 'node', report.runnerScopes.node);
  const calls = [];
  await mkdir(scopeRoot, { recursive: true });
  await writeFile(join(scopeRoot, 'mutation.json'), '{"stale":true}\n');

  const results = await runMutationGroups({
    report,
    workspaceRoot: repositoryRoot,
    cacheRoot,
    force: true,
    executeStryker: async (options) => {
      calls.push(options);
      await assert.rejects(access(options.jsonReporter.fileName));
      await mkdir(options.tempDirName, { recursive: true });
      await writeFile(join(options.tempDirName, 'worker-was-here'), 'temporary\n');
      await writeFile(
        options.jsonReporter.fileName,
        JSON.stringify(mutationReport({ files: options.mutate })),
      );
    },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].mutate, ['scripts/lib/canonical-json.mjs']);
  assert.equal(calls[0].incrementalFile, join(scopeRoot, 'incremental.json'));
  assert.equal(calls[0].jsonReporter.fileName, join(scopeRoot, 'mutation.json'));
  assert.equal(calls[0].tempDirName, join(scopeRoot, 'tmp'));
  assert.equal(calls[0].force, true);
  assert.equal(calls[0].cleanTempDir, 'always');
  assert.deepEqual(calls[0].thresholds, { high: 70, low: 70, break: 70 });
  assert.equal(results.node.decision, 'pass');
  assert.deepEqual(results.elements, {
    decision: 'N/A',
    files: [],
    reason: 'no changed core files for elements',
    threshold: 70,
  });
  await assert.rejects(access(join(scopeRoot, 'tmp')));
  assert.equal(
    JSON.parse(await readFile(join(scopeRoot, 'mutation.json'), 'utf8')).stale,
    undefined,
  );
});

test('@spec:018 S3 missing runner report fails even when Stryker returns successfully', async (t) => {
  const { buildReport, runMutationGroups } = await loadRunner();
  const cacheRoot = await mkdtemp(join(tmpdir(), 'kimen-mutation-cache-'));
  t.after(() => rm(cacheRoot, { recursive: true, force: true }));
  const report = await buildReport({
    paths: ['scripts/lib/canonical-json.mjs'],
    workspaceRoot: repositoryRoot,
  });

  await assert.rejects(
    runMutationGroups({
      report,
      workspaceRoot: repositoryRoot,
      cacheRoot,
      force: false,
      executeStryker: async () => undefined,
    }),
    /mutation report.*missing/i,
  );
});

test('@spec:018 S3 one passing runner cannot compensate for another runner below 70', async (t) => {
  const { buildReport, runMutationGroups } = await loadRunner();
  const cacheRoot = await mkdtemp(join(tmpdir(), 'kimen-mutation-cache-'));
  t.after(() => rm(cacheRoot, { recursive: true, force: true }));
  const report = await buildReport({
    paths: [
      'scripts/lib/canonical-json.mjs',
      'packages/elements/src/components/ki-progress/ki-progress.math.ts',
    ],
    workspaceRoot: repositoryRoot,
  });
  const invoked = [];
  const statusesByPath = {
    'scripts/lib/canonical-json.mjs': ['Killed'],
    'packages/elements/src/components/ki-progress/ki-progress.math.ts': [
      ...Array(69).fill('Killed'),
      ...Array(31).fill('Survived'),
    ],
  };

  await assert.rejects(
    runMutationGroups({
      report,
      workspaceRoot: repositoryRoot,
      cacheRoot,
      force: false,
      executeStryker: async (options) => {
        invoked.push(options.mutate);
        await writeFile(
          options.jsonReporter.fileName,
          JSON.stringify(
            mutationReport({ files: options.mutate, statuses: statusesByPath[options.mutate[0]] }),
          ),
        );
      },
    }),
    /elements mutation score 69\/100 \(69\.00%\) is below 70%/i,
  );
  assert.deepEqual(invoked, [
    ['scripts/lib/canonical-json.mjs'],
    ['packages/elements/src/components/ki-progress/ki-progress.math.ts'],
  ]);
});
