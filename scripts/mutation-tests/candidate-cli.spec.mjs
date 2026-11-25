// @spec:018-project-integrity-hardening#S7
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, it, onTestFinished } from 'vitest';

import { runCandidateCli } from '../release/candidate-cli.mjs';
import { releasePackages } from '../release/release-plan.mjs';
import { writeBuiltPackage } from '../tests/fixtures/built-package.mjs';
import { mcpFixtureFields, writeMcpFixtureFiles } from '../tests/fixtures/mcp-package.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const candidateCli = join(repositoryRoot, 'scripts/release/candidate-cli.mjs');

function run(command, arguments_, cwd) {
  return spawnSync(command, arguments_, {
    cwd,
    encoding: 'utf8',
    env: { LC_ALL: 'C', PATH: process.env.PATH },
  });
}

function mustRun(command, arguments_, cwd) {
  const result = run(command, arguments_, cwd);
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  return result.stdout.trim();
}

async function createRepository() {
  const root = await mkdtemp(join(tmpdir(), 'kimen-candidate-cli-mutation-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  mustRun('git', ['init', '--initial-branch=main'], root);
  mustRun('git', ['config', 'user.email', 'fixture@example.invalid'], root);
  mustRun('git', ['config', 'user.name', 'Fixture'], root);
  for (const [name, path] of releasePackages) {
    const directory = path.split('/')[1];
    const packageDirectory = join(root, 'packages', directory);
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, 'index.js'),
      `export const name = ${JSON.stringify(name)};\n`,
    );
    await writeFile(join(packageDirectory, 'LICENSE'), 'Apache License, Version 2.0 (fixture)\n');
    await writeFile(join(packageDirectory, 'NOTICE'), 'Kimen fixture notices\n');
    await writeFile(join(packageDirectory, 'README.md'), `# ${name}\n`);
    const runtime = {
      emitter: '@kimen/catalog',
      'adapter-a2ui': '@kimen/catalog',
      'adapter-mcp-apps': '@kimen/catalog',
      react: '@kimen/elements',
      vue: '@kimen/elements',
      angular: '@kimen/elements',
    }[directory];
    const manifest = {
      name,
      version: '0.0.0',
      private: true,
      type: 'module',
      ...(directory === 'angular' ? {} : { files: ['index.js', 'NOTICE'] }),
      ...(directory === 'mcp-server' ? mcpFixtureFields : {}),
      ...(runtime === undefined ? {} : { dependencies: { [runtime]: 'workspace:*' } }),
      repository: {
        type: 'git',
        url: 'git+https://github.com/kimen-dev/kimen.git',
        directory: `packages/${directory}`,
      },
    };
    await writeFile(
      join(packageDirectory, 'package.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    if (directory === 'angular') await writeBuiltPackage(packageDirectory, manifest);
    if (directory === 'mcp-server') await writeMcpFixtureFiles(packageDirectory, '0.0.0');
  }
  mustRun('git', ['add', '.'], root);
  mustRun('git', ['commit', '-m', 'fixture'], root);
  return { root, sourceSha: mustRun('git', ['rev-parse', 'HEAD'], root) };
}

it('S7 CLI builds and independently verifies one dry-run candidate', async () => {
  const fixture = await createRepository();
  const outputDirectory = join(fixture.root, 'output');
  const built = run(
    process.execPath,
    [
      candidateCli,
      'build',
      '--mode',
      'dry-run',
      '--repository-root',
      fixture.root,
      '--output-directory',
      outputDirectory,
      '--source-sha',
      fixture.sourceSha,
    ],
    fixture.root,
  );
  expect(built.status, `${built.stdout}\n${built.stderr}`).toBe(0);
  const result = JSON.parse(built.stdout);
  expect(result.manifest.mode).toBe('dry-run');
  expect(result.manifest.tag).toBeNull();
  expect(result.manifest.packages.map(({ name }) => name)).toEqual([...releasePackages.keys()]);
  expect((await readFile(result.archivePath)).length).toBeGreaterThan(0);

  const verified = run(
    process.execPath,
    [candidateCli, 'verify', '--archive', result.archivePath, '--sha256', result.candidateSha256],
    fixture.root,
  );
  expect(verified.status, `${verified.stdout}\n${verified.stderr}`).toBe(0);
  expect(JSON.parse(verified.stdout).candidateSha256).toBe(result.candidateSha256);
}, 30_000);

it.each([
  ['unknown command', ['unknown'], /usage/iu],
  ['missing build option', ['build', '--mode', 'dry-run'], /missing --repository-root/iu],
  [
    'duplicate verify option',
    ['verify', '--archive', 'a', '--archive', 'b', '--sha256', 'c'],
    /duplicate option --archive/iu,
  ],
  ['unknown verify option', ['verify', '--unknown', 'a'], /invalid.*--unknown/iu],
  ['missing smoke digest', ['smoke', '--archive', 'a'], /missing --sha256/iu],
  ['unknown smoke option', ['smoke', '--registry', 'a'], /invalid.*--registry/iu],
])('S7 CLI rejects %s', (_name, arguments_, expected) => {
  const result = run(process.execPath, [candidateCli, ...arguments_], repositoryRoot);
  expect(result.status).not.toBe(0);
  expect(`${result.stdout}\n${result.stderr}`).toMatch(expected);
});

it('S7 CLI smokes the candidate it is given, by its digest and in the caller environment', async () => {
  const calls = [];
  const written = [];
  const result = await runCandidateCli({
    arguments_: ['smoke', '--archive', 'candidate.tar', '--sha256', 'f'.repeat(64)],
    environment: { PATH: '/bin' },
    stdout: { write: (text) => written.push(text) },
    smokeCandidateImpl: async (options) => {
      calls.push(options);
      return { version: '1.2.3', generative: { installed: ['@kimen/catalog'] } };
    },
    verifyCandidateImpl: () => {
      throw new Error('smoke must not dispatch to verify');
    },
  });

  expect(calls).toEqual([
    {
      archivePath: join(process.cwd(), 'candidate.tar'),
      environment: { PATH: '/bin' },
      expectedSha256: 'f'.repeat(64),
    },
  ]);
  expect(result).toEqual({ version: '1.2.3', generative: { installed: ['@kimen/catalog'] } });
  expect(written).toEqual([`${JSON.stringify(result)}\n`]);
});

it('S7 CLI usage names its three commands', async () => {
  await expect(
    runCandidateCli({ arguments_: [], stdout: { write: () => undefined } }),
  ).rejects.toThrow('candidate-cli: usage: candidate-cli.mjs <build|verify|smoke> [options]');
});
