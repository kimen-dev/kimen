#!/usr/bin/env node
// Publish a prepared review packet without merging into an existing path.
// The destination is reserved with atomic mkdir(2), held open, identity-checked
// around every write, populated with exclusive creates, and accepted only when
// its final inventory exactly matches the prepared packet.
// @spec:018-project-integrity-hardening#S2
import { createHash } from 'node:crypto';
import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  opendirSync,
  openSync,
  readSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const chunkBytes = 64 * 1024;
const maximumPacketDepth = 12;
const maximumPacketEntries = 1024;
const maximumPacketFileBytes = 32 * 1024 * 1024;
const maximumPacketAggregateBytes = 128 * 1024 * 1024;
const maximumPacketManifestBytes = 45_000;
const maximumPacketManifestFiles = 256;
const packetManifestName = 'packet-manifest.json';
const packetPathPattern = /^[A-Za-z0-9._/-]+$/;
const shaPattern = /^[0-9a-f]{40}$/;
const noFollow = constants.O_NOFOLLOW ?? 0;
const closeOnExec = constants.O_CLOEXEC ?? 0;
const setProcessUmask = (mode) => process.umask(mode);

function fail(message) {
  throw new Error(message);
}

function identity(information) {
  return `${String(information.dev)}:${String(information.ino)}`;
}

function assertDirectory(information, label) {
  if (!information.isDirectory() || information.isSymbolicLink()) {
    fail(`${label} must be a regular directory, not a symbolic link`);
  }
}

function assertConfined(root, candidate, label) {
  const relativePath = relative(root, candidate);
  if (relativePath === '' || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
    fail(`${label} escaped its root`);
  }
}

function hashRegularFile(path, expectedSize) {
  const descriptor = openSync(path, constants.O_RDONLY | noFollow | closeOnExec);
  try {
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.size !== expectedSize) {
      fail(`packet file changed before streaming hash: ${path}`);
    }
    const hash = createHash('sha256');
    const buffer = Buffer.allocUnsafe(chunkBytes);
    let bytesHashed = 0;
    while (true) {
      const bytesRead = readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      bytesHashed += bytesRead;
      if (bytesHashed > expectedSize) fail(`packet file grew during streaming hash: ${path}`);
      hash.update(buffer.subarray(0, bytesRead));
    }
    const after = fstatSync(descriptor);
    if (
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== expectedSize ||
      bytesHashed !== expectedSize
    ) {
      fail(`packet file changed during streaming hash: ${path}`);
    }
    return hash.digest('hex');
  } finally {
    closeSync(descriptor);
  }
}

function packetInventory(root, { preparedSource = false } = {}) {
  const rootInformation = lstatSync(root);
  assertDirectory(rootInformation, 'packet source');
  const entries = [];
  let aggregateBytes = 0;
  let entryCount = 0;

  function visit(directory, relativeDirectory = '', depth = 0) {
    const directoryHandle = opendirSync(directory);
    try {
      let child;
      while ((child = directoryHandle.readSync()) !== null) {
        const relativePath = relativeDirectory ? `${relativeDirectory}/${child.name}` : child.name;
        const absolutePath = join(directory, child.name);
        const entryDepth = depth + 1;
        if (entryDepth > maximumPacketDepth) {
          fail(`packet inventory depth exceeds the limit of 12: ${relativePath}`);
        }
        entryCount += 1;
        if (entryCount > maximumPacketEntries) {
          fail('packet inventory entry/file count exceeds the limit of 1024');
        }
        const information = lstatSync(absolutePath);
        if (information.isSymbolicLink()) {
          fail(`packet inventory contains a symbolic link: ${relativePath}`);
        }
        if (information.isDirectory()) {
          const mode = preparedSource ? 0o700 : information.mode & 0o777;
          entries.push({ mode, path: relativePath, type: 'directory' });
          visit(absolutePath, relativePath, entryDepth);
        } else if (information.isFile()) {
          if (information.size > maximumPacketFileBytes) {
            fail(`packet file exceeds the 32 MiB per-file limit: ${relativePath}`);
          }
          aggregateBytes += information.size;
          if (aggregateBytes > maximumPacketAggregateBytes) {
            fail('packet aggregate file bytes exceed the 128 MiB limit');
          }
          entries.push({
            mode: information.mode & 0o777,
            path: relativePath,
            size: information.size,
            type: 'file',
          });
        } else {
          fail(`packet inventory contains a non-regular entry: ${relativePath}`);
        }
      }
    } finally {
      directoryHandle.closeSync();
    }
  }

  visit(root);
  for (const entry of entries) {
    if (entry.type === 'file') {
      entry.sha256 = hashRegularFile(resolve(root, ...entry.path.split('/')), entry.size);
    }
  }
  return entries;
}

