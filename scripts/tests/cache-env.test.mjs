import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const cacheEnvSource = join(repositoryRoot, 'scripts/gates/cache-env.sh');

const selectedEnvironmentScript = `
const environment = {
  NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE,
  NPM_CONFIG_STORE_DIR: process.env.NPM_CONFIG_STORE_DIR,
  NPM_CONFIG_USERCONFIG: process.env.NPM_CONFIG_USERCONFIG,
  NPM_CONFIG_GLOBALCONFIG: process.env.NPM_CONFIG_GLOBALCONFIG,
  COREPACK_HOME: process.env.COREPACK_HOME,
  XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
  NX_CACHE_DIRECTORY: process.env.NX_CACHE_DIRECTORY,
  NX_WORKSPACE_DATA_DIRECTORY: process.env.NX_WORKSPACE_DATA_DIRECTORY,
  NX_NATIVE_FILE_CACHE_DIRECTORY: process.env.NX_NATIVE_FILE_CACHE_DIRECTORY,
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
  KIMEN_CONSUMER_CACHE_DIR: process.env.KIMEN_CONSUMER_CACHE_DIR,
  KIMEN_MUTATION_CACHE_DIR: process.env.KIMEN_MUTATION_CACHE_DIR,
  KIMEN_CACHE_ROOT: process.env.KIMEN_CACHE_ROOT,
  NX_DAEMON: process.env.NX_DAEMON,
  KIMEN_CACHE_ENV_READY: process.env.KIMEN_CACHE_ENV_READY,
  PNPM_HOME: process.env.PNPM_HOME ?? null,
};
process.stdout.write(JSON.stringify(environment));
`;

function expectedEnvironment(cacheRoot, overrides = {}) {
  return {
    NPM_CONFIG_CACHE: join(cacheRoot, 'npm/cache'),
    NPM_CONFIG_STORE_DIR: join(cacheRoot, 'pnpm/store'),
    NPM_CONFIG_USERCONFIG: join(cacheRoot, 'npm/userconfig'),
    NPM_CONFIG_GLOBALCONFIG: join(cacheRoot, 'npm/globalconfig'),
    COREPACK_HOME: join(cacheRoot, 'corepack'),
    XDG_CACHE_HOME: join(cacheRoot, 'xdg'),
    NX_CACHE_DIRECTORY: join(cacheRoot, 'nx/cache'),
    NX_WORKSPACE_DATA_DIRECTORY: join(cacheRoot, 'nx/workspace-data'),
    NX_NATIVE_FILE_CACHE_DIRECTORY: join(cacheRoot, 'nx/native'),
    PLAYWRIGHT_BROWSERS_PATH: join(cacheRoot, 'playwright'),
    KIMEN_CONSUMER_CACHE_DIR: join(cacheRoot, 'consumer'),
    KIMEN_MUTATION_CACHE_DIR: join(cacheRoot, 'mutation'),
    KIMEN_CACHE_ROOT: cacheRoot,
    NX_DAEMON: 'false',
    KIMEN_CACHE_ENV_READY: '1',
    ...overrides,
  };
}

async function createFixture() {
  const temporarySandbox = await mkdtemp(join(tmpdir(), 'kimen-cache-env-'));
  const sandbox = await realpath(temporarySandbox);
  const repository = join(sandbox, 'repository');
  const home = join(sandbox, 'read-only-home');
  const fixtureScript = join(repository, 'scripts/gates/cache-env.sh');

  await mkdir(dirname(fixtureScript), { recursive: true });
  await mkdir(home, { recursive: true });
  await symlink(cacheEnvSource, fixtureScript);
  await chmod(home, 0o500);
  const physicalRepository = await realpath(repository);

  return {
    sandbox,
    repository,
    home,
    script: fixtureScript,
    cacheRoot: join(physicalRepository, 'reports/cache'),
    async cleanup() {
      await chmod(home, 0o700);
      await rm(sandbox, { recursive: true, force: true });
    },
  };
}

