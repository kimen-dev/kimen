import { spawn } from 'node:child_process';
import { createPublicKey, verify } from 'node:crypto';
import { chmod, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';
import { domainToASCII, fileURLToPath } from 'node:url';

class LeaseRejection extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function reject(reason) {
  throw new LeaseRejection(reason);
}

function parseOptions(argv, required, optional = []) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      reject('invalid-arguments');
    }
    if (options.has(flag)) {
      reject('invalid-arguments');
    }
    options.set(flag, value);
  }

  const accepted = new Set([...required, ...optional]);
  if (
    required.some((flag) => !options.has(flag)) ||
    [...options.keys()].some((flag) => !accepted.has(flag))
  ) {
    reject('invalid-arguments');
  }

  return Object.fromEntries([...options].map(([flag, value]) => [flag.slice(2), value]));
}

async function readJson(path, reason) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    reject(reason);
  }
}

async function readAllowlist(path) {
  let contents;
  try {
    contents = await readFile(path, 'utf8');
  } catch {
    reject('invalid-allowlist');
  }

  try {
    return JSON.parse(contents);
  } catch {
    const lines = contents
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.shift() !== 'version 1') {
      reject('invalid-allowlist');
    }
    const allowedHosts = [];
    for (const line of lines) {
      const match = /^(bootstrap|agent)\s+(\S+):443$/u.exec(line);
      if (match === null) {
        reject('invalid-allowlist');
      }
      if (match[1] === 'agent') {
        allowedHosts.push(match[2]);
      }
    }
    return { schemaVersion: 1, allowedHosts };
  }
}

function decodeJwtPart(encoded, reason) {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    reject(reason);
  }

  try {
    const decoded = Buffer.from(encoded, 'base64url');
    if (decoded.toString('base64url') !== encoded) {
      reject(reason);
    }
    return JSON.parse(decoded.toString('utf8'));
  } catch {
    reject(reason);
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactlyKeys(value, expected) {
  if (!isRecord(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && expected.every((key, index) => key === actual[index]);
}

function normalizeHostname(value) {
  if (typeof value !== 'string' || value.length === 0 || value.endsWith('..')) {
    return null;
  }
  const withoutRootDot = value.endsWith('.') ? value.slice(0, -1) : value;
  const ascii = domainToASCII(withoutRootDot.toLowerCase());
  if (!ascii || ascii.includes(':')) {
    return null;
  }
  return ascii;
}

function validateEnvelopeShape(envelope) {
  if (!isRecord(envelope) || envelope.schemaVersion !== 1) {
    reject('invalid-envelope');
  }
  if (
    typeof envelope.leaseId !== 'string' ||
    !/^[A-Za-z0-9._:-]{1,256}$/u.test(envelope.leaseId) ||
    typeof envelope.provider !== 'string' ||
    envelope.provider.length === 0 ||
    envelope.tokenFormat !== 'jwt' ||
    typeof envelope.token !== 'string' ||
    envelope.token.length === 0 ||
    typeof envelope.issuer !== 'string' ||
    typeof envelope.audience !== 'string' ||
    typeof envelope.issuedAt !== 'string' ||
    typeof envelope.expiresAt !== 'string' ||
    !isRecord(envelope.scope)
  ) {
    reject('invalid-envelope');
  }
}

function parseCompactJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0].length === 0 || parts[1].length === 0) {
    reject('invalid-token');
  }

  return {
    header: decodeJwtPart(parts[0], 'invalid-header'),
    claims: decodeJwtPart(parts[1], 'invalid-claims'),
    signature: Buffer.from(parts[2], 'base64url'),
    signingInput: Buffer.from(`${parts[0]}.${parts[1]}`),
  };
}

function validateHeader(header) {
  if (!exactlyKeys(header, ['alg', 'kid', 'typ'])) {
    reject('invalid-header');
  }
  if (header.alg !== 'EdDSA') {
    reject('unsupported-algorithm');
  }
  if (header.typ !== 'JWT' || typeof header.kid !== 'string' || header.kid.length === 0) {
    reject('invalid-header');
  }
}

