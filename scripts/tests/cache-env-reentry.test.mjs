// Regression for how `scripts/gates/cache-env.sh` reaches the package manager
// when it is not the wrapper's immediate command.
//
// `cache-env.test.mjs` owns the environment the wrapper *exports*, and
// `pnpm-store-effective.test.mjs` owns the store the pinned manager uses when
// the wrapper starts it directly. Gates do not run that way: they enter the
// wrapper as `bash scripts/gates/<gate>.sh`, and pnpm is a grandchild started by
// a shell, or by another gate that re-enters the wrapper. pnpm 11 reads its
// store only from its own PNPM_CONFIG_* / pnpm_config_* spellings, so a store
// that is right for the direct call can still be wrong one level down. These
// cases hold the contract at that depth:
//
//   1. Re-entry. A gate may invoke the wrapper from inside an environment the
//      wrapper already prepared. The nested run must resolve the real manager
//      and it must finish.
//   2. Store. Through `pnpm …` and `corepack pnpm …`, started by a shell or by a
//      nested wrapper, the effective store stays inside the private root, and a
//      validated store override is honoured. Every scenario that reads a store
//      first establishes, in that same scenario, that the pinned manager is the
//      one answering, so a pass on the unpinned 9.x is impossible.
//   3. Reach. Making pnpm private must not make corepack a precondition for
//      running a command that has nothing to do with pnpm.
//
// Preconditions are measured rather than assumed, and a precondition that does
// not hold is reported as a blocked prerequisite — the case did not run — never
// as a pass and never as a skip. Every probe goes through the wrapper, inside
// the same containment as the run it describes; nothing is stubbed, nothing is
// installed, and no installation on the machine is modified.
//
// Every case builds its own fixture repository under the caller's TMPDIR, so it
// gets a fresh private cache root and never writes, reuses or removes the
// repository's own `reports/cache`. The one thing it reads from the caller's
// cache is the pinned pnpm already provisioned there, copied into the fixture
// so the cases run without registry access (see `seedPinnedManager`).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { accessSync, constants, readdirSync, statSync } from 'node:fs';
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { delimiter, dirname, join } from 'node:path';
import test from 'node:test';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const cacheEnvSource = join(repositoryRoot, 'scripts/gates/cache-env.sh');

// A nested run that resolves itself instead of the manager never returns, so
// every invocation is bounded. The bound is a failure condition, not a passing one: a case that
// stops at the deadline reports the hang, it does not tolerate it.
const INVOCATION_TIMEOUT_MS = 30_000;

// The temporary directory is not this file's to choose. The caller designates
// exactly one authorised location through TMPDIR, and these cases use that one
// or none: falling back to /tmp or /dev/shm would put fixture cache roots on a
// mount nobody granted. A missing or unusable TMPDIR is
// reported as a blocked prerequisite — the case did not run — never as a skip
// and never as a result.
function authorisedScratchRoot() {
  const root = process.env.TMPDIR;
  if (root === undefined || root === '') {
    return { root: null, reason: 'the caller designated no temporary directory: TMPDIR is unset' };
  }
  let stats;
  try {
    stats = statSync(root);
  } catch (error) {
    return { root: null, reason: `the designated TMPDIR ${root} could not be read: ${error.code}` };
  }
  if (!stats.isDirectory()) {
    return { root: null, reason: `the designated TMPDIR ${root} is not a directory` };
  }
  try {
    accessSync(root, constants.W_OK | constants.X_OK);
  } catch (error) {
    return { root: null, reason: `the designated TMPDIR ${root} is not writable: ${error.code}` };
  }
  return { root, reason: null };
}

function requireScratchRoot() {
  const { root, reason } = authorisedScratchRoot();
  assert.ok(root, `blocked prerequisite, not a result: ${reason}`);
  return root;
}

