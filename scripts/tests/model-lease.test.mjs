// @spec:018-project-integrity-hardening#S4
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';

import { invokeHelper } from '../../sandbox/model-lease.mjs';

const leaseVerifier = fileURLToPath(new URL('../../sandbox/model-lease.sh', import.meta.url));
const now = Math.floor(Date.now() / 1000);
const validIssuedAt = now - 10;
const defaultLeaseId = 'lease-s4-fixture';
const expectedIssuer = 'https://broker.example.invalid';
const expectedAudience = 'kimen-sandbox';
const allowedEndpoint = 'https://gateway.example.invalid/v1';

function anEd25519Key(kid, status) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');

  return {
    kid,
    status,
    privateKey,
    publicKey,
    publicKeyJwk: publicKey.export({ format: 'jwk' }),
  };
}

const currentKey = anEd25519Key('test-current', 'current');
const nextKey = anEd25519Key('test-next', 'next');
const retiredKey = anEd25519Key('test-retired', 'retired');
const unknownKey = anEd25519Key('test-unknown', 'unknown');

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function compactJwt({ header, payload, signingKey, mode = 'eddsa' }) {
  const signingInput = `${encodeJwtPart(header)}.${encodeJwtPart(payload)}`;
  let signature;

  if (mode === 'none') {
    signature = '';
  } else if (mode === 'hs256-public-key') {
    const publicKeyPem = currentKey.publicKey.export({
      format: 'pem',
      type: 'spki',
    });
    signature = createHmac('sha256', publicKeyPem).update(signingInput).digest('base64url');
  } else {
    signature = sign(null, Buffer.from(signingInput), signingKey.privateKey).toString('base64url');
  }

  return `${signingInput}.${signature}`;
}

function validClaims(overrides = {}) {
  return {
    iss: expectedIssuer,
    aud: expectedAudience,
    iat: validIssuedAt,
    nbf: validIssuedAt,
    exp: validIssuedAt + 3660,
    jti: defaultLeaseId,
    project: 'kimen',
    modelClass: 'implementation-agent',
    maxCostUsd: 25,
    maxRequests: 1000,
    ...overrides,
  };
}

function envelopeFor(claims, token, overrides = {}) {
  const scopeOverrides = overrides.scope ?? {};
  const envelope = {
    schemaVersion: 1,
    leaseId: defaultLeaseId,
    provider: 'openai',
    endpoint: allowedEndpoint,
    tokenFormat: 'jwt',
    token,
    issuer: claims.iss,
    audience: claims.aud,
    issuedAt: new Date(Number(claims.iat) * 1000).toISOString(),
    expiresAt: new Date(Number(claims.exp) * 1000).toISOString(),
    scope: {
      project: claims.project,
      modelClass: claims.modelClass,
      maxCostUsd: claims.maxCostUsd,
      maxRequests: claims.maxRequests,
      ...scopeOverrides,
    },
    ...overrides,
  };

  envelope.scope = {
    project: claims.project,
    modelClass: claims.modelClass,
    maxCostUsd: claims.maxCostUsd,
    maxRequests: claims.maxRequests,
    ...scopeOverrides,
  };

  return envelope;
}

function keyring(keys = [currentKey, nextKey, retiredKey]) {
  return {
    schemaVersion: 1,
    issuer: expectedIssuer,
    audience: expectedAudience,
    keys: keys.map(({ kid, status, publicKeyJwk }) => ({
      kid,
      status,
      alg: 'EdDSA',
      publicKeyJwk,
    })),
  };
}

