// Regression for the private-store contract of `scripts/gates/cache-env.sh`.
//
// `cache-env.test.mjs` proves the wrapper *exports* NPM_CONFIG_STORE_DIR below
// the repository-local cache root, with the HOME, symlink, permission and
// re-entry guards that make that value trustworthy. It does not prove that the
// package manager this repository pins obeys it, and an exported variable no
// tool reads is containment on paper only: the store then lands wherever the
// manager defaults to, outside the directory the gates believe they own. These
// cases close that gap by asking the real pinned manager where its store is.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const cacheEnvScript = join(repositoryRoot, 'scripts/gates/cache-env.sh');

// Every probe runs *through* the wrapper, never beside it: the contract under
// test is what a command sees when a gate invokes it, not what an ad-hoc shell
// happens to export.
async function runInsideWrapper(command, environment = {}) {
  try {
    const result = await execFileAsync('bash', [cacheEnvScript, '--', ...command], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, ...environment },
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

async function pinnedPnpmVersion() {
  const manifest = JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8'));
  const declaration = manifest.packageManager ?? '';
  const [name, version] = declaration.split('@');
  assert.ok(
    name === 'pnpm' && version,
    `package.json must pin a pnpm version, found ${JSON.stringify(declaration)}`,
  );
  return version;
}

// The failure these cases exist to catch is behavioral, so a run against the
// wrong manager would be worthless evidence. The pinned one is resolved
// explicitly — a bare `pnpm` on PATH qualifies only when its version matches —
// and what was found is reported when none does, so a toolchain problem can
// never be read as this defect.
async function resolvePinnedPnpm(version) {
  const candidates = [['pnpm'], ['corepack', 'pnpm']];
  const observed = [];
  for (const candidate of candidates) {
    const result = await runInsideWrapper([...candidate, '--version']);
    const reported = result.code === 0 ? result.stdout.trim() : `exit ${result.code}`;
    observed.push(`${candidate.join(' ')} -> ${reported}`);
    if (result.code === 0 && reported === version) {
      return { command: candidate, observed };
    }
  }
  return { command: null, observed };
}

function isWithin(candidate, parent) {
  return candidate === parent || candidate.startsWith(`${parent}/`);
}

async function measureStore(environment = {}) {
  const version = await pinnedPnpmVersion();
  const { command, observed } = await resolvePinnedPnpm(version);
  assert.ok(
    command,
    `pnpm ${version} could not be resolved inside the wrapper, so the store was never measured: ${observed.join('; ')}`,
  );

  const declared = await runInsideWrapper(
    [process.execPath, '-p', 'process.env.NPM_CONFIG_STORE_DIR'],
    environment,
  );
  assert.equal(
    declared.code,
    0,
    `the wrapper did not report a store directory: ${declared.stderr}`,
  );

  const effective = await runInsideWrapper([...command, 'store', 'path'], environment);
  assert.equal(
    effective.code,
    0,
    `\`pnpm store path\` failed inside the wrapper: ${effective.stdout}${effective.stderr}`,
  );

  const configured = await runInsideWrapper(
    [...command, 'config', 'get', 'store-dir'],
    environment,
  );

  return {
    manager: `${command.join(' ')} ${version}`,
    declared: declared.stdout.trim(),
    effective: effective.stdout.trim(),
    configured: configured.stdout.trim(),
  };
}

function report(headline, observed, extra = []) {
  return [
    headline,
    ...extra,
    `effective store path:  ${observed.effective}`,
    `pnpm config store-dir: ${observed.configured}`,
  ].join('\n');
}

test('the pinned pnpm keeps its store inside the private directory the wrapper reserves', async () => {
  const observed = await measureStore();

  assert.ok(
    isWithin(observed.effective, observed.declared),
    report(`${observed.manager} stores packages outside the wrapper's private store.`, observed, [
      `NPM_CONFIG_STORE_DIR:  ${observed.declared}`,
      'A store outside that root is shared state the gates neither create, measure nor clean.',
    ]),
  );
});

test('a validated store override reaches the pinned pnpm', async (t) => {
  // The wrapper accepts an override for this directory and validates it before
  // any command runs (`cache-env.test.mjs`). An override the manager ignores is
  // the same defect seen from the other side: the caller is told the store
  // moved, and it did not.
  const override = await realpath(await mkdtemp(join(tmpdir(), 'kimen-pnpm-store-')));
  t.after(() => rm(override, { force: true, recursive: true }));

  const observed = await measureStore({ NPM_CONFIG_STORE_DIR: override });

  assert.equal(
    observed.declared,
    override,
    'the wrapper must honour a validated store override before the manager is invoked',
  );
  assert.ok(
    isWithin(observed.effective, override),
    report(`${observed.manager} ignored the validated store override.`, observed, [
      `override:              ${override}`,
    ]),
  );
});