async function runCacheEnv(fixture, arguments_, environment = {}) {
  try {
    const result = await execFileAsync('bash', [fixture.script, ...arguments_], {
      cwd: fixture.repository,
      encoding: 'utf8',
      env: {
        HOME: fixture.home,
        LC_ALL: 'C',
        PATH: process.env.PATH,
        ...environment,
      },
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      code: typeof error.code === 'number' ? error.code : 1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    };
  }
}

function parseGitHubEnvironment(contents) {
  return Object.fromEntries(
    contents
      .trim()
      .split('\n')
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function prepareValidationEnvironment(fixture, name) {
  const githubEnvironment = join(fixture.sandbox, name);
  await writeFile(githubEnvironment, '', { mode: 0o600 });
  const prepared = await runCacheEnv(fixture, ['--github-env', githubEnvironment]);
  assert.equal(prepared.code, 0, prepared.stderr);
  return parseGitHubEnvironment(await readFile(githubEnvironment, 'utf8'));
}

test('runs a command with isolated writable caches when HOME is read-only', async () => {
  const fixture = await createFixture();

  try {
    const result = await runCacheEnv(
      fixture,
      ['--', process.execPath, '-e', selectedEnvironmentScript],
      {
        NPM_TOKEN: 'must-not-appear-in-wrapper-output',
        PNPM_HOME: join(fixture.home, 'pnpm'),
      },
    );
    const environment = JSON.parse(result.stdout);
    const expected = expectedEnvironment(fixture.cacheRoot, {
      PNPM_HOME: join(fixture.home, 'pnpm'),
    });

    assert.deepEqual(
      { code: result.code, stderr: result.stderr, environment },
      { code: 0, stderr: '', environment: expected },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('re-enters with the validated prepared environment when the repository cache is below HOME', async () => {
  const fixture = await createFixture();

  try {
    const result = await runCacheEnv(
      fixture,
      ['--', 'bash', fixture.script, '--', process.execPath, '-e', selectedEnvironmentScript],
      { HOME: fixture.sandbox },
    );
    const environment = result.code === 0 ? JSON.parse(result.stdout) : null;

    assert.deepEqual(
      { code: result.code, stderr: result.stderr, environment },
      {
        code: 0,
        stderr: '',
        environment: expectedEnvironment(fixture.cacheRoot, { PNPM_HOME: null }),
      },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('creates every cache directory and private empty npm config files', async () => {
  const fixture = await createFixture();

  try {
    const result = await runCacheEnv(fixture, ['--', process.execPath, '-e', '']);
    const expected = expectedEnvironment(fixture.cacheRoot);
    const directoryStats = await Promise.all(
      [
        expected.NPM_CONFIG_CACHE,
        expected.NPM_CONFIG_STORE_DIR,
        expected.COREPACK_HOME,
        expected.XDG_CACHE_HOME,
        expected.NX_CACHE_DIRECTORY,
        expected.NX_WORKSPACE_DATA_DIRECTORY,
        expected.NX_NATIVE_FILE_CACHE_DIRECTORY,
        expected.PLAYWRIGHT_BROWSERS_PATH,
        expected.KIMEN_CONSUMER_CACHE_DIR,
        expected.KIMEN_MUTATION_CACHE_DIR,
      ].map((path) => stat(path)),
    );
    const userConfig = await stat(expected.NPM_CONFIG_USERCONFIG);
    const globalConfig = await stat(expected.NPM_CONFIG_GLOBALCONFIG);

    assert.deepEqual(
      {
        code: result.code,
        allDirectories: directoryStats.every((entry) => entry.isDirectory()),
        userConfig: { size: userConfig.size, mode: userConfig.mode & 0o777 },
        globalConfig: { size: globalConfig.size, mode: globalConfig.mode & 0o777 },
      },
      {
        code: 0,
        allDirectories: true,
        userConfig: { size: 0, mode: 0o600 },
        globalConfig: { size: 0, mode: 0o600 },
      },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('appends exact cache values to a GitHub environment file without leaking secrets', async () => {
  const fixture = await createFixture();

  try {
    const cacheRoot = join(fixture.sandbox, 'explicit-cache');
    const npmCache = join(fixture.sandbox, 'preserved-npm-cache');
    const browsers = join(fixture.sandbox, 'prepared-browsers');
    const githubEnvironment = join(fixture.sandbox, 'github-environment');
    await writeFile(githubEnvironment, '', { mode: 0o600 });

    const result = await runCacheEnv(fixture, ['--github-env', githubEnvironment], {
      KIMEN_CACHE_ROOT: cacheRoot,
      NPM_CONFIG_CACHE: npmCache,
      PLAYWRIGHT_BROWSERS_PATH: browsers,
      NODE_AUTH_TOKEN: 'must-not-appear-in-wrapper-output',
      PNPM_HOME: join(fixture.home, 'pnpm'),
    });
    const contents = await readFile(githubEnvironment, 'utf8');
    const environment = parseGitHubEnvironment(contents);
    const validation = await runCacheEnv(fixture, ['--validate'], environment);
    const expected = expectedEnvironment(cacheRoot, {
      NPM_CONFIG_CACHE: npmCache,
      PLAYWRIGHT_BROWSERS_PATH: browsers,
    });

    assert.deepEqual(
      {
        code: result.code,
        environment,
        stderr: result.stderr,
        stdout: result.stdout,
        validation: {
          code: validation.code,
          stderr: validation.stderr,
          stdout: validation.stdout,
        },
      },
      {
        code: 0,
        environment: expected,
        stderr: '',
        stdout: '',
        validation: { code: 0, stderr: '', stdout: '' },
      },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('validates a complete prepared environment and rejects an orphan or relative ready flag', async () => {
  const fixture = await createFixture();

  try {
    const githubEnvironment = join(fixture.sandbox, 'github-environment');
    await writeFile(githubEnvironment, '', { mode: 0o600 });
    const prepared = await runCacheEnv(fixture, ['--github-env', githubEnvironment]);
    const environment = parseGitHubEnvironment(await readFile(githubEnvironment, 'utf8'));
    const valid = await runCacheEnv(fixture, ['--validate'], environment);
    const orphan = await runCacheEnv(fixture, ['--validate'], {
      KIMEN_CACHE_ENV_READY: '1',
    });
    const relative = await runCacheEnv(fixture, ['--validate'], {
      ...environment,
      NPM_CONFIG_CACHE: 'relative/cache',
    });

    assert.deepEqual(
      {
        orphanFailed: orphan.code !== 0,
        prepared: prepared.code,
        relativeFailed: relative.code !== 0,
        valid: { code: valid.code, stderr: valid.stderr, stdout: valid.stdout },
      },
      {
        orphanFailed: true,
        prepared: 0,
        relativeFailed: true,
        valid: { code: 0, stderr: '', stdout: '' },
      },
    );
    assert.match(orphan.stderr, /required|missing|NPM_CONFIG_CACHE/i);
    assert.match(relative.stderr, /NPM_CONFIG_CACHE.*absolute/i);
  } finally {
    await fixture.cleanup();
  }
});

test('validation rejects a complete ready environment whose cache is redirected into HOME', async () => {
  const fixture = await createFixture();

  try {
    const environment = await prepareValidationEnvironment(fixture, 'home-cache-environment');
    const homeCache = join(fixture.home, 'redirected-cache');
    await chmod(fixture.home, 0o700);
    await mkdir(homeCache);
    await chmod(fixture.home, 0o500);
    const result = await runCacheEnv(fixture, ['--validate'], {
      ...environment,
      NPM_CONFIG_CACHE: homeCache,
    });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /NPM_CONFIG_CACHE.*outside HOME/i);
  } finally {
    await fixture.cleanup();
  }
});

test('validation rejects a complete ready environment with a world-writable npmrc', async () => {
  const fixture = await createFixture();

  try {
    const environment = await prepareValidationEnvironment(fixture, 'npmrc-mode-environment');
    await chmod(environment.NPM_CONFIG_USERCONFIG, 0o666);
    const result = await runCacheEnv(fixture, ['--validate'], environment);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /NPM_CONFIG_USERCONFIG.*0600/i);
  } finally {
    await fixture.cleanup();
  }
});

test('rejects a pre-existing group-writable cache root before command execution', async () => {
  const fixture = await createFixture();

  try {
    await mkdir(fixture.cacheRoot, { recursive: true });
    await chmod(fixture.cacheRoot, 0o770);

    const result = await runCacheEnv(fixture, [
      '--',
      process.execPath,
      '-e',
      "process.stdout.write('COMMAND-RAN')",
    ]);

    assert.notEqual(result.code, 0);
    assert.doesNotMatch(result.stdout, /COMMAND-RAN/);
    assert.match(result.stderr, /KIMEN_CACHE_ROOT.*group.*writable/i);
  } finally {
    await fixture.cleanup();
  }
});

test('rejects a pre-existing world-writable cache subdirectory before command execution', async () => {
  const fixture = await createFixture();

  try {
    const npmCache = join(fixture.cacheRoot, 'npm/cache');
    await mkdir(npmCache, { recursive: true });
    await chmod(npmCache, 0o707);

    const result = await runCacheEnv(fixture, [
      '--',
      process.execPath,
      '-e',
      "process.stdout.write('COMMAND-RAN')",
    ]);

    assert.notEqual(result.code, 0);
    assert.doesNotMatch(result.stdout, /COMMAND-RAN/);
    assert.match(result.stderr, /NPM_CONFIG_CACHE.*group.*writable/i);
  } finally {
    await fixture.cleanup();
  }
});

test('rejects a shared-writable intermediate cache directory before command execution', async () => {
  const fixture = await createFixture();

  try {
    const nxParent = join(fixture.cacheRoot, 'nx');
    const nxCache = join(nxParent, 'cache');
    await mkdir(nxCache, { recursive: true });
    await chmod(fixture.cacheRoot, 0o700);
    await chmod(nxParent, 0o777);
    await chmod(nxCache, 0o700);

    const result = await runCacheEnv(fixture, [
      '--',
      process.execPath,
      '-e',
      "process.stdout.write('COMMAND-RAN')",
    ]);

    assert.notEqual(result.code, 0);
    assert.doesNotMatch(result.stdout, /COMMAND-RAN/);
    assert.match(result.stderr, /NX_CACHE_DIRECTORY.*group.*writable/i);
  } finally {
    await fixture.cleanup();
  }
});

test('re-entry rejects a manipulated prepared directory before command execution', async () => {
  const fixture = await createFixture();

  try {
    const environment = await prepareValidationEnvironment(
      fixture,
      'manipulated-reentry-environment',
    );
    await chmod(environment.NX_CACHE_DIRECTORY, 0o777);

    const result = await runCacheEnv(
      fixture,
      ['--', process.execPath, '-e', "process.stdout.write('COMMAND-RAN')"],
      environment,
    );

    assert.notEqual(result.code, 0);
    assert.doesNotMatch(result.stdout, /COMMAND-RAN/);
    assert.match(result.stderr, /NX_CACHE_DIRECTORY.*group.*writable/i);
  } finally {
    await fixture.cleanup();
  }
});

test('fails closed before command execution for a relative override', async () => {
  const fixture = await createFixture();

  try {
    const result = await runCacheEnv(
      fixture,
      ['--', process.execPath, '-e', "process.stdout.write('COMMAND-RAN')"],
      { NPM_CONFIG_CACHE: 'relative/cache' },
    );

    assert.deepEqual(
      { code: result.code === 0, commandRan: result.stdout.includes('COMMAND-RAN') },
      { code: false, commandRan: false },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('fails closed before command execution for an explicitly empty override', async () => {
  const fixture = await createFixture();

  try {
    const result = await runCacheEnv(
      fixture,
      ['--', process.execPath, '-e', "process.stdout.write('COMMAND-RAN')"],
      { NPM_CONFIG_CACHE: '' },
    );

    assert.deepEqual(
      { code: result.code === 0, commandRan: result.stdout.includes('COMMAND-RAN') },
      { code: false, commandRan: false },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('fails closed before command execution for an override below HOME', async () => {
  const fixture = await createFixture();

  try {
    const result = await runCacheEnv(
      fixture,
      ['--', process.execPath, '-e', "process.stdout.write('COMMAND-RAN')"],
      { NPM_CONFIG_CACHE: join(fixture.home, 'cache') },
    );

    assert.deepEqual(
      { code: result.code === 0, commandRan: result.stdout.includes('COMMAND-RAN') },
      { code: false, commandRan: false },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('fails closed before command execution for a symlink override', async () => {
  const fixture = await createFixture();

  try {
    const realCache = join(fixture.sandbox, 'real-cache');
    const linkedCache = join(fixture.sandbox, 'linked-cache');
    await mkdir(realCache);
    await symlink(realCache, linkedCache);

    const result = await runCacheEnv(
      fixture,
      ['--', process.execPath, '-e', "process.stdout.write('COMMAND-RAN')"],
      { NPM_CONFIG_CACHE: linkedCache },
    );
    const linkedCacheStats = await lstat(linkedCache);

    assert.deepEqual(
      {
        code: result.code === 0,
        commandRan: result.stdout.includes('COMMAND-RAN'),
        remainedSymlink: linkedCacheStats.isSymbolicLink(),
      },
      { code: false, commandRan: false, remainedSymlink: true },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('rejects a symlink ancestor below the default repository cache root', async () => {
  const fixture = await createFixture();

  try {
    const redirectedReports = join(fixture.sandbox, 'redirected-reports');
    await mkdir(redirectedReports);
    await symlink(redirectedReports, join(fixture.repository, 'reports'));

    const result = await runCacheEnv(fixture, [
      '--',
      process.execPath,
      '-e',
      "process.stdout.write('COMMAND-RAN')",
    ]);
    const redirectedContents = await readdir(redirectedReports);

    assert.deepEqual(
      {
        code: result.code === 0,
        commandRan: result.stdout.includes('COMMAND-RAN'),
        redirectedContents,
      },
      { code: false, commandRan: false, redirectedContents: [] },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('fails closed before command execution for a non-writable override', async () => {
  const fixture = await createFixture();
  const cache = join(fixture.sandbox, 'non-writable-cache');

  try {
    await mkdir(cache, { mode: 0o500 });

    const result = await runCacheEnv(
      fixture,
      ['--', process.execPath, '-e', "process.stdout.write('COMMAND-RAN')"],
      { NPM_CONFIG_CACHE: cache },
    );

    assert.deepEqual(
      { code: result.code === 0, commandRan: result.stdout.includes('COMMAND-RAN') },
      { code: false, commandRan: false },
    );
  } finally {
    await chmod(cache, 0o700);
    await fixture.cleanup();
  }
});

test('rejects a non-empty npm config without reading, printing, or truncating it', async () => {
  const fixture = await createFixture();

  try {
    const globalConfig = join(fixture.sandbox, 'existing-global-npmrc');
    const secretConfig = '//registry.example.invalid/:_authToken=DO-NOT-LEAK\n';
    await writeFile(globalConfig, secretConfig, { mode: 0o600 });

    const result = await runCacheEnv(
      fixture,
      ['--', process.execPath, '-e', "process.stdout.write('COMMAND-RAN')"],
      { NPM_CONFIG_GLOBALCONFIG: globalConfig },
    );
    const unchangedConfig = await readFile(globalConfig, 'utf8');

    assert.deepEqual(
      {
        code: result.code === 0,
        commandRan: result.stdout.includes('COMMAND-RAN'),
        leakedSecret: `${result.stdout}${result.stderr}`.includes('DO-NOT-LEAK'),
        unchangedConfig,
      },
      {
        code: false,
        commandRan: false,
        leakedSecret: false,
        unchangedConfig: secretConfig,
      },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('rejects a symlink GitHub environment target without modifying its destination', async () => {
  const fixture = await createFixture();

  try {
    const destination = join(fixture.sandbox, 'environment-destination');
    const linkedEnvironment = join(fixture.sandbox, 'linked-environment');
    await writeFile(destination, 'UNCHANGED\n');
    await symlink(destination, linkedEnvironment);

    const result = await runCacheEnv(fixture, ['--github-env', linkedEnvironment]);
    const destinationContents = await readFile(destination, 'utf8');

    assert.deepEqual(
      { code: result.code === 0, destinationContents },
      { code: false, destinationContents: 'UNCHANGED\n' },
    );
  } finally {
    await fixture.cleanup();
  }
});