async function verifyFixture(
  t,
  {
    claims: claimOverrides = {},
    envelope: envelopeOverrides = {},
    header: headerOverrides = {},
    signingKey = currentKey,
    mode = 'eddsa',
    keys,
    allowedHosts = ['gateway.example.invalid'],
    revokedLeaseIds = [],
  } = {},
) {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-model-lease-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const claims = validClaims(claimOverrides);
  const header = {
    typ: 'JWT',
    alg: 'EdDSA',
    kid: signingKey.kid,
    ...headerOverrides,
  };
  const token = compactJwt({ header, payload: claims, signingKey, mode });
  const leasePath = join(directory, 'lease.json');
  const keyringPath = join(directory, 'keyring.json');
  const allowlistPath = join(directory, 'allowlist.json');
  const revocationsPath = join(directory, 'revocations.json');

  await Promise.all([
    writeFile(leasePath, `${JSON.stringify(envelopeFor(claims, token, envelopeOverrides))}\n`, {
      mode: 0o600,
    }),
    writeFile(keyringPath, `${JSON.stringify(keyring(keys))}\n`, { mode: 0o600 }),
    writeFile(allowlistPath, `${JSON.stringify({ schemaVersion: 1, allowedHosts })}\n`, {
      mode: 0o600,
    }),
    writeFile(revocationsPath, `${JSON.stringify({ schemaVersion: 1, revokedLeaseIds })}\n`, {
      mode: 0o600,
    }),
  ]);

  const result = spawnSync(
    'bash',
    [
      leaseVerifier,
      'verify',
      '--lease',
      leasePath,
      '--keyring',
      keyringPath,
      '--allowlist',
      allowlistPath,
      '--revocations',
      revocationsPath,
    ],
    {
      cwd: directory,
      encoding: 'utf8',
      env: { LC_ALL: 'C', PATH: process.env.PATH },
    },
  );

  return { result, token };
}

function assertTokenWasNotLeaked({ result, token }) {
  assert.equal(result.stdout.includes(token), false);
  assert.equal(result.stderr.includes(token), false);
}

function assertAccepted(execution) {
  assertTokenWasNotLeaked(execution);
  assert.deepEqual(
    {
      status: execution.result.status,
      stdout: execution.result.stdout,
      stderr: execution.result.stderr,
    },
    { status: 0, stdout: '', stderr: '' },
  );
}

function assertRejected(execution, reason) {
  assertTokenWasNotLeaked(execution);
  assert.deepEqual(
    {
      status: execution.result.status,
      stdout: execution.result.stdout,
      stderr: execution.result.stderr,
    },
    {
      status: 1,
      stdout: '',
      stderr: `model-lease: rejected: ${reason}\n`,
    },
  );
}

test('S4 accepts a valid lease signed by the current Ed25519 key', async (t) => {
  const execution = await verifyFixture(t);

  assertAccepted(execution);
});

test('S4 accepts a valid lease signed by the explicitly configured next Ed25519 key', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { maxCostUsd: 0.01, maxRequests: 1 },
    signingKey: nextKey,
  });

  assertAccepted(execution);
});

test('S4 rejects an unknown JWT kid even when its Ed25519 signature is valid', async (t) => {
  const execution = await verifyFixture(t, { signingKey: unknownKey });

  assertRejected(execution, 'unknown-key');
});

test('S4 rejects a correctly signed JWT whose key is retired', async (t) => {
  const execution = await verifyFixture(t, { signingKey: retiredKey });

  assertRejected(execution, 'retired-key');
});

test('S4 rejects a JWT with a known kid but a signature from another key', async (t) => {
  const execution = await verifyFixture(t, {
    header: { kid: currentKey.kid },
    signingKey: unknownKey,
  });

  assertRejected(execution, 'invalid-signature');
});

test('S4 rejects the none JWT algorithm', async (t) => {
  const execution = await verifyFixture(t, {
    header: { alg: 'none' },
    mode: 'none',
  });

  assertRejected(execution, 'unsupported-algorithm');
});

test('S4 rejects HS256 public-key algorithm confusion', async (t) => {
  const execution = await verifyFixture(t, {
    header: { alg: 'HS256' },
    mode: 'hs256-public-key',
  });

  assertRejected(execution, 'unsupported-algorithm');
});

test('S4 rejects a JWT whose typ header is not exactly JWT', async (t) => {
  const execution = await verifyFixture(t, { header: { typ: 'jwt' } });

  assertRejected(execution, 'invalid-header');
});

test('S4 rejects a JWT from a different issuer', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iss: 'https://attacker.example.invalid' },
  });

  assertRejected(execution, 'invalid-issuer');
});

test('S4 rejects a JWT for a different audience', async (t) => {
  const execution = await verifyFixture(t, { claims: { aud: 'other-sandbox' } });

  assertRejected(execution, 'invalid-audience');
});

test('S4 rejects a JWT jti that differs from the envelope leaseId', async (t) => {
  const execution = await verifyFixture(t, { claims: { jti: 'other-lease' } });

  assertRejected(execution, 'envelope-mismatch');
});

