// @spec:018-project-integrity-hardening#S3
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

test('S3 ESLint ignores isolated tool caches even when they contain JavaScript', async (t) => {
  const fixture = join(repositoryRoot, 'reports/cache/eslint-contract/invalid.js');
  t.after(() => rm(dirname(fixture), { force: true, recursive: true }));
  await mkdir(dirname(fixture), { recursive: true });
  await writeFile(fixture, 'const = invalid syntax;\n', 'utf8');

  const result = spawnSync('pnpm', ['exec', 'eslint', '--no-warn-ignored', fixture], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});