function packetManifestFiles(inventory) {
  const files = inventory
    .filter((entry) => entry.type === 'file' && entry.path !== packetManifestName)
    .map(({ path, sha256, size }) => ({ path, size, sha256 }))
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  if (files.length === 0 || files.length > maximumPacketManifestFiles) {
    fail('packet manifest must bind 1 through 256 regular files');
  }
  for (const file of files) {
    if (
      file.path.length === 0 ||
      file.path.length > 512 ||
      !packetPathPattern.test(file.path) ||
      file.path.startsWith('/') ||
      file.path.endsWith('/') ||
      file.path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
    ) {
      fail(`packet manifest cannot encode non-canonical packet path: ${file.path}`);
    }
  }
  return files;
}

function canonicalPacketManifestBytes(inventory, baseSha, headSha) {
  if (!shaPattern.test(baseSha) || !shaPattern.test(headSha)) {
    fail('packet manifest base/head must be lowercase 40-hex Git SHAs');
  }
  const manifest = {
    schemaVersion: 1,
    baseSha,
    headSha,
    files: packetManifestFiles(inventory),
  };
  const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`, 'utf8');
  if (bytes.length > maximumPacketManifestBytes) {
    fail('packet manifest exceeds the 45000-byte workflow transport limit');
  }
  return { bytes, manifest };
}

function readBoundedRegularFile(path, expectedSize, maximumSize) {
  if (expectedSize > maximumSize) fail(`packet file exceeds its read limit: ${path}`);
  const descriptor = openSync(path, constants.O_RDONLY | noFollow | closeOnExec);
  try {
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.size !== expectedSize) {
      fail(`packet file changed before bounded read: ${path}`);
    }
    const bytes = Buffer.alloc(expectedSize);
    let offset = 0;
    while (offset < bytes.length) {
      const bytesRead = readSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (bytesRead === 0) fail(`packet file ended during bounded read: ${path}`);
      offset += bytesRead;
    }
    const probe = Buffer.allocUnsafe(1);
    if (readSync(descriptor, probe, 0, 1, null) !== 0) {
      fail(`packet file grew during bounded read: ${path}`);
    }
    const after = fstatSync(descriptor);
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== expectedSize) {
      fail(`packet file changed during bounded read: ${path}`);
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function assertPacketManifestMatchesInventory(root, inventory) {
  const manifestEntry = inventory.find(
    (entry) => entry.type === 'file' && entry.path === packetManifestName,
  );
  if (!manifestEntry) return;
  const bytes = readBoundedRegularFile(
    join(root, packetManifestName),
    manifestEntry.size,
    maximumPacketManifestBytes,
  );
  if (createHash('sha256').update(bytes).digest('hex') !== manifestEntry.sha256) {
    fail('packet manifest changed after inventory hashing');
  }
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('packet manifest must contain valid JSON');
  }
  const expected = {
    schemaVersion: 1,
    baseSha: manifest?.baseSha,
    headSha: manifest?.headSha,
    files: packetManifestFiles(inventory),
  };
  if (
    !shaPattern.test(expected.baseSha) ||
    !shaPattern.test(expected.headSha) ||
    bytes.toString('utf8') !== `${JSON.stringify(expected)}\n`
  ) {
    fail('packet manifest does not canonically bind the prepared packet inventory');
  }
}

export function writeReviewPacketManifest(sourceArgument, baseSha, headSha) {
  const source = resolve(sourceArgument);
  const inventory = packetInventory(source, { preparedSource: true });
  if (inventory.some((entry) => entry.path === packetManifestName)) {
    fail('packet manifest already exists; refusing to replace it');
  }
  const { bytes } = canonicalPacketManifestBytes(inventory, baseSha, headSha);
  const destination = join(source, packetManifestName);
  const descriptor = openSync(
    destination,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow | closeOnExec,
    0o600,
  );
  try {
    writeAll(descriptor, bytes);
    fchmodSync(descriptor, 0o600);
    fsyncSync(descriptor);
    const information = fstatSync(descriptor);
    if (
      !information.isFile() ||
      information.size !== bytes.length ||
      (information.mode & 0o777) !== 0o600
    ) {
      fail('packet manifest failed descriptor finalization');
    }
  } finally {
    closeSync(descriptor);
  }
  return createHash('sha256').update(bytes).digest('hex');
}

function assertIdentity(path, expectedIdentity, label) {
  const information = lstatSync(path);
  assertDirectory(information, label);
  if (identity(information) !== expectedIdentity) {
    fail(`${label} identity changed during publication`);
  }
  return information;
}

function assertReservedDestination(destination, directoryDescriptor, reservedIdentity) {
  const heldInformation = fstatSync(directoryDescriptor);
  assertDirectory(heldInformation, 'held PACKET_DIR');
  if (identity(heldInformation) !== reservedIdentity) {
    fail('held PACKET_DIR identity changed during publication');
  }
  const pathInformation = assertIdentity(destination, reservedIdentity, 'PACKET_DIR');
  if ((heldInformation.mode & 0o777) !== 0o700 || (pathInformation.mode & 0o777) !== 0o700) {
    fail('PACKET_DIR mode changed; reserved root must remain 0700');
  }
}

function describeInventoryMismatch(expected, actual) {
  const expectedByPath = new Map(expected.map((entry) => [entry.path, entry]));
  const actualByPath = new Map(actual.map((entry) => [entry.path, entry]));
  for (const entry of actual) {
    if (!expectedByPath.has(entry.path)) {
      return `PACKET_DIR inventory contains an unexpected extra entry: ${entry.path}`;
    }
  }
  for (const entry of expected) {
    const observed = actualByPath.get(entry.path);
    if (!observed) return `PACKET_DIR inventory is missing an expected entry: ${entry.path}`;
    if (JSON.stringify(observed) !== JSON.stringify(entry)) {
      return `PACKET_DIR inventory does not match the prepared packet: ${entry.path}`;
    }
  }
  return null;
}

function assertExactInventory(destination, expected) {
  const actual = packetInventory(destination);
  const mismatch = describeInventoryMismatch(expected, actual);
  if (mismatch) fail(mismatch);
}

function writeAll(descriptor, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = writeSync(descriptor, bytes, offset, bytes.length - offset);
    if (written <= 0) fail('packet publication write made no progress');
    offset += written;
  }
}

async function copyFileExclusive(sourcePath, destinationPath, entry, runtime) {
  if (
    runtime.environment.KIMEN_REVIEW_PACKET_TEST_MODE === '1' &&
    runtime.environment.KIMEN_REVIEW_PACKET_TEST_ENTRY_PATH === entry.path
  ) {
    await testBarrier('before-source-file-open', runtime);
  }
  const sourceDescriptor = openSync(sourcePath, constants.O_RDONLY | noFollow | closeOnExec);
  let destinationDescriptor;
  try {
    destinationDescriptor = openSync(
      destinationPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow | closeOnExec,
      entry.mode,
    );
    const sourceBefore = fstatSync(sourceDescriptor);
    if (!sourceBefore.isFile() || sourceBefore.size !== entry.size) {
      fail(`packet source file changed before publication: ${entry.path}`);
    }
    if (
      runtime.environment.KIMEN_REVIEW_PACKET_TEST_MODE === '1' &&
      runtime.environment.KIMEN_REVIEW_PACKET_TEST_ENTRY_PATH === entry.path
    ) {
      await testBarrier('after-file-create-before-finalize', runtime);
    }
    const hash = createHash('sha256');
    const buffer = Buffer.allocUnsafe(chunkBytes);
    let bytesCopied = 0;
    while (true) {
      const bytesRead = readSync(sourceDescriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      bytesCopied += bytesRead;
      if (bytesCopied > entry.size || bytesCopied > maximumPacketFileBytes) {
        fail(`packet source file exceeded its bounded inventory: ${entry.path}`);
      }
      const chunk = buffer.subarray(0, bytesRead);
      hash.update(chunk);
      writeAll(destinationDescriptor, chunk);
    }
    const sourceAfter = fstatSync(sourceDescriptor);
    if (
      sourceAfter.dev !== sourceBefore.dev ||
      sourceAfter.ino !== sourceBefore.ino ||
      sourceAfter.size !== entry.size ||
      bytesCopied !== entry.size ||
      hash.digest('hex') !== entry.sha256
    ) {
      fail(`packet source file changed during publication: ${entry.path}`);
    }
    fchmodSync(destinationDescriptor, entry.mode);
    fsyncSync(destinationDescriptor);
    const published = fstatSync(destinationDescriptor);
    if (
      !published.isFile() ||
      published.size !== entry.size ||
      (published.mode & 0o777) !== entry.mode
    ) {
      fail(`published packet file descriptor failed final verification: ${entry.path}`);
    }
  } finally {
    if (destinationDescriptor !== undefined) closeSync(destinationDescriptor);
    closeSync(sourceDescriptor);
  }
}

function createPrivateDirectory(path, entry, setUmask) {
  if (entry.mode !== 0o700)
    fail(`prepared packet directory mode must normalize to 0700: ${entry.path}`);
  const previousUmask = setUmask(0o077);
  try {
    mkdirSync(path, { mode: 0o700 });
  } finally {
    setUmask(previousUmask);
  }
  const information = lstatSync(path);
  if (
    information.isSymbolicLink() ||
    !information.isDirectory() ||
    (information.mode & 0o777) !== 0o700
  ) {
    fail(`published packet directory was not created safely: ${entry.path}`);
  }
}

async function populate(
  destination,
  source,
  inventory,
  directoryDescriptor,
  reservedIdentity,
  runtime,
) {
  for (const entry of inventory) {
    assertReservedDestination(destination, directoryDescriptor, reservedIdentity);
    const sourcePath = resolve(source, ...entry.path.split('/'));
    const destinationPath = resolve(destination, ...entry.path.split('/'));
    assertConfined(source, sourcePath, 'packet source entry');
    assertConfined(destination, destinationPath, 'PACKET_DIR entry');
    if (
      runtime.environment.KIMEN_REVIEW_PACKET_TEST_MODE === '1' &&
      runtime.environment.KIMEN_REVIEW_PACKET_TEST_ENTRY_PATH === entry.path
    ) {
      await testBarrier('before-entry-create', runtime);
    }
    // Same-UID replacement of a descendant after confinement/identity checks
    // cannot be closed portably without openat-style relative operations. The
    // exclusive create prevents clobber, and final inventory prevents success,
    // but a newly named file can be created through a raced ancestor symlink.
    if (entry.type === 'directory') {
      createPrivateDirectory(destinationPath, entry, runtime.setUmask);
    } else {
      await copyFileExclusive(sourcePath, destinationPath, entry, runtime);
    }
    assertReservedDestination(destination, directoryDescriptor, reservedIdentity);
  }
}

async function testBarrier(phase, { environment, now, wait }) {
  if (environment.KIMEN_REVIEW_PACKET_TEST_MODE !== '1') return;
  if (environment.KIMEN_REVIEW_PACKET_TEST_BARRIER_PHASE !== phase) return;
  const barrierDirectory = environment.KIMEN_REVIEW_PACKET_TEST_BARRIER_DIR;
  if (!barrierDirectory) fail('test barrier directory is required in test mode');
  const information = lstatSync(barrierDirectory);
  assertDirectory(information, 'test barrier directory');
  const readyPath = join(barrierDirectory, `${phase}.ready`);
  const continuePath = join(barrierDirectory, `${phase}.continue`);
  writeFileSync(readyPath, 'ready\n', { flag: 'wx', mode: 0o600 });
  const deadline = now() + 10_000;
  while (true) {
    try {
      const continuation = lstatSync(continuePath);
      if (!continuation.isFile() || continuation.isSymbolicLink()) {
        fail('test barrier continuation must be a regular file');
      }
      return;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    if (now() > deadline) fail(`test barrier timed out at ${phase}`);
    await wait(10);
  }
}

export async function publishReviewPacket(
  sourceArgument,
  destinationArgument,
  { environment = process.env, now = Date.now, setUmask = setProcessUmask, wait = delay } = {},
) {
  const source = resolve(sourceArgument);
  const destination = resolve(destinationArgument);
  const parent = dirname(destination);
  const sourceInformation = lstatSync(source);
  const parentInformation = lstatSync(parent);
  assertDirectory(sourceInformation, 'packet source');
  assertDirectory(parentInformation, 'PACKET_DIR parent');
  const parentIdentity = identity(parentInformation);
  const expectedInventory = packetInventory(source, { preparedSource: true });
  assertPacketManifestMatchesInventory(source, expectedInventory);
  const runtime = { environment, now, setUmask, wait };

  const previousUmask = setUmask(0o077);
  try {
    try {
      mkdirSync(destination, { mode: 0o700 });
    } catch (error) {
      if (error?.code === 'EEXIST') {
        fail('PACKET_DIR already exists; atomic no-clobber reservation refused replacement');
      }
      throw error;
    }
  } finally {
    setUmask(previousUmask);
  }

  // Node does not expose a portable mkdirat/openat or rename-noreplace API on
  // both macOS and Linux, and mkdir(2) does not return a descriptor. Keep this
  // intentionally testable micro-window explicit: a same-UID actor can replace
  // the path before openSync, but exclusive child creates plus exact inventory
  // prevent a non-empty substitute from being accepted, and failure never
  // recursively deletes whichever directory is currently at the path.
  await testBarrier('after-mkdir-before-open', runtime);

  // There is deliberately no destination cleanup below. A failed identity or
  // inventory check may mean another actor replaced this path; path-based
  // recursive deletion would risk deleting that actor's directory.
  const directoryDescriptor = openSync(
    destination,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  );
  try {
    const reservedInformation = fstatSync(directoryDescriptor);
    assertDirectory(reservedInformation, 'reserved PACKET_DIR');
    const reservedIdentity = identity(reservedInformation);
    assertIdentity(parent, parentIdentity, 'PACKET_DIR parent');
    assertReservedDestination(destination, directoryDescriptor, reservedIdentity);
    await testBarrier('after-reserve', runtime);
    assertReservedDestination(destination, directoryDescriptor, reservedIdentity);
    await populate(
      destination,
      source,
      expectedInventory,
      directoryDescriptor,
      reservedIdentity,
      runtime,
    );
    await testBarrier('before-inventory', runtime);
    assertReservedDestination(destination, directoryDescriptor, reservedIdentity);
    assertExactInventory(destination, expectedInventory);
    assertReservedDestination(destination, directoryDescriptor, reservedIdentity);
    assertIdentity(parent, parentIdentity, 'PACKET_DIR parent');
  } finally {
    closeSync(directoryDescriptor);
  }
}

export async function runPublishReviewPacket({
  arguments_ = process.argv.slice(2),
  manifestImpl = writeReviewPacketManifest,
  publishImpl = publishReviewPacket,
  setExitCode = (value) => (process.exitCode = value),
  stderr = process.stderr,
  stdout = process.stdout,
} = {}) {
  if (arguments_[0] === 'manifest') {
    const [, source, baseSha, headSha] = arguments_;
    if (!source || !baseSha || !headSha) {
      stderr.write(
        'ERROR: usage: publish-review-packet.mjs manifest <source-dir> <base-sha> <head-sha>\n',
      );
      setExitCode(1);
      return false;
    }
    try {
      stdout.write(`${manifestImpl(source, baseSha, headSha)}\n`);
      return true;
    } catch (error) {
      stderr.write(`ERROR: review packet manifest ${error.message}\n`);
      setExitCode(1);
      return false;
    }
  }
  const [source, destination] = arguments_;
  if (!source || !destination) {
    stderr.write('ERROR: usage: publish-review-packet.mjs <source-dir> <PACKET_DIR>\n');
    setExitCode(1);
    return false;
  }
  try {
    await publishImpl(source, destination);
    return true;
  } catch (error) {
    stderr.write(`ERROR: review packet publication ${error.message}\n`);
    setExitCode(1);
    return false;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runPublishReviewPacket();
}
