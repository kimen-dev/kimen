#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S5
// Host-owned, crash-durable lifecycle journal for unattended attempts.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const uid = process.getuid?.();
const phases = ['bootstrap', 'agent', 'gates'];
const helperTimeoutSeconds = 30;

export class AttemptJournalError extends Error {
  constructor(message, exitCode = 65) {
    super(message);
    this.name = 'AttemptJournalError';
    this.exitCode = exitCode;
  }
}

function fail(message, code = 65) {
  throw new AttemptJournalError(message, code);
}

function safeAttemptId(value) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value ?? '')) {
    fail('invalid attempt id');
  }
  return value;
}

function journalNow(environment) {
  if (environment.KIMEN_JOURNAL_NOW_MS_TEST !== undefined) {
    if (environment.KIMEN_LOOP_TEST_MODE !== '1')
      fail('journal clock override requires explicit test mode', 64);
    const overridden = Number(environment.KIMEN_JOURNAL_NOW_MS_TEST);
    if (!Number.isSafeInteger(overridden) || overridden < 0) fail('invalid journal clock');
    return overridden;
  }
  return Date.now();
}

function secureStat(target, kind, privateMode = true) {
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch {
    fail(`missing ${kind}: ${target}`);
  }
  const validKind = kind === 'directory' ? stat.isDirectory() : stat.isFile();
  if (!validKind || stat.isSymbolicLink() || (uid !== undefined && stat.uid !== uid)) {
    fail(`unsafe ${kind}: ${target}`);
  }
  const forbidden = privateMode ? 0o077 : 0o022;
  if ((stat.mode & forbidden) !== 0) fail(`unsafe permissions: ${target}`);
  return stat;
}

function ensurePrivateDirectory(target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { mode: 0o700 });
    fs.chmodSync(target, 0o700);
    fsyncDirectory(path.dirname(target));
  }
  secureStat(target, 'directory');
}