function selectKey(keyring, kid) {
  if (!isRecord(keyring) || keyring.schemaVersion !== 1 || !Array.isArray(keyring.keys)) {
    reject('invalid-keyring');
  }
  const matches = keyring.keys.filter((candidate) => candidate?.kid === kid);
  if (matches.length !== 1) {
    reject('unknown-key');
  }
  const key = matches[0];
  if (key.status === 'retired') {
    reject('retired-key');
  }
  if (
    !['current', 'next'].includes(key.status) ||
    key.alg !== 'EdDSA' ||
    !isRecord(key.publicKeyJwk) ||
    key.publicKeyJwk.kty !== 'OKP' ||
    key.publicKeyJwk.crv !== 'Ed25519'
  ) {
    reject('invalid-key');
  }
  return key;
}

function validateSignature(jwt, key) {
  try {
    const publicKey = createPublicKey({ key: key.publicKeyJwk, format: 'jwk' });
    if (!verify(null, jwt.signingInput, publicKey, jwt.signature)) {
      reject('invalid-signature');
    }
  } catch (error) {
    if (error instanceof LeaseRejection) {
      throw error;
    }
    reject('invalid-key');
  }
}

function validateIdentity(claims, envelope, keyring) {
  if (!isRecord(claims)) {
    reject('invalid-claims');
  }
  if (
    typeof keyring.issuer !== 'string' ||
    claims.iss !== keyring.issuer ||
    envelope.issuer !== keyring.issuer
  ) {
    reject('invalid-issuer');
  }
  if (
    typeof keyring.audience !== 'string' ||
    claims.aud !== keyring.audience ||
    envelope.audience !== keyring.audience
  ) {
    reject('invalid-audience');
  }
  if (claims.jti !== envelope.leaseId) {
    reject('envelope-mismatch');
  }
}

function validateScope(claims, envelope) {
  if (
    claims.project !== envelope.scope.project ||
    claims.modelClass !== envelope.scope.modelClass ||
    claims.maxCostUsd !== envelope.scope.maxCostUsd ||
    claims.maxRequests !== envelope.scope.maxRequests
  ) {
    reject('envelope-mismatch');
  }
  if (claims.project !== 'kimen') {
    reject('invalid-project');
  }
  if (claims.modelClass !== 'implementation-agent') {
    reject('invalid-model-class');
  }
  if (
    typeof claims.maxCostUsd !== 'number' ||
    !Number.isFinite(claims.maxCostUsd) ||
    claims.maxCostUsd <= 0 ||
    claims.maxCostUsd > 25
  ) {
    reject('invalid-max-cost');
  }
  if (
    typeof claims.maxRequests !== 'number' ||
    !Number.isInteger(claims.maxRequests) ||
    claims.maxRequests < 1 ||
    claims.maxRequests > 1_000
  ) {
    reject('invalid-max-requests');
  }
}

function validateTimes(claims, envelope, maximumTtl, leaseNotAfterMs) {
  if (![claims.iat, claims.nbf, claims.exp].every(Number.isSafeInteger)) {
    reject('invalid-time');
  }
  if (claims.exp <= claims.iat) {
    reject('invalid-time');
  }

  const issuedAt = Date.parse(envelope.issuedAt);
  const expiresAt = Date.parse(envelope.expiresAt);
  if (
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expiresAt) ||
    issuedAt !== claims.iat * 1_000 ||
    expiresAt !== claims.exp * 1_000
  ) {
    reject('envelope-mismatch');
  }
  if (claims.exp - claims.iat > maximumTtl) {
    reject('excessive-ttl');
  }
  if (leaseNotAfterMs !== undefined && claims.exp * 1_000 > leaseNotAfterMs) {
    reject('lease-expiry-after-deadline');
  }

  const now = Math.floor(Date.now() / 1_000);
  if (claims.iat > now || claims.nbf > now) {
    reject('not-active');
  }
  if (claims.exp <= now) {
    reject('expired');
  }
}