test('S4 rejects an envelope scope that differs from the signed JWT scope', async (t) => {
  const execution = await verifyFixture(t, {
    envelope: { scope: { maxRequests: 999 } },
  });

  assertRejected(execution, 'envelope-mismatch');
});

test('S4 rejects a signed project other than kimen', async (t) => {
  const execution = await verifyFixture(t, { claims: { project: 'other-project' } });

  assertRejected(execution, 'invalid-project');
});

test('S4 rejects a model class outside the approved implementation-agent class', async (t) => {
  const execution = await verifyFixture(t, { claims: { modelClass: 'admin-agent' } });

  assertRejected(execution, 'invalid-model-class');
});

test('S4 rejects numeric maxCostUsd equal to zero', async (t) => {
  const execution = await verifyFixture(t, { claims: { maxCostUsd: 0 } });

  assertRejected(execution, 'invalid-max-cost');
});

test('S4 rejects numeric maxCostUsd above 25', async (t) => {
  const execution = await verifyFixture(t, { claims: { maxCostUsd: 25.01 } });

  assertRejected(execution, 'invalid-max-cost');
});

test('S4 rejects string maxCostUsd even when it looks numeric', async (t) => {
  const execution = await verifyFixture(t, { claims: { maxCostUsd: '25' } });

  assertRejected(execution, 'invalid-max-cost');
});

test('S4 rejects maxRequests below the inclusive lower bound', async (t) => {
  const execution = await verifyFixture(t, { claims: { maxRequests: 0 } });

  assertRejected(execution, 'invalid-max-requests');
});

test('S4 rejects maxRequests above the inclusive upper bound', async (t) => {
  const execution = await verifyFixture(t, { claims: { maxRequests: 1001 } });

  assertRejected(execution, 'invalid-max-requests');
});

test('S4 rejects fractional maxRequests inside the numeric range', async (t) => {
  const execution = await verifyFixture(t, { claims: { maxRequests: 1.5 } });

  assertRejected(execution, 'invalid-max-requests');
});

test('S4 rejects string maxRequests even when it looks like an integer', async (t) => {
  const execution = await verifyFixture(t, { claims: { maxRequests: '1000' } });

  assertRejected(execution, 'invalid-max-requests');
});

test('S4 accepts an exact signed TTL of 3660 seconds', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iat: validIssuedAt, nbf: validIssuedAt, exp: validIssuedAt + 3660 },
  });

  assertAccepted(execution);
});

test('S4 rejects a signed TTL of 3661 seconds', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iat: validIssuedAt, nbf: validIssuedAt, exp: validIssuedAt + 3661 },
  });

  assertRejected(execution, 'excessive-ttl');
});

test('S4 rejects a future issued-at claim', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iat: now + 300, nbf: now + 300, exp: now + 600 },
  });

  assertRejected(execution, 'not-active');
});

test('S4 rejects a future not-before claim even when issued-at is current', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iat: validIssuedAt, nbf: now + 300, exp: validIssuedAt + 3660 },
  });

  assertRejected(execution, 'not-active');
});

test('S4 rejects an expired signed token', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iat: now - 120, nbf: now - 120, exp: now - 1 },
  });

  assertRejected(execution, 'expired');
});

test('S4 rejects nonnumeric temporal claims', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iat: String(validIssuedAt) },
  });

  assertRejected(execution, 'invalid-time');
});

test('S4 rejects an exp claim that is not later than iat', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iat: validIssuedAt, nbf: validIssuedAt, exp: validIssuedAt },
  });

  assertRejected(execution, 'invalid-time');
});

test('S4 rejects fresh envelope dates that try to mask an expired signed JWT', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iat: now - 120, nbf: now - 120, exp: now - 1 },
    envelope: {
      issuedAt: new Date(now * 1000).toISOString(),
      expiresAt: new Date((now + 3600) * 1000).toISOString(),
    },
  });

  assertRejected(execution, 'envelope-mismatch');
});

test('S4 rejects shorter envelope dates that try to mask a 3661-second signed TTL', async (t) => {
  const execution = await verifyFixture(t, {
    claims: { iat: validIssuedAt, nbf: validIssuedAt, exp: validIssuedAt + 3661 },
    envelope: {
      issuedAt: new Date(validIssuedAt * 1000).toISOString(),
      expiresAt: new Date((validIssuedAt + 3660) * 1000).toISOString(),
    },
  });

  assertRejected(execution, 'envelope-mismatch');
});

