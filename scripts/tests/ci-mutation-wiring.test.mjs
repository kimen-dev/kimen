import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// @spec:018-project-integrity-hardening#S3

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const packagePath = join(repositoryRoot, 'package.json');
const coreGatePath = join(repositoryRoot, 'scripts/gates/gates-core.sh');
const suitePath = join(repositoryRoot, 'scripts/gates/gates-suite.sh');
const mutationWrapperPath = join(repositoryRoot, 'scripts/gates/run-mutation.sh');
const ciWorkflowPath = join(repositoryRoot, '.github/workflows/ci.yml');
const rulesetPath = join(repositoryRoot, '.github/rulesets/main.json');

const readUtf8 = (path) => readFile(path, 'utf8');

async function createCoreFixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-core-mutation-'));
  const gateDirectory = join(root, 'scripts/gates');
  const binDirectory = join(root, 'bin');
  const pnpmLog = join(root, 'pnpm.log');

  t.after(() => rm(root, { force: true, recursive: true }));
  await Promise.all([
    mkdir(gateDirectory, { recursive: true }),
    mkdir(binDirectory, { recursive: true }),
    mkdir(join(root, 'specs/fixture'), { recursive: true }),
  ]);
  await copyFile(coreGatePath, join(gateDirectory, 'gates-core.sh'));
  await copyFile(
    join(repositoryRoot, 'scripts/gates/cache-env.sh'),
    join(gateDirectory, 'cache-env.sh'),
  );
  await Promise.all(
    [
      'constitution-check.sh',
      'check-spec-contracts.sh',
      'check-approvals.sh',
      'check-traceability.sh',
    ].map((name) => writeFile(join(gateDirectory, name), '#!/usr/bin/env bash\nexit 0\n')),
  );
  await writeFile(join(gateDirectory, 'check-generated-sync.mjs'), 'process.exit(0);\n');
  const fakePnpm = join(binDirectory, 'pnpm');
  await writeFile(
    fakePnpm,
    [
      '#!/usr/bin/env bash',
      'printf \'%s\\n\' "$*" >>"$KIMEN_TEST_PNPM_LOG"',
      'if [ "$*" = "exec nx graph --file=.nx/graph.json" ]; then',
      '  mkdir -p .nx',
      "  printf '{}\\n' >.nx/graph.json",
      'fi',
      '',
    ].join('\n'),
  );
  await chmod(fakePnpm, 0o755);
  const git = spawnSync('git', ['init', '--quiet'], { cwd: root, encoding: 'utf8' });
  assert.equal(git.status, 0, git.stderr);

  return { binDirectory, pnpmLog, root };
}

function runCore(fixture, { arguments_: argumentsList = [], environment = {} } = {}) {
  return spawnSync('bash', ['scripts/gates/gates-core.sh', ...argumentsList], {
    cwd: fixture.root,
    encoding: 'utf8',
    env: {
      HOME: join(fixture.root, 'home'),
      KIMEN_TEST_PNPM_LOG: fixture.pnpmLog,
      PATH: `${fixture.binDirectory}:${process.env.PATH}`,
      ...environment,
    },
  });
}

test('S3 test:mutation enters the isolated wrapper and the wrapper launches run mode', async () => {
  const packageJson = JSON.parse(await readUtf8(packagePath));
  const wrapper = await readUtf8(mutationWrapperPath);

  assert.equal(packageJson.scripts['test:mutation'], 'bash scripts/gates/run-mutation.sh');
  assert.match(wrapper, /KIMEN_CACHE_ENV_READY/);
  assert.match(wrapper, /bash scripts\/gates\/cache-env\.sh --validate/);
  assert.match(
    wrapper,
    /exec bash scripts\/gates\/cache-env\.sh -- bash scripts\/gates\/run-mutation\.sh "\$@"/,
  );
  assert.match(wrapper, /exec node scripts\/gates\/mutation-changed\.mjs --run "\$@"/);
});

test('S3 the full suite self-isolates before any Nx or Playwright work', async () => {
  const suite = await readUtf8(suitePath);
  const core = await readUtf8(coreGatePath);
  const suiteReexec = suite.indexOf(
    'exec bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-suite.sh "$@"',
  );
  const coreReexec = core.indexOf(
    'exec bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-core.sh "$@"',
  );

  assert.ok(suiteReexec > -1, 'the suite must re-exec through cache-env');
  assert.ok(suiteReexec < suite.indexOf('run_gate core'));
  assert.ok(suiteReexec < suite.indexOf('run_gate test-browser'));
  assert.ok(coreReexec > -1, 'direct core runs must re-exec through cache-env');
  assert.ok(coreReexec < core.indexOf('export NX_TUI=false'));
  assert.ok(coreReexec < core.indexOf('nx_graph()'));
  assert.doesNotMatch(core, /test-browser/);
  assert.match(suite, /KIMEN_CACHE_ENV_READY/);
  assert.match(suite, /bash scripts\/gates\/cache-env\.sh --validate/);
  assert.match(core, /bash scripts\/gates\/cache-env\.sh --validate/);
  assert.match(suite, /mutation delegated.*Definition of Done requires ci \/ mutation/is);
});