function validateRevocation(envelope, revocations) {
  if (
    !isRecord(revocations) ||
    revocations.schemaVersion !== 1 ||
    !Array.isArray(revocations.revokedLeaseIds) ||
    !revocations.revokedLeaseIds.every((value) => typeof value === 'string')
  ) {
    reject('invalid-revocations');
  }
  if (revocations.revokedLeaseIds.includes(envelope.leaseId)) {
    reject('revoked');
  }
}

function validateEndpoint(envelope, allowlist) {
  if (
    !isRecord(allowlist) ||
    allowlist.schemaVersion !== 1 ||
    !Array.isArray(allowlist.allowedHosts)
  ) {
    reject('invalid-allowlist');
  }

  let endpoint;
  try {
    endpoint = new URL(envelope.endpoint);
  } catch {
    reject('endpoint-denied');
  }
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username !== '' ||
    endpoint.password !== '' ||
    (endpoint.port !== '' && endpoint.port !== '443')
  ) {
    reject('endpoint-denied');
  }

  const endpointHost = normalizeHostname(endpoint.hostname);
  const allowedHosts = allowlist.allowedHosts.map(normalizeHostname);
  if (
    endpointHost === null ||
    allowedHosts.includes(null) ||
    !allowedHosts.includes(endpointHost)
  ) {
    reject('endpoint-denied');
  }
}

export async function verifyLease(paths, maximumTtl = 3_660, leaseNotAfterMs) {
  if (
    leaseNotAfterMs !== undefined &&
    (!Number.isSafeInteger(leaseNotAfterMs) || leaseNotAfterMs <= 0)
  ) {
    reject('invalid-lease-deadline');
  }
  const [envelope, keyring, allowlist, revocations] = await Promise.all([
    readJson(paths.lease, 'invalid-envelope'),
    readJson(paths.keyring, 'invalid-keyring'),
    readAllowlist(paths.allowlist),
    readJson(paths.revocations, 'invalid-revocations'),
  ]);

  validateEnvelopeShape(envelope);
  const jwt = parseCompactJwt(envelope.token);
  validateHeader(jwt.header);
  const key = selectKey(keyring, jwt.header.kid);
  validateSignature(jwt, key);
  validateIdentity(jwt.claims, envelope, keyring);
  validateScope(jwt.claims, envelope);
  validateTimes(jwt.claims, envelope, maximumTtl, leaseNotAfterMs);
  validateRevocation(envelope, revocations);
  validateEndpoint(envelope, allowlist);
  return envelope;
}

function requiredEnvironmentPath(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    reject('missing-configuration');
  }
  return value;
}

function configuredMaximumTtl() {
  const rawTimeout = process.env.KIMEN_AGENT_TIMEOUT_SECONDS ?? '3600';
  const timeout = Number(rawTimeout);
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 3_600) {
    reject('invalid-timeout');
  }
  return timeout + 60;
}

function parseLeaseDeadline(value) {
  const deadline = Number(value);
  if (!Number.isSafeInteger(deadline) || deadline <= 0) {
    reject('invalid-lease-deadline');
  }
  return deadline;
}

function configuredLeaseDeadline(explicitValue, { required = false } = {}) {
  const environmentValue = process.env.KIMEN_LEASE_NOT_AFTER_MS;
  const hasExplicitValue = explicitValue !== undefined;
  const hasEnvironmentValue = environmentValue !== undefined && environmentValue.length > 0;
  if (!hasExplicitValue && !hasEnvironmentValue) {
    if (required) {
      reject('missing-configuration');
    }
    return undefined;
  }

  const explicitDeadline = hasExplicitValue ? parseLeaseDeadline(explicitValue) : undefined;
  const environmentDeadline = hasEnvironmentValue
    ? parseLeaseDeadline(environmentValue)
    : undefined;
  if (
    explicitDeadline !== undefined &&
    environmentDeadline !== undefined &&
    explicitDeadline !== environmentDeadline
  ) {
    reject('invalid-lease-deadline');
  }
  return explicitDeadline ?? environmentDeadline;
}

