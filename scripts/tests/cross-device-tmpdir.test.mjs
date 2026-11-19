// Regression for how a local gate run designates TMPDIR.
//
// The cross-device regressions (site-publication, cache-env-reentry) need the
// caller to designate a TMPDIR on a filesystem other than the checkout's, and
// report a blocked prerequisite when it does not. CI designates one in the
// workflow (a tmpfs). A macOS checkout did not: its TMPDIR, under /var/folders,
// shares the repository's APFS volume, so every local `gates-suite.sh` run
// ended red on infra-tests for a reason that was not a result.
// `scripts/gates/cross-device-tmpdir.sh` is the local counterpart of the CI
// step, and these cases hold its contract: the command gets a writable TMPDIR
// across a filesystem boundary, its exit status is the wrapper's, nothing stays
// mounted or on disk afterwards, a TMPDIR that already crosses a boundary is
// kept, and the suite enters through it before it allocates the caches.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const wrapper = join(repositoryRoot, 'scripts/gates/cross-device-tmpdir.sh');
const repositoryDevice = statSync(repositoryRoot).dev;
const callerTemporary = process.env.TMPDIR ?? '';

// Writes and removes a file in the TMPDIR it is given, then reports it.
const probe = [
  "const { rmSync, statSync, writeFileSync } = require('node:fs');",
  "const { join } = require('node:path');",
  'const directory = process.env.TMPDIR;',
  "const file = join(directory, 'kimen-cross-device-probe-' + process.pid);",
  "writeFileSync(file, 'probe');",
  'rmSync(file);',
  'process.stdout.write(JSON.stringify({ directory, device: statSync(directory).dev }));',
].join('\n');

function runWrapper(command) {
  return spawnSync('bash', [wrapper, '--', ...command], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: callerTemporary },
  });
}

function describe(result) {
  return `status ${String(result.status)}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`;
}

// Off macOS the wrapper only passes the caller's TMPDIR through, so a caller
// whose TMPDIR shares the checkout's filesystem has nothing to measure here.
function requireBoundaryReachable() {
  if (process.platform === 'darwin') return;
  assert.notEqual(
    statSync(callerTemporary).dev,
    repositoryDevice,
    `blocked prerequisite, not a result: off macOS this case needs the caller to designate a TMPDIR on another filesystem, and ${callerTemporary} shares st_dev ${repositoryDevice} with the repository`,
  );
}

function scratchDirectories() {
  return readdirSync(callerTemporary).filter((name) => name.startsWith('kimen-cross-device.'));
}

test('the command runs with a writable TMPDIR on a filesystem other than the repository', () => {
  assert.notEqual(callerTemporary, '', 'blocked prerequisite, not a result: TMPDIR is unset');
  requireBoundaryReachable();

  const result = runWrapper([process.execPath, '-e', probe]);

  assert.equal(result.status, 0, describe(result));
  const { directory, device } = JSON.parse(result.stdout);
  assert.notEqual(
    device,
    repositoryDevice,
    `the command's TMPDIR ${directory} shares st_dev ${repositoryDevice} with the repository`,
  );
});

test("the command's exit status is the wrapper's", () => {
  const result = runWrapper([process.execPath, '-e', 'process.exit(7)']);

  assert.equal(result.status, 7, describe(result));
});

test('nothing stays mounted or on disk after the command', () => {
  requireBoundaryReachable();
  const before = scratchDirectories();

  const result = runWrapper([process.execPath, '-e', probe]);

  assert.equal(result.status, 0, describe(result));
  const { directory } = JSON.parse(result.stdout);
  if (directory !== callerTemporary) {
    // A mount point that is still mounted cannot be removed, so a missing one
    // is detached as well as gone.
    assert.equal(existsSync(directory), false, `${directory} outlived the command`);
  }
  assert.deepEqual(scratchDirectories(), before, 'a scratch directory outlived the command');
});

test('a TMPDIR that already crosses a filesystem boundary is kept', () => {
  requireBoundaryReachable();
  const nested = `printf '%s\\n' "$TMPDIR"; bash "$1" -- sh -c 'printf "%s\\n" "$TMPDIR"'`;

  const result = runWrapper(['sh', '-c', nested, 'sh', wrapper]);

  assert.equal(result.status, 0, describe(result));
  const [outer, inner] = result.stdout.trim().split('\n');
  assert.equal(inner, outer, 'the nested run replaced a TMPDIR that already crossed a boundary');
});

test('gates-suite designates the TMPDIR before it allocates the caches', async () => {
  const suite = await readFile(join(repositoryRoot, 'scripts/gates/gates-suite.sh'), 'utf8');

  assert.match(
    suite,
    /exec bash scripts\/gates\/cross-device-tmpdir\.sh -- bash scripts\/gates\/cache-env\.sh -- bash scripts\/gates\/gates-suite\.sh "\$@"/u,
  );
});
