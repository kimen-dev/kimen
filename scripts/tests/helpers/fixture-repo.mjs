import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const preparedCacheEnvironmentVariables = new Set([
  'COREPACK_HOME',
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
]);

function isolateFixtureEnvironment(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(
      ([name]) => !preparedCacheEnvironmentVariables.has(name) && !name.startsWith('GIT_'),
    ),
  );
}

function featureSource(scenarioIds) {
  return [
    'Feature: Fixture traceability',
    ...scenarioIds.flatMap((scenarioId) => [
      '',
      `  # ${scenarioId}`,
      `  Scenario: Fixture ${scenarioId}`,
      '    Given a fixture repository',
      '    When traceability is checked',
      '    Then the fixture has deterministic evidence',
    ]),
    '',
  ].join('\n');
}

async function writeFixture(root, relativePath, contents) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

export async function createFixtureRepo({
  environment = process.env,
  featureId = '999-fixture',
  scenarioIds = ['S1'],
  files = {},
} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-fixture-'));
  const fixtureEnvironment = isolateFixtureEnvironment(environment);

  await mkdir(join(root, 'scripts/gates'), { recursive: true });
  await cp(
    join(repositoryRoot, 'scripts/gates/check-traceability.sh'),
    join(root, 'scripts/gates/check-traceability.sh'),
  );
  await cp(join(repositoryRoot, 'scripts/gates/lib.sh'), join(root, 'scripts/gates/lib.sh'));
  await writeFixture(root, `specs/${featureId}/feature.feature`, featureSource(scenarioIds));

  await Promise.all(
    Object.entries(files).map(([relativePath, contents]) =>
      writeFixture(root, relativePath, contents),
    ),
  );
  await execFileAsync('git', ['init', '--quiet'], { cwd: root, env: fixtureEnvironment });

  async function run(command, args = [], options = {}) {
    const { env: explicitEnvironment, ...execOptions } = options;
    try {
      const result = await execFileAsync(command, args, {
        cwd: root,
        ...execOptions,
        env: { ...fixtureEnvironment, ...explicitEnvironment },
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

  return {
    root,
    featureDir: `specs/${featureId}`,
    async write(relativePath, contents) {
      await writeFixture(root, relativePath, contents);
    },
    async copyFromRepo(sourcePath, destinationPath = sourcePath) {
      const destination = join(root, destinationPath);
      await mkdir(dirname(destination), { recursive: true });
      await cp(join(repositoryRoot, sourcePath), destination, { recursive: true });
    },
    run,
    async runTraceability(...args) {
      return run('bash', ['scripts/gates/check-traceability.sh', `specs/${featureId}`, ...args]);
    },
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    },
  };
}