function acquisitionLeaseDeadline(explicitValue, maximumTtl) {
  const deadline = configuredLeaseDeadline(explicitValue, { required: true });
  const now = Date.now();
  if (now >= deadline) {
    reject('lease-deadline-expired');
  }
  if (deadline > now + (maximumTtl + 30) * 1_000) {
    reject('invalid-lease-deadline');
  }
  return deadline;
}

export function invokeHelper(
  helper,
  arguments_,
  environment = process.env,
  {
    timeoutMs = 30_000,
    terminationGraceMs = 1_000,
    maxBufferBytes = 1_048_576,
    spawnProcess = spawn,
  } = {},
) {
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    !Number.isSafeInteger(terminationGraceMs) ||
    terminationGraceMs < 1 ||
    !Number.isSafeInteger(maxBufferBytes) ||
    maxBufferBytes < 1 ||
    typeof spawnProcess !== 'function'
  ) {
    return Promise.reject(new LeaseRejection('helper-failed'));
  }

  return new Promise((resolveHelper, rejectHelper) => {
    const useProcessGroup = process.platform !== 'win32';
    const stdout = [];
    const handledSignals = ['SIGINT', 'SIGTERM'];
    let child;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let failed = false;
    let signalPending = false;
    let terminating = false;
    let killIssued = false;
    let closeResult;
    let settled = false;
    let timeoutHandle;
    let killHandle;
    let groupReapHandle;

    const signalHelper = (signal) => {
      if (child?.pid === undefined) {
        return;
      }
      try {
        if (useProcessGroup) {
          process.kill(-child.pid, signal);
        } else {
          child.kill(signal);
        }
      } catch (error) {
        if (error?.code !== 'ESRCH') {
          try {
            child.kill(signal);
          } catch {
            // The close/error event remains the authoritative reap result.
          }
        }
      }
    };

    const processGroupExists = () => {
      if (!useProcessGroup || child?.pid === undefined) {
        return false;
      }
      try {
        process.kill(-child.pid, 0);
        return true;
      } catch (error) {
        return error?.code !== 'ESRCH';
      }
    };

    const finish = () => {
      if (settled || closeResult === undefined) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      clearTimeout(killHandle);
      clearTimeout(groupReapHandle);
      for (const signal of handledSignals) {
        process.removeListener(signal, handleSupervisorSignal);
      }
      if (failed || closeResult.status !== 0 || closeResult.signal !== null) {
        rejectHelper(new LeaseRejection('helper-failed'));
        return;
      }
      resolveHelper(Buffer.concat(stdout, stdoutBytes).toString('utf8'));
    };

    const finishAfterForcedGroupExit = () => {
      if (closeResult === undefined) {
        return;
      }
      if (!useProcessGroup || !processGroupExists()) {
        finish();
        return;
      }
      if (killIssued) {
        groupReapHandle = setTimeout(finishAfterForcedGroupExit, 10);
      }
    };

    const terminate = () => {
      if (terminating) {
        return;
      }
      terminating = true;
      signalHelper('SIGTERM');
      killHandle = setTimeout(() => {
        killIssued = true;
        signalHelper('SIGKILL');
        finishAfterForcedGroupExit();
      }, terminationGraceMs);
    };

    const fail = () => {
      failed = true;
      terminate();
    };

    const handleSupervisorSignal = () => {
      failed = true;
      signalPending = true;
      if (child !== undefined) {
        terminate();
      }
    };
    for (const signal of handledSignals) {
      process.on(signal, handleSupervisorSignal);
    }

    try {
      child = spawnProcess(helper, arguments_, {
        detached: useProcessGroup,
        env: environment,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      for (const signal of handledSignals) {
        process.removeListener(signal, handleSupervisorSignal);
      }
      rejectHelper(new LeaseRejection('helper-failed'));
      return;
    }

    child.stdout.on('data', (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxBufferBytes) {
        fail();
        return;
      }
      stdout.push(Buffer.from(chunk));
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > maxBufferBytes) {
        fail();
      }
    });
    child.on('error', () => {
      failed = true;
      if (child.pid !== undefined) {
        terminate();
      }
    });
    child.on('close', (status, signal) => {
      closeResult = { signal, status };
      clearTimeout(timeoutHandle);
      if (!terminating) {
        if (processGroupExists()) {
          failed = true;
          terminate();
          finishAfterForcedGroupExit();
          return;
        }
        finish();
        return;
      }
      if (!processGroupExists()) {
        killIssued = true;
        clearTimeout(killHandle);
      }
      finishAfterForcedGroupExit();
    });

    if (signalPending) {
      terminate();
    }
    timeoutHandle = setTimeout(fail, timeoutMs);
  });
}