function fsyncDirectory(target) {
  const fd = fs.openSync(target, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function atomicJson(target, value) {
  const directory = path.dirname(target);
  secureStat(directory, 'directory');
  if (fs.existsSync(target)) secureStat(target, 'file');
  const temporary = path.join(
    directory,
    `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`,
  );
  const fd = fs.openSync(
    temporary,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
    0o600,
  );
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, target);
  fsyncDirectory(directory);
}

function readJson(target) {
  secureStat(target, 'file');
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch {
    fail(`invalid JSON: ${target}`);
  }
}

function journalDirectory(root, attemptId) {
  safeAttemptId(attemptId);
  return path.join(path.resolve(root), attemptId);
}

function canonicalExistingParent(target) {
  const absolute = path.resolve(target);
  return path.join(fs.realpathSync(path.dirname(absolute)), path.basename(absolute));
}

function anchorPathFor(repo, attemptId) {
  return path.join(path.dirname(repo), `.${path.basename(repo)}.attempt-${attemptId}.anchor`);
}

function validateBinding(anchor, state, directory) {
  if (anchor.schemaVersion !== 1 || state.schemaVersion !== 1)
    fail(`unsupported journal schema: ${directory}`);
  for (const key of ['attemptId', 'repoPath', 'baseSha', 'taskSha256']) {
    if (anchor[key] !== state[key]) fail(`anchor/state mismatch for ${key}: ${directory}`);
  }
  safeAttemptId(anchor.attemptId);
  if (!path.isAbsolute(anchor.repoPath) || path.resolve(anchor.repoPath) !== anchor.repoPath) {
    fail(`journal repo path is not canonical: ${directory}`);
  }
  if (!/^[0-9a-f]{40}$/.test(anchor.baseSha ?? '')) fail(`invalid base SHA: ${directory}`);
  if (!/^[0-9a-f]{64}$/.test(anchor.taskSha256 ?? '')) fail(`invalid task SHA-256: ${directory}`);
  if (!state.containers || !state.lease) fail(`incomplete journal state: ${directory}`);
  for (const phase of phases) {
    const container = state.containers[phase];
    if (!container) fail(`missing ${phase} container state: ${directory}`);
    if (!['none', 'creating', 'created', 'running', 'destroyed'].includes(container.state)) {
      fail(`invalid ${phase} container state: ${directory}`);
    }
    if (container.name !== null && !/^kimen-[A-Za-z0-9_.-]{1,220}$/.test(container.name)) {
      fail(`invalid ${phase} container name: ${directory}`);
    }
    if (['creating', 'created', 'running'].includes(container.state) && container.name === null) {
      fail(`missing ${phase} deterministic container name: ${directory}`);
    }
    if (['created', 'running'].includes(container.state) && container.id === null) {
      fail(`missing ${phase} container id: ${directory}`);
    }
  }
  if (!['none', 'prepared', 'cancelled'].includes(state.lease.state)) {
    if (
      !Number.isSafeInteger(state.lease.acquireStartedAt) ||
      !Number.isSafeInteger(state.lease.leaseNotAfter)
    ) {
      fail(`missing durable lease expiry bound: ${directory}`);
    }
    const ttl = state.lease.leaseNotAfter - state.lease.acquireStartedAt;
    if (ttl < 91_000 || ttl > 3_690_000) fail(`invalid durable lease expiry bound: ${directory}`);
  }
  return { anchor, state };
}

function load(root, attemptId) {
  const canonicalRoot = fs.realpathSync(root);
  secureStat(canonicalRoot, 'directory');
  const directory = journalDirectory(canonicalRoot, attemptId);
  secureStat(directory, 'directory');
  const anchor = readJson(path.join(directory, 'anchor.json'));
  const state = readJson(path.join(directory, 'state.json'));
  return { directory, ...validateBinding(anchor, state, directory) };
}

function validateConfinedFile(directory, candidate) {
  if (!path.isAbsolute(candidate) || path.dirname(candidate) !== directory) {
    fail(`journal file escapes attempt directory: ${candidate}`);
  }
}

function validateAttemptFiles(record) {
  const allowed = new Set([
    'anchor.json',
    'state.json',
    'image-id',
    'bootstrap.cid',
    'agent.cid',
    'gates.cid',
    'bootstrap-evidence.json',
    'agent-evidence.json',
    'model-lease.id',
    'model-lease.json',
  ]);
  for (const entry of fs.readdirSync(record.directory, { withFileTypes: true })) {
    const target = path.join(record.directory, entry.name);
    if (!allowed.has(entry.name) || !entry.isFile() || entry.isSymbolicLink()) {
      fail(`orphan or unsafe lifecycle-journal file: ${target}`);
    }
    secureStat(target, 'file');
  }
  for (const phase of phases) {
    const cidFile = record.state.containers[phase].cidFile;
    if (cidFile !== null && cidFile !== path.join(record.directory, `${phase}.cid`)) {
      fail(`unexpected ${phase} cid path: ${record.directory}`);
    }
  }
  const { idFile, secretPath } = record.state.lease;
  if (idFile !== null && idFile !== path.join(record.directory, 'model-lease.id'))
    fail(`unexpected lease id path: ${record.directory}`);
  if (secretPath !== null && secretPath !== path.join(record.directory, 'model-lease.json'))
    fail(`unexpected lease secret path: ${record.directory}`);
}

function init([rootArg, repoArg, attemptIdArg, baseSha, taskSha256], stdout) {
  if (!rootArg || !repoArg || !attemptIdArg || !baseSha || !taskSha256)
    fail('init requires root repo attempt base taskSha256', 64);
  const root = canonicalExistingParent(rootArg);
  const repoPath = fs.realpathSync(repoArg);
  const attemptId = safeAttemptId(attemptIdArg);
  if (!path.basename(repoPath).startsWith('kimen-loop-'))
    fail('attempt repository name is outside the loop namespace');
  secureStat(path.dirname(repoPath), 'directory', false);
  ensurePrivateDirectory(root);
  const directory = journalDirectory(root, attemptId);
  if (fs.existsSync(directory)) {
    const existing = load(root, attemptId);
    if (
      existing.anchor.repoPath !== repoPath ||
      existing.anchor.baseSha !== baseSha ||
      existing.anchor.taskSha256 !== taskSha256
    )
      fail('attempt id is already bound to different immutable inputs');
    stdout.write(`${directory}\n`);
    return;
  }
  fs.mkdirSync(directory, { mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  fsyncDirectory(root);
  const anchor = { schemaVersion: 1, attemptId, repoPath, baseSha, taskSha256 };
  const emptyContainer = () => ({ state: 'none', id: null, cidFile: null, name: null });
  const state = {
    ...anchor,
    imageId: null,
    containers: Object.fromEntries(phases.map((phase) => [phase, emptyContainer()])),
    lease: {
      state: 'none',
      leaseId: null,
      idFile: null,
      secretPath: null,
      secretState: 'absent',
      acquireStartedAt: null,
      leaseNotAfter: null,
    },
    finalization: 'pending',
  };
  atomicJson(path.join(directory, 'anchor.json'), anchor);
  atomicJson(path.join(directory, 'state.json'), state);
  const adjacentAnchor = anchorPathFor(repoPath, attemptId);
  const adjacentParent = path.dirname(adjacentAnchor);
  secureStat(adjacentParent, 'directory', false);
  const temporaryAnchor = path.join(
    adjacentParent,
    `.${path.basename(adjacentAnchor)}.${process.pid}.tmp`,
  );
  const fd = fs.openSync(
    temporaryAnchor,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
    0o600,
  );
  try {
    fs.writeFileSync(fd, `${JSON.stringify(anchor)}\n`);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temporaryAnchor, adjacentAnchor);
  fsyncDirectory(adjacentParent);
  stdout.write(`${directory}\n`);
}

function update([root, attemptId, operation, ...values], environment) {
  if (!root || !attemptId || !operation) fail('update requires root attempt operation', 64);
  const loaded = load(root, attemptId);
  const state = loaded.state;
  switch (operation) {
    case 'image': {
      const [imageId] = values;
      if (!imageId) fail('image update requires an image id', 64);
      state.imageId = imageId;
      break;
    }
    case 'container-intent': {
      const [phase, cidFile, name] = values;
      if (!phases.includes(phase) || !cidFile || !name)
        fail('container-intent requires phase, cid file and name', 64);
      if (!/^kimen-[A-Za-z0-9_.-]{1,220}$/.test(name))
        fail('invalid deterministic container name', 64);
      validateConfinedFile(loaded.directory, cidFile);
      state.containers[phase] = { state: 'creating', id: null, cidFile, name };
      break;
    }
    case 'container-id': {
      const [phase, id] = values;
      if (!phases.includes(phase) || !/^[A-Za-z0-9_.:-]{8,256}$/.test(id ?? ''))
        fail('invalid container identity', 64);
      state.containers[phase].id = id;
      state.containers[phase].state = 'created';
      break;
    }
    case 'container-running': {
      const [phase] = values;
      if (!phases.includes(phase) || !state.containers[phase].id)
        fail('container-running requires a persisted container id', 64);
      state.containers[phase].state = 'running';
      break;
    }
    case 'container-destroyed': {
      const [phase] = values;
      if (!phases.includes(phase)) fail('invalid container phase', 64);
      state.containers[phase].state = 'destroyed';
      break;
    }
    case 'lease-intent': {
      const [secretPath, idFile] = values;
      if (!secretPath || !idFile) fail('lease-intent requires secret and id paths', 64);
      validateConfinedFile(loaded.directory, secretPath);
      validateConfinedFile(loaded.directory, idFile);
      state.lease = {
        state: 'prepared',
        leaseId: null,
        idFile,
        secretPath,
        secretState: 'absent',
        acquireStartedAt: null,
        leaseNotAfter: null,
      };
      break;
    }
    case 'lease-acquiring': {
      const [rawTimeout = environment.KIMEN_AGENT_TIMEOUT_SECONDS ?? '3600'] = values;
      if (state.lease.state !== 'prepared') fail('lease-acquiring requires prepared intent');
      const timeout = Number(rawTimeout);
      if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 3_600)
        fail('invalid agent timeout', 64);
      const now = journalNow(environment);
      state.lease.state = 'acquiring';
      state.lease.secretState = 'pending';
      state.lease.acquireStartedAt = now;
      state.lease.leaseNotAfter = now + (helperTimeoutSeconds + timeout + 60) * 1_000;
      break;
    }
    case 'lease-id': {
      const [leaseId] = values;
      if (!/^[A-Za-z0-9_.:-]{1,256}$/.test(leaseId ?? '')) fail('invalid lease identity', 64);
      state.lease.leaseId = leaseId;
      state.lease.state = 'acquired';
      state.lease.secretState = 'present';
      break;
    }
    case 'secret-destroyed':
      state.lease.secretState = 'absent';
      break;
    case 'lease-revoking':
      if (!state.lease.leaseId) fail('cannot revoke an unidentified lease');
      state.lease.state = 'revoking';
      break;
    case 'lease-revoked':
      state.lease.state = 'revoked';
      state.lease.secretState = 'absent';
      break;
    case 'lease-expired': {
      const now = journalNow(environment);
      if (!Number.isSafeInteger(state.lease.leaseNotAfter) || now < state.lease.leaseNotAfter) {
        fail('cannot assert lease expiry before the durable upper bound');
      }
      state.lease.state = 'expired';
      state.lease.secretState = 'absent';
      break;
    }
    case 'lease-cancelled':
      if (state.lease.state !== 'prepared') fail('only an unstarted lease intent can be cancelled');
      state.lease.state = 'cancelled';
      state.lease.secretState = 'absent';
      break;
    case 'finalized':
      state.finalization = 'complete';
      break;
    default:
      fail(`unknown journal operation: ${operation}`, 64);
  }
  atomicJson(path.join(loaded.directory, 'state.json'), state);
}

function get([root, attemptId, field], stdout) {
  if (!root || !attemptId || !field) fail('get requires root attempt field', 64);
  let value = load(root, attemptId).state;
  for (const part of field.split('.')) value = value?.[part];
  if (value === undefined) fail(`unknown journal field: ${field}`);
  if (value === null) return;
  stdout.write(typeof value === 'object' ? JSON.stringify(value) : String(value));
}

function scan([rootArg, parentArg], stdout) {
  if (!rootArg || !parentArg) fail('scan requires journal root and repository parent', 64);
  const root = canonicalExistingParent(rootArg);
  const parent = fs.realpathSync(parentArg);
  secureStat(parent, 'directory', false);
  const records = new Map();
  if (fs.existsSync(root)) {
    secureStat(root, 'directory');
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink())
        fail(`orphan or unsafe journal entry: ${entry.name}`);
      const attemptId = safeAttemptId(entry.name);
      const loaded = load(root, attemptId);
      validateAttemptFiles(loaded);
      if (
        path.dirname(loaded.anchor.repoPath) !== parent ||
        !path.basename(loaded.anchor.repoPath).startsWith('kimen-loop-')
      ) {
        fail(`journal repository escapes the recovery namespace: ${loaded.anchor.repoPath}`);
      }
      const key = `${loaded.anchor.repoPath}\0${attemptId}`;
      if (records.has(key)) fail(`duplicate journal binding: ${attemptId}`);
      records.set(key, loaded);
    }
  }

  const seenEvidence = new Set();
  const seenAnchors = new Set();
  for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
    const candidate = path.join(parent, entry.name);
    if (entry.name.startsWith('kimen-loop-')) {
      if (entry.isSymbolicLink()) fail(`unsafe loop repository entry: ${candidate}`);
      if (!entry.isDirectory()) continue;
      const attempts = path.join(candidate, '.kimen', 'attempts');
      if (!fs.existsSync(attempts)) continue;
      secureStat(path.join(candidate, '.kimen'), 'directory');
      secureStat(attempts, 'directory');
      for (const evidenceEntry of fs.readdirSync(attempts, { withFileTypes: true })) {
        const evidencePath = path.join(attempts, evidenceEntry.name);
        if (
          !evidenceEntry.isFile() ||
          evidenceEntry.isSymbolicLink() ||
          !evidenceEntry.name.endsWith('.json')
        ) {
          fail(`orphan or unsafe evidence entry: ${evidencePath}`);
        }
        secureStat(evidencePath, 'file');
        const evidence = readJson(evidencePath);
        const attemptId = safeAttemptId(evidenceEntry.name.slice(0, -5));
        if (evidence.attemptId !== attemptId)
          fail(`evidence filename/identity mismatch: ${evidencePath}`);
        const key = `${candidate}\0${attemptId}`;
        const record = records.get(key);
        if (!record) fail(`attempt evidence has no lifecycle journal: ${evidencePath}`);
        if (
          evidence.baseSha !== record.anchor.baseSha ||
          evidence.taskSha256 !== record.anchor.taskSha256
        ) {
          fail(`evidence/journal immutable binding mismatch: ${evidencePath}`);
        }
        seenEvidence.add(key);
      }
    }
    if (
      entry.name.startsWith('.') &&
      entry.name.includes('.attempt-') &&
      entry.name.endsWith('.anchor')
    ) {
      if (!entry.isFile() || entry.isSymbolicLink())
        fail(`unsafe adjacent attempt anchor: ${candidate}`);
      secureStat(candidate, 'file');
      const anchor = readJson(candidate);
      const key = `${anchor.repoPath}\0${safeAttemptId(anchor.attemptId)}`;
      const record = records.get(key);
      if (!record || JSON.stringify(anchor) !== JSON.stringify(record.anchor)) {
        fail(`orphan or mismatched adjacent attempt anchor: ${candidate}`);
      }
      if (anchorPathFor(anchor.repoPath, anchor.attemptId) !== candidate)
        fail(`misnamed adjacent attempt anchor: ${candidate}`);
      seenAnchors.add(key);
    }
  }

  for (const [key, record] of records) {
    if (!seenEvidence.has(key)) fail(`lifecycle journal has no evidence: ${record.directory}`);
    if (!seenAnchors.has(key))
      fail(`lifecycle journal has no adjacent anchor: ${record.directory}`);
    stdout.write(`${record.directory}\0`);
  }
}

