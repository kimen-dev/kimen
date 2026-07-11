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
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it, onTestFinished, vi } from 'vitest';

import {
  buildReport,
  discoverChangedPaths,
  main,
  runMutationGroups,
  validateRunnableFiles,
} from '../gates/mutation-changed.mjs';

// @spec:018-project-integrity-hardening

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

const git = (cwd, arguments_) =>
  execFileAsync('git', arguments_, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C' },
  });

const createGitFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-mutation-git-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
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

const createCache = async () => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-mutation-cache-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  return root;
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
  config: { mutate: files, thresholds: { high: 70, low: 70, break: 70 } },
  files: Object.fromEntries(
    files.map((path) => [
      path,
      {
        mutants: statuses.map((status, index) => ({ id: String(index), status })),
      },
    ]),
  ),
});

describe('mutation scope report', () => {
  it('@spec:018 S3 hashes exact files, all configs, lockfile, policy, and runner scopes', async () => {
    const report = await buildReport({
      paths: [
        'scripts/lib/component-inventory.mjs',
        'packages/elements/src/components/ki-button/ki-button.css',
        'packages/elements/src/components/ki-button/ki-button.tsx',
      ],
      workspaceRoot: repositoryRoot,
    });

    expect(report.schemaVersion).toBe(1);
    expect(report.files.map(({ path }) => path)).toEqual([
      'packages/elements/src/components/ki-button/ki-button.css',
      'packages/elements/src/components/ki-button/ki-button.tsx',
      'scripts/lib/component-inventory.mjs',
    ]);
    expect(report.groups).toEqual({
      elements: ['packages/elements/src/components/ki-button/ki-button.tsx'],
      node: ['scripts/lib/component-inventory.mjs'],
    });
    expect(report.runnerScopes.node).toMatch(/^[0-9a-f]{64}$/);
    expect(report.runnerScopes.elements).toMatch(/^[0-9a-f]{64}$/);
    expect(report.scopeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(report.policyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.keys(report.configHashes)).toEqual([
      'elements',
      'node',
      'vitest',
      'vitest-elements',
      'vitest-node',
    ]);
    expect(report.lockfileHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('@spec:018 S3 emits null runner scope only for an empty core group', async () => {
    const report = await buildReport({ paths: ['README.md'], workspaceRoot: repositoryRoot });

    expect(report.groups).toEqual({ elements: [], node: [] });
    expect(report.runnerScopes).toEqual({ node: null, elements: null });
  });

  it('@spec:018 S3 reports the specific missing config or lockfile', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kimen-mutation-report-'));
    onTestFinished(() => rm(root, { recursive: true, force: true }));

    await expect(buildReport({ paths: ['README.md'], workspaceRoot: root })).rejects.toThrow(
      /cannot hash mutation config/i,
    );
    await Promise.all(
      [
        'stryker.elements.config.mjs',
        'stryker.node.config.mjs',
        'vitest.mutation.config.ts',
        'vitest.mutation.elements.config.ts',
        'vitest.mutation.node.config.ts',
      ].map((name) => writeFile(join(root, name), 'export default {};\n')),
    );
    await expect(buildReport({ paths: ['README.md'], workspaceRoot: root })).rejects.toThrow(
      /cannot hash mutation lockfile/i,
    );
  });

  it('@spec:018 S3 main dry-run writes one canonical report for explicit paths', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await main({
      arguments_: ['scripts/lib/component-inventory.mjs'],
      workspaceRoot: repositoryRoot,
      environment: {},
    });

    expect(write).toHaveBeenCalledOnce();
    const output = write.mock.calls[0][0];
    expect(output.endsWith('\n')).toBe(true);
    expect(JSON.parse(output).groups.node).toEqual(['scripts/lib/component-inventory.mjs']);
    write.mockRestore();
  });

  it.each([
    ['--unknown', /unknown mutation option/i],
    [
      '--run',
      /mutation discovery requires|KIMEN_MUTATION_CACHE_DIR|Git repository discovery|must run at the repository root/i,
    ],
  ])('@spec:018 S3 main rejects unsafe or incomplete option %s', async (option, expected) => {
    await expect(
      main({ arguments_: [option], workspaceRoot: repositoryRoot, environment: {} }),
    ).rejects.toThrow(expected);
  });

  it('@spec:018 S3 treats everything after separator as a path', async () => {
    await expect(
      main({
        arguments_: ['--', '--not-an-option.ts'],
        workspaceRoot: repositoryRoot,
        environment: {},
      }),
    ).rejects.toThrow(/unclassified executable paths.*--not-an-option\.ts/i);
  });
});

describe('mutation Git discovery', () => {
  it('@spec:018 S3 includes committed, staged, unstaged, and untracked paths', async () => {
    const fixture = await createGitFixture();
    await writeFile(join(fixture.root, 'scripts/lib/committed.mjs'), 'export const value = 1;\n');
    await git(fixture.root, ['add', 'scripts/lib/committed.mjs']);
    await git(fixture.root, ['commit', '-m', 'committed candidate']);
    await writeFile(join(fixture.root, 'scripts/lib/staged.mjs'), 'export const value = 1;\n');
    await git(fixture.root, ['add', 'scripts/lib/staged.mjs']);
    await writeFile(join(fixture.root, 'scripts/lib/original.mjs'), 'export const original = 2;\n');
    await writeFile(join(fixture.root, 'scripts/lib/untracked.mjs'), 'export const value = 1;\n');

    const discovered = await discoverChangedPaths({
      workspaceRoot: fixture.root,
      environment: { KIMEN_MUTATION_BASE: fixture.baseSha },
    });

    expect(discovered).toEqual({
      baseSha: fixture.baseSha,
      baseSource: 'KIMEN_MUTATION_BASE',
      paths: [
        'scripts/lib/committed.mjs',
        'scripts/lib/original.mjs',
        'scripts/lib/staged.mjs',
        'scripts/lib/untracked.mjs',
      ],
    });
  });

  it('@spec:018 S3 chooses origin/main merge-base before upstream and HEAD', async () => {
    const origin = await createGitFixture();
    await git(origin.root, ['update-ref', 'refs/remotes/origin/main', origin.baseSha]);
    await git(origin.root, ['switch', '-c', 'feature']);
    await writeFile(join(origin.root, 'feature.txt'), 'feature\n');
    await git(origin.root, ['add', 'feature.txt']);
    await git(origin.root, ['commit', '-m', 'feature']);
    expect(
      await discoverChangedPaths({ workspaceRoot: origin.root, environment: {} }),
    ).toMatchObject({ baseSource: 'origin/main merge-base', baseSha: origin.baseSha });

    const upstream = await createGitFixture();
    await git(upstream.root, ['branch', 'base-branch', upstream.baseSha]);
    await git(upstream.root, ['switch', '-c', 'feature']);
    await git(upstream.root, ['branch', '--set-upstream-to=base-branch']);
    await writeFile(join(upstream.root, 'feature.txt'), 'feature\n');
    await git(upstream.root, ['add', 'feature.txt']);
    await git(upstream.root, ['commit', '-m', 'feature']);
    expect(
      await discoverChangedPaths({ workspaceRoot: upstream.root, environment: {} }),
    ).toMatchObject({ baseSource: 'upstream merge-base', baseSha: upstream.baseSha });

    const head = await createGitFixture();
    expect(await discoverChangedPaths({ workspaceRoot: head.root, environment: {} })).toEqual({
      baseSource: 'HEAD fallback',
      baseSha: head.baseSha,
      paths: [],
    });
  });

  it('@spec:018 S3 rejects unsafe, absent, or invalid explicit bases', async () => {
    const fixture = await createGitFixture();

    await expect(
      discoverChangedPaths({
        workspaceRoot: fixture.root,
        environment: { KIMEN_MUTATION_BASE: '--exec=unsafe' },
      }),
    ).rejects.toThrow(/safe Git commit reference/i);
    await expect(
      discoverChangedPaths({
        workspaceRoot: fixture.root,
        environment: { KIMEN_MUTATION_BASE: 'does-not-exist' },
      }),
    ).rejects.toThrow(/does not resolve to a commit/i);
  });

  it('@spec:018 S3 rejects unsupported type-change and malformed injected Git output', async () => {
    const fixture = await createGitFixture();
    await rm(join(fixture.root, 'scripts/lib/original.mjs'));
    await symlink('../../README.md', join(fixture.root, 'scripts/lib/original.mjs'));

    await expect(
      discoverChangedPaths({
        workspaceRoot: fixture.root,
        environment: { KIMEN_MUTATION_BASE: fixture.baseSha },
      }),
    ).rejects.toThrow(/unsupported or malformed Git status: T/i);

    const outputs = new Map([
      ['rev-parse --show-toplevel', { code: 0, stdout: `${fixture.root}\n`, stderr: '' }],
      [
        'rev-parse --verify --quiet --end-of-options HEAD^{commit}',
        { code: 0, stdout: 'bad\n', stderr: '' },
      ],
    ]);
    await expect(
      discoverChangedPaths({
        workspaceRoot: fixture.root,
        environment: {},
        runGit: async (arguments_) =>
          outputs.get(arguments_.join(' ')) ?? { code: 1, stdout: '', stderr: 'missing' },
      }),
    ).rejects.toThrow(/invalid commit SHA/i);
  });

  it('@spec:018 S3 rejects a workspace that is not the physical repository root', async () => {
    const fixture = await createGitFixture();
    const nested = join(fixture.root, 'scripts');

    await expect(discoverChangedPaths({ workspaceRoot: nested, environment: {} })).rejects.toThrow(
      /must run at the repository root/i,
    );
  });
});

describe('mutation runnable-file validation', () => {
  it('@spec:018 S3 accepts regular core files and ignores excluded artifacts', async () => {
    await expect(
      validateRunnableFiles({
        workspaceRoot: repositoryRoot,
        files: [
          { path: 'scripts/lib/component-inventory.mjs', classification: 'core', runner: 'node' },
          { path: 'README.md', classification: 'excluded', reason: 'documentation' },
        ],
      }),
    ).resolves.toBeUndefined();
  });

  it('@spec:018 S3 rejects deleted and symlinked executable paths before Stryker', async () => {
    const fixture = await createGitFixture();
    const deleted = [{ path: 'scripts/lib/deleted.mjs', classification: 'core', runner: 'node' }];

    await expect(
      validateRunnableFiles({ files: deleted, workspaceRoot: fixture.root }),
    ).rejects.toThrow(/deleted executable path/i);
    await symlink('original.mjs', join(fixture.root, 'scripts/lib/link.mjs'));
    await expect(
      validateRunnableFiles({
        files: [{ path: 'scripts/lib/link.mjs', classification: 'core', runner: 'node' }],
        workspaceRoot: fixture.root,
      }),
    ).rejects.toThrow(/regular non-symlink file/i);
  });
});

describe('mutation group execution', () => {
  it('@spec:018 S3 isolates scope cache, deletes stale output, and reports empty groups', async () => {
    const cacheRoot = await createCache();
    const report = await buildReport({
      paths: ['scripts/lib/component-inventory.mjs'],
      workspaceRoot: repositoryRoot,
    });
    const scopeRoot = join(await realpath(cacheRoot), 'node', report.runnerScopes.node);
    await mkdir(scopeRoot, { recursive: true });
    await writeFile(join(scopeRoot, 'mutation.json'), '{"stale":true}\n');
    const calls = [];

    const results = await runMutationGroups({
      report,
      workspaceRoot: repositoryRoot,
      cacheRoot,
      force: true,
      executeStryker: async (options) => {
        calls.push(options);
        await expect(access(options.jsonReporter.fileName)).rejects.toThrow();
        await mkdir(options.tempDirName, { recursive: true });
        await writeFile(join(options.tempDirName, 'worker'), 'temporary\n');
        await writeFile(
          options.jsonReporter.fileName,
          JSON.stringify(mutationReport({ files: options.mutate })),
        );
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      mutate: ['scripts/lib/component-inventory.mjs'],
      force: true,
      cleanTempDir: 'always',
      symlinkNodeModules: true,
      disableTypeChecks: true,
      thresholds: { high: 70, low: 70, break: 70 },
    });
    expect(calls[0].incrementalFile).toBe(join(scopeRoot, 'incremental.json'));
    expect(calls[0].jsonReporter.fileName).toBe(join(scopeRoot, 'mutation.json'));
    expect(results.node).toMatchObject({
      decision: 'pass',
      score: 80,
      files: ['scripts/lib/component-inventory.mjs'],
    });
    expect(results.elements).toEqual({
      decision: 'N/A',
      files: [],
      reason: 'no changed core files for elements',
      threshold: 70,
    });
    await expect(access(join(scopeRoot, 'tmp'))).rejects.toThrow();
    expect(
      JSON.parse(await readFile(join(scopeRoot, 'mutation.json'), 'utf8')).stale,
    ).toBeUndefined();
  });

  it('@spec:018 S3 cleans temp even when an evaluated group fails below 70', async () => {
    const cacheRoot = await createCache();
    const report = await buildReport({
      paths: ['scripts/lib/component-inventory.mjs'],
      workspaceRoot: repositoryRoot,
    });
    let tempDir;

    await expect(
      runMutationGroups({
        report,
        workspaceRoot: repositoryRoot,
        cacheRoot,
        force: false,
        executeStryker: async (options) => {
          tempDir = options.tempDirName;
          await mkdir(tempDir, { recursive: true });
          await writeFile(
            options.jsonReporter.fileName,
            JSON.stringify(
              mutationReport({
                files: options.mutate,
                statuses: [...Array(69).fill('Killed'), ...Array(31).fill('Survived')],
              }),
            ),
          );
        },
      }),
    ).rejects.toThrow(/score 69\/100 \(69\.00%\) is below 70%/i);
    await expect(access(tempDir)).rejects.toThrow();
  });

  it.each([
    [null, false, /requires a classified scope report/i],
    [{ groups: {} }, 'false', /force flag must be boolean/i],
    [{ groups: { node: 'bad', elements: [] } }, false, /missing the node group/i],
    [
      { groups: { node: ['scripts/lib/a.mjs'], elements: [] }, runnerScopes: { node: 'bad' } },
      false,
      /missing a valid node runner hash/i,
    ],
  ])('@spec:018 S3 rejects malformed group execution input %#', async (report, force, expected) => {
    const cacheRoot = await createCache();
    await expect(
      runMutationGroups({
        report,
        workspaceRoot: repositoryRoot,
        cacheRoot,
        force,
        executeStryker: async () => undefined,
      }),
    ).rejects.toThrow(expected);
  });

  it('@spec:018 S3 rejects missing and invalid JSON runner reports', async () => {
    const cacheRoot = await createCache();
    const report = await buildReport({
      paths: ['scripts/lib/component-inventory.mjs'],
      workspaceRoot: repositoryRoot,
    });

    await expect(
      runMutationGroups({
        report,
        workspaceRoot: repositoryRoot,
        cacheRoot,
        force: false,
        executeStryker: async () => undefined,
      }),
    ).rejects.toThrow(/mutation report.*missing/i);
    await expect(
      runMutationGroups({
        report,
        workspaceRoot: repositoryRoot,
        cacheRoot,
        force: false,
        executeStryker: async (options) => writeFile(options.jsonReporter.fileName, '{bad'),
      }),
    ).rejects.toThrow(/invalid JSON/i);
  });
});