test('S4 rejects a lease present in the revocation list', async (t) => {
  const execution = await verifyFixture(t, {
    revokedLeaseIds: [defaultLeaseId],
  });

  assertRejected(execution, 'revoked');
});

test('S4 rejects an endpoint host outside the exact allowlist', async (t) => {
  const execution = await verifyFixture(t, {
    envelope: { endpoint: 'https://undeclared.example.invalid/v1' },
  });

  assertRejected(execution, 'endpoint-denied');
});

async function acquireFixture(
  t,
  {
    timeoutSeconds = 3_600,
    invalidEnvelope = false,
    notAfterMs,
    deadlineSource = 'environment',
  } = {},
) {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-model-lease-acquire-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const leaseNotAfterMs = notAfterMs ?? Date.now() + (timeoutSeconds + 80) * 1_000;
  const claims = validClaims();
  const token = compactJwt({
    header: { typ: 'JWT', alg: 'EdDSA', kid: currentKey.kid },
    payload: claims,
    signingKey: currentKey,
  });
  const sourcePath = join(directory, 'broker-response.json');
  const keyringPath = join(directory, 'keyring.json');
  const allowlistPath = join(directory, 'allowlist.txt');
  const revocationsPath = join(directory, 'revocations.json');
  const helperPath = join(directory, 'helper.sh');
  const outputPath = join(directory, 'lease.json');
  const helperLog = join(directory, 'helper.log');
  const envelope = invalidEnvelope ? { token } : envelopeFor(claims, token);

  await Promise.all([
    writeFile(sourcePath, `${JSON.stringify(envelope)}\n`, { mode: 0o600 }),
    writeFile(keyringPath, `${JSON.stringify(keyring())}\n`, { mode: 0o600 }),
    writeFile(allowlistPath, 'version 1\nagent gateway.example.invalid:443\n', {
      mode: 0o600,
    }),
    writeFile(revocationsPath, `${JSON.stringify({ schemaVersion: 1, revokedLeaseIds: [] })}\n`, {
      mode: 0o600,
    }),
    writeFile(
      helperPath,
      `#!/usr/bin/env bash
set -euo pipefail
case "\${1:-}" in
  acquire)
    [ "\${2:-}" = --ttl ]
    [ "\${4:-}" = --not-after-ms ]
    [ "\${5:-}" = "$KIMEN_EXPECTED_NOT_AFTER_MS" ]
    [ "\${6:-}" = --audience ]
    [ "\${7:-}" = kimen-sandbox ]
    [ "\${8:-}" = --project ]
    [ "\${9:-}" = kimen ]
    [ "$KIMEN_LEASE_NOT_AFTER_MS" = "$KIMEN_EXPECTED_NOT_AFTER_MS" ]
    printf 'acquire:%s:%s\\n' "\${3:-}" "\${5:-}" >> "$KIMEN_HELPER_LOG"
    cat "$KIMEN_HELPER_LEASE_SOURCE"
    ;;
  revoke)
    [ "\${2:-}" = "${defaultLeaseId}" ]
    printf 'revoke:%s\\n' "\${2:-}" >> "$KIMEN_HELPER_LOG"
    ;;
  *) exit 64 ;;
esac
`,
      { mode: 0o700 },
    ),
  ]);

  const environment = {
    LC_ALL: 'C',
    PATH: process.env.PATH,
    KIMEN_AGENT_TIMEOUT_SECONDS: String(timeoutSeconds),
    KIMEN_EGRESS_ALLOWLIST: allowlistPath,
    KIMEN_HELPER_LEASE_SOURCE: sourcePath,
    KIMEN_HELPER_LOG: helperLog,
    KIMEN_EXPECTED_NOT_AFTER_MS: String(leaseNotAfterMs),
    KIMEN_MODEL_LEASE_HELPER: helperPath,
    KIMEN_MODEL_LEASE_KEYRING: keyringPath,
    KIMEN_MODEL_LEASE_REVOCATIONS: revocationsPath,
  };
  const acquireArguments = [leaseVerifier, 'acquire', '--output', outputPath];
  if (deadlineSource === 'environment') {
    environment.KIMEN_LEASE_NOT_AFTER_MS = String(leaseNotAfterMs);
  } else if (deadlineSource === 'argument') {
    acquireArguments.push('--not-after-ms', String(leaseNotAfterMs));
  } else {
    throw new Error(`unsupported deadline source: ${deadlineSource}`);
  }
  const result = spawnSync('bash', acquireArguments, {
    cwd: directory,
    encoding: 'utf8',
    env: environment,
  });

  return {
    directory,
    environment,
    helperLog,
    notAfterMs: leaseNotAfterMs,
    outputPath,
    result,
    token,
  };
}