// One fixture per case: the wrapper reached through a symlink (so it resolves
// its own repository root to the fixture, and its default cache root with it)
// plus the single manifest field the manager pin lives in. Nothing else is
// copied — the fixture exists to isolate the cache root, not to stand in for
// the repository.
async function createFixture(t, label) {
  const scratch = await realpath(await mkdtemp(join(requireScratchRoot(), `kimen-${label}-`)));
  t.after(() => rm(scratch, { force: true, recursive: true }));

  const repository = join(scratch, 'repository');
  const home = join(scratch, 'home');
  const script = join(repository, 'scripts/gates/cache-env.sh');
  await mkdir(dirname(script), { recursive: true });
  await mkdir(home, { recursive: true });
  await mkdir(join(scratch, 'tmp'), { recursive: true });
  await chmod(home, 0o700);
  await symlink(cacheEnvSource, script);

  const manifest = JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8'));
  const [manager, pinnedVersion] = (manifest.packageManager ?? '').split('@');
  assert.ok(
    manager === 'pnpm' && pinnedVersion,
    `package.json must pin a pnpm version, found ${JSON.stringify(manifest.packageManager)}`,
  );
  const fixtureManifest = {
    name: `kimen-${label}-fixture`,
    private: true,
    packageManager: manifest.packageManager,
  };
  await writeFile(
    join(repository, 'package.json'),
    `${JSON.stringify(fixtureManifest, null, 2)}\n`,
  );

  const cacheRoot = join(repository, 'reports/cache');
  await seedPinnedManager(cacheRoot, pinnedVersion);

  return {
    scratch,
    repository,
    home,
    script,
    pinnedVersion,
    cacheRoot,
  };
}

// A fresh private cache root starts with an empty corepack home, so the first
// pinned call would download pnpm. That makes every version and store case
// depend on registry access, and offline it fails before the wrapper is
// exercised at all. The caller already runs through the wrapper, which has
// provisioned the pinned manager in its own COREPACK_HOME: copy that one
// version into the fixture's default corepack home, with the private modes the
// wrapper requires. The source is only read. Without a provisioned copy the
// fixture stays empty and corepack fetches the pin, as a clean CI runner does.
async function seedPinnedManager(cacheRoot, pinnedVersion) {
  const provisioned = process.env.COREPACK_HOME;
  if (!provisioned) return;
  const source = join(provisioned, 'v1/pnpm', pinnedVersion);
  try {
    if (!statSync(source).isDirectory()) return;
  } catch {
    return;
  }
  const target = join(cacheRoot, 'corepack/v1/pnpm', pinnedVersion);
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  for (const directory of ['', 'corepack', 'corepack/v1', 'corepack/v1/pnpm']) {
    await chmod(join(cacheRoot, directory), 0o700);
  }
  await cp(source, target, { recursive: true, verbatimSymlinks: true });
}

function callerPath() {
  return process.env.PATH ?? '';
}

// A PATH fixture mirrors the executables the caller already has — real binaries,
// reached through links — so a case can remove exactly one name without
// touching any installation. `first-wins` matches PATH lookup order.
function mirrorPathFixture(directory, { exclude = [] } = {}) {
  const excluded = new Set(exclude);
  const linked = new Map();
  for (const entry of callerPath().split(delimiter)) {
    if (entry === '') continue;
    let names;
    try {
      names = readdirSync(entry);
    } catch {
      continue;
    }
    for (const name of names) {
      if (linked.has(name) || excluded.has(name)) continue;
      const source = join(entry, name);
      try {
        accessSync(source, constants.X_OK);
        if (!statSync(source).isFile()) continue;
      } catch {
        continue;
      }
      linked.set(name, source);
    }
  }
  return { linked, excluded };
}

async function createPathFixture(fixture, label, options) {
  const directory = join(fixture.scratch, `path-${label}`);
  await mkdir(directory, { recursive: true });
  const { linked } = mirrorPathFixture(directory, options);
  await Promise.all([...linked].map(([name, source]) => symlink(source, join(directory, name))));
  return {
    directory,
    has: (name) => linked.has(name),
  };
}

