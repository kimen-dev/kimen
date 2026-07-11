#!/usr/bin/env node
// Validate review-evidence.json against the frozen review range and every
// UI-affecting path classified by review-package.sh. Network-free by design.
// @spec:018-project-integrity-hardening#S2
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs';
import { lstat, opendir, readFile, writeFile } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

const manifestName = 'review-evidence.json';

function fail(message) {
  throw new Error(message);
}

function assertRecord(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function assertExactKeys(record, expected, label) {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} must contain exactly: ${wanted.join(', ')}`);
  }
}

function assertSafeRelativePath(value, label) {
  if (
    typeof value !== 'string' ||
    value === '' ||
    value.includes('\\') ||
    posix.isAbsolute(value) ||
    posix.normalize(value) !== value ||
    value === '..' ||
    value.startsWith('../')
  ) {
    fail(`${label} must be a canonical relative path without traversal`);
  }
}

const maximumImageBytes = 64 * 1024 * 1024;
const maximumManifestBytes = 1024 * 1024;
const maximumAggregateEncodedBytes = 32 * 1024 * 1024;
const maximumDecodedImageBytes = 128 * 1024 * 1024;
const maximumAggregateDecodedBytes = 512 * 1024 * 1024;
const maximumImagePixels = 100_000_000;
const maximumPngDimension = 32_768;
const maximumPngScanlineBytes = 1024 * 1024;
const maximumEvidenceDepth = 8;
const maximumEvidenceEntries = 512;
const maximumManifestSurfaces = 128;
const maximumStatesPerSurface = 32;
const noFollow = constants.O_NOFOLLOW ?? 0;
const closeOnExec = constants.O_CLOEXEC ?? 0;

function assertImageDimensions(width, height, format, relativePath) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > maximumPngDimension ||
    height > maximumPngDimension ||
    width * height > maximumImagePixels
  ) {
    fail(
      `rendered evidence ${format} has invalid dimensions; width and height are limited to 32768: ${relativePath}`,
    );
  }
}

const crc32Table = Uint32Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngPassDimension(size, start, step) {
  return size <= start ? 0 : Math.ceil((size - start) / step);
}

function pngScanlineLayout(width, height, bitsPerPixel, interlace, relativePath) {
  const passes =
    interlace === 0
      ? [[0, 0, 1, 1]]
      : [
          [0, 0, 8, 8],
          [4, 0, 8, 8],
          [0, 4, 4, 8],
          [2, 0, 4, 4],
          [0, 2, 2, 4],
          [1, 0, 2, 2],
          [0, 1, 1, 2],
        ];
  const passesWithRows = [];
  let length = 0;
  for (const [startX, startY, stepX, stepY] of passes) {
    const passWidth = pngPassDimension(width, startX, stepX);
    const passHeight = pngPassDimension(height, startY, stepY);
    if (passWidth === 0 || passHeight === 0) continue;
    const rowBytes = Math.ceil((passWidth * bitsPerPixel) / 8);
    if (rowBytes > maximumPngScanlineBytes) {
      fail(`rendered evidence PNG exceeds the 1 MiB scanline limit: ${relativePath}`);
    }
    length += passHeight * (1 + rowBytes);
    if (length > maximumDecodedImageBytes) {
      fail(`rendered evidence PNG exceeds the 128 MiB decoded image-data limit: ${relativePath}`);
    }
    passesWithRows.push({ rowBytes, rows: passHeight });
  }
  return { length, passesWithRows };
}

function validatePng(relativePath, bytes, { decode }) {
  const magic = Buffer.from('89504e470d0a1a0a', 'hex');
  if (bytes.length < 45 || !bytes.subarray(0, magic.length).equals(magic)) {
    fail(`rendered evidence PNG is invalid or truncated: ${relativePath}`);
  }
  let offset = magic.length;
  let header;
  let paletteSeen = false;
  let imageDataEnded = false;
  const imageData = [];
  let endSeen = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) {
      fail(`rendered evidence PNG has a truncated chunk: ${relativePath}`);
    }
    const chunkLength = bytes.readUInt32BE(offset);
    const typeOffset = offset + 4;
    const type = bytes.subarray(typeOffset, typeOffset + 4).toString('ascii');
    if (!/^[A-Za-z]{4}$/u.test(type)) {
      fail(`rendered evidence PNG has an invalid chunk type: ${relativePath}`);
    }
    const dataOffset = typeOffset + 4;
    const dataEnd = dataOffset + chunkLength;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > bytes.length) {
      fail(`rendered evidence PNG has a truncated ${type} chunk: ${relativePath}`);
    }
    const expectedCrc = bytes.readUInt32BE(dataEnd);
    const observedCrc = crc32(bytes.subarray(typeOffset, dataEnd));
    if (expectedCrc !== observedCrc) {
      fail(`rendered evidence PNG ${type} chunk CRC is invalid: ${relativePath}`);
    }
    if (!header && type !== 'IHDR') {
      fail(`rendered evidence PNG must begin with an IHDR chunk: ${relativePath}`);
    }
    if (type === 'IHDR') {
      if (header || chunkLength !== 13 || offset !== magic.length) {
        fail(`rendered evidence PNG has an invalid IHDR chunk: ${relativePath}`);
      }
      const width = bytes.readUInt32BE(dataOffset);
      const height = bytes.readUInt32BE(dataOffset + 4);
      const bitDepth = bytes[dataOffset + 8];
      const colorType = bytes[dataOffset + 9];
      const compression = bytes[dataOffset + 10];
      const filter = bytes[dataOffset + 11];
      const interlace = bytes[dataOffset + 12];
      const validDepths = new Map([
        [0, new Set([1, 2, 4, 8, 16])],
        [2, new Set([8, 16])],
        [4, new Set([8, 16])],
        [6, new Set([8, 16])],
      ]);
      assertImageDimensions(width, height, 'PNG', relativePath);
      if (colorType === 3) {
        fail(
          `rendered evidence PNG indexed colorType 3 is unsupported in schema v1: ${relativePath}`,
        );
      }
      if (
        !validDepths.get(colorType)?.has(bitDepth) ||
        compression !== 0 ||
        filter !== 0 ||
        ![0, 1].includes(interlace)
      ) {
        fail(`rendered evidence PNG has an invalid IHDR encoding: ${relativePath}`);
      }
      header = { bitDepth, colorType, height, interlace, width };
    } else if (type === 'PLTE') {
      if (
        paletteSeen ||
        imageData.length > 0 ||
        chunkLength === 0 ||
        chunkLength > 768 ||
        chunkLength % 3 !== 0 ||
        [0, 4].includes(header.colorType)
      ) {
        fail(`rendered evidence PNG has an invalid PLTE chunk: ${relativePath}`);
      }
      paletteSeen = true;
    } else if (type === 'IDAT') {
      if (imageDataEnded) {
        fail(`rendered evidence PNG has non-consecutive IDAT chunks: ${relativePath}`);
      }
      if (header.colorType === 3 && !paletteSeen) {
        fail(`rendered evidence PNG indexed color is missing PLTE: ${relativePath}`);
      }
      imageData.push(bytes.subarray(dataOffset, dataEnd));
    } else if (type === 'IEND') {
      if (chunkLength !== 0 || imageData.length === 0 || chunkEnd !== bytes.length) {
        fail(`rendered evidence PNG has an invalid IEND or trailing bytes: ${relativePath}`);
      }
      endSeen = true;
    } else {
      if (/^[A-Z]/u.test(type)) {
        fail(`rendered evidence PNG has an unknown critical chunk ${type}: ${relativePath}`);
      }
      if (imageData.length > 0) imageDataEnded = true;
    }
    offset = chunkEnd;
    if (endSeen) break;
  }
  if (!header || !endSeen || imageData.length === 0) {
    fail(`rendered evidence PNG is missing IHDR, IDAT or IEND data: ${relativePath}`);
  }
  const channelCount = new Map([
    [0, 1],
    [2, 3],
    [3, 1],
    [4, 2],
    [6, 4],
  ]).get(header.colorType);
  const layout = pngScanlineLayout(
    header.width,
    header.height,
    channelCount * header.bitDepth,
    header.interlace,
    relativePath,
  );
  if (!decode) return { decodedBytes: layout.length };
  let inflated;
  try {
    inflated = inflateSync(Buffer.concat(imageData), { maxOutputLength: layout.length + 1 });
  } catch {
    fail(`rendered evidence PNG has invalid compressed image data: ${relativePath}`);
  }
  if (inflated.length !== layout.length) {
    fail(`rendered evidence PNG image data length is invalid: ${relativePath}`);
  }
  let scanlineOffset = 0;
  for (const pass of layout.passesWithRows) {
    for (let row = 0; row < pass.rows; row += 1) {
      if (inflated[scanlineOffset] > 4) {
        fail(`rendered evidence PNG has an invalid scanline filter: ${relativePath}`);
      }
      scanlineOffset += 1 + pass.rowBytes;
    }
  }
  return { decodedBytes: layout.length };
}

function validateImageBytes(relativePath, bytes, { decode }) {
  if (bytes.length > maximumImageBytes) {
    fail(`rendered evidence image exceeds the 64 MiB limit: ${relativePath}`);
  }
  const lower = relativePath.toLowerCase();
  if (lower.endsWith('.png')) return validatePng(relativePath, bytes, { decode });
  fail(
    `unsupported rendered evidence file; schema v1 requires a structurally decodable PNG: ${relativePath}`,
  );
}

async function discoverEvidenceEntries(evidenceRoot) {
  const imageEntries = [];
  let aggregateEncodedBytes = 0;
  let entryCount = 0;
  let manifestEntry = null;

  async function visit(directory, relativeDirectory = '', depth = 0) {
    const directoryHandle = await opendir(directory);
    for await (const child of directoryHandle) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${child.name}` : child.name;
      const absolutePath = join(directory, child.name);
      const entryDepth = depth + 1;
      if (entryDepth > maximumEvidenceDepth) {
        fail(`rendered evidence depth exceeds the schema-v1 limit of 8 entries: ${relativePath}`);
      }
      entryCount += 1;
      if (entryCount > maximumEvidenceEntries) {
        fail('rendered evidence entry/file count exceeds the schema-v1 limit of 512');
      }
      const information = await lstat(absolutePath);
      if (information.isSymbolicLink()) {
        fail(`rendered evidence contains a symbolic link: ${relativePath}`);
      }
      if (information.isDirectory()) {
        await visit(absolutePath, relativePath, entryDepth);
        continue;
      }
      if (!information.isFile()) {
        fail(`rendered evidence contains a non-regular file: ${relativePath}`);
      }
      const entry = {
        absolutePath,
        device: information.dev,
        inode: information.ino,
        relativePath,
        size: information.size,
      };
      if (relativePath === manifestName) {
        if (information.size > maximumManifestBytes) {
          fail(`${manifestName} manifest exceeds the schema-v1 1 MiB size limit`);
        }
        manifestEntry = entry;
        continue;
      }
      if (information.size > maximumImageBytes) {
        fail(`rendered evidence image exceeds the 64 MiB encoded file limit: ${relativePath}`);
      }
      aggregateEncodedBytes += information.size;
      if (aggregateEncodedBytes > maximumAggregateEncodedBytes) {
        fail('rendered evidence aggregate encoded size exceeds the schema-v1 32 MiB limit');
      }
      imageEntries.push(entry);
    }
  }

  await visit(evidenceRoot);
  return { imageEntries, manifestEntry };
}