test('S4 acquire exposes only a verified mode-0600 lease and its opaque ID', async (t) => {
  const fixture = await acquireFixture(t);

  assert.deepEqual(
    { status: fixture.result.status, stdout: fixture.result.stdout, stderr: fixture.result.stderr },
    { status: 0, stdout: `${defaultLeaseId}\n`, stderr: '' },
  );
  const outputHandle = await open(fixture.outputPath, 'r');
  try {
    assert.equal((await outputHandle.stat()).mode & 0o777, 0o600);
    assert.equal(JSON.parse(await outputHandle.readFile('utf8')).token, fixture.token);
  } finally {
    await outputHandle.close();
  }
  assert.equal(fixture.result.stdout.includes(fixture.token), false);
  assert.equal(fixture.result.stderr.includes(fixture.token), false);
  assert.equal(await readFile(fixture.helperLog, 'utf8'), `acquire:3660:${fixture.notAfterMs}\n`);

  await rm(fixture.outputPath);
  const revoke = spawnSync('bash', [leaseVerifier, 'revoke', '--lease-id', defaultLeaseId], {
    cwd: fixture.directory,
    encoding: 'utf8',
    env: fixture.environment,
  });
  assert.deepEqual(
    { status: revoke.status, stdout: revoke.stdout, stderr: revoke.stderr },
    { status: 0, stdout: '', stderr: '' },
  );
  assert.equal(
    await readFile(fixture.helperLog, 'utf8'),
    `acquire:3660:${fixture.notAfterMs}\nrevoke:lease-s4-fixture\n`,
  );
});

test('S4 helper timeout kills a detached-fd descendant after its leader exits on TERM', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-model-lease-supervisor-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const helperPath = join(directory, 'ignore-term.sh');
  const leaderPidPath = join(directory, 'leader.pid');
  const descendantPidPath = join(directory, 'descendant.pid');
  let leaderPid;
  t.after(() => {
    if (leaderPid !== undefined && process.platform !== 'win32') {
      try {
        process.kill(-leaderPid, 'SIGKILL');
      } catch {
        // The expected GREEN path already removed the complete process group.
      }
    }
  });
  await writeFile(
    helperPath,
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$$" > "$KIMEN_HELPER_LEADER_PID_FILE"
(
  trap '' TERM
  exec </dev/null >/dev/null 2>/dev/null
  while :; do sleep 60; done
) &
printf '%s\n' "$!" > "$KIMEN_HELPER_DESCENDANT_PID_FILE"
trap 'exit 0' TERM
wait
`,
    { mode: 0o700 },
  );

  const startedAt = Date.now();
  await assert.rejects(
    invokeHelper(
      helperPath,
      ['acquire'],
      {
        ...process.env,
        KIMEN_HELPER_DESCENDANT_PID_FILE: descendantPidPath,
        KIMEN_HELPER_LEADER_PID_FILE: leaderPidPath,
      },
      { timeoutMs: 500, terminationGraceMs: 200 },
    ),
    (error) => error?.reason === 'helper-failed',
  );
  assert.ok(Date.now() - startedAt < 3_000, 'helper supervisor exceeded its hard deadline');

  leaderPid = Number((await readFile(leaderPidPath, 'utf8')).trim());
  const descendantPid = Number((await readFile(descendantPidPath, 'utf8')).trim());
  assert.throws(
    () => process.kill(leaderPid, 0),
    (error) => error?.code === 'ESRCH',
  );
  assert.throws(
    () => process.kill(descendantPid, 0),
    (error) => error?.code === 'ESRCH',
  );
  if (process.platform !== 'win32') {
    assert.throws(
      () => process.kill(-leaderPid, 0),
      (error) => error?.code === 'ESRCH',
    );
  }
});

test('S4 rejects a successful helper leader that leaves a detached-fd descendant', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-model-lease-orphan-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const helperPath = join(directory, 'orphan.sh');
  const leaderPidPath = join(directory, 'leader.pid');
  const descendantPidPath = join(directory, 'descendant.pid');
  let leaderPid;
  t.after(() => {
    if (leaderPid !== undefined && process.platform !== 'win32') {
      try {
        process.kill(-leaderPid, 'SIGKILL');
      } catch {
        // The expected GREEN path already removed the complete process group.
      }
    }
  });
  await writeFile(
    helperPath,
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$$" > "$KIMEN_HELPER_LEADER_PID_FILE"
(
  trap '' HUP TERM
  exec </dev/null >/dev/null 2>/dev/null
  while :; do sleep 60; done
) &
printf '%s\n' "$!" > "$KIMEN_HELPER_DESCENDANT_PID_FILE"
printf '{}\n'
exit 0
`,
    { mode: 0o700 },
  );

  await assert.rejects(
    invokeHelper(
      helperPath,
      ['acquire'],
      {
        ...process.env,
        KIMEN_HELPER_DESCENDANT_PID_FILE: descendantPidPath,
        KIMEN_HELPER_LEADER_PID_FILE: leaderPidPath,
      },
      { timeoutMs: 2_000, terminationGraceMs: 100 },
    ),
    (error) => error?.reason === 'helper-failed',
  );

  leaderPid = Number((await readFile(leaderPidPath, 'utf8')).trim());
  const descendantPid = Number((await readFile(descendantPidPath, 'utf8')).trim());
  assert.throws(
    () => process.kill(descendantPid, 0),
    (error) => error?.code === 'ESRCH',
  );
  if (process.platform !== 'win32') {
    assert.throws(
      () => process.kill(-leaderPid, 0),
      (error) => error?.code === 'ESRCH',
    );
  }
});