async function acquireLease(argv) {
  const options = parseOptions(argv, ['--output'], ['--not-after-ms']);
  const { output } = options;
  const helper = requiredEnvironmentPath('KIMEN_MODEL_LEASE_HELPER');
  const keyring = requiredEnvironmentPath('KIMEN_MODEL_LEASE_KEYRING');
  const revocations = requiredEnvironmentPath('KIMEN_MODEL_LEASE_REVOCATIONS');
  const allowlist =
    process.env.KIMEN_EGRESS_ALLOWLIST ??
    fileURLToPath(new URL('./egress-allowlist.txt', import.meta.url));
  const maximumTtl = configuredMaximumTtl();
  const leaseNotAfterMs = acquisitionLeaseDeadline(options['not-after-ms'], maximumTtl);
  const normalizedDeadline = String(leaseNotAfterMs);
  const helperOutput = await invokeHelper(
    helper,
    [
      'acquire',
      '--ttl',
      String(maximumTtl),
      '--not-after-ms',
      normalizedDeadline,
      '--audience',
      'kimen-sandbox',
      '--project',
      'kimen',
    ],
    {
      ...process.env,
      KIMEN_LEASE_NOT_AFTER_MS: normalizedDeadline,
    },
  );

  if (Date.now() >= leaseNotAfterMs) {
    reject('lease-deadline-expired');
  }

  try {
    await writeFile(output, helperOutput, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await chmod(output, 0o600);
    const envelope = await verifyLease(
      { lease: output, keyring, allowlist, revocations },
      maximumTtl,
      leaseNotAfterMs,
    );
    process.stdout.write(`${envelope.leaseId}\n`);
  } catch (error) {
    await rm(output, { force: true });
    throw error;
  }
}

async function revokeLease(argv) {
  const options = parseOptions(argv, ['--lease-id']);
  const leaseId = options['lease-id'];
  if (!/^[A-Za-z0-9._:-]{1,256}$/u.test(leaseId)) {
    reject('invalid-lease-id');
  }
  const helper = requiredEnvironmentPath('KIMEN_MODEL_LEASE_HELPER');
  await invokeHelper(helper, ['revoke', leaseId]);
}

export async function main(argv) {
  const command = argv.shift();
  if (command === 'verify') {
    const paths = parseOptions(
      argv,
      ['--lease', '--keyring', '--allowlist', '--revocations'],
      ['--max-ttl', '--not-after-ms'],
    );
    const maximumTtl = paths['max-ttl'] === undefined ? 3_660 : Number(paths['max-ttl']);
    if (!Number.isSafeInteger(maximumTtl) || maximumTtl < 1 || maximumTtl > 3_660) {
      reject('invalid-timeout');
    }
    const leaseNotAfterMs = configuredLeaseDeadline(paths['not-after-ms']);
    await verifyLease(paths, maximumTtl, leaseNotAfterMs);
    return;
  }
  if (command === 'acquire') {
    await acquireLease(argv);
    return;
  }
  if (command === 'revoke') {
    await revokeLease(argv);
    return;
  }
  reject('invalid-command');
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    const reason = error instanceof LeaseRejection ? error.reason : 'internal-error';
    process.stderr.write(`model-lease: rejected: ${reason}\n`);
    process.exitCode = 1;
  }
}
