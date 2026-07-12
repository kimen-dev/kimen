import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants as filesystemConstants } from 'node:fs';
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';

import { canonicalJson } from '../lib/canonical-json.mjs';

const execFileAsync = promisify(execFile);

const CANDIDATE_SCHEMA_VERSION = 1;
const CANDIDATE_FILE = 'candidate.tar';
const MANIFEST_FILE = 'manifest.json';
const CHECKSUM_FILE = 'SHA256SUMS';
const REPOSITORY_URL = 'git+https://github.com/kimen-dev/kimen.git';
const RELEASE_WORKFLOW = '.github/workflows/release.yml';
const RELEASE_ENVIRONMENT = 'npm';
const REQUIRED_PACKAGES = Object.freeze([
  Object.freeze({
    name: '@kimen/elements',
    directory: 'elements',
    fileStem: 'kimen-elements',
  }),
  Object.freeze({
    name: '@kimen/tokens',
    directory: 'tokens',
    fileStem: 'kimen-tokens',
  }),
]);
const FORBIDDEN_LIFECYCLE_SCRIPTS = new Set([
  'postpack',
  'postpublish',
  'prepack',
  'prepare',
  'prepublish',
  'prepublishOnly',
  'publish',
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SOURCE_SHA_PATTERN = /^[a-f0-9]{40}$/;
const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const TAR_BLOCK_SIZE = 512;

function lexicalCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(message) {
  throw new Error(message);
}

function assertPlainObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function assertExactKeys(value, expectedKeys, label) {
  const actual = Object.keys(assertPlainObject(value, label)).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} has unexpected or missing fields: expected ${expected.join(', ')}`);
  }
}

function digest(algorithm, bytes, encoding = 'hex') {
  return createHash(algorithm).update(bytes).digest(encoding);
}

function expectedPackageFile(packageDefinition, version) {
  return `${packageDefinition.fileStem}-${version}.tgz`;
}

function packageDefinition(name) {
  return REQUIRED_PACKAGES.find((candidate) => candidate.name === name);
}

function assertSha512Sri(value, label) {
  if (typeof value !== 'string' || !value.startsWith('sha512-')) {
    fail(`${label} must be a SHA-512 SRI integrity`);
  }
  const encoded = value.slice('sha512-'.length);
  let decoded;
  try {
    decoded = Buffer.from(encoded, 'base64');
  } catch {
    fail(`${label} must be a valid SHA-512 SRI integrity`);
  }
  if (decoded.length !== 64 || decoded.toString('base64') !== encoded) {
    fail(`${label} must be a canonical SHA-512 SRI integrity`);
  }
}

function validatePackageRecord(record, expected, version, index) {
  const label = `candidate packages[${index}]`;
  assertExactKeys(record, ['file', 'integrity', 'name', 'sha256', 'size'], label);
  if (record.name !== expected.name) {
    fail(
      `Candidate package set must be exactly @kimen/elements and @kimen/tokens in canonical order; found ${String(record.name)}`,
    );
  }
  const expectedFile = expectedPackageFile(expected, version);
  if (record.file !== expectedFile) {
    fail(`${label}.file must be ${expectedFile}`);
  }
  if (typeof record.sha256 !== 'string' || !SHA256_PATTERN.test(record.sha256)) {
    fail(`${label}.sha256 must be a lowercase SHA-256 digest`);
  }
  assertSha512Sri(record.integrity, `${label}.integrity`);
  if (!Number.isSafeInteger(record.size) || record.size <= 0) {
    fail(`${label}.size must be a positive safe integer`);
  }
}

export function validateCandidateManifest(manifest) {
  assertExactKeys(
    manifest,
    ['mode', 'packages', 'schemaVersion', 'sourceSha', 'tag', 'version'],
    'candidate manifest',
  );
  if (manifest.schemaVersion !== CANDIDATE_SCHEMA_VERSION) {
    fail(`Candidate schemaVersion must be ${CANDIDATE_SCHEMA_VERSION}`);
  }
  if (manifest.mode !== 'release' && manifest.mode !== 'dry-run') {
    fail('Candidate mode must be release or dry-run');
  }
  if (typeof manifest.sourceSha !== 'string' || !SOURCE_SHA_PATTERN.test(manifest.sourceSha)) {
    fail('Candidate sourceSha must be a lowercase 40-character Git SHA');
  }
  if (typeof manifest.version !== 'string' || !VERSION_PATTERN.test(manifest.version)) {
    fail('Candidate version must be an exact X.Y.Z version');
  }
  if (manifest.mode === 'release' && manifest.tag !== `v${manifest.version}`) {
    fail(`Release tag must match candidate version exactly: expected v${manifest.version}`);
  }
  if (manifest.mode === 'dry-run' && manifest.tag !== null) {
    fail('A dry-run candidate tag must be null');
  }
  if (!Array.isArray(manifest.packages) || manifest.packages.length !== REQUIRED_PACKAGES.length) {
    fail('Candidate exact package set must contain @kimen/elements and @kimen/tokens');
  }
  for (const [index, expected] of REQUIRED_PACKAGES.entries()) {
    validatePackageRecord(manifest.packages[index], expected, manifest.version, index);
  }
  return manifest;
}

function assertSafeTarName(name) {
  if (
    name.length === 0 ||
    isAbsolute(name) ||
    name.includes('\\') ||
    name.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(`Unsafe path in candidate archive: ${name}`);
  }
}

function readTarString(header, offset, length) {
  const field = header.subarray(offset, offset + length);
  const zero = field.indexOf(0);
  return field.subarray(0, zero === -1 ? field.length : zero).toString('utf8');
}

function readTarOctal(header, offset, length, label) {
  const value = readTarString(header, offset, length).trim();
  if (!/^[0-7]+$/.test(value)) {
    fail(`Invalid ${label} in candidate TAR header`);
  }
  const parsed = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(parsed)) {
    fail(`Unsafe ${label} in candidate TAR header`);
  }
  return parsed;
}

function tarChecksum(header) {
  let sum = 0;
  for (let index = 0; index < header.length; index += 1) {
    sum += index >= 148 && index < 156 ? 32 : header[index];
  }
  return sum;
}

function parseTar(bytes, { requireCanonical = false } = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length < TAR_BLOCK_SIZE * 2 || bytes.length % 512 !== 0) {
    fail('Candidate TAR is truncated or not block aligned');
  }

  const entries = [];
  const names = new Set();
  let offset = 0;
  let terminated = false;
  while (offset < bytes.length) {
    const header = bytes.subarray(offset, offset + TAR_BLOCK_SIZE);
    if (header.every((byte) => byte === 0)) {
      const trailing = bytes.subarray(offset);
      if (trailing.length < TAR_BLOCK_SIZE * 2 || !trailing.every((byte) => byte === 0)) {
        fail('Candidate TAR has an invalid end marker');
      }
      if (requireCanonical && trailing.length !== TAR_BLOCK_SIZE * 2) {
        fail('Candidate TAR has non-canonical trailing blocks');
      }
      terminated = true;
      break;
    }

    const storedChecksum = readTarOctal(header, 148, 8, 'checksum');
    if (storedChecksum !== tarChecksum(header)) {
      fail('Candidate TAR header checksum mismatch');
    }
    const prefix = readTarString(header, 345, 155);
    const shortName = readTarString(header, 0, 100);
    const name = prefix === '' ? shortName : `${prefix}/${shortName}`;
    assertSafeTarName(name);
    if (names.has(name)) {
      fail(`Duplicate path in candidate archive: ${name}`);
    }
    names.add(name);

    const size = readTarOctal(header, 124, 12, 'size');
    const type = readTarString(header, 156, 1) || '0';
    const contentStart = offset + TAR_BLOCK_SIZE;
    const contentEnd = contentStart + size;
    if (contentEnd > bytes.length) {
      fail(`Candidate TAR entry is truncated: ${name}`);
    }
    if (requireCanonical && !header.equals(canonicalTarHeader(name, size))) {
      fail(`Candidate TAR metadata is not canonical for ${name}`);
    }
    entries.push({ name, type, bytes: Buffer.from(bytes.subarray(contentStart, contentEnd)) });
    const alignedEnd = contentStart + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
    if (requireCanonical && !bytes.subarray(contentEnd, alignedEnd).every((byte) => byte === 0)) {
      fail(`Candidate TAR padding is not canonical for ${name}`);
    }
    offset = alignedEnd;
  }
  if (!terminated) {
    fail('Candidate TAR is missing its end marker');
  }
  return entries;
}

function writeTarString(header, offset, length, value, label) {
  if (Buffer.byteLength(value, 'utf8') > length) {
    fail(`${label} is too long for canonical USTAR`);
  }
  header.write(value, offset, length, 'utf8');
}

function writeTarOctal(header, offset, length, value, label) {
  const encoded = value.toString(8);
  if (encoded.length > length - 1) {
    fail(`${label} is too large for canonical USTAR`);
  }
  writeTarString(header, offset, length, `${encoded.padStart(length - 1, '0')}\0`, label);
}

function canonicalTarHeader(name, size) {
  assertSafeTarName(name);
  const header = Buffer.alloc(TAR_BLOCK_SIZE);
  writeTarString(header, 0, 100, name, 'TAR entry name');
  writeTarOctal(header, 100, 8, 0o644, 'TAR mode');
  writeTarOctal(header, 108, 8, 0, 'TAR uid');
  writeTarOctal(header, 116, 8, 0, 'TAR gid');
  writeTarOctal(header, 124, 12, size, 'TAR size');
  writeTarOctal(header, 136, 12, 0, 'TAR mtime');
  header.fill(32, 148, 156);
  writeTarString(header, 156, 1, '0', 'TAR type');
  writeTarString(header, 257, 6, 'ustar\0', 'TAR magic');
  writeTarString(header, 263, 2, '00', 'TAR version');
  writeTarString(header, 265, 32, 'root', 'TAR owner');
  writeTarString(header, 297, 32, 'root', 'TAR group');
  const checksum = tarChecksum(header).toString(8).padStart(6, '0');
  writeTarString(header, 148, 8, `${checksum}\0 `, 'TAR checksum');
  return header;
}

function canonicalTar(entries) {
  const blocks = [];
  for (const { name, bytes } of entries) {
    const header = canonicalTarHeader(name, bytes.length);
    blocks.push(header, bytes);
    const padding = (TAR_BLOCK_SIZE - (bytes.length % TAR_BLOCK_SIZE)) % TAR_BLOCK_SIZE;
    if (padding > 0) {
      blocks.push(Buffer.alloc(padding));
    }
  }
  blocks.push(Buffer.alloc(TAR_BLOCK_SIZE * 2));
  return Buffer.concat(blocks);
}

function forbiddenLifecycleScripts(manifest) {
  if (manifest.scripts === undefined) {
    return [];
  }
  assertPlainObject(manifest.scripts, `${manifest.name} scripts`);
  return Object.keys(manifest.scripts).filter((name) => FORBIDDEN_LIFECYCLE_SCRIPTS.has(name));
}

function validateRepositoryMetadata(manifest, expected) {
  const repository = manifest.repository;
  assertExactKeys(repository, ['directory', 'type', 'url'], `${manifest.name} repository metadata`);
  if (
    repository.type !== 'git' ||
    repository.url !== REPOSITORY_URL ||
    repository.directory !== `packages/${expected.directory}`
  ) {
    fail(
      `${manifest.name} repository metadata must identify ${REPOSITORY_URL} packages/${expected.directory}`,
    );
  }
}

function validateSourcePackageManifest(manifest, expected, { mode, version }) {
  assertPlainObject(manifest, `${expected.name} package manifest`);
  if (manifest.name !== expected.name) {
    fail(
      `Candidate package set must be exactly @kimen/elements and @kimen/tokens; found ${String(manifest.name)}`,
    );
  }
  if (manifest.version !== version) {
    fail(`${expected.name} version ${String(manifest.version)} does not match ${version}`);
  }
  if (mode === 'release' && manifest.private !== false) {
    fail(`Private release package ${expected.name} is forbidden; private must be false`);
  }
  validateRepositoryMetadata(manifest, expected);
  const lifecycle = forbiddenLifecycleScripts(manifest);
  if (lifecycle.length > 0) {
    fail(`${expected.name} contains forbidden publish lifecycle scripts: ${lifecycle.join(', ')}`);
  }
}

async function runGit(repositoryRoot, arguments_, { allowFailure = false } = {}) {
  try {
    const result = await execFileAsync('git', arguments_, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { LC_ALL: 'C', PATH: process.env.PATH },
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, stdout: result.stdout.trim() };
  } catch (error) {
    if (allowFailure) {
      return { ok: false, stdout: '' };
    }
    fail(
      `Git ${arguments_[0]} failed while validating release candidate: ${error.stderr?.trim() || error.message}`,
    );
  }
}

async function validateGitBinding({ mode, protectedMainRef, repositoryRoot, sourceSha, tag }) {
  const resolvedSource = await runGit(repositoryRoot, [
    'rev-parse',
    '--verify',
    `${sourceSha}^{commit}`,
  ]);
  if (resolvedSource.stdout !== sourceSha) {
    fail('Candidate sourceSha does not resolve to the exact repository commit');
  }
  if (mode === 'dry-run') {
    return;
  }
  if (protectedMainRef !== 'refs/heads/main') {
    fail('Release protected main ref must be refs/heads/main');
  }
  const reachable = await runGit(
    repositoryRoot,
    ['merge-base', '--is-ancestor', sourceSha, protectedMainRef],
    { allowFailure: true },
  );
  if (!reachable.ok) {
    fail(`Release source SHA must be reachable from protected main ref ${protectedMainRef}`);
  }
  const resolvedTag = await runGit(repositoryRoot, [
    'rev-parse',
    '--verify',
    `refs/tags/${tag}^{commit}`,
  ]);
  if (resolvedTag.stdout !== sourceSha) {
    fail(`Release tag ${tag} must point to source SHA ${sourceSha}`);
  }
}

async function validatePackageDirectory(repositoryRoot, directory, expected) {
  const [rootPath, packagePath] = await Promise.all([
    realpath(repositoryRoot),
    realpath(directory),
  ]);
  const expectedPath = join(rootPath, 'packages', expected.directory);
  if (packagePath !== expectedPath || relative(rootPath, packagePath).startsWith('..')) {
    fail(`${expected.name} package directory must be ${expectedPath}`);
  }
  return packagePath;
}

async function packPackage({ directory, destination, isolatedHome, expectedFile }) {
  const npmrc = join(isolatedHome, '.npmrc');
  const cache = join(isolatedHome, '.npm-cache');
  await Promise.all([
    mkdir(cache, { recursive: true, mode: 0o700 }),
    writeFile(npmrc, '', { encoding: 'utf8', mode: 0o600, flag: 'wx' }),
  ]);
  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', destination],
      {
        cwd: directory,
        encoding: 'utf8',
        env: {
          HOME: isolatedHome,
          LC_ALL: 'C',
          PATH: process.env.PATH,
          npm_config_cache: cache,
          npm_config_ignore_scripts: 'true',
          npm_config_offline: 'true',
          npm_config_audit: 'false',
          npm_config_fund: 'false',
          npm_config_update_notifier: 'false',
          npm_config_userconfig: npmrc,
        },
        maxBuffer: 16 * 1024 * 1024,
      },
    ));
  } catch (error) {
    fail(`npm pack failed for ${directory}: ${error.stderr?.trim() || error.message}`);
  }
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    fail(`npm pack returned invalid JSON for ${directory}`);
  }
  if (!Array.isArray(report) || report.length !== 1 || report[0]?.filename !== expectedFile) {
    fail(`npm pack produced an unexpected tarball for ${directory}; expected ${expectedFile}`);
  }
  return join(destination, expectedFile);
}

function packageRecordFromBytes(expected, version, bytes) {
  return {
    name: expected.name,
    file: expectedPackageFile(expected, version),
    sha256: digest('sha256', bytes),
    integrity: `sha512-${digest('sha512', bytes, 'base64')}`,
    size: bytes.length,
  };
}

function checksumDocument(files) {
  return `${[...files.entries()]
    .sort(([left], [right]) => lexicalCompare(left, right))
    .map(([name, bytes]) => `${digest('sha256', bytes)}  ${name}`)
    .join('\n')}\n`;
}

export async function buildCandidate(options) {
  const {
    mode,
    repositoryRoot,
    outputDirectory,
    sourceSha,
    tag,
    protectedMainRef = 'refs/heads/main',
    packageDirectories,
  } = assertPlainObject(options, 'buildCandidate options');

  if (mode !== 'release' && mode !== 'dry-run') {
    fail('Candidate mode must be release or dry-run');
  }
  if (typeof sourceSha !== 'string' || !SOURCE_SHA_PATTERN.test(sourceSha)) {
    fail('Candidate sourceSha must be a lowercase 40-character Git SHA');
  }
  if (mode === 'release' && (typeof tag !== 'string' || tag.length === 0)) {
    fail('Release mode requires a tag');
  }
  if (mode === 'dry-run' && tag !== null) {
    fail('A dry-run candidate tag must be null');
  }
  if (
    !Array.isArray(packageDirectories) ||
    packageDirectories.length !== REQUIRED_PACKAGES.length
  ) {
    fail('Candidate package set must be exactly @kimen/elements and @kimen/tokens');
  }

  const packageInputs = [];
  for (const directory of packageDirectories) {
    const manifestPath = join(directory, 'package.json');
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
      fail(`Cannot read candidate package manifest ${manifestPath}: ${error.message}`);
    }
    const expected = packageDefinition(manifest.name);
    if (expected === undefined || packageInputs.some((input) => input.expected === expected)) {
      fail(
        `Candidate package set must be exactly @kimen/elements and @kimen/tokens; unexpected or duplicate ${String(manifest.name)}`,
      );
    }
    const validatedDirectory = await validatePackageDirectory(repositoryRoot, directory, expected);
    packageInputs.push({ directory: validatedDirectory, expected, manifest });
  }
  packageInputs.sort(
    (left, right) =>
      REQUIRED_PACKAGES.indexOf(left.expected) - REQUIRED_PACKAGES.indexOf(right.expected),
  );

  const versions = new Set(packageInputs.map(({ manifest }) => manifest.version));
  if (versions.size !== 1) {
    fail('Candidate package versions must match exactly');
  }
  const [version] = versions;
  if (typeof version !== 'string' || !VERSION_PATTERN.test(version)) {
    fail('Candidate package version must be an exact X.Y.Z version');
  }
  if (mode === 'release' && tag !== `v${version}`) {
    fail(`Release tag ${tag} does not match package version ${version}`);
  }
  for (const input of packageInputs) {
    validateSourcePackageManifest(input.manifest, input.expected, { mode, version });
  }
  await validateGitBinding({ mode, protectedMainRef, repositoryRoot, sourceSha, tag });

  await mkdir(outputDirectory, { recursive: true });
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'kimen-release-candidate-'));
  const staging = join(temporaryRoot, 'candidate');
  await mkdir(staging, { recursive: true });
  try {
    const records = [];
    const packageFiles = new Map();
    for (const input of packageInputs) {
      const expectedFile = expectedPackageFile(input.expected, version);
      const isolatedHome = join(temporaryRoot, `home-${input.expected.directory}`);
      await mkdir(isolatedHome, { recursive: true, mode: 0o700 });
      const packedPath = await packPackage({
        directory: input.directory,
        destination: staging,
        isolatedHome,
        expectedFile,
      });
      const bytes = await readFile(packedPath);
      packageFiles.set(expectedFile, bytes);
      records.push(packageRecordFromBytes(input.expected, version, bytes));
    }

    const manifest = validateCandidateManifest({
      schemaVersion: CANDIDATE_SCHEMA_VERSION,
      mode,
      sourceSha,
      tag,
      version,
      packages: records,
    });
    const manifestBytes = Buffer.from(canonicalJson(manifest), 'utf8');
    const sumInputs = new Map([[MANIFEST_FILE, manifestBytes], ...packageFiles.entries()]);
    const checksumBytes = Buffer.from(checksumDocument(sumInputs), 'utf8');
    const archiveEntries = new Map([
      [CHECKSUM_FILE, checksumBytes],
      ...packageFiles.entries(),
      [MANIFEST_FILE, manifestBytes],
    ]);
    const archiveBytes = canonicalTar(
      [...archiveEntries.entries()]
        .sort(([left], [right]) => lexicalCompare(left, right))
        .map(([name, bytes]) => ({ name, bytes })),
    );
    const temporaryArchive = join(temporaryRoot, CANDIDATE_FILE);
    const archivePath = join(resolve(outputDirectory), CANDIDATE_FILE);
    await writeFile(temporaryArchive, archiveBytes, { flag: 'wx', mode: 0o600 });
    try {
      await link(temporaryArchive, archivePath);
    } catch (error) {
      if (error.code !== 'EXDEV') {
        throw error;
      }
      await copyFile(temporaryArchive, archivePath, filesystemConstants.COPYFILE_EXCL);
    }
    await rm(temporaryArchive, { force: true });
    return {
      archivePath,
      candidateSha256: digest('sha256', archiveBytes),
      manifest,
    };
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

function entryMap(entries, label) {
  const files = new Map();
  for (const entry of entries) {
    if (entry.type !== '0') {
      fail(`${label} contains non-file entry ${entry.name}`);
    }
    files.set(entry.name, entry.bytes);
  }
  return files;
}

function verifyPackedManifest(bytes, expected, candidateManifest) {
  let packageTar;
  try {
    packageTar = gunzipSync(bytes);
  } catch {
    fail(`${expected.name} tarball is not valid gzip data`);
  }
  const entries = parseTar(packageTar);
  const packageJson = entries.find(
    (entry) => entry.name === 'package/package.json' && entry.type === '0',
  );
  if (packageJson === undefined) {
    fail(`${expected.name} tarball is missing package/package.json`);
  }
  let manifest;
  try {
    manifest = JSON.parse(packageJson.bytes.toString('utf8'));
  } catch {
    fail(`${expected.name} tarball has invalid package.json`);
  }
  validateSourcePackageManifest(manifest, expected, {
    mode: candidateManifest.mode,
    version: candidateManifest.version,
  });
}

export async function verifyCandidate({ archivePath, expectedSha256, environment = {} }) {
  if (typeof expectedSha256 !== 'string' || !SHA256_PATTERN.test(expectedSha256)) {
    fail('Expected candidate SHA-256 must be a lowercase 64-character digest');
  }
  if (
    environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN ||
    environment.ACTIONS_ID_TOKEN_REQUEST_URL ||
    environment.AWS_WEB_IDENTITY_TOKEN_FILE
  ) {
    fail('Independent verification must run with no OIDC identity authority');
  }
  const archiveBytes = await readFile(archivePath);
  const candidateSha256 = digest('sha256', archiveBytes);
  if (candidateSha256 !== expectedSha256) {
    fail('Candidate SHA-256 digest mismatch; immutable artifact bytes changed');
  }

  const entries = parseTar(archiveBytes, { requireCanonical: true });
  const files = entryMap(entries, 'candidate archive');
  const manifestBytes = files.get(MANIFEST_FILE);
  if (manifestBytes === undefined) {
    fail('Candidate archive is missing manifest.json');
  }
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    fail('Candidate manifest is not valid JSON');
  }
  validateCandidateManifest(manifest);
  if (!manifestBytes.equals(Buffer.from(canonicalJson(manifest), 'utf8'))) {
    fail('Candidate manifest JSON is not canonical');
  }
  const expectedNames = [
    CHECKSUM_FILE,
    ...manifest.packages.map(({ file }) => file),
    MANIFEST_FILE,
  ].sort((left, right) => lexicalCompare(left, right));
  if (
    entries.length !== expectedNames.length ||
    entries.some(({ name }, index) => name !== expectedNames[index])
  ) {
    fail('Candidate archive has an unexpected file or package-set drift');
  }

  const sumInputs = new Map([[MANIFEST_FILE, manifestBytes]]);
  for (const [index, record] of manifest.packages.entries()) {
    const bytes = files.get(record.file);
    if (bytes === undefined) {
      fail(`Candidate archive is missing ${record.file}`);
    }
    if (
      digest('sha256', bytes) !== record.sha256 ||
      `sha512-${digest('sha512', bytes, 'base64')}` !== record.integrity ||
      bytes.length !== record.size
    ) {
      fail(`${record.name} tarball digest, integrity or size mismatch`);
    }
    verifyPackedManifest(bytes, REQUIRED_PACKAGES[index], manifest);
    sumInputs.set(record.file, bytes);
  }
  const checksums = files.get(CHECKSUM_FILE);
  if (
    checksums === undefined ||
    !checksums.equals(Buffer.from(checksumDocument(sumInputs), 'utf8'))
  ) {
    fail('Candidate SHA256SUMS does not match manifest and package bytes');
  }
  return { candidateSha256, manifest };
}

function validateEvidence(
  evidence,
  label,
  { artifactId, candidateSha256, mustHaveNoOidc = false },
) {
  assertPlainObject(evidence, label);
  if (evidence.status !== 'success') {
    fail(`${label} must record success`);
  }
  if (evidence.artifactId !== artifactId) {
    fail(`${label} must reference the same artifact ID ${artifactId}`);
  }
  if (evidence.candidateSha256 !== candidateSha256) {
    fail(`${label} must reference the same candidate digest; rebuilt bytes are forbidden`);
  }
  if (mustHaveNoOidc && evidence.oidc !== false) {
    fail('Verification evidence must prove no OIDC identity authority was present');
  }
}

function npmSupportsTrustedPublishing(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (match === null) {
    return false;
  }
  const numbers = match.slice(1).map(Number);
  return (
    numbers[0] > 11 ||
    (numbers[0] === 11 && (numbers[1] > 5 || (numbers[1] === 5 && numbers[2] >= 1)))
  );
}

function hasLongLivedNpmCredential(environment) {
  return Object.entries(assertPlainObject(environment, 'publication environment')).some(
    ([name, value]) =>
      value !== undefined &&
      value !== '' &&
      (/^(?:NODE_AUTH_TOKEN|NPM_TOKEN)$/i.test(name) ||
        /(?:_authToken|npm_config__auth)$/i.test(name)),
  );
}

function hasOidcAuthority(environment) {
  return Boolean(
    environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN ||
      environment.ACTIONS_ID_TOKEN_REQUEST_URL ||
      environment.AWS_WEB_IDENTITY_TOKEN_FILE,
  );
}

export async function evaluatePublication(input) {
  assertPlainObject(input, 'publication input');
  const candidate = assertPlainObject(input.candidate, 'candidate evidence');
  const manifest = validateCandidateManifest(candidate.manifest);
  if (
    typeof candidate.candidateSha256 !== 'string' ||
    !SHA256_PATTERN.test(candidate.candidateSha256)
  ) {
    fail('Candidate evidence must contain a SHA-256 digest');
  }
  if (!Number.isSafeInteger(input.artifactId) || input.artifactId <= 0) {
    fail('Publication artifact ID must be a positive integer');
  }
  validateEvidence(input.verificationEvidence, 'Verification evidence', {
    artifactId: input.artifactId,
    candidateSha256: candidate.candidateSha256,
    mustHaveNoOidc: true,
  });
  const browserEvidence = assertPlainObject(input.browserEvidence, 'browser evidence');
  const engines = ['chromium', 'firefox', 'webkit'];
  if (
    Object.keys(browserEvidence).length !== engines.length ||
    engines.some((engine) => !Object.hasOwn(browserEvidence, engine))
  ) {
    fail('Browser evidence must contain exactly chromium, firefox and webkit');
  }
  for (const engine of engines) {
    validateEvidence(browserEvidence[engine], `${engine} browser evidence`, {
      artifactId: input.artifactId,
      candidateSha256: candidate.candidateSha256,
    });
  }

  const authority = assertPlainObject(input.authority, 'publication authority');
  if (manifest.mode === 'dry-run') {
    if (authority.kind !== 'none' || hasOidcAuthority(input.environment ?? {})) {
      fail('A dry-run is validation-only and must not receive OIDC authority');
    }
    return { status: 'validation-only', actions: [] };
  }
  if (
    authority.kind !== 'oidc' ||
    authority.workflow !== RELEASE_WORKFLOW ||
    authority.environment !== RELEASE_ENVIRONMENT
  ) {
    fail('Release OIDC authority must be scoped to the exact release workflow and npm environment');
  }
  if (hasLongLivedNpmCredential(input.environment ?? {})) {
    fail('Long-lived npm credentials such as NPM_TOKEN are forbidden');
  }
  if (typeof input.npmVersion !== 'string' || !npmSupportsTrustedPublishing(input.npmVersion)) {
    fail(
      `npm ${String(input.npmVersion)} is unsupported; trusted publication requires npm >=11.5.1`,
    );
  }

  const registry = assertPlainObject(input.registry, 'registry state');
  const trustedPublishers = assertPlainObject(
    input.trustedPublishers,
    'trusted publisher configuration',
  );
  const actions = [];
  for (const record of manifest.packages) {
    const packageRegistry = registry[record.name];
    if (packageRegistry?.exists !== true) {
      fail(
        `First publication for ${record.name} is ineligible: package does not exist and token bootstrap is forbidden`,
      );
    }
    const trustedPublisher = trustedPublishers[record.name];
    if (
      trustedPublisher?.configured !== true ||
      trustedPublisher.workflow !== RELEASE_WORKFLOW ||
      trustedPublisher.environment !== RELEASE_ENVIRONMENT
    ) {
      fail(`Trusted publisher configuration for ${record.name} is missing or incorrectly scoped`);
    }
    const versions = assertPlainObject(
      packageRegistry.versions,
      `${record.name} registry versions`,
    );
    const published = versions[manifest.version];
    if (published === undefined) {
      actions.push({
        name: record.name,
        action: 'publish',
        file: record.file,
        integrity: record.integrity,
      });
      continue;
    }
    if (published?.integrity !== record.integrity) {
      fail(`Registry integrity conflict for ${record.name}@${manifest.version}; security failure`);
    }
    actions.push({
      name: record.name,
      action: 'skip',
      file: record.file,
      integrity: record.integrity,
    });
  }
  return { status: 'eligible', actions };
}
