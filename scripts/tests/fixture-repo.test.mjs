import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { createFixtureRepo } from './helpers/fixture-repo.mjs';

const execFileAsync = promisify(execFile);
const fixtureHelperUrl = new URL('./helpers/fixture-repo.mjs', import.meta.url).href;
const gitExecPath = execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim();

const inspectEnvironment = `
const names = [
  'COREPACK_HOME',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_KEY_0',
  'GIT_CONFIG_NOSYSTEM',
  'GIT_CONFIG_SYSTEM',
  'GIT_CONFIG_VALUE_0',
  'GIT_DIR',
  'GIT_EXEC_PATH',
  'GIT_FUTURE_FIXTURE_STATE',
  'GIT_INDEX_FILE',
  'GIT_NAMESPACE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_SHALLOW_FILE',
  'GIT_TEMPLATE_DIR',
  'GIT_WORK_TREE',
  'KIMEN_CACHE_ENV_READY',
  'KIMEN_CACHE_ROOT',
  'KIMEN_CONSUMER_CACHE_DIR',
  'KIMEN_MUTATION_CACHE_DIR',
  'NPM_CONFIG_CACHE',
  'NPM_CONFIG_GLOBALCONFIG',
  'NPM_CONFIG_STORE_DIR',
  'NPM_CONFIG_USERCONFIG',
  'NX_CACHE_DIRECTORY',
  'NX_DAEMON',
  'NX_NATIVE_FILE_CACHE_DIRECTORY',
  'NX_WORKSPACE_DATA_DIRECTORY',
  'PLAYWRIGHT_BROWSERS_PATH',
  'XDG_CACHE_HOME',
];
const prepared = Object.fromEntries(names.map((name) => [name, process.env[name] ?? null]));
process.stdout.write(JSON.stringify({
  prepared,
  sentinel: process.env.FIXTURE_PARENT_SENTINEL ?? null,
}));
`;

const preparedParentEnvironment = {
  COREPACK_HOME: '/parent/corepack',
  FIXTURE_PARENT_SENTINEL: 'preserved',
  GIT_ALTERNATE_OBJECT_DIRECTORIES: '/parent/git/alternates',
  GIT_COMMON_DIR: '/parent/git/common',
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_GLOBAL: '/parent/git/global-config',
  GIT_CONFIG_KEY_0: 'user.name',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_SYSTEM: '/parent/git/system-config',
  GIT_CONFIG_VALUE_0: 'parent fixture',
  GIT_DIR: '/parent/git/dir',
  GIT_EXEC_PATH: gitExecPath,
  GIT_FUTURE_FIXTURE_STATE: 'must-not-cross-fixture-boundary',
  GIT_INDEX_FILE: '/parent/git/index',
  GIT_NAMESPACE: 'parent-namespace',
  GIT_OBJECT_DIRECTORY: '/parent/git/objects',
  GIT_SHALLOW_FILE: '/dev/null',
  GIT_WORK_TREE: '/parent/git/work-tree',
  KIMEN_CACHE_ENV_READY: '1',
  KIMEN_CACHE_ROOT: '/parent/cache',
  KIMEN_CONSUMER_CACHE_DIR: '/parent/consumer',
  KIMEN_MUTATION_CACHE_DIR: '/parent/mutation',
  NPM_CONFIG_CACHE: '/parent/npm/cache',
  NPM_CONFIG_GLOBALCONFIG: '/parent/npm/globalconfig',
  NPM_CONFIG_STORE_DIR: '/parent/pnpm/store',
  NPM_CONFIG_USERCONFIG: '/parent/npm/userconfig',
  NX_CACHE_DIRECTORY: '/parent/nx/cache',
  NX_DAEMON: 'false',
  NX_NATIVE_FILE_CACHE_DIRECTORY: '/parent/nx/native',
  NX_WORKSPACE_DATA_DIRECTORY: '/parent/nx/workspace-data',
  PLAYWRIGHT_BROWSERS_PATH: '/parent/playwright',
  XDG_CACHE_HOME: '/parent/xdg',
};

