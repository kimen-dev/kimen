// @spec:018-project-integrity-hardening
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const configProject = join(repositoryRoot, 'packages/elements/scripts/tsconfig.json');

function runTypeScript(project, extraArguments = []) {
  return spawnSync('pnpm', ['exec', 'tsc', '-p', project, '--pretty', 'false', ...extraArguments], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
  });
}

const diagnostic = (result) => `${result.stdout}\n${result.stderr}`;

test('@spec:018-project-integrity-hardening S6 root typecheck invokes the explicit configuration project', async () => {
  const packageJson = JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8'));

  assert.match(
    packageJson.scripts.typecheck,
    /tsc\s+-p\s+packages\/elements\/scripts(?:\/tsconfig\.json)?(?:\s|$)/,
  );
});

test('@spec:018-project-integrity-hardening S6 the configuration project typechecks every Stencil, Vitest, browser and mutation config', () => {
  const result = runTypeScript(configProject, ['--noEmit', '--listFilesOnly']);
  assert.equal(result.status, 0, diagnostic(result));

  const listedFiles = new Set(
    result.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((file) => resolve(file)),
  );
  const expectedConfigs = [
    'packages/elements/stencil.config.ts',
    'packages/elements/vitest.config.ts',
    'packages/elements/vitest.node.config.ts',
    'packages/elements/vitest.browser.config.ts',
    'vitest.mutation.config.ts',
    'vitest.mutation.elements.config.ts',
    'vitest.mutation.node.config.ts',
  ].map((file) => join(repositoryRoot, file));

  assert.deepEqual(
    expectedConfigs.filter((file) => !listedFiles.has(file)),
    [],
    'every executable TypeScript configuration must be part of the explicit config project',
  );
});

test('@spec:018-project-integrity-hardening S6 an invalid typed config fails deterministically', async (t) => {
  const fixtureDirectory = await mkdtemp(
    join(repositoryRoot, 'scripts/tests/.config-typecheck-fixture-'),
  );
  t.after(() => rm(fixtureDirectory, { force: true, recursive: true }));
  const fixtureConfig = join(fixtureDirectory, 'invalid.config.ts');
  const fixtureProject = join(fixtureDirectory, 'tsconfig.json');
  await writeFile(
    fixtureConfig,
    [
      "import { defineConfig } from 'vitest/config';",
      '',
      'export default defineConfig({',
      "  test: { passWithNoTests: 'not-a-boolean' },",
      '});',
      '',
    ].join('\n'),
  );
  await writeFile(
    fixtureProject,
    `${JSON.stringify(
      {
        extends: '../../../tsconfig.base.json',
        compilerOptions: {
          composite: false,
          declaration: false,
          noEmit: true,
        },
        files: ['./invalid.config.ts'],
      },
      null,
      2,
    )}\n`,
  );

  const result = runTypeScript(fixtureProject);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /invalid\.config\.ts/);
  assert.match(diagnostic(result), /string.*boolean|boolean.*string|No overload matches/i);
});

test('@spec:018-project-integrity-hardening S6 configuration validation precedes browser launch', async () => {
  const source = await readFile(join(repositoryRoot, 'scripts/gates/gates-browser.sh'), 'utf8');
  const executableLines = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
  const typecheckIndex = executableLines.findIndex((line) =>
    /(?:pnpm run typecheck|tsc\b.*packages\/elements\/scripts)/.test(line),
  );
  const browserIndex = executableLines.findIndex((line) =>
    /(?:test-browser|vitest\b.*browser)/.test(line),
  );

  assert.notEqual(typecheckIndex, -1, 'browser gate must execute the config typecheck');
  assert.notEqual(browserIndex, -1, 'browser gate must execute a real browser command');
  assert.ok(typecheckIndex < browserIndex, 'config typecheck must fail before browser launch');
});
