// @spec:018-project-integrity-hardening#S6
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const browserGate = join(repositoryRoot, 'scripts/gates/gates-browser.sh');
const browserConfig = join(repositoryRoot, 'packages/elements/vitest.browser.config.ts');
const elementsConfig = join(repositoryRoot, 'packages/elements/vitest.config.ts');
const nodeConfig = join(repositoryRoot, 'packages/elements/vitest.node.config.ts');
const suiteGate = join(repositoryRoot, 'scripts/gates/gates-suite.sh');
const temporaryRoot = await realpath(tmpdir());

const executableScript = [
  'import { chromium, firefox, webkit } from',
  "  './packages/elements/node_modules/playwright/index.mjs';",
  'const engines = { chromium, firefox, webkit };',
  'process.stdout.write(engines[process.argv[1]].executablePath());',
].join('\n');

function executablePath(engine, browsersPath) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', executableScript, engine],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

async function browserFixture(t, { preparedEngine } = {}) {
  const root = await mkdtemp(join(temporaryRoot, 'kimen-browser-gate-'));
  const bin = join(root, 'bin');
  const browsers = join(root, 'browsers');
  const cacheRoot = join(root, 'cache');
  const commandLog = join(root, 'commands.log');
  const home = join(root, 'home');
  t.after(() => rm(root, { force: true, recursive: true }));
  await Promise.all([
    mkdir(bin, { recursive: true }),
    mkdir(browsers, { recursive: true }),
    mkdir(home, { recursive: true }),
  ]);

  const fakePnpm = join(bin, 'pnpm');
  await writeFile(
    fakePnpm,
    [
      '#!/usr/bin/env bash',
      'printf "%s|%s\\n" "${KIMEN_BROWSER_ENGINE:-unset}" "$*" >>"$KIMEN_TEST_COMMAND_LOG"',
      'exit 0',
      '',
    ].join('\n'),
  );
  await chmod(fakePnpm, 0o755);

  if (preparedEngine) {
    const executable = executablePath(preparedEngine, browsers);
    await mkdir(dirname(executable), { recursive: true });
    await writeFile(executable, '#!/usr/bin/env bash\nexit 0\n');
    await chmod(executable, 0o755);
  }

  return {
    browsers,
    cacheRoot,
    commandLog,
    environment: {
      HOME: home,
      KIMEN_CACHE_ROOT: cacheRoot,
      KIMEN_TEST_COMMAND_LOG: commandLog,
      PATH: `${bin}:${process.env.PATH}`,
      PLAYWRIGHT_BROWSERS_PATH: browsers,
    },
  };
}

function runBrowserGate(fixture, engine) {
  return spawnSync('bash', [browserGate, engine], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: fixture.environment,
  });
}

const diagnostic = (result) => `${result.stdout}\n${result.stderr}`;

function inspectVitestConfig(configPath, environment = {}) {
  const configUrl = pathToFileURL(configPath).href;
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `const config = await (await import(${JSON.stringify(configUrl)})).default;
process.stdout.write(JSON.stringify({ cacheDir: config.cacheDir, name: config.test?.name }));`,
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, ...environment },
    },
  );
  assert.equal(result.status, 0, diagnostic(result));
  return JSON.parse(result.stdout);
}

test('S6 browser config accepts exactly one validated engine per invocation', async () => {
  const source = await readFile(browserConfig, 'utf8');

  assert.match(source, /KIMEN_BROWSER_ENGINE/);
  assert.match(source, /chromium.*firefox.*webkit/s);
  assert.match(source, /launchOptions:\s*\{\s*channel:\s*'chromium'/);
  assert.doesNotMatch(source, /KIMEN_BROWSER_MATRIX/);
});

test('S6 Vitest configs isolate writable caches by suite and browser engine', () => {
  const cacheRoot = join(temporaryRoot, 'kimen-vitest-cache-contract');
  const commonEnvironment = { KIMEN_CACHE_ROOT: cacheRoot };
  const unit = inspectVitestConfig(elementsConfig, commonEnvironment);
  const node = inspectVitestConfig(nodeConfig, commonEnvironment);
  const chromium = inspectVitestConfig(browserConfig, {
    ...commonEnvironment,
    KIMEN_BROWSER_ENGINE: 'chromium',
  });
  const firefox = inspectVitestConfig(browserConfig, {
    ...commonEnvironment,
    KIMEN_BROWSER_ENGINE: 'firefox',
  });

  assert.deepEqual(unit, {
    cacheDir: join(cacheRoot, 'vite/elements-unit'),
    name: 'elements-unit',
  });
  assert.deepEqual(node, {
    cacheDir: join(cacheRoot, 'vite/elements-node'),
    name: 'elements-node',
  });
  assert.deepEqual(chromium, {
    cacheDir: join(cacheRoot, 'vite/elements-browser-chromium'),
    name: 'elements-browser-chromium',
  });
  assert.deepEqual(firefox, {
    cacheDir: join(cacheRoot, 'vite/elements-browser-firefox'),
    name: 'elements-browser-firefox',
  });
});

test('S6 browser gate rejects an engine outside the supported matrix', async (t) => {
  const fixture = await browserFixture(t);
  const result = runBrowserGate(fixture, 'safari');

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /engine.*chromium.*firefox.*webkit/i);
});

test('S6 browser gate fails clearly when its isolated exact binary is absent', async (t) => {
  const fixture = await browserFixture(t);
  const result = runBrowserGate(fixture, 'webkit');
  const commands = await readFile(fixture.commandLog, 'utf8');

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /missing prepared webkit executable/i);
  assert.match(diagnostic(result), /PLAYWRIGHT_BROWSERS_PATH/);
  assert.match(commands, /exec tsc -p packages\/elements\/scripts\/tsconfig\.json/);
  assert.doesNotMatch(commands, /exec nx .*test-browser/);
});

test('S6 browser gate typechecks then runs only the requested prepared engine', async (t) => {
  const fixture = await browserFixture(t, { preparedEngine: 'firefox' });
  const result = runBrowserGate(fixture, 'firefox');
  const commands = (await readFile(fixture.commandLog, 'utf8')).trim().split('\n');
  const evidence = await readFile(join(fixture.cacheRoot, 'gate-evidence/current-run.tsv'), 'utf8');

  assert.equal(result.status, 0, diagnostic(result));
  assert.deepEqual(commands, [
    'firefox|exec tsc -p packages/elements/scripts/tsconfig.json --noEmit --pretty false',
    'firefox|exec nx run @kimen/elements:test-browser --skipNxCache',
  ]);
  assert.match(evidence, /^browser\tconfig-typecheck\tgreen$/m);
  assert.match(evidence, /^browser\ttest-browser:firefox\tgreen$/m);
});

test('S6 local suite is exactly reusable core plus explicit Chromium', async () => {
  const source = await readFile(suiteGate, 'utf8');

  assert.match(source, /run_gate core bash scripts\/gates\/gates-core\.sh/);
  assert.match(source, /run_gate test-browser bash scripts\/gates\/gates-browser\.sh chromium/);
  assert.doesNotMatch(source, /KIMEN_BROWSER_MATRIX/);
});