test('S4 supervisor signal cleans a TERM-ignoring helper group before exiting', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-model-lease-signal-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const helperPath = join(directory, 'ignore-term.sh');
  const leaderPidPath = join(directory, 'leader.pid');
  const descendantPidPath = join(directory, 'descendant.pid');
  const outputPath = join(directory, 'lease.json');
  let leaderPid;
  let descendantPid;
  t.after(() => {
    if (leaderPid !== undefined && process.platform !== 'win32') {
      try {
        process.kill(-leaderPid, 'SIGKILL');
      } catch {
        // The expected GREEN path already removed the complete process group.
      }
    }
  });
  await writeFile(
    helperPath,
    `#!/usr/bin/env bash
set -euo pipefail
trap '' HUP TERM
printf '%s\n' "$$" > "$KIMEN_HELPER_LEADER_PID_FILE"
(
  trap '' HUP TERM
  exec </dev/null >/dev/null 2>/dev/null
  while :; do sleep 60; done
) &
printf '%s\n' "$!" > "$KIMEN_HELPER_DESCENDANT_PID_FILE"
while :; do sleep 60; done
`,
    { mode: 0o700 },
  );

  const supervisor = spawn('bash', [leaseVerifier, 'acquire', '--output', outputPath], {
    cwd: directory,
    env: {
      LC_ALL: 'C',
      PATH: process.env.PATH,
      KIMEN_AGENT_TIMEOUT_SECONDS: '1',
      KIMEN_HELPER_DESCENDANT_PID_FILE: descendantPidPath,
      KIMEN_HELPER_LEADER_PID_FILE: leaderPidPath,
      KIMEN_LEASE_NOT_AFTER_MS: String(Date.now() + 90_000),
      KIMEN_MODEL_LEASE_HELPER: helperPath,
      KIMEN_MODEL_LEASE_KEYRING: join(directory, 'unused-keyring.json'),
      KIMEN_MODEL_LEASE_REVOCATIONS: join(directory, 'unused-revocations.json'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closed = new Promise((resolveClose) => supervisor.once('close', resolveClose));
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      leaderPid = Number((await readFile(leaderPidPath, 'utf8')).trim());
      descendantPid = Number((await readFile(descendantPidPath, 'utf8')).trim());
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
    }
  }
  assert.ok(Number.isSafeInteger(leaderPid), 'helper leader never started');
  assert.ok(Number.isSafeInteger(descendantPid), 'helper descendant never started');

  supervisor.kill('SIGTERM');
  await closed;
  assert.throws(
    () => process.kill(leaderPid, 0),
    (error) => error?.code === 'ESRCH',
  );
  assert.throws(
    () => process.kill(descendantPid, 0),
    (error) => error?.code === 'ESRCH',
  );
  if (process.platform !== 'win32') {
    assert.throws(
      () => process.kill(-leaderPid, 0),
      (error) => error?.code === 'ESRCH',
    );
  }
  await assert.rejects(() => stat(outputPath), { code: 'ENOENT' });
});

test('S4 signal received at spawn bootstrap is pending until the helper group is cleaned', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-model-lease-spawn-signal-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const helperPath = join(directory, 'ignore-term.sh');
  const priorHandlers = new Set(process.listeners('SIGTERM'));
  let helperPid;
  t.after(() => {
    if (helperPid !== undefined && process.platform !== 'win32') {
      try {
        process.kill(-helperPid, 'SIGKILL');
      } catch {
        // The expected GREEN path already removed the complete process group.
      }
    }
  });
  await writeFile(
    helperPath,
    `#!/usr/bin/env bash
set -euo pipefail
trap '' HUP TERM
while :; do sleep 60; done
`,
    { mode: 0o700 },
  );

  const spawnDuringSignal = (...arguments_) => {
    const addedHandlers = process
      .listeners('SIGTERM')
      .filter((handler) => !priorHandlers.has(handler));
    assert.equal(addedHandlers.length, 1);
    addedHandlers[0]();
    const child = spawn(...arguments_);
    helperPid = child.pid;
    return child;
  };

  await assert.rejects(
    invokeHelper(helperPath, ['acquire'], process.env, {
      spawnProcess: spawnDuringSignal,
      timeoutMs: 2_000,
      terminationGraceMs: 100,
    }),
    (error) => error?.reason === 'helper-failed',
  );
  assert.throws(
    () => process.kill(helperPid, 0),
    (error) => error?.code === 'ESRCH',
  );
  if (process.platform !== 'win32') {
    assert.throws(
      () => process.kill(-helperPid, 0),
      (error) => error?.code === 'ESRCH',
    );
  }
  assert.deepEqual(
    process.listeners('SIGTERM').filter((handler) => !priorHandlers.has(handler)),
    [],
  );
});