// `env -i` in Node form: the child receives exactly these names and nothing
// else. Nothing is copied out of `process.env`, so no inherited value can reach
// the wrapper or the manager it starts.
function containedEnvironment(fixture, { path, ...overrides }) {
  return {
    HOME: fixture.home,
    PATH: path,
    TMPDIR: join(fixture.scratch, 'tmp'),
    HUSKY: '0',
    LANG: 'C.UTF-8',
    TERM: 'xterm',
    ...overrides,
  };
}

// The child gets its own process group so the deadline can end the whole exec
// chain — a wrapper that re-executes itself is a chain, not a single call — and so
// the kill can never reach anything but the processes this case started.
function runContained(fixture, command, environment) {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: fixture.repository,
      detached: true,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    const deadline = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }, INVOCATION_TIMEOUT_MS);
    child.on('error', (error) => {
      clearTimeout(deadline);
      resolve({ code: null, signal: null, timedOut, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on('close', (code, signal) => {
      clearTimeout(deadline);
      resolve({ code, signal, timedOut, stdout, stderr });
    });
  });
}

function wrapperCommand(fixture, argv) {
  return ['bash', fixture.script, '--', ...argv];
}

// The nested form: a command started by the wrapper starts the wrapper again,
// inheriting the environment the outer run prepared. This is what a gate that
// shells out to another gate does, and it is the only way to observe what the
// second run resolves.
function nestedWrapperCommand(fixture, argv) {
  return wrapperCommand(fixture, wrapperCommand(fixture, argv));
}

// The shell form: the wrapper starts a shell and the shell starts the command,
// the way `bash scripts/gates/<gate>.sh` reaches pnpm. The trailing statement
// keeps bash from exec-ing the command in its own place, so the manager really
// is a grandchild of the wrapper and sees only what the shell inherited.
function shellWrapperCommand(fixture, argv) {
  return wrapperCommand(fixture, ['bash', '-c', '"$@"; exit "$?"', 'gate', ...argv]);
}

const FORMS = {
  direct: wrapperCommand,
  nested: nestedWrapperCommand,
  shell: shellWrapperCommand,
};

// How each form is named in a case title and in its failure messages.
const FORM_LABELS = {
  nested: 'a nested wrapper run',
  shell: 'a shell started by the wrapper',
};

async function runWrapper(fixture, argv, options = {}) {
  const path = options.path ?? callerPath();
  const command = FORMS[options.form ?? 'direct'];
  return runContained(
    fixture,
    command(fixture, argv),
    containedEnvironment(fixture, { path, ...(options.environment ?? {}) }),
  );
}

function describe(result) {
  const ending = result.timedOut
    ? `no exit: still running at the ${INVOCATION_TIMEOUT_MS} ms deadline, killed`
    : `exit ${result.code}${result.signal ? ` (signal ${result.signal})` : ''}`;
  return [ending, `stdout: ${result.stdout.trim()}`, `stderr: ${result.stderr.trim()}`].join('\n');
}

function assertTerminated(result, headline) {
  assert.equal(
    result.timedOut,
    false,
    [
      headline,
      'A run that never ends is the signature of a wrapper that resolved itself: the nested',
      'run took something the outer run put on PATH for the real manager and exec-ed it again.',
      describe(result),
    ].join('\n'),
  );
}

// A store path is only evidence about the manager that produced it. Reading one
// without establishing which manager answered would let these cases pass on the
// unpinned 9.x that sits on PATH — the exact substitution the pin exists to
// prevent — so every scenario that measures a store first establishes, *in that
// same scenario*, that the pinned manager is the one answering.
//
// Three outcomes are kept strictly apart, because they are three different
// facts and only the third is this defect:
//
//   - the run never ends      -> the re-entry defect, named as such;
//   - the run ends non-zero   -> a blocked prerequisite: the pinned manager
//                                could not be produced here at all, which is
//                                safe but is not a result;
//   - the run ends 0, wrong version -> silent substitution.
async function requirePinnedManager(fixture, invoker, options) {
  const label = invoker.join(' ');
  const reported = await runWrapper(fixture, [...invoker, '--version'], options);

  assertTerminated(reported, `resolving \`${label}\` must terminate.`);
  assert.equal(
    reported.code,
    0,
    [
      `blocked prerequisite, not a result: \`${label}\` could not produce pnpm ${fixture.pinnedVersion} in this scenario at all.`,
      describe(reported),
    ].join('\n'),
  );
  assert.equal(
    reported.stdout.trim(),
    fixture.pinnedVersion,
    [
      `\`${label}\` answered as pnpm ${reported.stdout.trim()}, not the pinned ${fixture.pinnedVersion}.`,
      'Answering with a different manager and exit 0 is worse than failing: the caller is told',
      'the pinned toolchain ran, and every measurement taken afterwards describes the wrong one.',
      describe(reported),
    ].join('\n'),
  );
  return reported.stdout.trim();
}

// `pnpm …` and `corepack pnpm …` are two different routes reaching the manager
// two different ways, so a case that covers one has not covered the other.
// `corepack --version` covers neither: it reports corepack's own version and
// never resolves the pinned manager at all.
const PNPM_INVOKERS = [['pnpm'], ['corepack', 'pnpm']];

async function measureStore(fixture, invoker, form, environment) {
  const where = FORM_LABELS[form];
  await requirePinnedManager(fixture, invoker, { form, environment });

  const declared = await runWrapper(
    fixture,
    [process.execPath, '-p', 'process.env.NPM_CONFIG_STORE_DIR'],
    { form, environment },
  );
  assertTerminated(declared, `${where} must not hang.`);
  assert.equal(
    declared.code,
    0,
    `${where} did not report a store directory.\n${describe(declared)}`,
  );

  const effective = await runWrapper(fixture, [...invoker, 'store', 'path'], {
    form,
    environment,
  });
  assertTerminated(effective, `${where} must not hang.`);
  assert.equal(
    effective.code,
    0,
    `\`${invoker.join(' ')} store path\` failed in ${where}.\n${describe(effective)}`,
  );

  return { declared: declared.stdout.trim(), effective: effective.stdout.trim() };
}

function isWithin(candidate, parent) {
  return candidate === parent || candidate.startsWith(`${parent}/`);
}

test('control: one wrapper run resolves the real corepack', async (t) => {
  const fixture = await createFixture(t, 'cache-env-reentry-control-single');

  const result = await runWrapper(fixture, ['corepack', '--version']);

  assertTerminated(result, 'a single, un-nested wrapper run must terminate.');
  assert.equal(result.code, 0, `the control run must succeed.\n${describe(result)}`);
  assert.match(
    result.stdout.trim(),
    /^\d+\.\d+\.\d+/u,
    `the control run must report a corepack version.\n${describe(result)}`,
  );
});

test('a nested wrapper run resolves the same corepack as an un-nested run', async (t) => {
  const fixture = await createFixture(t, 'cache-env-reentry-nested-corepack');

  const control = await runWrapper(fixture, ['corepack', '--version']);
  assertTerminated(control, 'the un-nested control must terminate before the nested run is read.');
  assert.equal(control.code, 0, `the un-nested control must succeed.\n${describe(control)}`);

  const nested = await runWrapper(fixture, ['corepack', '--version'], { form: 'nested' });

  assertTerminated(nested, 're-entering the wrapper must not hang.');
  assert.equal(nested.code, 0, `the nested run must succeed.\n${describe(nested)}`);
  assert.equal(
    nested.stdout.trim(),
    control.stdout.trim(),
    [
      'the nested run must resolve the same corepack the un-nested run resolves.',
      `un-nested: ${control.stdout.trim()}`,
      `nested:    ${nested.stdout.trim()}`,
    ].join('\n'),
  );
});

for (const invoker of PNPM_INVOKERS) {
  test(`a nested wrapper run reports the pinned pnpm version through \`${invoker.join(' ')}\``, async (t) => {
    const fixture = await createFixture(t, `cache-env-reentry-${invoker.join('-')}-version`);

    await requirePinnedManager(fixture, invoker, { form: 'nested' });
  });
}

for (const form of ['nested', 'shell']) {
  for (const invoker of PNPM_INVOKERS) {
    test(`${FORM_LABELS[form]} keeps the \`${invoker.join(' ')}\` store inside the private root`, async (t) => {
      const fixture = await createFixture(
        t,
        `cache-env-reentry-${form}-${invoker.join('-')}-store`,
      );

      const observed = await measureStore(fixture, invoker, form);

      assert.ok(
        isWithin(observed.effective, observed.declared),
        [
          `${FORM_LABELS[form]} moved the pnpm store outside the private root.`,
          `NPM_CONFIG_STORE_DIR: ${observed.declared}`,
          `effective store path: ${observed.effective}`,
        ].join('\n'),
      );
    });
  }
}

for (const form of ['nested', 'shell']) {
  for (const invoker of PNPM_INVOKERS) {
    test(`${FORM_LABELS[form]} honours a validated store override through \`${invoker.join(' ')}\``, async (t) => {
      const fixture = await createFixture(
        t,
        `cache-env-reentry-${form}-${invoker.join('-')}-override`,
      );
      const override = join(fixture.scratch, 'store-override');
      await mkdir(override, { recursive: true });

      const observed = await measureStore(fixture, invoker, form, {
        NPM_CONFIG_STORE_DIR: override,
      });

      assert.equal(
        observed.declared,
        override,
        'the wrapper must honour a validated store override before the manager is invoked',
      );
      assert.ok(
        isWithin(observed.effective, override),
        [
          `${FORM_LABELS[form]} dropped a validated store override.`,
          `override:             ${override}`,
          `effective store path: ${observed.effective}`,
        ].join('\n'),
      );
    });
  }
}

test('control: a command unrelated to pnpm runs while corepack is on PATH', async (t) => {
  const fixture = await createFixture(t, 'cache-env-reentry-control-corepack');
  const path = await createPathFixture(fixture, 'complete');
  assert.ok(
    path.has('corepack'),
    'blocked prerequisite, not a result: this control needs corepack on the caller’s PATH',
  );

  const result = await runWrapper(fixture, ['echo', 'unrelated'], { path: path.directory });

  assertTerminated(result, 'the control must terminate.');
  assert.equal(result.code, 0, `the control must succeed.\n${describe(result)}`);
  assert.equal(result.stdout.trim(), 'unrelated', describe(result));
});

test('a command unrelated to pnpm still runs when corepack is absent from PATH', async (t) => {
  const fixture = await createFixture(t, 'cache-env-reentry-no-corepack');
  const path = await createPathFixture(fixture, 'without-corepack', { exclude: ['corepack'] });
  assert.equal(
    path.has('corepack'),
    false,
    'the PATH fixture must not carry corepack, otherwise it fixtures nothing',
  );

  const result = await runWrapper(fixture, ['echo', 'unrelated'], { path: path.directory });

  assertTerminated(result, 'the run must terminate.');
  assert.equal(
    result.code,
    0,
    [
      'a command with no relation to pnpm must not require corepack.',
      'The wrapper has always been a plain exec for these, so every caller that runs a linter, a',
      'build or a shell command through the wrapper on a machine without corepack was served.',
      'Refusing them makes corepack a precondition for the whole wrapper, not just for pnpm.',
      describe(result),
    ].join('\n'),
  );
  assert.equal(result.stdout.trim(), 'unrelated', describe(result));
});
