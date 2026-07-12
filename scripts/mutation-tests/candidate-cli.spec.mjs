// @spec:018-project-integrity-hardening#S7
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, it, onTestFinished } from 'vitest';

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
  for (const [name, directory] of [
    ['@kimen/elements', 'elements'],
    ['@kimen/tokens', 'tokens'],
  ]) {
    const packageDirectory = join(root, 'packages', directory);
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, 'index.js'),
      `export const name = ${JSON.stringify(name)};\n`,
    );
    await writeFile(
      join(packageDirectory, 'package.json'),
      `${JSON.stringify(
        {
          name,
          version: '0.0.0',
          private: true,
          type: 'module',
          files: ['index.js'],
          repository: {
            type: 'git',
            url: 'git+https://github.com/kimen-dev/kimen.git',
            directory: `packages/${directory}`,
          },
        },
        null,
        2,
      )}\n`,
    );
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
  expect(result.manifest.packages.map(({ name }) => name)).toEqual([
    '@kimen/elements',
    '@kimen/tokens',
  ]);
  expect((await readFile(result.archivePath)).length).toBeGreaterThan(0);

  const verified = run(
    process.execPath,
    [candidateCli, 'verify', '--archive', result.archivePath, '--sha256', result.candidateSha256],
    fixture.root,
  );
  expect(verified.status, `${verified.stdout}\n${verified.stderr}`).toBe(0);
  expect(JSON.parse(verified.stdout).candidateSha256).toBe(result.candidateSha256);
});

it.each([
  ['unknown command', ['unknown'], /usage/iu],
  ['missing build option', ['build', '--mode', 'dry-run'], /missing --repository-root/iu],
  [
    'duplicate verify option',
    ['verify', '--archive', 'a', '--archive', 'b', '--sha256', 'c'],
    /duplicate option --archive/iu,
  ],
  ['unknown verify option', ['verify', '--unknown', 'a'], /invalid.*--unknown/iu],
])('S7 CLI rejects %s', (_name, arguments_, expected) => {
  const result = run(process.execPath, [candidateCli, ...arguments_], repositoryRoot);
  expect(result.status).not.toBe(0);
  expect(`${result.stdout}\n${result.stderr}`).toMatch(expected);
});
