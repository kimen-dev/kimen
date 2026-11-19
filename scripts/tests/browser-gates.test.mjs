// @spec:018-project-integrity-hardening#S6
// @spec:067-merge-friendly-checks
// @spec:068-component-discovery
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, matchesGlob } from 'node:path';
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

function runBrowserGate(fixture, engine, environment = {}) {
  return spawnSync('bash', [browserGate, engine], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...fixture.environment, ...environment },
  });
}

async function readBrowserEvidence(fixture) {
  const directory = join(fixture.cacheRoot, 'worktrees');
  const namespaces = await readdir(directory);
  assert.equal(namespaces.length, 1);
  return readFile(join(directory, namespaces[0], 'gate-evidence/current-run.tsv'), 'utf8');
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
process.stdout.write(JSON.stringify({ cacheDir: config.cacheDir, name: config.test?.name, include: config.test?.include, exclude: config.test?.exclude }));`,
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

function inspectBrowserInstances(environment = {}) {
  const configUrl = pathToFileURL(browserConfig).href;
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `const config = await (await import(${JSON.stringify(configUrl)})).default;
process.stdout.write(JSON.stringify(config.test?.browser?.instances ?? []));`,
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

test('S6 browser setups isolate shared input and page-level capability emulation', () => {
  const instances = inspectBrowserInstances({ KIMEN_BROWSER_ENGINE: 'chromium' });
  assert.deepEqual(
    instances.map(({ name }) => name),
    ['chromium-light', 'chromium-dark', 'chromium-reduced-motion', 'chromium-pointer-capability'],
  );
  for (const instance of instances) {
    assert.equal(
      instance.fileParallelism,
      false,
      `${instance.name} shares one Playwright page, so its files must not compete for input`,
    );
  }

  const light = instances.find(({ name }) => name === 'chromium-light');
  const pointerCapability = instances.find(({ name }) => name === 'chromium-pointer-capability');
  assert.ok(light, 'missing ordinary light-browser setup');
  assert.ok(pointerCapability, 'missing isolated pointer-capability setup');
  const inputDeviceSpecs = [
    'browser-tests/pointer-capability.browser.spec.ts',
    'browser-tests/touch-field-text.browser.spec.ts',
    'browser-tests/touch-size-field-text.browser.spec.ts',
    'src/components/ki-note/ki-note.pointer.browser.spec.ts',
  ];
  for (const spec of inputDeviceSpecs) {
    assert.ok(
      light.exclude?.includes(spec),
      `page-level pointer emulation in ${spec} must not contaminate ordinary hover contracts`,
    );
  }
  assert.deepEqual(pointerCapability.include, inputDeviceSpecs);
});

test('S1 component-local specs join the appropriate suite without a shared registration edit', () => {
  const environment = { KIMEN_BROWSER_ENGINE: 'chromium', KIMEN_RUN_VISUALS: '1' };
  const browser = inspectVitestConfig(browserConfig, environment);
  const unit = inspectVitestConfig(elementsConfig, environment);
  const instances = inspectBrowserInstances(environment);
  const matches = ({ include, exclude }, file) =>
    include?.some((pattern) => matchesGlob(file, pattern)) &&
    !exclude?.some((pattern) => matchesGlob(file, pattern));
  const suitesFor = (filename) => {
    const file = `src/components/ki-example/ki-example${filename}`;
    return [unit, ...instances.map((instance) => ({ include: browser.include, ...instance }))]
      .filter((suite) => matches(suite, file))
      .map((suite) => suite.name);
  };

  assert.deepEqual(suitesFor('.browser.spec.ts'), ['chromium-light']);
  assert.deepEqual(suitesFor('.visual.browser.spec.ts'), ['chromium-light']);
  assert.deepEqual(suitesFor('.visual.dark.browser.spec.ts'), ['chromium-dark']);
  assert.deepEqual(suitesFor('.motion.browser.spec.ts'), ['chromium-reduced-motion']);
  assert.deepEqual(suitesFor('.logic.spec.ts'), ['elements-unit']);
});

test('S6 local non-Linux visual specs are counted and CI or opt-in preserves them', async () => {
  const configUrl = pathToFileURL(browserConfig).href;
  const specEntries = await Promise.all(
    ['browser-tests', 'src/components'].map((directory) =>
      readdir(join(repositoryRoot, 'packages/elements', directory), {
        recursive: true,
        withFileTypes: true,
      }),
    ),
  );
  const visualSpecNames = specEntries
    .flat()
    .filter((entry) => entry.isFile() && /\.visual\..*browser\.spec\.tsx?$/u.test(entry.name));
  assert.ok(visualSpecNames.length > 0);

  for (const [platform, ci, override, skipped] of [
    ['darwin', '', '', true],
    ['darwin', 'true', '', false],
    ['darwin', '', '1', false],
    ['linux', '', '', false],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `
      await import('./packages/elements/node_modules/vitest/dist/config.js');
      await import('./packages/elements/node_modules/@vitest/browser-playwright/dist/index.js');
      Object.defineProperty(process, 'platform', { value: ${JSON.stringify(platform)} });
      const { default: config } = await import(${JSON.stringify(configUrl)});
      process.stdout.write(JSON.stringify(config.test.browser.instances));
    `,
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: { ...process.env, CI: ci, KIMEN_RUN_VISUALS: override },
      },
    );
    assert.equal(result.status, 0, diagnostic(result));
    const instances = JSON.parse(result.stdout);
    for (const instance of instances.slice(0, 3)) {
      assert.equal(
        instance.exclude?.some((pattern) => pattern.includes('.visual.')) ?? false,
        skipped,
      );
    }
    if (skipped) {
      assert.match(
        result.stderr,
        new RegExp(`visual specs run only on Linux: ${visualSpecNames.length} skipped`, 'u'),
      );
      assert.match(result.stderr, /KIMEN_RUN_VISUALS=1/u);
    } else {
      assert.doesNotMatch(result.stderr, /visual specs run only on Linux/u);
    }
  }
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

  const cache = ({ cacheDir, name }) => ({ cacheDir, name });
  assert.deepEqual(cache(unit), {
    cacheDir: join(cacheRoot, 'vite/elements-unit'),
    name: 'elements-unit',
  });
  assert.deepEqual(cache(node), {
    cacheDir: join(cacheRoot, 'vite/elements-node'),
    name: 'elements-node',
  });
  assert.deepEqual(cache(chromium), {
    cacheDir: join(cacheRoot, 'vite/elements-browser-chromium'),
    name: 'elements-browser-chromium',
  });
  assert.deepEqual(cache(firefox), {
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
  const evidence = await readBrowserEvidence(fixture);

  assert.equal(result.status, 0, diagnostic(result));
  assert.deepEqual(commands, [
    'firefox|exec tsc -p packages/elements/scripts/tsconfig.json --noEmit --pretty false',
    'firefox|exec nx run @kimen/elements:test-browser --skipNxCache',
  ]);
  assert.match(evidence, /^browser\tconfig-typecheck\tgreen$/m);
  assert.match(evidence, /^browser\ttest-browser:firefox\tgreen$/m);
});

// CI splits the browser gate across parallel jobs. Every shard typechecks the
// configs and resolves its engine; the elements suite runs its share of the
// files; the smaller Chromium-only suites run once, in the last shard. Unset,
// the gate is the whole suite in one invocation, as before.
test('S6 browser gate runs one shard of the elements suite when asked', async (t) => {
  const fixture = await browserFixture(t, { preparedEngine: 'chromium' });
  const first = runBrowserGate(fixture, 'chromium', { KIMEN_BROWSER_SHARD: '1/2' });
  const commands = (await readFile(fixture.commandLog, 'utf8')).trim().split('\n');
  const evidence = await readBrowserEvidence(fixture);

  assert.equal(first.status, 0, diagnostic(first));
  assert.deepEqual(commands, [
    'chromium|exec tsc -p packages/elements/scripts/tsconfig.json --noEmit --pretty false',
    'chromium|exec nx run @kimen/elements:test-browser --skipNxCache -- --shard=1/2',
  ]);
  assert.match(evidence, /^browser\ttest-browser:chromium:1\/2\tgreen$/m);
});

test('S6 the last browser shard also runs the Chromium-only suites, once', async (t) => {
  const fixture = await browserFixture(t, { preparedEngine: 'chromium' });
  const last = runBrowserGate(fixture, 'chromium', { KIMEN_BROWSER_SHARD: '2/2' });
  const commands = (await readFile(fixture.commandLog, 'utf8')).trim().split('\n');

  assert.equal(last.status, 0, diagnostic(last));
  assert.deepEqual(commands, [
    'chromium|exec tsc -p packages/elements/scripts/tsconfig.json --noEmit --pretty false',
    'chromium|exec nx run @kimen/elements:test-browser --skipNxCache -- --shard=2/2',
    'chromium|exec nx run-many -t test-browser-wrapper --skipNxCache',
    'chromium|exec nx run @kimen/catalog:test-browser --skipNxCache',
    'chromium|exec nx run @kimen/adapter-mcp-apps:test-browser --skipNxCache',
  ]);
});

test('S6 browser gate rejects a shard that names no part of the suite', async (t) => {
  for (const shard of ['0/2', '3/2', '2', '1/0', 'a/b', '1/2 ', '-1/2']) {
    const fixture = await browserFixture(t, { preparedEngine: 'chromium' });
    const result = runBrowserGate(fixture, 'chromium', { KIMEN_BROWSER_SHARD: shard });

    assert.notEqual(result.status, 0, `${JSON.stringify(shard)} was accepted`);
    assert.match(diagnostic(result), /KIMEN_BROWSER_SHARD/);
    await assert.rejects(readFile(fixture.commandLog, 'utf8'), /ENOENT/u);
  }
});

test('S6 local suite is exactly reusable core plus explicit Chromium', async () => {
  const source = await readFile(suiteGate, 'utf8');

  assert.match(source, /run_gate core bash scripts\/gates\/gates-core\.sh/);
  assert.match(source, /run_gate test-browser bash scripts\/gates\/gates-browser\.sh chromium/);
  assert.doesNotMatch(source, /KIMEN_BROWSER_MATRIX/);
});
