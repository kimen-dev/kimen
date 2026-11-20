// The core gate's two scopes. With no scope it is complete (local readiness,
// release, the nightly run); the affected scope CI sets for a change that
// touches no shared infrastructure narrows lint, budgets and unit tests to the
// listed projects and paths, and leaves every repository-wide gate whole.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));

async function fixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'kimen-core-scope-')));
  t.after(() => rm(root, { force: true, recursive: true }));
  const bin = join(root, 'bin');
  const gates = join(root, 'scripts/gates');
  const home = join(root, 'home');
  const log = join(root, 'commands.log');
  await Promise.all(
    [bin, gates, home, join(root, '.agents/skills/frontend-qa'), join(root, '.claude')].map(
      (path) => mkdir(path, { recursive: true }),
    ),
  );
  await writeFile(join(root, '.agents/skills/frontend-qa/SKILL.md'), '# QA\n');
  await symlink('../.agents/skills', join(root, '.claude/skills'));
  await Promise.all(
    ['gates-core.sh', 'cache-env.sh', 'lib.sh'].map((name) =>
      symlink(join(repository, 'scripts/gates', name), join(gates, name)),
    ),
  );
  for (const name of [
    'constitution-check.sh',
    'check-spec-contracts.sh',
    'check-traceability.sh',
    'semgrep-scan.sh',
  ]) {
    await writeFile(
      join(gates, name),
      `#!/usr/bin/env bash\nprintf '${name}\\n' >>"$KIMEN_TEST_COMMAND_LOG"\n`,
    );
  }
  await writeFile(
    join(gates, 'check-generated-sync.mjs'),
    "import { appendFileSync } from 'node:fs';\nappendFileSync(process.env.KIMEN_TEST_COMMAND_LOG, `sync ${process.argv[2]}\\n`);\n",
  );
  const pnpm = join(bin, 'pnpm');
  await writeFile(
    pnpm,
    [
      '#!/usr/bin/env bash',
      'printf "pnpm %s\\n" "$*" >>"$KIMEN_TEST_COMMAND_LOG"',
      'if [ "$*" = "exec nx graph --file=.nx/graph.json" ]; then',
      '  mkdir -p .nx && printf "{}" >.nx/graph.json',
      'fi',
      '',
    ].join('\n'),
  );
  await chmod(pnpm, 0o755);
  await writeFile(join(root, '.gitignore'), '/commands.log\n/reports/\n/.nx/\n/home/\n/bin/\n');

  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'base');
  return {
    root,
    async run(environment = {}) {
      const result = spawnSync('bash', ['scripts/gates/gates-core.sh'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          HOME: home,
          PATH: `${bin}:${process.env.PATH}`,
          KIMEN_TEST_COMMAND_LOG: log,
          ...environment,
        },
      });
      // A gate that refuses its environment runs nothing, so writes no log.
      const logged = await readFile(log, 'utf8').catch(() => '');
      const commands = logged.trim() === '' ? [] : logged.trim().split('\n');
      await rm(log, { force: true });
      return { ...result, commands };
    },
  };
}

const diagnostic = (result) => `${result.stdout}\n${result.stderr}`;

// What both scopes run, in order, with the build whole.
const repositoryWide = [
  'constitution-check.sh',
  'check-spec-contracts.sh',
  'check-traceability.sh',
  'pnpm run check:workflows',
  'semgrep-scan.sh',
  'pnpm exec nx graph --file=.nx/graph.json',
  'pnpm run format:check',
  'pnpm exec nx run-many -t build',
  'sync tokens',
  'sync surfaces',
  'sync catalog',
  'sync wrappers',
  'pnpm run check:api',
  'pnpm run check:tokens',
  'pnpm run check:component-inventory',
];

test('with no scope the core gate is complete', async (t) => {
  const core = await fixture(t);
  const result = await core.run();

  assert.equal(result.status, 0, diagnostic(result));
  assert.deepEqual(result.commands, [
    ...repositoryWide,
    'pnpm run lint',
    'pnpm run lint:styles',
    'pnpm run typecheck',
    'pnpm run deadcode',
    'pnpm --filter @kimen/tokens contrast',
    'pnpm exec nx run-many -t size',
    'pnpm run test:infra',
    'pnpm run check:capabilities',
    'pnpm exec nx run-many -t test',
  ]);
  assert.match(result.stdout, /^CORE QUALITY GREEN$/mu);
});

test('the affected scope narrows lint, budgets and unit tests and nothing else', async (t) => {
  const core = await fixture(t);
  const result = await core.run({
    KIMEN_GATE_SCOPE: 'affected',
    KIMEN_AFFECTED_PROJECTS: '@kimen/catalog,@kimen/emitter',
    KIMEN_AFFECTED_LINT_PATHS: 'packages/catalog,packages/emitter,scripts',
  });

  assert.equal(result.status, 0, diagnostic(result));
  assert.deepEqual(result.commands, [
    ...repositoryWide,
    'pnpm exec eslint --no-error-on-unmatched-pattern packages/catalog packages/emitter scripts',
    'pnpm run lint:styles',
    'pnpm run typecheck',
    'pnpm run deadcode',
    'pnpm --filter @kimen/tokens contrast',
    'pnpm exec nx run-many -t size --projects=@kimen/catalog,@kimen/emitter',
    'pnpm run test:infra',
    'pnpm run check:capabilities',
    'pnpm exec nx run-many -t test --projects=@kimen/catalog,@kimen/emitter',
  ]);
  assert.match(
    result.stdout,
    /CORE QUALITY GREEN \(affected scope: @kimen\/catalog,@kimen\/emitter\)/u,
  );
});

// Nx reads an empty --projects as every project: an empty list skips the gate.
test('an affected scope with nothing affected skips the project gates', async (t) => {
  const core = await fixture(t);
  const result = await core.run({
    KIMEN_GATE_SCOPE: 'affected',
    KIMEN_AFFECTED_PROJECTS: '',
    KIMEN_AFFECTED_LINT_PATHS: '',
  });

  assert.equal(result.status, 0, diagnostic(result));
  assert.deepEqual(result.commands, [
    ...repositoryWide,
    'pnpm run lint:styles',
    'pnpm run typecheck',
    'pnpm run deadcode',
    'pnpm --filter @kimen/tokens contrast',
    'pnpm run test:infra',
    'pnpm run check:capabilities',
  ]);
  for (const gate of ['lint', 'budgets', 'test']) {
    assert.match(result.stdout, new RegExp(`── CORE ${gate}: SKIPPED`, 'u'));
  }
});

test('the affected scope must name its lists, and only two scopes exist', async (t) => {
  const core = await fixture(t);
  for (const environment of [
    { KIMEN_GATE_SCOPE: 'affected', KIMEN_AFFECTED_PROJECTS: '' },
    { KIMEN_GATE_SCOPE: 'affected', KIMEN_AFFECTED_LINT_PATHS: '' },
    { KIMEN_GATE_SCOPE: 'everything' },
  ]) {
    const result = await core.run(environment);
    assert.notEqual(result.status, 0, JSON.stringify(environment));
    assert.match(result.stderr, /KIMEN_AFFECTED_|KIMEN_GATE_SCOPE/u);
    assert.deepEqual(result.commands, []);
  }
});
