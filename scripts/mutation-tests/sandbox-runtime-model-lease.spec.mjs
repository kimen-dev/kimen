import { spawn } from 'node:child_process';
import { generateKeyPairSync, sign } from 'node:crypto';
import { chmod, mkdtemp, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout } from 'node:timers';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { invokeHelper, main as runModelLease, verifyLease } from '../../sandbox/model-lease.mjs';

// @spec:018-project-integrity-hardening#S4

const issuer = 'https://broker.fixture.invalid';
const audience = 'kimen-sandbox';
const leaseId = 'lease-mutation-fixture';
const endpointHost = 'gateway.fixture.invalid';
const temporaryDirectories = new Set();

const aSigningKey = (kid, status = 'current') => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    kid,
    status,
    privateKey,
    publicKeyJwk: publicKey.export({ format: 'jwk' }),
  };
};

const currentKey = aSigningKey('current-key');
const nextKey = aSigningKey('next-key', 'next');
const retiredKey = aSigningKey('retired-key', 'retired');
const otherKey = aSigningKey('other-key');

const encodePart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const signedToken = ({ header, claims, signingKey = currentKey }) => {
  const signingInput = `${encodePart(header)}.${encodePart(claims)}`;
  const signature = sign(null, Buffer.from(signingInput), signingKey.privateKey).toString(
    'base64url',
  );
  return `${signingInput}.${signature}`;
};