async function readStableEntry(entry, label) {
  const descriptor = openSync(entry.absolutePath, constants.O_RDONLY | noFollow | closeOnExec);
  try {
    const before = fstatSync(descriptor);
    if (
      !before.isFile() ||
      before.dev !== entry.device ||
      before.ino !== entry.inode ||
      before.size !== entry.size
    ) {
      fail(`${label} changed before bounded rendered-evidence read`);
    }
    const bytes = Buffer.allocUnsafe(entry.size);
    let offset = 0;
    while (offset < bytes.length) {
      const bytesRead = readSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (bytesRead === 0) fail(`${label} ended before its bounded rendered-evidence size`);
      offset += bytesRead;
    }
    const extraByte = Buffer.allocUnsafe(1);
    if (readSync(descriptor, extraByte, 0, 1, null) !== 0) {
      fail(`${label} grew beyond its bounded rendered-evidence size`);
    }
    const after = fstatSync(descriptor);
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== entry.size) {
      fail(`${label} changed during bounded rendered-evidence read`);
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

async function validateEvidenceImages(imageEntries) {
  const images = new Map();
  let aggregateDecodedBytes = 0;

  // Pass one validates bounded container structure and records only metadata.
  // Buffers are released between files; no decoded allocation occurs until the
  // complete declared aggregate is known to fit the evidence-level budget.
  for (const entry of imageEntries) {
    const bytes = await readStableEntry(entry, `rendered evidence image ${entry.relativePath}`);
    const validation = validateImageBytes(entry.relativePath, bytes, { decode: false });
    const digest = createHash('sha256').update(bytes).digest('hex');
    aggregateDecodedBytes += validation.decodedBytes;
    if (aggregateDecodedBytes > maximumAggregateDecodedBytes) {
      fail('rendered evidence aggregate decoded size exceeds the schema-v1 512 MiB limit');
    }
    images.set(entry.relativePath, {
      decodedBytes: validation.decodedBytes,
      sha256: digest,
      size: entry.size,
    });
  }

  // Pass two re-reads under the established caps and proves the PNG stream is
  // actually inflatable with the exact declared scanline layout.
  for (const entry of imageEntries) {
    const bytes = await readStableEntry(entry, `rendered evidence image ${entry.relativePath}`);
    const expected = images.get(entry.relativePath);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== expected.sha256) {
      fail(`rendered evidence image changed between validation passes: ${entry.relativePath}`);
    }
    const validation = validateImageBytes(entry.relativePath, bytes, { decode: true });
    if (validation.decodedBytes !== expected.decodedBytes) {
      fail(
        `rendered evidence image layout changed between validation passes: ${entry.relativePath}`,
      );
    }
  }
  return images;
}

async function requiredUiSurfaces(requiredRecordsPath) {
  const recordBytes = await readFile(requiredRecordsPath);
  const fields = recordBytes.toString('utf8').split('\0');
  if (fields.at(-1) === '') fields.pop();
  if (fields.length % 2 !== 0) fail('internal UI-surface record is malformed');
  const required = new Map();
  for (let index = 0; index < fields.length; index += 2) {
    const surfaceId = fields[index];
    const changedPath = fields[index + 1];
    const paths = required.get(surfaceId) ?? new Set();
    if (paths.has(changedPath)) fail(`duplicate affected UI path: ${changedPath}`);
    paths.add(changedPath);
    required.set(surfaceId, paths);
  }
  return required;
}

function requiredRenderedStates(surfaceId) {
  if (
    surfaceId.startsWith('component:') ||
    surfaceId === 'component-generator' ||
    surfaceId === 'elements-config'
  ) {
    return ['default', 'dark', 'rtl'];
  }
  if (surfaceId === 'tokens') return ['light', 'dark'];
  if (surfaceId === 'site') return ['wide', 'narrow'];
  if (surfaceId.startsWith('path:')) return ['default'];
  fail(`affected UI surface has no contractual state inventory: ${surfaceId}`);
}

async function testBarrier(phase) {
  if (process.env.KIMEN_REVIEW_EVIDENCE_TEST_MODE !== '1') return;
  if (process.env.KIMEN_REVIEW_EVIDENCE_TEST_BARRIER_PHASE !== phase) return;
  const barrierDirectory = process.env.KIMEN_REVIEW_EVIDENCE_TEST_BARRIER_DIR;
  if (!barrierDirectory) fail('rendered-evidence test barrier directory is required');
  const information = await lstat(barrierDirectory);
  if (information.isSymbolicLink() || !information.isDirectory()) {
    fail('rendered-evidence test barrier must be a regular directory');
  }
  const readyPath = join(barrierDirectory, `${phase}.ready`);
  const continuePath = join(barrierDirectory, `${phase}.continue`);
  await writeFile(readyPath, 'ready\n', { flag: 'wx', mode: 0o600 });
  const deadline = Date.now() + 10_000;
  while (true) {
    try {
      const continuation = await lstat(continuePath);
      if (continuation.isSymbolicLink() || !continuation.isFile()) {
        fail('rendered-evidence test continuation must be a regular file');
      }
      return;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    if (Date.now() > deadline) fail(`rendered-evidence test barrier timed out at ${phase}`);
    await delay(10);
  }
}

async function validateManifest({ baseSha, evidenceRoot, headSha, requiredRecordsPath }) {
  const required = await requiredUiSurfaces(requiredRecordsPath);
  const { imageEntries, manifestEntry } = await discoverEvidenceEntries(evidenceRoot);
  await testBarrier('after-discovery-before-read');
  if (!manifestEntry) {
    const images = await validateEvidenceImages(imageEntries);
    if (required.size > 0 && images.size === 0) {
      fail('rendered evidence is empty; a manifest and at least one regular image are required');
    }
    fail(`missing required ${manifestName} evidence manifest`);
  }
  const manifestBytes = await readStableEntry(manifestEntry, manifestName);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    fail(`${manifestName} must contain valid JSON`);
  }
  assertRecord(manifest, 'evidence manifest');
  assertExactKeys(
    manifest,
    ['baseSha', 'headSha', 'schemaVersion', 'surfaces'],
    'evidence manifest',
  );
  if (manifest.schemaVersion !== 1) fail('evidence manifest schemaVersion must be 1');
  if (manifest.baseSha !== baseSha) {
    fail('evidence manifest baseSha must match the frozen review base');
  }
  if (manifest.headSha !== headSha) {
    fail('evidence manifest headSha must match the frozen review head');
  }
  if (!Array.isArray(manifest.surfaces)) fail('evidence manifest surfaces must be an array');
  if (manifest.surfaces.length > maximumManifestSurfaces) {
    fail('evidence manifest surfaces exceed the schema-v1 limit of 128');
  }
  for (const [surfaceIndex, surfaceValue] of manifest.surfaces.entries()) {
    const surface = assertRecord(surfaceValue, `surfaces[${surfaceIndex}]`);
    if (Array.isArray(surface.states) && surface.states.length > maximumStatesPerSurface) {
      fail(`evidence manifest states exceed the schema-v1 limit of 32: surfaces[${surfaceIndex}]`);
    }
  }

  const images = await validateEvidenceImages(imageEntries);
  if (required.size > 0 && images.size === 0) {
    fail('rendered evidence is empty; at least one regular image is required');
  }

  const seenSurfaces = new Set();
  const seenImages = new Map();
  const coveredPaths = new Set();
  for (const [surfaceIndex, surfaceValue] of manifest.surfaces.entries()) {
    const surface = assertRecord(surfaceValue, `surfaces[${surfaceIndex}]`);
    assertExactKeys(surface, ['id', 'paths', 'states'], `surfaces[${surfaceIndex}]`);
    if (typeof surface.id !== 'string' || surface.id === '') {
      fail('manifest surface id must be non-empty');
    }
    if (seenSurfaces.has(surface.id)) fail(`duplicate manifest surface: ${surface.id}`);
    seenSurfaces.add(surface.id);
    const expectedPaths = required.get(surface.id);
    if (!expectedPaths) {
      fail(`manifest surface does not match an affected UI surface: ${surface.id}`);
    }
    if (!Array.isArray(surface.paths) || surface.paths.length === 0) {
      fail(`manifest surface ${surface.id} paths must be a non-empty array`);
    }
    const actualPaths = new Set();
    for (const changedPath of surface.paths) {
      assertSafeRelativePath(changedPath, `manifest UI path for ${surface.id}`);
      if (actualPaths.has(changedPath) || coveredPaths.has(changedPath)) {
        fail(`duplicate manifest UI path: ${changedPath}`);
      }
      actualPaths.add(changedPath);
      coveredPaths.add(changedPath);
    }
    for (const expectedPath of expectedPaths) {
      if (!actualPaths.has(expectedPath)) {
        fail(`manifest coverage is missing affected UI path: ${expectedPath}`);
      }
    }
    for (const actualPath of actualPaths) {
      if (!expectedPaths.has(actualPath)) {
        fail(`manifest contains an unexpected UI path: ${actualPath}`);
      }
    }
    if (!Array.isArray(surface.states) || surface.states.length === 0) {
      fail(`manifest surface ${surface.id} must include at least one rendered state/image`);
    }
    const requiredStates = new Set(requiredRenderedStates(surface.id));
    const seenDigests = new Set();
    const seenStates = new Set();
    for (const [stateIndex, stateValue] of surface.states.entries()) {
      const state = assertRecord(stateValue, `${surface.id}.states[${stateIndex}]`);
      assertExactKeys(state, ['image', 'name', 'sha256'], `${surface.id}.states[${stateIndex}]`);
      if (typeof state.name !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/u.test(state.name)) {
        fail(`manifest state name for ${surface.id} must be a stable lowercase identifier`);
      }
      if (seenStates.has(state.name)) {
        fail(`duplicate manifest state for ${surface.id}: ${state.name}`);
      }
      seenStates.add(state.name);
      assertSafeRelativePath(state.image, `manifest image path for ${surface.id}/${state.name}`);
      if (seenImages.get(state.image) === surface.id) {
        fail(`duplicate manifest image mapping within ${surface.id}: ${state.image}`);
      }
      if (typeof state.sha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(state.sha256)) {
        fail(`manifest image sha256 is invalid: ${state.image}`);
      }
      if (seenDigests.has(state.sha256)) {
        fail(`duplicate state image digest within ${surface.id}: ${state.sha256}`);
      }
      seenDigests.add(state.sha256);
      const image = images.get(state.image);
      if (!image) fail(`manifest image is missing from EVIDENCE_DIR: ${state.image}`);
      if (image.sha256 !== state.sha256) {
        fail(`manifest image sha256 does not match: ${state.image}`);
      }
      seenImages.set(state.image, surface.id);
    }
    for (const requiredState of requiredStates) {
      if (!seenStates.has(requiredState)) {
        fail(`manifest surface ${surface.id} is missing required rendered state: ${requiredState}`);
      }
    }
  }

  for (const [surfaceId, expectedPaths] of required) {
    if (!seenSurfaces.has(surfaceId)) {
      fail(
        `manifest coverage is missing affected UI surface: ${surfaceId} (${[...expectedPaths].join(
          ', ',
        )})`,
      );
    }
  }
  for (const imagePath of images.keys()) {
    if (!seenImages.has(imagePath)) {
      fail(`rendered evidence image is not integrity-bound by the manifest: ${imagePath}`);
    }
  }
  return {
    imageCount: images.size,
    manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
  };
}

export async function runRenderedEvidenceCli({
  arguments_ = process.argv.slice(2),
  writeStdout = (value) => process.stdout.write(value),
} = {}) {
  const [evidenceRoot, requiredRecordsPath, baseSha, headSha] = arguments_;
  if (!evidenceRoot || !requiredRecordsPath || !baseSha || !headSha) {
    fail(
      'usage: validate-rendered-evidence.mjs <evidence-dir> <required-records> <base-sha> <head-sha>',
    );
  }
  const result = await validateManifest({ baseSha, evidenceRoot, headSha, requiredRecordsPath });
  writeStdout(`${String(result.imageCount)}\t${result.manifestSha256}\n`);
}

export {
  assertSafeRelativePath as assertSafeRenderedPath,
  requiredRenderedStates,
  validateImageBytes as validateRenderedImageBytes,
  validateManifest as validateRenderedEvidence,
};

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runRenderedEvidenceCli().catch((error) => {
    process.stderr.write(`ERROR: rendered evidence ${error.message}\n`);
    process.exitCode = 1;
  });
}
