import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const dockerfile = await readFile(new URL('../../sandbox/Dockerfile', import.meta.url), 'utf8');
const loginScript = await readFile(new URL('../../sandbox/login.sh', import.meta.url), 'utf8');
const loopScript = await readFile(new URL('../../sandbox/loop.sh', import.meta.url), 'utf8');
const packageJson = JSON.parse(
  await readFile(new URL('../../sandbox/package.json', import.meta.url), 'utf8'),
);
const packageLock = await readFile(
  new URL('../../sandbox/package-lock.json', import.meta.url),
  'utf8',
).catch(() => null);
const rootPackageJson = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
);

// @spec:018-project-integrity-hardening#S5
test('sandbox image pins its base, dated Debian snapshot and direct OS packages', () => {
  const dockerfileLines = dockerfile.split('\n').map((line) => line.trim());
  assert.match(dockerfile, /^FROM node:\d+\.\d+\.\d+-bookworm@sha256:[0-9a-f]{64}$/m);
  assert.match(dockerfile, /ARG DEBIAN_SNAPSHOT=\d{8}T\d{6}Z/);
  assert.ok(
    dockerfileLines.includes(
      '"deb [check-valid-until=no] https://snapshot.debian.org/archive/debian/${DEBIAN_SNAPSHOT}/ bookworm main" \\',
    ),
  );
  assert.ok(
    dockerfileLines.includes(
      '"deb [check-valid-until=no] https://snapshot.debian.org/archive/debian-security/${DEBIAN_SNAPSHOT}/ bookworm-security main" \\',
    ),
  );
  for (const name of ['iptables', 'ipset', 'dnsutils', 'jq', 'sudo', 'git']) {
    assert.match(dockerfile, new RegExp(`\\b${name}=[^\\s\\\\]+`));
  }
});

test('sandbox executables use exact package metadata and one integrity lock', () => {
  assert.deepEqual(Object.keys(packageJson.dependencies).toSorted(), [
    '@anthropic-ai/claude-code',
    '@openai/codex',
    'corepack',
    'playwright',
  ]);
  for (const version of Object.values(packageJson.dependencies)) {
    assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u);
  }
  assert.notEqual(packageLock, null, 'sandbox/package-lock.json is mandatory');
  const parsedLock = JSON.parse(packageLock);
  assert.equal(parsedLock.lockfileVersion, 3);
  assert.deepEqual(parsedLock.packages[''].dependencies, packageJson.dependencies);
  for (const [path, entry] of Object.entries(parsedLock.packages)) {
    if (path.startsWith('node_modules/')) {
      assert.match(entry.integrity ?? '', /^sha512-[A-Za-z0-9+/]+={0,2}$/);
    }
  }
  assert.match(dockerfile, /npm ci --omit=dev --ignore-scripts/);
  assert.doesNotMatch(dockerfile, /npm install -g|npx -y/);
});

// The gates phase runs with --network none: corepack can only serve the pnpm
// the image pre-fetched. The pin lagged behind the pnpm 11 and 12 bumps.
test('sandbox image pre-fetches the pnpm the repository declares', () => {
  const prepared = dockerfile.match(/corepack prepare (pnpm@\S+) --activate/u)?.[1];
  assert.equal(
    prepared,
    rootPackageJson.packageManager,
    'update `corepack prepare` in sandbox/Dockerfile to the root packageManager field',
  );
});

// The global loop lock is mutually exclusive only because mkdir(2) fails with
// EEXIST for the second creator. An external mkdir binary does not guarantee
// that: uutils coreutils before 0.11, the default /bin/mkdir on Ubuntu 26.04
// runners, turned a concurrent EEXIST into success (uutils/coreutils#13970),
// so two simultaneous loops both became lock owners.
// @spec:018-project-integrity-hardening#S5
test('loop lock directories are created exclusively by mkdir(2), not an external mkdir', () => {
  const loopCode = loopScript
    .split('\n')
    .filter((line) => !/^\s*#/u.test(line))
    .join('\n');
  const externalMkdirs = [
    ...loopCode.matchAll(/(?:^|[\s;&|(!])((?:\/usr)?\/bin\/)?mkdir\s+(\S+)/gmu),
  ];
  for (const [invocation, absolutePath, firstArgument] of externalMkdirs) {
    assert.equal(absolutePath, undefined, `exclusive creation through ${invocation.trim()}`);
    assert.equal(firstArgument, '-p', `${invocation.trim()} must be idempotent or use mkdir(2)`);
  }
  const exclusiveCreates = [...loopCode.matchAll(/fs\.mkdirSync\(([^)]*)\)/gu)];
  assert.ok(exclusiveCreates.length > 0, 'lock directories need an exclusive mkdir(2) helper');
  for (const [call, argumentsText] of exclusiveCreates) {
    assert.match(argumentsText, /mode: 0o700/u, `${call} must create a private directory`);
    assert.doesNotMatch(argumentsText, /recursive/u, `${call} must fail on EEXIST`);
  }
});

test('durable device login is retired from unattended use', () => {
  assert.match(loginScript, /retired/i);
  assert.doesNotMatch(loginScript, /docker run|codex login|kimen-codex-auth|1455/);
});
