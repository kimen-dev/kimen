// @spec:067-merge-friendly-checks
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
  const root = await realpath(await mkdtemp(join(tmpdir(), 'kimen-affected-')));
  t.after(() => rm(root, { force: true, recursive: true }));
  const bin = join(root, 'bin');
  const gates = join(root, 'scripts/gates');
  const home = join(root, 'home');
  const log = join(root, 'commands.log');
  await Promise.all(
    [bin, gates, home, join(root, 'packages/example')].map((path) =>
      mkdir(path, { recursive: true }),
    ),
  );
  await Promise.all(
    ['gates-suite.sh', 'cache-env.sh', 'gates-affected.sh'].map((name) =>
      symlink(join(repository, 'scripts/gates', name), join(gates, name)),
    ),
  );
  for (const entry of ['gates-core.sh', 'gates-browser.sh', 'cross-device-tmpdir.sh']) {
    const command =
      entry === 'cross-device-tmpdir.sh'
        ? 'shift; exec "$@"'
        : `printf '${entry} %s\\n' "$*" >>"$KIMEN_TEST_COMMAND_LOG"`;
    await writeFile(join(gates, entry), `#!/usr/bin/env bash\n${command}\n`);
  }
  const pnpm = join(bin, 'pnpm');
  await writeFile(
    pnpm,
    '#!/usr/bin/env bash\nprintf "pnpm %s\\n" "$*" >>"$KIMEN_TEST_COMMAND_LOG"\n',
  );
  await chmod(pnpm, 0o755);
  await writeFile(join(root, '.gitignore'), '/commands.log\n/reports/\n');

  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD');
  git('update-ref', 'refs/remotes/origin/main', base);
  return {
    base,
    log,
    root,
    run(environment = {}) {
      return spawnSync('bash', ['scripts/gates/gates-suite.sh', '--affected'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          HOME: home,
          PATH: `${bin}:${process.env.PATH}`,
          KIMEN_TEST_COMMAND_LOG: log,
          ...environment,
        },
      });
    },
  };
}

test('S7 affected mode delegates changed projects and dependents to Nx without full-gate evidence', async (t) => {
  const local = await fixture(t);
  await writeFile(join(local.root, 'packages/example/index.ts'), 'export const example = 1;\n');

  const result = local.run();

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /limited verification.*release evidence/iu);
  const commands = await readFile(local.log, 'utf8');
  assert.match(commands, new RegExp(`nx affected -t build test size --base=${local.base}`, 'u'));
  assert.match(
    commands,
    new RegExp(`nx affected -t test-browser test-browser-wrapper --base=${local.base}`, 'u'),
  );
  assert.doesNotMatch(commands, /gates-core\.sh|gates-browser\.sh|nx run-many/u);
});

test('S7 shared inputs run the full suite, and CI and sandbox reject affected mode', async (t) => {
  const local = await fixture(t);
  await writeFile(join(local.root, 'tsconfig.base.json'), '{}\n');

  for (const environment of [{ CI: 'true' }, { KIMEN_SANDBOX: '1' }]) {
    const result = local.run(environment);
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(result.stderr, /--affected is local-only/u);
  }
  const result = local.run();
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /shared input .*tsconfig\.base\.json.*full suite/u);
  assert.equal(await readFile(local.log, 'utf8'), 'gates-core.sh \ngates-browser.sh chromium\n');
});
