import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const dockerfile = await readFile(new URL('../../sandbox/Dockerfile', import.meta.url), 'utf8');
const loginScript = await readFile(new URL('../../sandbox/login.sh', import.meta.url), 'utf8');
const packageJson = JSON.parse(
  await readFile(new URL('../../sandbox/package.json', import.meta.url), 'utf8'),
);
const packageLock = await readFile(
  new URL('../../sandbox/package-lock.json', import.meta.url),
  'utf8',
).catch(() => null);

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
  assert.deepEqual(packageJson.dependencies, {
    '@anthropic-ai/claude-code': '2.1.205',
    '@openai/codex': '0.144.0',
    playwright: '1.61.1',
  });
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

test('durable device login is retired from unattended use', () => {
  assert.match(loginScript, /retired/i);
  assert.doesNotMatch(loginScript, /docker run|codex login|kimen-codex-auth|1455/);
});