export function dispatchAttemptJournal({
  arguments_ = [],
  environment = process.env,
  stdout = process.stdout,
} = {}) {
  if (
    environment.KIMEN_JOURNAL_NOW_MS_TEST !== undefined &&
    environment.KIMEN_LOOP_TEST_MODE !== '1'
  ) {
    fail('journal clock override requires explicit test mode', 64);
  }
  const [command, ...args] = arguments_;
  switch (command) {
    case 'init':
      init(args, stdout);
      break;
    case 'update':
      update(args, environment);
      break;
    case 'get':
      get(args, stdout);
      break;
    case 'scan':
      scan(args, stdout);
      break;
    case 'validate':
      load(args[0], args[1]);
      break;
    default:
      fail('usage: attempt-journal.mjs <init|update|get|scan|validate> ...', 64);
  }
}

export function runAttemptJournalCli({
  arguments_ = process.argv.slice(2),
  environment = process.env,
  stderr = process.stderr,
  stdout = process.stdout,
} = {}) {
  try {
    dispatchAttemptJournal({ arguments_, environment, stdout });
    return 0;
  } catch (error) {
    if (!(error instanceof AttemptJournalError)) throw error;
    stderr.write(`attempt-journal: ${error.message}\n`);
    return error.exitCode;
  }
}

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  process.exitCode = runAttemptJournalCli();
}
