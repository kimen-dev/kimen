// @spec:018-project-integrity-hardening#S8
// @spec:018-project-integrity-hardening#S11
// @spec:018-project-integrity-hardening#S12
// @spec:018-project-integrity-hardening#S13
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const infraRunnerUrl = new URL('../run-infra-tests.mjs', import.meta.url);

const readRepositoryFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('S8 keeps the browser-backed packed consumer out of the generic infrastructure batch', async () => {
  const packageJson = JSON.parse(await readRepositoryFile('package.json'));
  assert.equal(packageJson.scripts['test:infra'], 'node scripts/run-infra-tests.mjs');
  assert.equal(
    packageJson.scripts['test:consumer-contract:unit'],
    'bash scripts/gates/cache-env.sh -- node --test scripts/tests/consumer-contract.test.mjs',
  );
  assert.equal(
    packageJson.scripts['test:consumer-contract'],
    'bash scripts/gates/cache-env.sh -- pnpm run test:consumer-contract:isolated',
  );
  assert.equal(
    packageJson.scripts['test:consumer-contract:isolated'],
    'node --test scripts/tests/consumer-contract.test.mjs && node scripts/tests/consumer-contract-real-smoke.mjs',
  );

  const subject = await import(infraRunnerUrl.href).catch((error) => {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      assert.fail('scripts/run-infra-tests.mjs is required');
    }
    throw error;
  });
  assert.equal(typeof subject.selectInfrastructureTestFiles, 'function');
  assert.deepEqual(
    subject.selectInfrastructureTestFiles([
      'z.test.mjs',
      'consumer-contract.test.mjs',
      'helper.mjs',
      'a.test.mjs',
    ]),
    ['a.test.mjs', 'z.test.mjs'],
  );
});

test('S11-S13 expose deterministic token, inventory, generator, and capability commands', async () => {
  const packageJson = JSON.parse(await readRepositoryFile('package.json'));
  assert.equal(packageJson.scripts['check:tokens'], 'node scripts/gates/check-tokens.mjs');
  assert.equal(
    packageJson.scripts['check:component-inventory'],
    'node scripts/gates/check-component-inventory.mjs',
  );
  assert.equal(
    packageJson.scripts['test:generator-contract'],
    'pnpm exec nx run @kimen/nx-plugin:test --skipNxCache',
  );
  assert.equal(
    packageJson.scripts['generate:capabilities'],
    'node scripts/gates/check-capabilities.mjs --generate',
  );
  assert.equal(
    packageJson.scripts['check:capabilities'],
    'node scripts/gates/check-capabilities.mjs --static-only',
  );
});

test('S11-S13 make static integrity checks mandatory in core after fresh generated output', async () => {
  const core = await readRepositoryFile('scripts/gates/gates-core.sh');
  const orderedMarkers = [
    'run_core_gate build pnpm exec nx run-many -t build',
    'run_core_gate token-contract pnpm run check:tokens',
    'run_core_gate component-inventory pnpm run check:component-inventory',
    'run_core_gate capabilities-static pnpm run check:capabilities',
  ];
  let previous = -1;
  for (const marker of orderedMarkers) {
    const index = core.indexOf(marker);
    assert.notEqual(index, -1, `missing core gate: ${marker}`);
    assert.ok(index > previous, `${marker} must follow the preceding integrity gate`);
    previous = index;
  }
});

test('S3-S13 run static analysis before behavioral, browser-backed, and mutation gates', async () => {
  const core = await readRepositoryFile('scripts/gates/gates-core.sh');
  const orderedMarkers = [
    'run_core_gate workflows pnpm run check:workflows',
    'run_core_gate format pnpm run format:check',
    'run_core_gate build pnpm exec nx run-many -t build',
    'run_core_gate public-api pnpm run check:api',
    'run_core_gate lint pnpm run lint',
    'run_core_gate styles pnpm run lint:styles',
    'run_core_gate typecheck pnpm run typecheck',
    'run_core_gate deadcode pnpm run deadcode',
    'run_core_gate generator-contract pnpm run test:generator-contract',
    'run_core_gate infra-contracts pnpm run test:infra',
    'run_core_gate sandbox-contract pnpm run test:sandbox',
    'run_core_gate test pnpm exec nx run-many -t test',
    'run_core_gate pack-consumer pnpm run test:consumer-contract',
    'run_core_gate mutation pnpm run test:mutation',
  ];
  let previous = -1;
  for (const marker of orderedMarkers) {
    const index = core.indexOf(marker);
    assert.notEqual(index, -1, `missing core gate: ${marker}`);
    assert.ok(index > previous, `${marker} must follow the preceding gate layer`);
    previous = index;
  }
});

test('S4-S5 local sandbox gate covers portable contracts and leaves Docker authoritative to CI', async () => {
  const [packageJson, runner, suite] = await Promise.all([
    readRepositoryFile('package.json').then(JSON.parse),
    readRepositoryFile('sandbox/tests/run-local.sh'),
    readRepositoryFile('scripts/gates/gates-suite.sh'),
  ]);
  assert.equal(packageJson.scripts['test:sandbox'], 'bash sandbox/tests/run-local.sh');
  const orderedMarkers = [
    'bash sandbox/tests/loop-entry.test.sh',
    'bash sandbox/tests/loop-host.test.sh',
    'node --test sandbox/tests/proxy.test.mjs',
    'bash sandbox/tests/containment.test.sh',
  ];
  let previous = -1;
  for (const marker of orderedMarkers) {
    const index = runner.indexOf(marker);
    assert.notEqual(index, -1, `missing local containment contract: ${marker}`);
    assert.ok(index > previous, `${marker} must follow the preceding containment layer`);
    previous = index;
  }
  assert.match(suite, /LOCAL GATES GREEN/u);
  assert.match(suite, /ci \/ containment/u);
  assert.doesNotMatch(suite, /ALL GATES GREEN.*done is done/u);
});

test('S13 validates current-revision capability evidence only after the browser gate', async () => {
  const suite = await readRepositoryFile('scripts/gates/gates-suite.sh');
  const browser = suite.indexOf(
    'run_gate test-browser bash scripts/gates/gates-browser.sh chromium',
  );
  const evidencePath = suite.indexOf(
    'KIMEN_CAPABILITY_EVIDENCE_FILE="$EVIDENCE_DIRECTORY/capabilities-current-run.json"',
  );
  const capability = suite.indexOf(
    'run_gate capabilities node scripts/gates/check-capabilities.mjs',
  );
  assert.ok(browser >= 0, 'the Chromium browser gate must remain mandatory');
  assert.ok(
    evidencePath > browser,
    'capability evidence path must be created after browser success',
  );
  assert.ok(capability > evidencePath, 'capability validation must follow the browser gate');
  assert.match(suite, /--write-evidence "\$KIMEN_CAPABILITY_EVIDENCE_FILE"/u);
  assert.match(suite, /--gate-evidence "\$KIMEN_GATE_EVIDENCE_FILE"/u);
  assert.match(suite, /export KIMEN_CAPABILITY_EVIDENCE_FILE/u);
});

test('wiring fixture resolves from the repository under test', async () => {
  const [fromRepositoryRoot, fromFixtureUrl] = await Promise.all([
    readRepositoryFile('scripts/run-infra-tests.mjs'),
    readFile(infraRunnerUrl, 'utf8'),
  ]);

  assert.equal(fileURLToPath(new URL('../', infraRunnerUrl)), repositoryRoot);
  assert.equal(fromFixtureUrl, fromRepositoryRoot);
});