const envelopeDate = (seconds) => {
  const date = new Date(Number(seconds) * 1_000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
};

const keyEntry = ({ kid, status, publicKeyJwk }, overrides = {}) => ({
  kid,
  status,
  alg: 'EdDSA',
  publicKeyJwk,
  ...overrides,
});

const makeFixture = async ({
  claimOverrides = {},
  envelopeOverrides = {},
  scopeOverrides = {},
  headerOverrides = {},
  signingKey = currentKey,
  token,
  keyEntries = [keyEntry(currentKey), keyEntry(nextKey), keyEntry(retiredKey)],
  keyringOverrides = {},
  allowlist = { schemaVersion: 1, allowedHosts: [endpointHost] },
  allowlistContents,
  revocations = { schemaVersion: 1, revokedLeaseIds: [] },
  leaseContents,
  keyringContents,
  revocationsContents,
} = {}) => {
  const now = Math.floor(Date.now() / 1_000);
  const claims = {
    iss: issuer,
    aud: audience,
    iat: now - 30,
    nbf: now - 30,
    exp: now + 3_570,
    jti: leaseId,
    project: 'kimen',
    modelClass: 'implementation-agent',
    maxCostUsd: 25,
    maxRequests: 1_000,
    ...claimOverrides,
  };
  const header = { alg: 'EdDSA', kid: signingKey.kid, typ: 'JWT', ...headerOverrides };
  const compactToken = token ?? signedToken({ header, claims, signingKey });
  const envelope = {
    schemaVersion: 1,
    leaseId,
    provider: 'fixture-provider',
    endpoint: `https://${endpointHost}/v1`,
    tokenFormat: 'jwt',
    token: compactToken,
    issuer: claims.iss,
    audience: claims.aud,
    issuedAt: envelopeDate(claims.iat),
    expiresAt: envelopeDate(claims.exp),
    scope: {
      project: claims.project,
      modelClass: claims.modelClass,
      maxCostUsd: claims.maxCostUsd,
      maxRequests: claims.maxRequests,
      ...scopeOverrides,
    },
    ...envelopeOverrides,
  };
  if (Object.hasOwn(envelopeOverrides, 'scope')) {
    envelope.scope = envelopeOverrides.scope;
  }

  const keyring = {
    schemaVersion: 1,
    issuer,
    audience,
    keys: keyEntries,
    ...keyringOverrides,
  };
  const directory = await mkdtemp(join(tmpdir(), 'kimen-mutation-model-lease-'));
  temporaryDirectories.add(directory);
  const paths = {
    lease: join(directory, 'lease.json'),
    keyring: join(directory, 'keyring.json'),
    allowlist: join(directory, 'allowlist.json'),
    revocations: join(directory, 'revocations.json'),
  };

  await Promise.all([
    writeFile(paths.lease, leaseContents ?? `${JSON.stringify(envelope)}\n`, { mode: 0o600 }),
    writeFile(paths.keyring, keyringContents ?? `${JSON.stringify(keyring)}\n`, { mode: 0o600 }),
    writeFile(paths.allowlist, allowlistContents ?? `${JSON.stringify(allowlist)}\n`, {
      mode: 0o600,
    }),
    writeFile(paths.revocations, revocationsContents ?? `${JSON.stringify(revocations)}\n`, {
      mode: 0o600,
    }),
  ]);

  return { claims, compactToken, envelope, paths };
};

const expectRejectedReason = async (promise, reason) => {
  let rejection;
  try {
    await promise;
  } catch (error) {
    rejection = error;
  }
  expect(rejection).toBeInstanceOf(Error);
  expect(rejection.message).toBe(reason);
};

const rejectedReason = async (fixtureOptions, reason, maximumTtl = 3_660) => {
  const fixture = await makeFixture(fixtureOptions);
  await expectRejectedReason(verifyLease(fixture.paths, maximumTtl), reason);
};

const configureHelper = async (
  fixture,
  { sourcePath = fixture.paths.lease, fail = false } = {},
) => {
  const directory = dirname(fixture.paths.lease);
  const helperPath = join(directory, 'helper.sh');
  const helperLog = join(directory, 'helper.log');
  await writeFile(
    helperPath,
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$KIMEN_MUTATION_HELPER_LOG"
${fail ? 'exit 64' : 'case "$1" in acquire) cat "$KIMEN_MUTATION_LEASE_SOURCE" ;; revoke) ;; *) exit 64 ;; esac'}
`,
    { mode: 0o700 },
  );
  await chmod(helperPath, 0o700);
  vi.stubEnv('KIMEN_AGENT_TIMEOUT_SECONDS', '3600');
  vi.stubEnv('KIMEN_EGRESS_ALLOWLIST', fixture.paths.allowlist);
  const leaseNotAfterMs = Date.now() + 3_680_000;
  vi.stubEnv('KIMEN_LEASE_NOT_AFTER_MS', String(leaseNotAfterMs));
  vi.stubEnv('KIMEN_MODEL_LEASE_HELPER', helperPath);
  vi.stubEnv('KIMEN_MODEL_LEASE_KEYRING', fixture.paths.keyring);
  vi.stubEnv('KIMEN_MODEL_LEASE_REVOCATIONS', fixture.paths.revocations);
  vi.stubEnv('KIMEN_MUTATION_HELPER_LOG', helperLog);
  vi.stubEnv('KIMEN_MUTATION_LEASE_SOURCE', sourcePath);
  return { directory, helperLog, leaseNotAfterMs };
};

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await Promise.all(
    [...temporaryDirectories].map((directory) => rm(directory, { recursive: true, force: true })),
  );
  temporaryDirectories.clear();
});

describe('sandbox model-lease mutation boundary', () => {
  it('S4 verifies an exact Ed25519 lease with a text egress policy', async () => {
    const fixture = await makeFixture({
      signingKey: nextKey,
      allowlistContents: `version 1\nbootstrap registry.fixture.invalid:443\nagent ${endpointHost}:443\n`,
    });

    await expect(verifyLease(fixture.paths)).resolves.toEqual(fixture.envelope);
  });

  it.each([
    ['invalid-envelope', { leaseContents: '{' }],
    ['invalid-keyring', { keyringContents: '{' }],
    ['invalid-allowlist', { allowlistContents: 'version 2\nagent denied.invalid:443\n' }],
    ['invalid-allowlist', { allowlistContents: 'version 1\nagent gateway.fixture.invalid:8443\n' }],
    ['invalid-revocations', { revocationsContents: '{' }],
  ])('S4 fails closed when a policy input is %s', async (reason, options) => {
    await rejectedReason(options, reason);
  });

  it.each([
    ['wrong schema', { schemaVersion: 2 }],
    ['invalid lease ID', { leaseId: 'lease with spaces' }],
    ['empty provider', { provider: '' }],
    ['wrong token format', { tokenFormat: 'opaque' }],
    ['empty token', { token: '' }],
    ['non-string issuer', { issuer: 1 }],
    ['non-string audience', { audience: 1 }],
    ['non-string issued-at', { issuedAt: 1 }],
    ['non-string expiry', { expiresAt: 1 }],
    ['array scope', { scope: [] }],
  ])('S4 rejects an envelope with %s', async (_label, envelopeOverrides) => {
    await rejectedReason({ envelopeOverrides }, 'invalid-envelope');
  });

  it.each([
    ['two segments', 'e30.e30'],
    ['empty header', `.${encodePart({})}.signature`],
    ['empty claims', `${encodePart({})}..signature`],
  ])('S4 rejects a compact JWT with %s', async (_label, token) => {
    await rejectedReason({ token }, 'invalid-token');
  });

  it.each([
    ['non-base64url bytes', `*.${encodePart({})}.signature`, 'invalid-header'],
    [
      'non-JSON header',
      `${Buffer.from('no-json').toString('base64url')}.${encodePart({})}.x`,
      'invalid-header',
    ],
    [
      'non-object claims',
      signedToken({
        header: { alg: 'EdDSA', kid: currentKey.kid, typ: 'JWT' },
        claims: [],
      }),
      'invalid-claims',
    ],
  ])('S4 rejects %s', async (_label, token, reason) => {
    await rejectedReason({ token }, reason);
  });

  it.each([
    ['an extra field', { extra: true }, 'invalid-header'],
    ['a missing kid', { kid: undefined }, 'invalid-header'],
    ['an unsupported algorithm', { alg: 'HS256' }, 'unsupported-algorithm'],
    ['a non-canonical type', { typ: 'jwt' }, 'invalid-header'],
  ])('S4 rejects a JWT header with %s', async (_label, headerOverrides, reason) => {
    await rejectedReason({ headerOverrides }, reason);
  });

  it.each([
    ['a wrong schema', { keyringOverrides: { schemaVersion: 2 } }, 'invalid-keyring'],
    ['a non-array key list', { keyringOverrides: { keys: {} } }, 'invalid-keyring'],
    ['no matching key', { keyEntries: [] }, 'unknown-key'],
    [
      'duplicate matching keys',
      { keyEntries: [keyEntry(currentKey), keyEntry(currentKey)] },
      'unknown-key',
    ],
    ['a retired key', { signingKey: retiredKey }, 'retired-key'],
    [
      'an unknown status',
      { keyEntries: [keyEntry(currentKey, { status: 'unknown' })] },
      'invalid-key',
    ],
    ['a non-EdDSA key', { keyEntries: [keyEntry(currentKey, { alg: 'ES256' })] }, 'invalid-key'],
    [
      'a non-OKP key',
      {
        keyEntries: [
          keyEntry(currentKey, { publicKeyJwk: { ...currentKey.publicKeyJwk, kty: 'EC' } }),
        ],
      },
      'invalid-key',
    ],
    [
      'a non-Ed25519 curve',
      {
        keyEntries: [
          keyEntry(currentKey, { publicKeyJwk: { ...currentKey.publicKeyJwk, crv: 'X25519' } }),
        ],
      },
      'invalid-key',
    ],
  ])('S4 rejects a keyring with %s', async (_label, options, reason) => {
    await rejectedReason(options, reason);
  });

  it('S4 rejects a non-object keyring root', async () => {
    const fixture = await makeFixture();
    await writeFile(fixture.paths.keyring, 'null\n');

    await expect(verifyLease(fixture.paths)).rejects.toThrow(/^invalid-keyring$/u);
  });

  it('S4 rejects a valid signature made by a different key', async () => {
    await rejectedReason(
      {
        signingKey: otherKey,
        headerOverrides: { kid: currentKey.kid },
      },
      'invalid-signature',
    );
  });

  it.each([
    ['keyring issuer type', { keyringOverrides: { issuer: 1 } }, 'invalid-issuer'],
    ['signed issuer', { claimOverrides: { iss: 'https://attacker.invalid' } }, 'invalid-issuer'],
    [
      'envelope issuer',
      { envelopeOverrides: { issuer: 'https://attacker.invalid' } },
      'invalid-issuer',
    ],
    ['keyring audience type', { keyringOverrides: { audience: 1 } }, 'invalid-audience'],
    ['signed audience', { claimOverrides: { aud: 'other-sandbox' } }, 'invalid-audience'],
    ['envelope audience', { envelopeOverrides: { audience: 'other-sandbox' } }, 'invalid-audience'],
    ['lease identity', { claimOverrides: { jti: 'other-lease' } }, 'envelope-mismatch'],
  ])('S4 rejects a mismatched %s', async (_label, options, reason) => {
    await rejectedReason(options, reason);
  });

  it.each([
    ['project copy', { scopeOverrides: { project: 'other' } }, 'envelope-mismatch'],
    ['model copy', { scopeOverrides: { modelClass: 'other' } }, 'envelope-mismatch'],
    ['cost copy', { scopeOverrides: { maxCostUsd: 24 } }, 'envelope-mismatch'],
    ['request copy', { scopeOverrides: { maxRequests: 999 } }, 'envelope-mismatch'],
    ['project', { claimOverrides: { project: 'other' } }, 'invalid-project'],
    ['model class', { claimOverrides: { modelClass: 'admin-agent' } }, 'invalid-model-class'],
    ['zero cost', { claimOverrides: { maxCostUsd: 0 } }, 'invalid-max-cost'],
    ['negative cost', { claimOverrides: { maxCostUsd: -1 } }, 'invalid-max-cost'],
    ['excessive cost', { claimOverrides: { maxCostUsd: 25.01 } }, 'invalid-max-cost'],
    ['nonnumeric cost', { claimOverrides: { maxCostUsd: '25' } }, 'invalid-max-cost'],
    ['zero requests', { claimOverrides: { maxRequests: 0 } }, 'invalid-max-requests'],
    ['excessive requests', { claimOverrides: { maxRequests: 1_001 } }, 'invalid-max-requests'],
    ['fractional requests', { claimOverrides: { maxRequests: 1.5 } }, 'invalid-max-requests'],
    ['nonnumeric requests', { claimOverrides: { maxRequests: '1000' } }, 'invalid-max-requests'],
  ])('S4 rejects an invalid scope %s', async (_label, options, reason) => {
    await rejectedReason(options, reason);
  });

  it.each([
    ['nonnumeric iat', { claimOverrides: { iat: '1' } }, 'invalid-time'],
    ['fractional nbf', { claimOverrides: { nbf: 1.5 } }, 'invalid-time'],
    ['unsafe exp', { claimOverrides: { exp: Number.MAX_VALUE } }, 'invalid-time'],
    [
      'non-increasing expiry',
      { claimOverrides: { iat: 2_000_000_000, nbf: 1, exp: 2_000_000_000 } },
      'invalid-time',
    ],
    ['bad issued-at copy', { envelopeOverrides: { issuedAt: 'not-a-date' } }, 'envelope-mismatch'],
    ['bad expiry copy', { envelopeOverrides: { expiresAt: 'not-a-date' } }, 'envelope-mismatch'],
    [
      'issued-at mismatch',
      { envelopeOverrides: { issuedAt: new Date(0).toISOString() } },
      'envelope-mismatch',
    ],
    [
      'expiry mismatch',
      { envelopeOverrides: { expiresAt: new Date(0).toISOString() } },
      'envelope-mismatch',
    ],
    [
      'future iat',
      {
        claimOverrides: {
          iat: Math.floor(Date.now() / 1_000) + 60,
          nbf: Math.floor(Date.now() / 1_000),
          exp: Math.floor(Date.now() / 1_000) + 120,
        },
      },
      'not-active',
    ],
    [
      'future nbf',
      {
        claimOverrides: {
          nbf: Math.floor(Date.now() / 1_000) + 60,
          exp: Math.floor(Date.now() / 1_000) + 120,
        },
      },
      'not-active',
    ],
    [
      'expired token',
      {
        claimOverrides: {
          iat: Math.floor(Date.now() / 1_000) - 120,
          nbf: Math.floor(Date.now() / 1_000) - 120,
          exp: Math.floor(Date.now() / 1_000) - 1,
        },
      },
      'expired',
    ],
  ])('S4 rejects an invalid time contract: %s', async (_label, options, reason) => {
    await rejectedReason(options, reason);
  });

  it('S4 enforces the injected maximum TTL at its exact boundary', async () => {
    const accepted = await makeFixture();
    const rejected = await makeFixture();

    await expect(verifyLease(accepted.paths, 3_600)).resolves.toEqual(accepted.envelope);
    await expect(verifyLease(rejected.paths, 3_599)).rejects.toThrow(/^excessive-ttl$/u);
  });

  it('S4 accepts the exact absolute expiry boundary and rejects one millisecond after it', async () => {
    const accepted = await makeFixture();
    const rejected = await makeFixture();

    await expect(verifyLease(accepted.paths, 3_660, accepted.claims.exp * 1_000)).resolves.toEqual(
      accepted.envelope,
    );
    await expect(
      verifyLease(rejected.paths, 3_660, rejected.claims.exp * 1_000 - 1),
    ).rejects.toThrow(/^lease-expiry-after-deadline$/u);
  });

  it('S4 rejects a malformed absolute deadline before reading lease material', async () => {
    await expect(verifyLease({}, 3_660, 0)).rejects.toThrow(/^invalid-lease-deadline$/u);
  });

  it.each([
    ['non-object revocations', null, 'invalid-revocations'],
    ['wrong revocation schema', { schemaVersion: 2, revokedLeaseIds: [] }, 'invalid-revocations'],
    ['non-array revocations', { schemaVersion: 1, revokedLeaseIds: {} }, 'invalid-revocations'],
    ['nonnumeric revocation ID', { schemaVersion: 1, revokedLeaseIds: [1] }, 'invalid-revocations'],
    ['revoked lease', { schemaVersion: 1, revokedLeaseIds: [leaseId] }, 'revoked'],
  ])('S4 rejects %s', async (_label, revocations, reason) => {
    await rejectedReason({ revocations }, reason);
  });

  it.each([
    ['non-object allowlist', null],
    ['wrong allowlist schema', { schemaVersion: 2, allowedHosts: [endpointHost] }],
    ['non-array host list', { schemaVersion: 1, allowedHosts: endpointHost }],
  ])('S4 rejects %s', async (_label, allowlist) => {
    await rejectedReason({ allowlist }, 'invalid-allowlist');
  });

  it('S4 denies an endpoint when any listed host is invalid', async () => {
    await rejectedReason(
      { allowlist: { schemaVersion: 1, allowedHosts: [endpointHost, 'bad::host'] } },
      'endpoint-denied',
    );
  });

  it.each([
    ['invalid URL', 'not a URL'],
    ['plaintext HTTP', `http://${endpointHost}/v1`],
    ['username', `https://user@${endpointHost}/v1`],
    ['password', `https://user:pass@${endpointHost}/v1`],
    ['nonstandard port', `https://${endpointHost}:8443/v1`],
    ['undeclared host', 'https://undeclared.fixture.invalid/v1'],
  ])('S4 denies an endpoint with %s', async (_label, endpoint) => {
    await rejectedReason({ envelopeOverrides: { endpoint } }, 'endpoint-denied');
  });

  it.each([
    [[], 'invalid-command'],
    [['verify', '--lease'], 'invalid-arguments'],
    [['verify', '--lease', '--keyring'], 'invalid-arguments'],
    [['verify', '--unknown', 'value'], 'invalid-arguments'],
    [['verify', '--lease', 'a', '--lease', 'b'], 'invalid-arguments'],
    [['verify', '--lease', 'a', '--keyring', 'b', '--allowlist', 'c'], 'invalid-arguments'],
    [
      [
        'verify',
        '--lease',
        'a',
        '--keyring',
        'b',
        '--allowlist',
        'c',
        '--revocations',
        'd',
        '--max-ttl',
        '0',
      ],
      'invalid-timeout',
    ],
    [['revoke', '--lease-id', 'contains spaces'], 'invalid-lease-id'],
    [['acquire', '--output', 'unused'], 'missing-configuration'],
  ])('S4 rejects malformed model-lease arguments %#', async (arguments_, reason) => {
    await expectRejectedReason(runModelLease([...arguments_]), reason);
  });

  it('S4 main verifies a lease with an explicit TTL without mutating caller arguments', async () => {
    const fixture = await makeFixture();
    const arguments_ = [
      'verify',
      '--lease',
      fixture.paths.lease,
      '--keyring',
      fixture.paths.keyring,
      '--allowlist',
      fixture.paths.allowlist,
      '--revocations',
      fixture.paths.revocations,
      '--max-ttl',
      '3600',
    ];

    await expect(runModelLease([...arguments_])).resolves.toBeUndefined();
    expect(arguments_[0]).toBe('verify');
  });

  it('S4 acquires, verifies and exposes only a mode-0600 lease plus its opaque ID', async () => {
    const fixture = await makeFixture();
    const helper = await configureHelper(fixture);
    const outputPath = join(helper.directory, 'acquired-lease.json');
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    await expect(runModelLease(['acquire', '--output', outputPath])).resolves.toBeUndefined();

    expect(stdout).toHaveBeenCalledWith(`${leaseId}\n`);
    expect(String(stdout.mock.calls[0][0])).not.toContain(fixture.compactToken);
    const outputHandle = await open(outputPath, 'r');
    try {
      expect((await outputHandle.stat()).mode & 0o777).toBe(0o600);
      expect(JSON.parse(await outputHandle.readFile('utf8'))).toEqual(fixture.envelope);
    } finally {
      await outputHandle.close();
    }
    expect(await readFile(helper.helperLog, 'utf8')).toBe(
      `acquire --ttl 3660 --not-after-ms ${helper.leaseNotAfterMs} --audience kimen-sandbox --project kimen\n`,
    );
  });

  it('S4 force-kills a surviving helper process group after its leader exits on TERM', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kimen-mutation-helper-supervisor-'));
    temporaryDirectories.add(directory);
    const helperPath = join(directory, 'helper.sh');
    const leaderPidPath = join(directory, 'leader.pid');
    const descendantPidPath = join(directory, 'descendant.pid');
    let leaderPid;
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

    try {
      await expect(
        invokeHelper(
          helperPath,
          ['acquire'],
          {
            ...process.env,
            KIMEN_HELPER_DESCENDANT_PID_FILE: descendantPidPath,
            KIMEN_HELPER_LEADER_PID_FILE: leaderPidPath,
          },
          { timeoutMs: 1_000, terminationGraceMs: 100 },
        ),
      ).rejects.toThrow(/^helper-failed$/u);

      leaderPid = Number((await readFile(leaderPidPath, 'utf8')).trim());
      const descendantPid = Number((await readFile(descendantPidPath, 'utf8')).trim());
      expect(() => process.kill(leaderPid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }));
      expect(() => process.kill(descendantPid, 0)).toThrow(
        expect.objectContaining({ code: 'ESRCH' }),
      );
      if (process.platform !== 'win32') {
        expect(() => process.kill(-leaderPid, 0)).toThrow(
          expect.objectContaining({ code: 'ESRCH' }),
        );
      }
    } finally {
      if (leaderPid !== undefined && process.platform !== 'win32') {
        try {
          process.kill(-leaderPid, 'SIGKILL');
        } catch {
          // GREEN already removed the group.
        }
      }
    }
  });

  it('S4 rejects a zero-exit helper leader while its process group remains populated', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kimen-mutation-helper-orphan-'));
    temporaryDirectories.add(directory);
    const helperPath = join(directory, 'helper.sh');
    const leaderPidPath = join(directory, 'leader.pid');
    const descendantPidPath = join(directory, 'descendant.pid');
    let leaderPid;
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

    try {
      await expect(
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
      ).rejects.toThrow(/^helper-failed$/u);

      leaderPid = Number((await readFile(leaderPidPath, 'utf8')).trim());
      const descendantPid = Number((await readFile(descendantPidPath, 'utf8')).trim());
      expect(() => process.kill(descendantPid, 0)).toThrow(
        expect.objectContaining({ code: 'ESRCH' }),
      );
      if (process.platform !== 'win32') {
        expect(() => process.kill(-leaderPid, 0)).toThrow(
          expect.objectContaining({ code: 'ESRCH' }),
        );
      }
    } finally {
      if (leaderPid !== undefined && process.platform !== 'win32') {
        try {
          process.kill(-leaderPid, 'SIGKILL');
        } catch {
          // GREEN already removed the group.
        }
      }
    }
  });

  it('S4 supervisor signal handler cleans its helper group and removes itself', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kimen-mutation-helper-signal-'));
    temporaryDirectories.add(directory);
    const helperPath = join(directory, 'helper.sh');
    const leaderPidPath = join(directory, 'leader.pid');
    const descendantPidPath = join(directory, 'descendant.pid');
    const priorHandlers = new Set(process.listeners('SIGTERM'));
    let leaderPid;
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

    try {
      const invocation = invokeHelper(
        helperPath,
        ['acquire'],
        {
          ...process.env,
          KIMEN_HELPER_DESCENDANT_PID_FILE: descendantPidPath,
          KIMEN_HELPER_LEADER_PID_FILE: leaderPidPath,
        },
        { timeoutMs: 2_000, terminationGraceMs: 100 },
      );
      for (let attempt = 0; attempt < 200; attempt += 1) {
        try {
          leaderPid = Number((await readFile(leaderPidPath, 'utf8')).trim());
          break;
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
        }
      }
      expect(Number.isSafeInteger(leaderPid)).toBe(true);
      const addedHandlers = process
        .listeners('SIGTERM')
        .filter((handler) => !priorHandlers.has(handler));
      expect(addedHandlers).toHaveLength(1);
      addedHandlers[0]();

      await expect(invocation).rejects.toThrow(/^helper-failed$/u);
      const descendantPid = Number((await readFile(descendantPidPath, 'utf8')).trim());
      expect(() => process.kill(descendantPid, 0)).toThrow(
        expect.objectContaining({ code: 'ESRCH' }),
      );
      expect(process.listeners('SIGTERM').filter((handler) => !priorHandlers.has(handler))).toEqual(
        [],
      );
    } finally {
      if (leaderPid !== undefined && process.platform !== 'win32') {
        try {
          process.kill(-leaderPid, 'SIGKILL');
        } catch {
          // GREEN already removed the group.
        }
      }
    }
  });

  it('S4 preserves a signal received after listener install but before helper spawn', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kimen-mutation-helper-spawn-signal-'));
    temporaryDirectories.add(directory);
    const helperPath = join(directory, 'helper.sh');
    const priorHandlers = new Set(process.listeners('SIGTERM'));
    let helperPid;
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
      expect(addedHandlers).toHaveLength(1);
      addedHandlers[0]();
      const child = spawn(...arguments_);
      helperPid = child.pid;
      return child;
    };

    try {
      await expect(
        invokeHelper(helperPath, ['acquire'], process.env, {
          spawnProcess: spawnDuringSignal,
          timeoutMs: 2_000,
          terminationGraceMs: 100,
        }),
      ).rejects.toThrow(/^helper-failed$/u);
      expect(() => process.kill(helperPid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }));
      expect(process.listeners('SIGTERM').filter((handler) => !priorHandlers.has(handler))).toEqual(
        [],
      );
    } finally {
      if (helperPid !== undefined && process.platform !== 'win32') {
        try {
          process.kill(-helperPid, 'SIGKILL');
        } catch {
          // GREEN already removed the group.
        }
      }
    }
  });

  it('S4 rejects an expired absolute deadline before invoking the broker helper', async () => {
    const fixture = await makeFixture();
    const helper = await configureHelper(fixture);
    vi.stubEnv('KIMEN_LEASE_NOT_AFTER_MS', String(Date.now() - 1));

    await expect(
      runModelLease(['acquire', '--output', join(helper.directory, 'unused.json')]),
    ).rejects.toThrow(/^lease-deadline-expired$/u);
    await expect(readFile(helper.helperLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('S4 rejects conflicting argument and environment deadlines before invoking the broker', async () => {
    const fixture = await makeFixture();
    const helper = await configureHelper(fixture);

    await expect(
      runModelLease([
        'acquire',
        '--output',
        join(helper.directory, 'unused.json'),
        '--not-after-ms',
        String(helper.leaseNotAfterMs - 1),
      ]),
    ).rejects.toThrow(/^invalid-lease-deadline$/u);
    await expect(readFile(helper.helperLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('S4 rejects an absolute deadline beyond helper timeout plus requested TTL', async () => {
    const fixture = await makeFixture();
    const helper = await configureHelper(fixture);
    vi.stubEnv('KIMEN_LEASE_NOT_AFTER_MS', String(Date.now() + 3_691_000));

    await expect(
      runModelLease(['acquire', '--output', join(helper.directory, 'unused.json')]),
    ).rejects.toThrow(/^invalid-lease-deadline$/u);
    await expect(readFile(helper.helperLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('S4 discards a broker response received at the absolute deadline', async () => {
    const fixture = await makeFixture();
    const helper = await configureHelper(fixture);
    const outputPath = join(helper.directory, 'late-response.json');
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(helper.leaseNotAfterMs - 1_000)
      .mockReturnValue(helper.leaseNotAfterMs);

    await expect(runModelLease(['acquire', '--output', outputPath])).rejects.toThrow(
      /^lease-deadline-expired$/u,
    );
    await expect(stat(outputPath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(helper.helperLog, 'utf8')).toContain(
      `--not-after-ms ${helper.leaseNotAfterMs}`,
    );
  });

  it('S4 deletes an acquired broker response that fails verification', async () => {
    const fixture = await makeFixture();
    const invalidSource = join(dirname(fixture.paths.lease), 'invalid-response.json');
    await writeFile(invalidSource, `${JSON.stringify({ token: fixture.compactToken })}\n`, {
      mode: 0o600,
    });
    const helper = await configureHelper(fixture, { sourcePath: invalidSource });
    const outputPath = join(helper.directory, 'rejected-lease.json');

    await expect(runModelLease(['acquire', '--output', outputPath])).rejects.toThrow(
      /^invalid-envelope$/u,
    );
    await expect(stat(outputPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('S4 rejects an invalid configured agent timeout before invoking the helper', async () => {
    const fixture = await makeFixture();
    const helper = await configureHelper(fixture);
    vi.stubEnv('KIMEN_AGENT_TIMEOUT_SECONDS', '3601');

    await expect(
      runModelLease(['acquire', '--output', join(helper.directory, 'unused.json')]),
    ).rejects.toThrow(/^invalid-timeout$/u);
    await expect(readFile(helper.helperLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('S4 reports an injected helper failure without trusting its output', async () => {
    const fixture = await makeFixture();
    await configureHelper(fixture, { fail: true });

    await expect(runModelLease(['revoke', '--lease-id', leaseId])).rejects.toThrow(
      /^helper-failed$/u,
    );
  });

  it('S4 revokes only a syntactically valid opaque lease ID through the injected helper', async () => {
    const fixture = await makeFixture();
    const helper = await configureHelper(fixture);

    await expect(runModelLease(['revoke', '--lease-id', leaseId])).resolves.toBeUndefined();

    expect(await readFile(helper.helperLog, 'utf8')).toBe(`revoke ${leaseId}\n`);
  });
});