test('S4 acquire rejects an absolute lease deadline that expired before broker invocation', async (t) => {
  const fixture = await acquireFixture(t, {
    deadlineSource: 'argument',
    notAfterMs: Date.now() - 1_000,
  });

  assertRejected(fixture, 'lease-deadline-expired');
  await assert.rejects(() => readFile(fixture.helperLog, 'utf8'), { code: 'ENOENT' });
  await assert.rejects(() => stat(fixture.outputPath), { code: 'ENOENT' });
});

test('S4 acquire rejects a signed and copied expiry after the absolute lease deadline', async (t) => {
  const fixture = await acquireFixture(t, {
    deadlineSource: 'argument',
    notAfterMs: (validIssuedAt + 3_659) * 1_000,
  });

  assertRejected(fixture, 'lease-expiry-after-deadline');
  await assert.rejects(() => stat(fixture.outputPath), { code: 'ENOENT' });
  assert.equal(await readFile(fixture.helperLog, 'utf8'), `acquire:3660:${fixture.notAfterMs}\n`);
});

test('S4 acquire deletes an unverified broker response without leaking its token', async (t) => {
  const fixture = await acquireFixture(t, { invalidEnvelope: true });

  assert.equal(fixture.result.status, 1);
  assert.equal(fixture.result.stdout, '');
  assert.equal(fixture.result.stdout.includes(fixture.token), false);
  assert.equal(fixture.result.stderr.includes(fixture.token), false);
  await assert.rejects(() => stat(fixture.outputPath), { code: 'ENOENT' });
});

test('S4 acquire reduces the signed TTL ceiling for shorter agent attempts', async (t) => {
  const fixture = await acquireFixture(t, { timeoutSeconds: 60 });

  assert.deepEqual(
    { status: fixture.result.status, stdout: fixture.result.stdout, stderr: fixture.result.stderr },
    { status: 1, stdout: '', stderr: 'model-lease: rejected: excessive-ttl\n' },
  );
  await assert.rejects(() => stat(fixture.outputPath), { code: 'ENOENT' });
  assert.equal(await readFile(fixture.helperLog, 'utf8'), `acquire:120:${fixture.notAfterMs}\n`);
});