const clearedPreparedEnvironment = {
  COREPACK_HOME: null,
  GIT_ALTERNATE_OBJECT_DIRECTORIES: null,
  GIT_COMMON_DIR: null,
  GIT_CONFIG_COUNT: null,
  GIT_CONFIG_GLOBAL: null,
  GIT_CONFIG_KEY_0: null,
  GIT_CONFIG_NOSYSTEM: null,
  GIT_CONFIG_SYSTEM: null,
  GIT_CONFIG_VALUE_0: null,
  GIT_DIR: null,
  GIT_EXEC_PATH: null,
  GIT_FUTURE_FIXTURE_STATE: null,
  GIT_INDEX_FILE: null,
  GIT_NAMESPACE: null,
  GIT_OBJECT_DIRECTORY: null,
  GIT_SHALLOW_FILE: null,
  GIT_TEMPLATE_DIR: null,
  GIT_WORK_TREE: null,
  KIMEN_CACHE_ENV_READY: null,
  KIMEN_CACHE_ROOT: null,
  KIMEN_CONSUMER_CACHE_DIR: null,
  KIMEN_MUTATION_CACHE_DIR: null,
  NPM_CONFIG_CACHE: null,
  NPM_CONFIG_GLOBALCONFIG: null,
  NPM_CONFIG_STORE_DIR: null,
  NPM_CONFIG_USERCONFIG: null,
  NX_CACHE_DIRECTORY: null,
  NX_DAEMON: null,
  NX_NATIVE_FILE_CACHE_DIRECTORY: null,
  NX_WORKSPACE_DATA_DIRECTORY: null,
  PLAYWRIGHT_BROWSERS_PATH: null,
  XDG_CACHE_HOME: null,
};

test('fixture commands clear prepared parent caches and Git state without clearing unrelated environment', async (t) => {
  const fixture = await createFixtureRepo({ environment: preparedParentEnvironment });
  t.after(() => fixture.cleanup());

  const result = await fixture.run(process.execPath, ['-e', inspectEnvironment]);

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    prepared: clearedPreparedEnvironment,
    sentinel: 'preserved',
  });
});

test('fixture commands preserve a cache value supplied explicitly by the test', async (t) => {
  const fixture = await createFixtureRepo({ environment: preparedParentEnvironment });
  t.after(() => fixture.cleanup());

  const result = await fixture.run(process.execPath, ['-e', inspectEnvironment], {
    env: {
      GIT_INDEX_FILE: '/explicit/git/index',
      KIMEN_CACHE_ENV_READY: '1',
      KIMEN_CACHE_ROOT: '/explicit/cache',
    },
  });

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    prepared: {
      ...clearedPreparedEnvironment,
      GIT_INDEX_FILE: '/explicit/git/index',
      KIMEN_CACHE_ENV_READY: '1',
      KIMEN_CACHE_ROOT: '/explicit/cache',
    },
    sentinel: 'preserved',
  });
});

test('git init cannot be redirected by Git state inherited from the process', async (t) => {
  const redirectedGitDirectory = await mkdtemp(join(tmpdir(), 'kimen-redirected-git-'));
  t.after(() => rm(redirectedGitDirectory, { recursive: true, force: true }));

  const childSource = `
    import { createFixtureRepo } from ${JSON.stringify(fixtureHelperUrl)};

    const fixture = await createFixtureRepo();
    try {
      const result = await fixture.run('git', ['rev-parse', '--is-inside-work-tree']);
      process.stdout.write(JSON.stringify({ result }));
    } finally {
      await fixture.cleanup();
    }
  `;
  const child = await execFileAsync(process.execPath, ['--input-type=module', '-e', childSource], {
    env: { ...process.env, GIT_DIR: redirectedGitDirectory },
  });
  const observed = JSON.parse(child.stdout);

  assert.equal(observed.result.code, 0, observed.result.stderr);
  assert.equal(observed.result.stdout.trim(), 'true');
});

test('git init does not install hooks from an inherited Git template', async (t) => {
  const templateDirectory = await mkdtemp(join(tmpdir(), 'kimen-git-template-'));
  await mkdir(join(templateDirectory, 'hooks'), { recursive: true });
  await writeFile(join(templateDirectory, 'hooks/post-commit'), '#!/bin/sh\nexit 99\n', 'utf8');
  t.after(() => rm(templateDirectory, { recursive: true, force: true }));

  const fixture = await createFixtureRepo({
    environment: { ...process.env, GIT_TEMPLATE_DIR: templateDirectory },
  });
  t.after(() => fixture.cleanup());

  await assert.rejects(access(join(fixture.root, '.git/hooks/post-commit')), { code: 'ENOENT' });
});