test('S3 an orphan ready flag fails before the mutation runner starts', () => {
  const result = spawnSync('bash', [mutationWrapperPath], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: {
      HOME: process.env.HOME,
      KIMEN_CACHE_ENV_READY: '1',
      PATH: process.env.PATH,
    },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /KIMEN_CACHE_ROOT.*required/i);
  assert.doesNotMatch(result.stderr + result.stdout, /GATE mutation-changed/);
});

test('S3 local repository-wide core always invokes the mutation gate', async (t) => {
  const fixture = await createCoreFixture(t);
  const result = runCore(fixture);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(await readUtf8(fixture.pnpmLog), /^run test:mutation$/m);
  assert.match(result.stdout, /CORE mutation: PASS/);
});

test('S3 mutation delegation requires exact value and both GitHub CI signals', async (t) => {
  const fixture = await createCoreFixture(t);
  const localSpoof = runCore(fixture, {
    environment: { CI: 'true', KIMEN_MUTATION_DELEGATED_TO: 'mutation' },
  });
  const githubSpoof = runCore(fixture, {
    environment: { GITHUB_ACTIONS: 'true', KIMEN_MUTATION_DELEGATED_TO: 'mutation' },
  });
  const falseTarget = runCore(fixture, {
    environment: {
      CI: 'true',
      GITHUB_ACTIONS: 'true',
      KIMEN_MUTATION_DELEGATED_TO: 'other-job',
    },
  });
  const exactDelegation = runCore(fixture, {
    environment: {
      CI: 'true',
      GITHUB_ACTIONS: 'true',
      KIMEN_MUTATION_DELEGATED_TO: 'mutation',
    },
  });

  assert.deepEqual(
    {
      exactDelegation: exactDelegation.status,
      falseTarget: falseTarget.status === 0,
      githubSpoof: githubSpoof.status === 0,
      localSpoof: localSpoof.status === 0,
    },
    { exactDelegation: 0, falseTarget: false, githubSpoof: false, localSpoof: false },
  );
  assert.match(exactDelegation.stdout, /mutation.*delegated.*ci \/ mutation/is);
});

test('S3 feature-scoped core reports mutation N/A without executing it', async (t) => {
  const fixture = await createCoreFixture(t);
  const result = runCore(fixture, { arguments_: ['specs/fixture'] });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  await assert.rejects(readFile(fixture.pnpmLog), /ENOENT/);
  assert.match(result.stdout, /CORE mutation: N\/A.*feature-scoped/is);
});

test('S3 CI separates ordinary gates from mutation with isolated pre-install caches', async () => {
  const workflow = await readUtf8(ciWorkflowPath);
  const gatesStart = workflow.indexOf('  gates:\n');
  const mutationStart = workflow.indexOf('  mutation:\n');
  const containmentStart = workflow.indexOf('  containment:\n');
  const gates = workflow.slice(gatesStart, mutationStart);
  const mutation = workflow.slice(mutationStart, containmentStart);
  const containment = workflow.slice(containmentStart);
  const cacheSetup = 'run: bash scripts/gates/cache-env.sh --github-env "$GITHUB_ENV"';

  assert.ok(gatesStart > -1);
  assert.ok(mutationStart > gatesStart);
  assert.ok(containmentStart > mutationStart);
  assert.match(gates, /timeout-minutes: 45/);
  assert.ok(gates.indexOf(cacheSetup) > -1);
  assert.ok(gates.indexOf(cacheSetup) < gates.indexOf('uses: pnpm/action-setup@'));
  assert.match(gates, /KIMEN_MUTATION_DELEGATED_TO: ['"]?mutation['"]?/);
  assert.match(gates, /run: bash scripts\/gates\/gates-suite\.sh/);
  assert.ok(mutation.indexOf(cacheSetup) > -1);
  assert.ok(mutation.indexOf(cacheSetup) < mutation.indexOf('uses: pnpm/action-setup@'));
  assert.match(mutation, /timeout-minutes: 45/);
  assert.match(mutation, /fetch-depth: 0/);
  assert.match(
    mutation,
    /KIMEN_MUTATION_BASE:.*github\.event\.pull_request\.base\.sha.*github\.event\.before/,
  );
  assert.match(mutation, /run: pnpm run test:mutation/);
  assert.doesNotMatch(mutation, /playwright/i);
  assert.ok(
    containment.includes('production.cloudfront.docker.com:443'),
    'the pinned Docker base redirect host must remain in the containment egress allowlist',
  );
});

test('S3 protected main requires every mandatory CI gate context', async () => {
  const ruleset = JSON.parse(await readUtf8(rulesetPath));
  const statusRule = ruleset.rules.find(({ type }) => type === 'required_status_checks');
  const contexts = statusRule.parameters.required_status_checks.map(({ context }) => context);

  assert.ok(contexts.includes('gates'));
  assert.ok(contexts.includes('mutation'));
  assert.ok(contexts.includes('containment'));
});
