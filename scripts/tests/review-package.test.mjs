import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  stat,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';
import { deflateSync } from 'node:zlib';

import { createFixtureRepo } from './helpers/fixture-repo.mjs';

// @spec:018-project-integrity-hardening#S2

const localGreenFence = 'LOCAL GATES GREEN — protected main still requires ci / containment';

const delegatedGreenFence =
  'GATES JOB GREEN — mutation delegated; Definition of Done requires ci / mutation and ci / containment';

const fixtureUiPath = 'packages/elements/src/components/ki-fixture/ki-fixture.css';

const capabilityFixturePaths = [
  '.gitignore',
  'README.md',
  'docs/capabilities.json',
  'docs/roadmap.md',
  'packages/catalog/README.md',
  'packages/catalog/package.json',
  'packages/elements/docs/introduction.mdx',
  'packages/kimen/README.md',
  'packages/kimen/package.json',
  'scripts/gates/check-capabilities.mjs',
  'scripts/gates/gates-core.sh',
  'scripts/gates/gates-suite.sh',
  'scripts/lib/capability-claims.mjs',
  'site/index.html',
];

async function createReviewFixture({
  candidateContents = 'after\n',
  candidatePath = 'subject.txt',
} = {}) {
  const fixture = await createFixtureRepo({
    files: {
      'specs/999-fixture/spec.md': [
        '# Fixture spec',
        '',
        '## Constitutional Surface',
        '',
        '- Art. II',
        '',
      ].join('\n'),
      'subject.txt': 'before\n',
    },
  });
  await fixture.copyFromRepo('.claude/skills/requesting-code-review/scripts/review-package.sh');
  await fixture.copyFromRepo('scripts/lib/publish-review-packet.mjs');
  await fixture.copyFromRepo('scripts/lib/review-package-io.mjs');
  await fixture.copyFromRepo('scripts/lib/review-rendered-evidence.mjs');
  await Promise.all(capabilityFixturePaths.map((path) => fixture.copyFromRepo(path)));
  await fixture.run('git', ['config', 'user.name', 'Kimen test']);
  await fixture.run('git', ['config', 'user.email', 'test@local.invalid']);
  await fixture.run('git', ['add', '-A']);
  await fixture.run('git', ['commit', '--quiet', '-m', 'test: fixture base']);
  await fixture.write(candidatePath, candidateContents);
  await fixture.run('git', ['add', candidatePath]);
  await fixture.run('git', ['commit', '--quiet', '-m', 'test: fixture candidate']);
  return fixture;
}

function evidenceSurfaceForPath(path) {
  const componentMatch = /^packages\/elements\/src\/components\/([^/]+)\//u.exec(path);
  if (componentMatch) return `component:${componentMatch[1]}`;
  if (/^packages\/elements\/stencil\.config\.[^/]+$/u.test(path)) return 'elements-config';
  if (path.startsWith('packages/tokens/')) return 'tokens';
  if (
    path.startsWith('tools/kimen-plugin/src/generators/component/files/') ||
    path.startsWith('tools/kimen-plugin/src/generators/component/files-token/') ||
    path === 'tools/kimen-plugin/src/generators/component/generator.js'
  ) {
    return 'component-generator';
  }
  if (path.startsWith('site/')) return 'site';
  return `path:${path}`;
}

function requiredEvidenceStates(surfaceId) {
  if (surfaceId === 'component:ki-progress') {
    return [
      'circular-labeled-value-73-of-100',
      'circular-labeled-value-73-of-100-dark',
      'circular-labeled-value-73-of-100-rtl',
    ];
  }
  if (
    surfaceId.startsWith('component:') ||
    surfaceId === 'component-generator' ||
    surfaceId === 'elements-config'
  ) {
    return ['default', 'dark', 'rtl'];
  }
  if (surfaceId === 'tokens') return ['light', 'dark'];
  if (surfaceId === 'site') return ['wide', 'narrow'];
  return ['default'];
}

function aPngMagicTailShell() {
  const bytes = Buffer.alloc(45);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes, 0);
  Buffer.from('0000000049454e44ae426082', 'hex').copy(bytes, bytes.length - 12);
  return bytes;
}

function testCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(testCrc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function aPngWithLayout({
  bitDepth = 16,
  colorType = 6,
  decodedBytes = Buffer.alloc(0),
  height,
  palette,
  width,
}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = bitDepth;
  header[9] = colorType;
  const chunks = [pngChunk('IHDR', header)];
  if (palette) chunks.push(pngChunk('PLTE', palette));
  chunks.push(pngChunk('IDAT', deflateSync(decodedBytes)), pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), ...chunks]);
}

function aPngPixel(red, green, blue, alpha = 255) {
  return aPngWithLayout({
    bitDepth: 8,
    colorType: 6,
    decodedBytes: Buffer.from([0, red, green, blue, alpha]),
    height: 1,
    width: 1,
  });
}

function aPngWithOversizedDecodedLayout() {
  return aPngWithLayout({ height: 10_000, width: 10_000 });
}

async function createRenderedEvidence(
  fixture,
  {
    baseRef = 'HEAD~1',
    directoryPath,
    directoryName = 'rendered-evidence',
    hashOverride,
    headRef = 'HEAD',
    imagePath = 'ki-fixture-default.png',
    manifestImagePath = imagePath,
    screenshotOverride,
    uiPaths = [fixtureUiPath],
    writeManifest = true,
  } = {},
) {
  const evidenceDirectory = directoryPath ?? join(fixture.root, 'reports', directoryName);
  const screenshotPath = join(evidenceDirectory, imagePath);
  await mkdir(evidenceDirectory, { recursive: true });
  const screenshot = screenshotOverride ?? aPngPixel(0, 0, 0);
  await writeFile(screenshotPath, screenshot);
  if (writeManifest) {
    const baseSha = (await fixture.run('git', ['rev-parse', `${baseRef}^{commit}`])).stdout.trim();
    const headSha = (await fixture.run('git', ['rev-parse', `${headRef}^{commit}`])).stdout.trim();
    const groupedPaths = new Map();
    for (const path of uiPaths) {
      const surface = evidenceSurfaceForPath(path);
      groupedPaths.set(surface, [...(groupedPaths.get(surface) ?? []), path]);
    }
    const surfaces = [];
    let uniqueStateOrdinal = 0;
    for (const [id, paths] of groupedPaths) {
      const states = [];
      for (const [stateIndex, name] of requiredEvidenceStates(id).entries()) {
        const stateImagePath =
          stateIndex === 0
            ? manifestImagePath
            : `${id.replaceAll(/[^a-z0-9]+/giu, '-')}-${name}.png`;
        let stateBytes = screenshot;
        if (stateIndex > 0 && !screenshotOverride) {
          uniqueStateOrdinal += 1;
          stateBytes = aPngPixel(
            uniqueStateOrdinal & 0xff,
            (uniqueStateOrdinal >>> 8) & 0xff,
            (uniqueStateOrdinal >>> 16) & 0xff,
          );
        }
        if (stateIndex > 0) await writeFile(join(evidenceDirectory, stateImagePath), stateBytes);
        states.push({
          image: stateImagePath,
          name,
          sha256: hashOverride ?? createHash('sha256').update(stateBytes).digest('hex'),
        });
      }
      surfaces.push({ id, paths, states });
    }
    await writeFile(
      join(evidenceDirectory, 'review-evidence.json'),
      `${JSON.stringify({ baseSha, headSha, schemaVersion: 1, surfaces }, null, 2)}\n`,
      'utf8',
    );
  }
  return { evidenceDirectory, screenshotPath };
}

async function assertPacketWasRemoved(packetPath) {
  await assert.rejects(stat(packetPath), { code: 'ENOENT' });
}

async function readEvidenceManifest(evidenceDirectory) {
  return JSON.parse(await readFile(join(evidenceDirectory, 'review-evidence.json'), 'utf8'));
}

async function readPacketManifest(packetDirectory) {
  const bytes = await readFile(join(packetDirectory, 'packet-manifest.json'));
  const manifest = JSON.parse(bytes.toString('utf8'));
  return {
    bytes,
    digest: createHash('sha256').update(bytes).digest('hex'),
    manifest,
  };
}

async function packetContentInventory(packetDirectory) {
  const paths = [];
  async function visit(relativeDirectory = '') {
    const directory = relativeDirectory
      ? join(packetDirectory, relativeDirectory)
      : packetDirectory;
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await visit(relativePath);
        } else if (entry.isFile() && relativePath !== 'packet-manifest.json') {
          paths.push(relativePath);
        }
      }),
    );
  }
  await visit();
  return Promise.all(
    paths.sort().map(async (relativePath) => {
      const bytes = await readFile(join(packetDirectory, ...relativePath.split('/')));
      return {
        path: relativePath,
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    }),
  );
}

async function writeEvidenceManifest(evidenceDirectory, manifest) {
  await writeFile(
    join(evidenceDirectory, 'review-evidence.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

async function writeRawEvidenceManifest(fixture, evidenceDirectory, surfaces) {
  const baseSha = (await fixture.run('git', ['rev-parse', 'HEAD~1^{commit}'])).stdout.trim();
  const headSha = (await fixture.run('git', ['rev-parse', 'HEAD^{commit}'])).stdout.trim();
  await writeEvidenceManifest(evidenceDirectory, {
    baseSha,
    headSha,
    schemaVersion: 1,
    surfaces,
  });
}

async function installPublicationInjector(
  fixture,
  { entryPath = '', mode, outsideDirectory = '', packetDirectory },
) {
  const wrapperDirectory = join(fixture.root, 'reports/publish-injector-bin');
  const barrierDirectory = join(fixture.root, 'reports/publish-barrier');
  const physicalPacketDirectory = join(
    await realpath(dirname(packetDirectory)),
    basename(packetDirectory),
  );
  const realNode = (await fixture.run('sh', ['-c', 'command -v node'])).stdout.trim();
  await mkdir(barrierDirectory, { recursive: true });
  await fixture.write(
    'reports/publish-injector.mjs',
    [
      "import { appendFileSync, existsSync, mkdirSync, renameSync, symlinkSync, writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      '',
      'const [barrierDirectory, destination, mode, outsidePath, entryPath, sourceRoot] = process.argv.slice(2);',
      "const phase = mode === 'pre-open-swap' ? 'after-mkdir-before-open' : mode === 'swap' ? 'after-reserve' : mode === 'descendant-symlink' ? 'before-entry-create' : mode === 'file-finalize-symlink' ? 'after-file-create-before-finalize' : mode === 'source-grow' ? 'before-source-file-open' : 'before-inventory';",
      'const readyPath = join(barrierDirectory, `${phase}.ready`);',
      'const deadline = Date.now() + 10_000;',
      'while (!existsSync(readyPath)) {',
      "  if (Date.now() > deadline) throw new Error('publisher barrier timed out');",
      '  await new Promise((resolve) => setTimeout(resolve, 10));',
      '}',
      "if (mode === 'swap' || mode === 'pre-open-swap') {",
      '  renameSync(destination, `${destination}.original`);',
      '  mkdirSync(destination);',
      "  writeFileSync(join(destination, 'racer-owned.txt'), 'preserve me\\n');",
      "} else if (mode === 'descendant-symlink') {",
      "  const descendant = join(destination, 'evidence');",
      '  renameSync(descendant, `${descendant}.original`);',
      "  symlinkSync(outsidePath, descendant, 'dir');",
      "} else if (mode === 'file-finalize-symlink') {",
      "  const createdFile = join(destination, ...entryPath.split('/'));",
      '  renameSync(createdFile, `${createdFile}.original`);',
      "  symlinkSync(outsidePath, createdFile, 'file');",
      "} else if (mode === 'source-grow') {",
      "  appendFileSync(join(sourceRoot, ...entryPath.split('/')), 'grew after inventory\\n');",
      '} else {',
      "  writeFileSync(join(destination, 'unexpected.txt'), 'foreign extra\\n');",
      '}',
      "writeFileSync(join(barrierDirectory, `${phase}.continue`), 'continue\\n');",
      '',
    ].join('\n'),
  );
  await fixture.write(
    'reports/publish-injector-bin/node',
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [ "${1:-}" = "scripts/lib/publish-review-packet.mjs" ]; then',
      '  destination_parent="$(cd "$(dirname "${3:-}")" 2>/dev/null && pwd -P || true)"',
      '  destination_physical="${destination_parent%/}/${3##*/}"',
      '  if [ "$destination_physical" = "$RACING_PACKET_DIR" ]; then',
      '    "$REAL_NODE" "$PUBLISH_INJECTOR" "$PUBLISH_BARRIER_DIR" "$RACING_PACKET_DIR" "$PUBLISH_INJECT_MODE" "$PUBLISH_OUTSIDE_DIR" "$PUBLISH_ENTRY_PATH" "${2:-}" &',
      '  fi',
      'fi',
      'exec "$REAL_NODE" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', ['700', 'reports/publish-injector-bin/node']);
  return {
    barrierDirectory,
    processEnvironment: {
      KIMEN_REVIEW_PACKET_TEST_BARRIER_DIR: barrierDirectory,
      KIMEN_REVIEW_PACKET_TEST_BARRIER_PHASE:
        mode === 'pre-open-swap'
          ? 'after-mkdir-before-open'
          : mode === 'swap'
            ? 'after-reserve'
            : mode === 'descendant-symlink'
              ? 'before-entry-create'
              : mode === 'file-finalize-symlink'
                ? 'after-file-create-before-finalize'
                : mode === 'source-grow'
                  ? 'before-source-file-open'
                  : 'before-inventory',
      KIMEN_REVIEW_PACKET_TEST_ENTRY_PATH: entryPath,
      KIMEN_REVIEW_PACKET_TEST_MODE: '1',
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      PUBLISH_BARRIER_DIR: barrierDirectory,
      PUBLISH_ENTRY_PATH: entryPath,
      PUBLISH_INJECT_MODE: mode,
      PUBLISH_INJECTOR: join(fixture.root, 'reports/publish-injector.mjs'),
      PUBLISH_OUTSIDE_DIR: outsideDirectory,
      RACING_PACKET_DIR: physicalPacketDirectory,
      REAL_NODE: realNode,
    },
  };
}

async function writeCurrentRunEvidence(fixture) {
  const evidenceDirectory = join(fixture.root, 'reports/cache/gate-evidence');
  const gateEvidencePath = join(evidenceDirectory, 'current-run.tsv');
  const capabilityEvidencePath = join(evidenceDirectory, 'capabilities-current-run.json');
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    gateEvidencePath,
    ['core\tbuild\tgreen', 'core\tpack-consumer\tgreen', 'browser\ttest-browser\tgreen', ''].join(
      '\n',
    ),
    'utf8',
  );
  const result = await fixture.run('node', [
    'scripts/gates/check-capabilities.mjs',
    '--write-evidence',
    capabilityEvidencePath,
    '--gate-evidence',
    gateEvidencePath,
  ]);
  assert.equal(result.code, 0, result.stderr || result.stdout);
  return { capabilityEvidencePath, gateEvidencePath };
}

function gatesLog(greenFence, evidencePath, trailingOutput = '') {
  return [greenFence, `CURRENT-RUN EVIDENCE: ${evidencePath}`, trailingOutput].join('\n');
}

async function runReviewPackage(
  fixture,
  greenFence,
  {
    baseRef = 'HEAD~1',
    evidenceDirectory = '',
    evidencePath,
    gatesLogPath: suppliedGatesLogPath,
    headRef = 'HEAD',
    packetDirectory,
    processEnvironment = {},
    trailingOutput = '',
  } = {},
) {
  const gatesLogPath = suppliedGatesLogPath ?? join(fixture.root, 'gates.log');
  const packetPath = packetDirectory ?? join(fixture.root, fixture.featureDir, 'review-packet');
  const currentEvidence = evidencePath ?? (await writeCurrentRunEvidence(fixture)).gateEvidencePath;
  const log = gatesLog(greenFence, currentEvidence, trailingOutput);
  if (!suppliedGatesLogPath) await writeFile(gatesLogPath, log, 'utf8');

  const result = await fixture.run(
    'bash',
    [
      '.claude/skills/requesting-code-review/scripts/review-package.sh',
      fixture.featureDir,
      baseRef,
      headRef,
    ],
    {
      env: {
        ...process.env,
        EVIDENCE_DIR: evidenceDirectory,
        GATES_LOG: gatesLogPath,
        PACKET_DIR: packetPath,
        ...processEnvironment,
      },
    },
  );

  return { ...result, gatesLog: log, packetPath };
}

test('S2 review packet rejects the repository root as PACKET_DIR without deleting it', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence, {
    packetDirectory: fixture.root,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PACKET_DIR.*(?:repository|confined|spec)/iu);
  assert.equal(await readFile(join(fixture.root, 'subject.txt'), 'utf8'), 'after\n');
});

test('S2 review packet rejects the spec directory itself as PACKET_DIR without deleting it', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const packetDirectory = join(fixture.root, fixture.featureDir);

  const result = await runReviewPackage(fixture, localGreenFence, { packetDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PACKET_DIR.*(?:spec|destination|confined)/iu);
  assert.match(await readFile(join(packetDirectory, 'spec.md'), 'utf8'), /Fixture spec/u);
});

test('S2 review packet rejects an existing PACKET_DIR and preserves its contents', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const packetDirectory = join(fixture.root, fixture.featureDir, 'review-packet');
  const sentinel = join(packetDirectory, 'founder-owned.txt');
  await mkdir(packetDirectory, { recursive: true });
  await writeFile(sentinel, 'preserve me\n', 'utf8');

  const result = await runReviewPackage(fixture, localGreenFence, { packetDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PACKET_DIR.*(?:already exists|existing)/iu);
  assert.equal(await readFile(sentinel, 'utf8'), 'preserve me\n');
});

test('S2 review packet rejects a symbolic-link PACKET_DIR without touching its target', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const target = join(fixture.root, 'reports/protected-packet-target');
  const sentinel = join(target, 'founder-owned.txt');
  const packetDirectory = join(fixture.root, fixture.featureDir, 'review-packet');
  await mkdir(target, { recursive: true });
  await writeFile(sentinel, 'preserve me\n', 'utf8');
  await symlink(target, packetDirectory);

  const result = await runReviewPackage(fixture, localGreenFence, { packetDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PACKET_DIR.*symbolic link|symbolic link.*PACKET_DIR/iu);
  assert.equal(await readFile(sentinel, 'utf8'), 'preserve me\n');
});

test('S2 review packet rejects a PACKET_DIR whose in-spec ancestor is a symbolic link', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const target = join(fixture.root, fixture.featureDir, 'real-packet-parent');
  const alias = join(fixture.root, fixture.featureDir, 'packet-parent-link');
  await mkdir(target, { recursive: true });
  await symlink(target, alias);

  const result = await runReviewPackage(fixture, localGreenFence, {
    packetDirectory: join(alias, 'review-packet'),
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PACKET_DIR.*ancestor.*symbolic link|symbolic link.*ancestor/iu);
});

test('S2 review packet cannot replace an empty destination created immediately before publish', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const packetDirectory = join(fixture.root, fixture.featureDir, 'review-packet');
  const physicalPacketDirectory = join(await realpath(dirname(packetDirectory)), 'review-packet');
  const raceMarker = join(fixture.root, 'reports/founder-owned-destination.inode');
  const wrapperDirectory = join(fixture.root, 'reports/publish-race-bin');
  const realMkdir = (await fixture.run('sh', ['-c', 'command -v mkdir'])).stdout.trim();
  const realNode = (await fixture.run('sh', ['-c', 'command -v node'])).stdout.trim();
  const createRacerDestination = [
    '"$REAL_MKDIR" "$RACING_PACKET_DIR"',
    '"$REAL_NODE" -e \'const fs = require("node:fs"); fs.writeFileSync(process.env.RACE_MARKER, String(fs.statSync(process.env.RACING_PACKET_DIR).ino));\'',
  ];
  await fixture.write(
    'reports/publish-race-bin/node',
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if { { [ "${1:-}" = "--input-type=module" ] && [ "${2:-}" = "-e" ]; } || { [ "${1:-}" = "scripts/lib/publish-review-packet.mjs" ] && [ "${3:-}" = "$RACING_PACKET_DIR" ]; }; } && [ ! -e "$RACE_MARKER" ]; then',
      ...createRacerDestination,
      'fi',
      'exec "$REAL_NODE" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.write(
    'reports/publish-race-bin/mkdir',
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [ "$#" -eq 1 ] && [ "$1" = "$RACING_PACKET_DIR" ] && [ ! -e "$RACE_MARKER" ]; then',
      ...createRacerDestination,
      'fi',
      'exec "$REAL_MKDIR" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', [
    '700',
    'reports/publish-race-bin/node',
    'reports/publish-race-bin/mkdir',
  ]);

  const result = await runReviewPackage(fixture, localGreenFence, {
    packetDirectory,
    processEnvironment: {
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      RACE_MARKER: raceMarker,
      RACING_PACKET_DIR: physicalPacketDirectory,
      REAL_MKDIR: realMkdir,
      REAL_NODE: realNode,
    },
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PACKET_DIR.*(?:appeared|exists|reserve|replace)/iu);
  const founderOwnedInode = (await readFile(raceMarker, 'utf8')).trim();
  assert.equal(String((await stat(physicalPacketDirectory)).ino), founderOwnedInode);
  assert.deepEqual(await readdir(physicalPacketDirectory), []);
});

test('S2 review packet does not adopt a destination swapped after exclusive reservation', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const packetDirectory = join(fixture.root, fixture.featureDir, 'review-packet');
  const injection = await installPublicationInjector(fixture, {
    mode: 'swap',
    packetDirectory,
  });

  const result = await runReviewPackage(fixture, localGreenFence, {
    packetDirectory,
    processEnvironment: injection.processEnvironment,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PACKET_DIR.*(?:changed|identity|ownership|replaced)/iu);
  assert.equal(await readFile(join(packetDirectory, 'racer-owned.txt'), 'utf8'), 'preserve me\n');
});

test('S2 review packet never accepts or deletes a replacement in the mkdir-to-open window', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const packetDirectory = join(fixture.root, fixture.featureDir, 'review-packet');
  const injection = await installPublicationInjector(fixture, {
    mode: 'pre-open-swap',
    packetDirectory,
  });

  const result = await runReviewPackage(fixture, localGreenFence, {
    packetDirectory,
    processEnvironment: injection.processEnvironment,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PACKET_DIR.*(?:extra|inventory|unexpected|exists|mode)/iu);
  assert.equal(await readFile(join(packetDirectory, 'racer-owned.txt'), 'utf8'), 'preserve me\n');
});

test('S2 review packet rejects an extra file injected during publication', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const packetDirectory = join(fixture.root, fixture.featureDir, 'review-packet');
  const injection = await installPublicationInjector(fixture, {
    mode: 'extra',
    packetDirectory,
  });

  const result = await runReviewPackage(fixture, localGreenFence, {
    packetDirectory,
    processEnvironment: injection.processEnvironment,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PACKET_DIR.*(?:extra|inventory|unexpected)/iu);
  assert.equal(await readFile(join(packetDirectory, 'unexpected.txt'), 'utf8'), 'foreign extra\n');
});

test('S2 review packet cannot report success or clean up after a same-UID descendant symlink race', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const packetDirectory = join(fixture.root, fixture.featureDir, 'review-packet');
  const outsideDirectory = join(fixture.root, 'reports/descendant-symlink-target');
  const sentinel = join(outsideDirectory, 'founder-owned.txt');
  await mkdir(outsideDirectory, { recursive: true });
  await writeFile(sentinel, 'preserve me\n');
  const injection = await installPublicationInjector(fixture, {
    entryPath: 'evidence/component-ki-fixture-dark.png',
    mode: 'descendant-symlink',
    outsideDirectory,
    packetDirectory,
  });

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
    packetDirectory,
    processEnvironment: injection.processEnvironment,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /(?:symbolic link|inventory|publication)/iu);
  assert.equal(await readFile(sentinel, 'utf8'), 'preserve me\n');
  assert.ok((await stat(join(outsideDirectory, 'component-ki-fixture-dark.png'))).isFile());
  assert.ok((await stat(packetDirectory)).isDirectory());
});

test('S2 review packet finalizes only the held file descriptor after a created file is replaced', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const packetDirectory = join(fixture.root, fixture.featureDir, 'review-packet');
  const externalFile = join(fixture.root, 'reports/founder-owned-external.txt');
  await mkdir(dirname(externalFile), { recursive: true });
  await writeFile(externalFile, 'preserve external bytes\n', { mode: 0o644 });
  const externalModeBefore = (await stat(externalFile)).mode & 0o777;
  const injection = await installPublicationInjector(fixture, {
    entryPath: 'MANIFEST.md',
    mode: 'file-finalize-symlink',
    outsideDirectory: externalFile,
    packetDirectory,
  });

  const result = await runReviewPackage(fixture, localGreenFence, {
    packetDirectory,
    processEnvironment: injection.processEnvironment,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /(?:symbolic link|inventory|publication|identity)/iu);
  assert.equal(await readFile(externalFile, 'utf8'), 'preserve external bytes\n');
  assert.equal((await stat(externalFile)).mode & 0o777, externalModeBefore);
  assert.ok((await stat(packetDirectory)).isDirectory());
});

test('S2 packet publisher rejects a source tree deeper than 12 entries', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const source = join(fixture.root, 'reports/deep-packet-source');
  const destination = join(fixture.root, fixture.featureDir, 'deep-review-packet');
  await mkdir(join(source, '1/2/3/4/5/6/7/8/9/10/11/12/13'), { recursive: true });

  const result = await fixture.run('node', [
    'scripts/lib/publish-review-packet.mjs',
    source,
    destination,
  ]);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /packet.*depth.*(?:12.*limit|limit.*12)|depth limit.*12/iu);
  await assertPacketWasRemoved(destination);
});

test('S2 packet publisher rejects a source tree above 1024 entries', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const source = join(fixture.root, 'reports/many-entry-packet-source');
  const destination = join(fixture.root, fixture.featureDir, 'many-entry-review-packet');
  await mkdir(source, { recursive: true });
  for (let index = 0; index < 1025; index += 1) {
    await writeFile(join(source, `entry-${String(index).padStart(4, '0')}.txt`), '');
  }

  const result = await fixture.run('node', [
    'scripts/lib/publish-review-packet.mjs',
    source,
    destination,
  ]);

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /packet.*(?:entry|file).*(?:1024.*limit|limit.*1024)|too many.*entries/iu,
  );
  await assertPacketWasRemoved(destination);
});

test('S2 packet publisher rejects a sparse source file above the 32 MiB per-file cap', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const source = join(fixture.root, 'reports/large-file-packet-source');
  const destination = join(fixture.root, fixture.featureDir, 'large-file-review-packet');
  const sparseFile = join(source, 'sparse.bin');
  await mkdir(source, { recursive: true });
  await writeFile(sparseFile, Buffer.alloc(0));
  await truncate(sparseFile, 32 * 1024 * 1024 + 1);

  const result = await fixture.run('node', [
    'scripts/lib/publish-review-packet.mjs',
    source,
    destination,
  ]);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /packet.*file.*32 MiB.*limit|32 MiB.*per-file/iu);
  await assertPacketWasRemoved(destination);
});

test('S2 packet publisher rejects aggregate source bytes above 128 MiB before hashing', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const source = join(fixture.root, 'reports/aggregate-packet-source');
  const destination = join(fixture.root, fixture.featureDir, 'aggregate-review-packet');
  await mkdir(source, { recursive: true });
  for (let index = 0; index < 5; index += 1) {
    const sparseFile = join(source, `sparse-${String(index)}.bin`);
    await writeFile(sparseFile, Buffer.alloc(0));
    await truncate(sparseFile, 27 * 1024 * 1024);
  }

  const result = await fixture.run('node', [
    'scripts/lib/publish-review-packet.mjs',
    source,
    destination,
  ]);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /packet.*aggregate.*128 MiB.*limit|128 MiB.*aggregate/iu);
  await assertPacketWasRemoved(destination);
});

test('S2 packet publisher rejects a source file that grows after inventory and before fd open', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const source = join(fixture.root, 'reports/growing-packet-source');
  const destination = join(fixture.root, fixture.featureDir, 'growing-review-packet');
  await mkdir(source, { recursive: true });
  await writeFile(join(source, 'payload.txt'), 'bounded source\n');
  const injection = await installPublicationInjector(fixture, {
    entryPath: 'payload.txt',
    mode: 'source-grow',
    packetDirectory: destination,
  });

  const result = await fixture.run(
    'node',
    ['scripts/lib/publish-review-packet.mjs', source, destination],
    { env: { ...process.env, ...injection.processEnvironment } },
  );

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /source file changed|bounded inventory|grew/iu);
  assert.match(await readFile(join(source, 'payload.txt'), 'utf8'), /grew after inventory/u);
  assert.ok((await stat(destination)).isDirectory());
});

test('S2 review packet accepts a non-UI diff without rendered evidence', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /review packet ready/u);
  assert.equal(
    await readFile(join(result.packetPath, 'gates-output.txt'), 'utf8'),
    result.gatesLog,
  );
  const committedSpec = await fixture.run('git', ['show', `HEAD:${fixture.featureDir}/spec.md`]);
  const committedFeature = await fixture.run('git', [
    'show',
    `HEAD:${fixture.featureDir}/feature.feature`,
  ]);
  assert.equal(await readFile(join(result.packetPath, 'spec.md'), 'utf8'), committedSpec.stdout);
  assert.equal(
    await readFile(join(result.packetPath, 'feature.feature'), 'utf8'),
    committedFeature.stdout,
  );
});

test('S2 review packet emits machine-readable metadata for the frozen review range', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const baseSha = (await fixture.run('git', ['rev-parse', 'HEAD~1^{commit}'])).stdout.trim();
  const headSha = (await fixture.run('git', ['rev-parse', 'HEAD^{commit}'])).stdout.trim();

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.equal(result.code, 0, result.stderr);
  const metadata = JSON.parse(
    await readFile(join(result.packetPath, 'review-metadata.json'), 'utf8'),
  );
  assert.deepEqual(metadata, { baseSha, headSha, schemaVersion: 1 });
});

test('S2 review packet emits a canonical content manifest whose digest binds the frozen packet', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const baseSha = (await fixture.run('git', ['rev-parse', 'HEAD~1^{commit}'])).stdout.trim();
  const headSha = (await fixture.run('git', ['rev-parse', 'HEAD^{commit}'])).stdout.trim();

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.equal(result.code, 0, result.stderr);
  const { bytes, digest, manifest } = await readPacketManifest(result.packetPath);
  assert.equal(bytes.toString('utf8'), `${JSON.stringify(manifest)}\n`);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.baseSha, baseSha);
  assert.equal(manifest.headSha, headSha);
  assert.deepEqual(manifest.files, await packetContentInventory(result.packetPath));
  assert.ok(manifest.files.some(({ path }) => path === 'diff.patch'));
  assert.ok(manifest.files.some(({ path }) => path === 'review-metadata.json'));
  assert.ok(manifest.files.some(({ path }) => path === 'MANIFEST.md'));
  assert.ok(!manifest.files.some(({ path }) => path === 'packet-manifest.json'));
  assert.match(result.stdout, new RegExp(`packet SHA-256: ${digest}`));
});

test('S2 review packet rejects a review base that descends from the frozen head', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const reviewedHead = (await fixture.run('git', ['rev-parse', 'HEAD^{commit}'])).stdout.trim();
  const branch = (await fixture.run('git', ['branch', '--show-current'])).stdout.trim();
  await fixture.write('future.txt', 'future base revision\n');
  await fixture.run('git', ['add', 'future.txt']);
  const futureCommit = await fixture.run('git', ['commit', '--quiet', '-m', 'test: future base']);
  assert.equal(futureCommit.code, 0, futureCommit.stderr);
  const checkout = await fixture.run('git', ['checkout', '--quiet', '--detach', reviewedHead]);
  assert.equal(checkout.code, 0, checkout.stderr);

  const result = await runReviewPackage(fixture, localGreenFence, { baseRef: branch });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /review base.*(?:ancestor|ancestry)|merge-base.*ancestor/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an unrelated review base', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const unrelatedTree = (await fixture.run('git', ['rev-parse', 'HEAD~1^{tree}'])).stdout.trim();
  const unrelated = await fixture.run('git', [
    'commit-tree',
    unrelatedTree,
    '-m',
    'test: unrelated root',
  ]);
  assert.equal(unrelated.code, 0, unrelated.stderr);

  const result = await runReviewPackage(fixture, localGreenFence, {
    baseRef: unrelated.stdout.trim(),
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /review base.*(?:ancestor|ancestry)|merge-base.*ancestor/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a partial changed-path stream when git diff exits non-zero', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const realGit = (await fixture.run('sh', ['-c', 'command -v git'])).stdout.trim();
  const wrapperDirectory = join(fixture.root, 'reports/partial-diff-bin');
  await fixture.write(
    'reports/partial-diff-bin/git',
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [ "${1:-}" = "diff" ] && [ "${2:-}" = "--no-renames" ] && [ "${3:-}" = "--name-only" ] && [ "${4:-}" = "-z" ]; then',
      "  printf 'subject.txt\\0'",
      '  exit 86',
      'fi',
      'exec "$REAL_GIT" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', ['700', 'reports/partial-diff-bin/git']);

  const result = await runReviewPackage(fixture, localGreenFence, {
    processEnvironment: {
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      REAL_GIT: realGit,
    },
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /(?:git diff|changed paths|enumerat).*(?:failed|non-zero)/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet stops an oversized diff.patch while git is still streaming', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const realGit = (await fixture.run('sh', ['-c', 'command -v git'])).stdout.trim();
  const realNode = (await fixture.run('sh', ['-c', 'command -v node'])).stdout.trim();
  const wrapperDirectory = join(fixture.root, 'reports/oversized-diff-bin');
  await fixture.write(
    'reports/oversized-diff-bin/git',
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [ "$#" -eq 2 ] && [ "${1:-}" = "diff" ]; then',
      '  exec "$REAL_NODE" -e \'process.stdout.write(Buffer.alloc(17 * 1024 * 1024, 0x61))\'',
      'fi',
      'exec "$REAL_GIT" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', ['700', 'reports/oversized-diff-bin/git']);

  const result = await runReviewPackage(fixture, localGreenFence, {
    processEnvironment: {
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      REAL_GIT: realGit,
      REAL_NODE: realNode,
    },
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /diff\.patch.*(?:16 MiB|limit)|16 MiB.*diff\.patch/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects dirty spec and feature bytes instead of mixing them with frozen HEAD', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const specPath = `${fixture.featureDir}/spec.md`;
  const featurePath = `${fixture.featureDir}/feature.feature`;
  await fixture.write(
    specPath,
    '# Dirty worktree spec\n\n## Constitutional Surface\n\n- DIRTY-WORKTREE-CONTRACT\n',
  );
  await fixture.write(
    featurePath,
    [
      'Feature: Dirty worktree contract',
      '',
      '  # S999',
      '  Scenario: Must never enter the packet',
      '    Given mutable worktree bytes',
      '    When a review packet is assembled',
      '    Then the dirty contract is ignored',
      '',
    ].join('\n'),
  );

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /review (?:index|worktree).*(?:clean|drift)|(?:dirty|staged).*(?:index|worktree)/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects staged bytes that are not in frozen HEAD', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  await fixture.write('subject.txt', 'staged after frozen HEAD\n');
  const staged = await fixture.run('git', ['add', 'subject.txt']);
  assert.equal(staged.code, 0, staged.stderr);

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /review (?:index|worktree).*(?:clean|drift)|(?:dirty|staged).*(?:index|worktree)/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a staged index change when the worktree is restored to frozen HEAD', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  await fixture.write('subject.txt', 'staged but hidden by restored worktree\n');
  const staged = await fixture.run('git', ['add', 'subject.txt']);
  assert.equal(staged.code, 0, staged.stderr);
  await fixture.write('subject.txt', 'after\n');

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /review (?:index|worktree).*(?:clean|drift)|staged.*(?:change|drift)/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects non-ignored untracked bytes outside frozen HEAD', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  await fixture.write('untracked-review-input.txt', 'outside frozen HEAD\n');

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /review worktree.*clean|dirty.*worktree/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a UI-affecting diff without rendered evidence', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: 'packages/elements/src/components/ki-fixture/ki-fixture.css',
  });
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet treats deletion of a UI source as UI-affecting', async (t) => {
  const candidatePath = 'packages/elements/src/components/ki-fixture/ki-fixture.css';
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath,
  });
  t.after(() => fixture.cleanup());
  const removal = await fixture.run('git', ['rm', '--quiet', '--', candidatePath]);
  assert.equal(removal.code, 0, removal.stderr);
  const commit = await fixture.run('git', ['commit', '--quiet', '-m', 'test: remove fixture UI']);
  assert.equal(commit.code, 0, commit.stderr);

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet keeps the UI origin visible when a UI source is renamed', async (t) => {
  const candidatePath = 'packages/elements/src/components/ki-fixture/ki-fixture.css';
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath,
  });
  t.after(() => fixture.cleanup());
  const rename = await fixture.run('git', ['mv', '--', candidatePath, 'retired-ui-source.txt']);
  assert.equal(rename.code, 0, rename.stderr);
  const commit = await fixture.run('git', ['commit', '--quiet', '-m', 'test: rename fixture UI']);
  assert.equal(commit.code, 0, commit.stderr);

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet classifies Elements production helpers as UI-affecting', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: 'export const renderedState = true;\n',
    candidatePath: 'packages/elements/src/rendered-state.ts',
  });
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet keeps Elements production precedence for a helper named .spec.ts', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: 'export const renderedState = true;\n',
    candidatePath: 'packages/elements/src/rendered-state.spec.ts',
  });
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet classifies component generator UI templates as UI-affecting', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: ':host { display: block; }\n',
    candidatePath: 'tools/kimen-plugin/src/generators/component/files/__name__.css.template',
  });
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet classifies component generator token templates as UI-affecting', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '{"$value":"{color.text}"}\n',
    candidatePath:
      'tools/kimen-plugin/src/generators/component/files-token/__name__.tokens.json.template',
  });
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet conservatively classifies the component generator implementation as UI-affecting', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: 'export function generator() { return true; }\n',
    candidatePath: 'tools/kimen-plugin/src/generators/component/generator.js',
  });
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet classifies Stencil production configuration as UI-affecting', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: 'export const config = { namespace: "fixture" };\n',
    candidatePath: 'packages/elements/stencil.config.ts',
  });
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet classifies Style Dictionary production configuration as UI-affecting', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: 'export default { source: ["tokens/**/*.json"] };\n',
    candidatePath: 'packages/tokens/style-dictionary.config.mjs',
  });
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet classifies the tokens production build script as UI-affecting', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: 'export const buildTokens = true;\n',
    candidatePath: 'packages/tokens/build.mjs',
  });
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /UI-affecting.*rendered evidence|rendered evidence.*UI-affecting/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an empty rendered-evidence directory for a UI diff', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: 'packages/elements/src/components/ki-fixture/ki-fixture.css',
  });
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/empty-rendered-evidence');
  await mkdir(evidenceDirectory, { recursive: true });

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /rendered evidence.*(?:empty|image)|(?:empty|image).*rendered evidence/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an oversized evidence manifest before reading it', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/oversized-manifest-evidence');
  const manifestPath = join(evidenceDirectory, 'review-evidence.json');
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(manifestPath, Buffer.alloc(0));
  await truncate(manifestPath, 1024 * 1024 + 1);

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /manifest.*(?:1 MiB|size|limit)|1 MiB.*manifest/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects rendered evidence nested beyond the depth cap', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/deep-rendered-evidence');
  await mkdir(join(evidenceDirectory, '1/2/3/4/5/6/7/8/9'), { recursive: true });

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /rendered evidence.*depth.*(?:8|limit)|depth cap/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects rendered evidence above the entry-count cap', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/too-many-rendered-files');
  const png = aPngPixel(1, 2, 3);
  await mkdir(evidenceDirectory, { recursive: true });
  for (let index = 0; index < 513; index += 1) {
    await writeFile(join(evidenceDirectory, `image-${String(index).padStart(3, '0')}.png`), png);
  }

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /rendered evidence.*(?:entry|file).*(?:512.*limit|limit.*512)|too many.*files/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects aggregate encoded evidence above 32 MiB before reading images', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/aggregate-encoded-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  for (let index = 0; index < 5; index += 1) {
    const imagePath = join(evidenceDirectory, `sparse-${String(index)}.png`);
    await writeFile(imagePath, Buffer.alloc(0));
    await truncate(imagePath, 8 * 1024 * 1024);
  }

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /aggregate encoded.*32 MiB|32 MiB.*aggregate encoded/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects arbitrary files presented as rendered evidence', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: 'packages/elements/src/components/ki-fixture/ki-fixture.css',
  });
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/invalid-rendered-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(join(evidenceDirectory, 'notes.txt'), 'not a rendered screenshot\n', 'utf8');

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /rendered evidence.*(?:regular image|unsupported)|unsupported.*evidence/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a non-image payload disguised with a PNG extension', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: 'packages/elements/src/components/ki-fixture/ki-fixture.css',
  });
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/spoofed-rendered-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(join(evidenceDirectory, 'spoofed.png'), 'not really a PNG\n', 'utf8');

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /rendered evidence.*(?:invalid|truncated)|(?:invalid|truncated).*rendered evidence/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a truncated payload with only a PNG header', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: 'packages/elements/src/components/ki-fixture/ki-fixture.css',
  });
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/truncated-rendered-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    join(evidenceDirectory, 'truncated.png'),
    Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
  );

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /rendered evidence.*(?:truncated|invalid)|(?:truncated|invalid).*rendered evidence/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an oversized sparse image before reading its bytes', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/oversized-rendered-evidence');
  const imagePath = join(evidenceDirectory, 'oversized.png');
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(imagePath, Buffer.alloc(0));
  await truncate(imagePath, 64 * 1024 * 1024 + 1);

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /(?:32|64) MiB.*(?:encoded|file).*limit|exceeds.*(?:32|64) MiB/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a PNG-shaped shell without valid chunks or image data', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture, {
    screenshotOverride: aPngMagicTailShell(),
  });

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PNG.*(?:chunk|CRC|IHDR|IDAT|image data|invalid)/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a structurally valid PNG whose decoded layout exceeds the cap', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture, {
    screenshotOverride: aPngWithOversizedDecodedLayout(),
  });

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /128 MiB.*decoded.*limit|decoded.*(?:cap|limit|large)/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a tall narrow PNG before allocating per-row metadata', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/tall-narrow-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    join(evidenceDirectory, 'tall.png'),
    aPngWithLayout({ bitDepth: 8, colorType: 0, height: 100_000, width: 1 }),
  );

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PNG.*(?:height|dimension).*(?:32768|limit)|dimension cap/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects aggregate declared PNG decode size above 512 MiB before inflation', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/aggregate-decoded-evidence');
  const declaredLargePng = aPngWithLayout({ height: 450, width: 32_768 });
  await mkdir(evidenceDirectory, { recursive: true });
  for (let index = 0; index < 5; index += 1) {
    await writeFile(
      join(evidenceDirectory, `declared-large-${String(index)}.png`),
      declaredLargePng,
    );
  }

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /aggregate decoded.*512 MiB|512 MiB.*aggregate decoded/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet fails closed for indexed-color PNG evidence', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const indexedPng = aPngWithLayout({
    bitDepth: 8,
    colorType: 3,
    decodedBytes: Buffer.from([0, 0]),
    height: 1,
    palette: Buffer.from([0, 0, 0]),
    width: 1,
  });
  const evidence = await createRenderedEvidence(fixture, { screenshotOverride: indexedPng });

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /PNG.*indexed.*(?:unsupported|fail|reject)|colorType 3/iu);
  await assertPacketWasRemoved(result.packetPath);
});

for (const [format, imageName, bytes] of [
  ['JPEG', 'framed.jpg', Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex')],
  ['WebP', 'framed.webp', Buffer.from('52494646100000005745425056503820040000009d012a00', 'hex')],
]) {
  test(`S2 review packet fails closed for ${format} evidence without a real decoder`, async (t) => {
    const fixture = await createReviewFixture({
      candidateContents: '.fixture { color: red; }\n',
      candidatePath: fixtureUiPath,
    });
    t.after(() => fixture.cleanup());
    const evidenceDirectory = join(fixture.root, `reports/unsupported-${format.toLowerCase()}`);
    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(join(evidenceDirectory, imageName), bytes);

    const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /schema v1.*(?:requires|PNG)|structurally decodable PNG/iu);
    await assertPacketWasRemoved(result.packetPath);
  });
}

test('S2 review packet validates optional rendered evidence even for a non-UI diff', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/non-ui-invalid-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(join(evidenceDirectory, 'notes.txt'), 'not a rendered screenshot\n', 'utf8');

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /rendered evidence.*(?:regular image|unsupported)|unsupported.*evidence/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a symbolic link inside rendered evidence', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: 'packages/elements/src/components/ki-fixture/ki-fixture.css',
  });
  t.after(() => fixture.cleanup());
  const source = await createRenderedEvidence(fixture, {
    directoryName: 'source-rendered-evidence',
  });
  const evidenceDirectory = join(fixture.root, 'reports/symlink-rendered-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  await symlink(source.screenshotPath, join(evidenceDirectory, 'linked.png'));

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /(?:rendered evidence|publication).*symbolic link|symbolic link.*(?:rendered evidence|publication)/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a rendered-evidence directory that is a symbolic link', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: 'packages/elements/src/components/ki-fixture/ki-fixture.css',
  });
  t.after(() => fixture.cleanup());
  const source = await createRenderedEvidence(fixture, {
    directoryName: 'real-rendered-evidence',
  });
  const evidenceDirectory = join(fixture.root, 'reports/rendered-evidence-link');
  await symlink(source.evidenceDirectory, evidenceDirectory);

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /EVIDENCE_DIR.*symbolic link|symbolic link.*EVIDENCE_DIR/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an in-repository symbolic-link ancestor of EVIDENCE_DIR', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const realParent = join(fixture.root, 'reports/real-evidence-parent');
  const aliasParent = join(fixture.root, 'reports/evidence-parent-link');
  const evidence = await createRenderedEvidence(fixture, {
    directoryPath: join(realParent, 'rendered-evidence'),
  });
  const screenshotBefore = await readFile(evidence.screenshotPath);
  await symlink(realParent, aliasParent);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: join(aliasParent, 'rendered-evidence'),
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /EVIDENCE_DIR.*ancestor.*symbolic link|symbolic link.*EVIDENCE_DIR/iu,
  );
  assert.deepEqual(await readFile(evidence.screenshotPath), screenshotBefore);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects overlap between PACKET_DIR and EVIDENCE_DIR', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture, {
    directoryPath: join(fixture.root, fixture.featureDir, 'rendered-evidence'),
  });

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
    packetDirectory: join(evidence.evidenceDirectory, 'review-packet'),
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /PACKET_DIR.*overlap.*EVIDENCE_DIR|EVIDENCE_DIR.*overlap.*PACKET_DIR/iu,
  );
});

test('S2 review packet snapshots rendered evidence without invoking recursive cp', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const realCp = (await fixture.run('sh', ['-c', 'command -v cp'])).stdout.trim();
  const wrapperDirectory = join(fixture.root, 'reports/no-recursive-cp-bin');
  await fixture.write(
    'reports/no-recursive-cp-bin/cp',
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [ "${1:-}" = "-R" ]; then',
      '  echo "recursive cp must not snapshot rendered evidence" >&2',
      '  exit 92',
      'fi',
      'exec "$REAL_CP" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', ['700', 'reports/no-recursive-cp-bin/cp']);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
    processEnvironment: {
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      REAL_CP: realCp,
    },
  });

  assert.equal(result.code, 0, result.stderr);
});

test('S2 review packet accepts and copies regular rendered images for a UI diff', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: 'packages/elements/src/components/ki-fixture/ki-fixture.css',
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(
    await readFile(join(result.packetPath, 'evidence/ki-fixture-default.png')),
    await readFile(evidence.screenshotPath),
  );
  assert.match(
    await readFile(join(result.packetPath, 'MANIFEST.md'), 'utf8'),
    /UI-affecting diff: yes/u,
  );
  assert.deepEqual(
    await readFile(join(result.packetPath, 'evidence/review-evidence.json')),
    await readFile(join(evidence.evidenceDirectory, 'review-evidence.json')),
  );
  assert.match(
    await readFile(join(result.packetPath, 'MANIFEST.md'), 'utf8'),
    /Evidence manifest SHA-256: `[0-9a-f]{64}`/u,
  );
});

test('S2 review packet groups token paths and permits one integrity-bound gallery image across surfaces', async (t) => {
  const tokenSourcePath = 'packages/tokens/tokens/fixture-a.tokens.json';
  const tokenCssPath = 'packages/tokens/dist/css/fixture.css';
  const uiPaths = [fixtureUiPath, tokenSourcePath, tokenCssPath];
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  await fixture.write(tokenSourcePath, '{"fixture":true}\n');
  await fixture.write(tokenCssPath, ':root { --fixture: red; }\n');
  await fixture.run('git', ['add', tokenSourcePath, tokenCssPath]);
  const amended = await fixture.run('git', ['commit', '--quiet', '--amend', '--no-edit']);
  assert.equal(amended.code, 0, amended.stderr);
  const evidence = await createRenderedEvidence(fixture, { uiPaths });

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.equal(result.code, 0, result.stderr);
  const copiedManifest = JSON.parse(
    await readFile(join(result.packetPath, 'evidence/review-evidence.json'), 'utf8'),
  );
  assert.deepEqual(
    copiedManifest.surfaces.map(({ id }) => id),
    ['component:ki-fixture', 'tokens'],
  );
});

test('S2 review packet rejects rendered images without a versioned evidence manifest', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture, { writeManifest: false });

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /(?:missing|requires).*review-evidence\.json|manifest.*(?:missing|required)/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an evidence manifest above the surface-count cap', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/too-many-surfaces-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  const surfaces = Array.from({ length: 129 }, (_, index) => ({
    id: `path:surface-${String(index)}`,
    paths: [`surface-${String(index)}.css`],
    states: [],
  }));
  await writeRawEvidenceManifest(fixture, evidenceDirectory, surfaces);

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /manifest.*surfaces.*(?:128.*limit|limit.*128)|too many.*surfaces/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an evidence surface above the state-count cap', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidenceDirectory = join(fixture.root, 'reports/too-many-states-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  const states = Array.from({ length: 33 }, (_, index) => ({
    image: `state-${String(index)}.png`,
    name: `state-${String(index)}`,
    sha256: '0'.repeat(64),
  }));
  await writeRawEvidenceManifest(fixture, evidenceDirectory, [
    { id: 'path:surface.css', paths: ['surface.css'], states },
  ]);

  const result = await runReviewPackage(fixture, localGreenFence, { evidenceDirectory });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /manifest.*states.*(?:32.*limit|limit.*32)|too many.*states/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an evidence manifest that omits an affected UI path', async (t) => {
  const secondUiPath = 'packages/elements/src/components/ki-other/ki-other.css';
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  await fixture.write(secondUiPath, '.other { color: blue; }\n');
  await fixture.run('git', ['add', secondUiPath]);
  const amended = await fixture.run('git', ['commit', '--quiet', '--amend', '--no-edit']);
  assert.equal(amended.code, 0, amended.stderr);
  const evidence = await createRenderedEvidence(fixture);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /(?:missing|incomplete|coverage).*(?:ki-other|UI path)|(?:ki-other|UI path).*(?:missing|coverage)/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an evidence manifest that omits a contractually required state', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const manifest = await readEvidenceManifest(evidence.evidenceDirectory);
  manifest.surfaces[0].states = manifest.surfaces[0].states.filter(({ name }) => name !== 'rtl');
  await writeEvidenceManifest(evidence.evidenceDirectory, manifest);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /missing.*required.*state.*(?:dark|rtl)|state.*(?:dark|rtl).*missing/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects generic ki-progress images that do not bind the changed circular state', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: 'packages/elements/src/components/ki-progress/ki-progress.css',
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture, {
    uiPaths: ['packages/elements/src/components/ki-progress/ki-progress.css'],
  });
  const manifest = await readEvidenceManifest(evidence.evidenceDirectory);
  for (const [index, state] of manifest.surfaces[0].states.entries()) {
    state.name = ['default', 'dark', 'rtl'][index];
  }
  await writeEvidenceManifest(evidence.evidenceDirectory, manifest);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /ki-progress.*(?:circular|value-73)|(?:circular|value-73).*ki-progress/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an evidence manifest whose image hash is incorrect', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture, { hashOverride: '0'.repeat(64) });

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /sha256|hash|digest/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects traversal in a manifest image path', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture, {
    manifestImagePath: '../outside.png',
  });

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /(?:image path|manifest path).*(?:traversal|relative|escape)|traversal/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a duplicate manifest surface mapping', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const manifest = await readEvidenceManifest(evidence.evidenceDirectory);
  manifest.surfaces.push({
    ...manifest.surfaces[0],
    paths: [...manifest.surfaces[0].paths],
    states: manifest.surfaces[0].states.map((state) => ({ ...state })),
  });
  await writeEvidenceManifest(evidence.evidenceDirectory, manifest);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /duplicate.*(?:surface|image|path)|(?:surface|image|path).*duplicate/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet permits additional integrity-bound states beyond the contractual baseline', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const bytes = aPngPixel(255, 254, 253);
  const image = 'ki-fixture-hover.png';
  await writeFile(join(evidence.evidenceDirectory, image), bytes);
  const manifest = await readEvidenceManifest(evidence.evidenceDirectory);
  manifest.surfaces[0].states.push({
    image,
    name: 'hover',
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
  await writeEvidenceManifest(evidence.evidenceDirectory, manifest);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.equal(result.code, 0, result.stderr);
});

test('S2 review packet rejects a duplicate manifest image mapping across states', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const manifest = await readEvidenceManifest(evidence.evidenceDirectory);
  manifest.surfaces[0].states[1].image = manifest.surfaces[0].states[0].image;
  manifest.surfaces[0].states[1].sha256 = manifest.surfaces[0].states[0].sha256;
  await writeEvidenceManifest(evidence.evidenceDirectory, manifest);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /duplicate.*image|image.*duplicate/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects byte-identical state evidence within one surface', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const manifest = await readEvidenceManifest(evidence.evidenceDirectory);
  const firstState = manifest.surfaces[0].states[0];
  const secondState = manifest.surfaces[0].states[1];
  const firstBytes = await readFile(join(evidence.evidenceDirectory, firstState.image));
  await writeFile(join(evidence.evidenceDirectory, secondState.image), firstBytes);
  secondState.sha256 = firstState.sha256;
  await writeEvidenceManifest(evidence.evidenceDirectory, manifest);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /duplicate.*(?:state.*(?:digest|sha256|bytes)|(?:digest|sha256|bytes).*state)|state.*byte-identical/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects an unsupported evidence manifest schema version', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const manifest = await readEvidenceManifest(evidence.evidenceDirectory);
  manifest.schemaVersion = 2;
  await writeEvidenceManifest(evidence.evidenceDirectory, manifest);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /schemaVersion.*1|schema version.*1/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet binds the evidence manifest to the frozen base and head SHAs', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const manifest = await readEvidenceManifest(evidence.evidenceDirectory);
  manifest.headSha = '0'.repeat(40);
  await writeEvidenceManifest(evidence.evidenceDirectory, manifest);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /headSha.*(?:frozen|review|match)|(?:frozen|review).*headSha/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a green-looking marker that is not the terminal fence', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence, {
    trailingOutput: 'unexpected trailing output',
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /gates log does not end green/u);
});

test('S2 review packet rejects an oversized sparse gates log before copying its payload', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidence = await writeCurrentRunEvidence(fixture);
  const gatesLogPath = join(fixture.root, 'reports/oversized-gates.log');
  const terminalFence = Buffer.from(
    `\n${gatesLog(localGreenFence, evidence.gateEvidencePath)}\n`,
    'utf8',
  );
  const handle = await open(gatesLogPath, 'w', 0o600);
  await handle.truncate(16 * 1024 * 1024 + 1);
  await handle.write(terminalFence, 0, terminalFence.length, 16 * 1024 * 1024 + 1);
  await handle.close();

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidencePath: evidence.gateEvidencePath,
    gatesLogPath,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /(?:gates log|gates-output).*16 MiB.*limit|16 MiB.*gates/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects oversized current-run TSV evidence before validation', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidence = await writeCurrentRunEvidence(fixture);
  await truncate(evidence.gateEvidencePath, 1024 * 1024 + 1);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidencePath: evidence.gateEvidencePath,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /current-run.*TSV.*1 MiB.*limit|1 MiB.*current-run/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects oversized capability JSON evidence before validation', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidence = await writeCurrentRunEvidence(fixture);
  await truncate(evidence.capabilityEvidencePath, 1024 * 1024 + 1);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidencePath: evidence.gateEvidencePath,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /capability.*JSON.*1 MiB.*limit|1 MiB.*capability/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet rejects a terminal fence whose current-run evidence is absent', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidencePath: join(fixture.root, 'reports/cache/gate-evidence/missing.tsv'),
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /current-run evidence.*(?:missing|regular)/iu);
});

test('S2 review packet rejects a terminal fence whose current-run evidence is not a regular file', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidencePath = join(fixture.root, 'reports/cache/gate-evidence/current-run.tsv');
  await mkdir(evidencePath, { recursive: true });

  const result = await runReviewPackage(fixture, localGreenFence, { evidencePath });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /current-run evidence.*regular/iu);
});

test('S2 review packet rejects a terminal fence whose current-run evidence is a symlink', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const realEvidence = await writeCurrentRunEvidence(fixture);
  const evidencePath = join(fixture.root, 'reports/cache/gate-evidence/current-run-link.tsv');
  await symlink(realEvidence.gateEvidencePath, evidencePath);

  const result = await runReviewPackage(fixture, localGreenFence, { evidencePath });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /current-run evidence.*(?:regular|symbolic|symlink)/iu);
});

test('S2 review packet rejects a dirty worktree before stale evidence can be reused', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidence = await writeCurrentRunEvidence(fixture);
  await fixture.write('subject.txt', 'dirty after gates\n');

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidencePath: evidence.gateEvidencePath,
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /worktree.*(?:clean|dirty)|evidence.*(?:stale|worktree)/iu);
});

test('S2 review packet rejects current-worktree evidence when the requested review head is older', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  await fixture.write('later.txt', 'later revision\n');
  await fixture.run('git', ['add', 'later.txt']);
  await fixture.run('git', ['commit', '--quiet', '-m', 'test: later revision']);
  const evidence = await writeCurrentRunEvidence(fixture);

  const result = await runReviewPackage(fixture, localGreenFence, {
    baseRef: 'HEAD~2',
    evidencePath: evidence.gateEvidencePath,
    headRef: 'HEAD~1',
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /review head.*current|current.*review head|revision.*review/iu);
});

test('S2 review packet rejects a named review ref that moves after SHAs are frozen', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const realGit = (await fixture.run('sh', ['-c', 'command -v git'])).stdout.trim();
  const wrapperDirectory = join(fixture.root, 'reports/moving-ref-bin');
  const movementMarker = join(fixture.root, 'reports/moving-ref.marker');
  await fixture.write(
    'reports/moving-ref-bin/git',
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [ "${1:-}" = "diff" ] && [ "${2:-}" = "--stat" ] && [ ! -e "$MOVING_GIT_STATE" ]; then',
      '  current_ref="$("$REAL_GIT" symbolic-ref -q HEAD)"',
      '  previous_sha="$("$REAL_GIT" rev-parse HEAD~1)"',
      '  "$REAL_GIT" update-ref "$current_ref" "$previous_sha"',
      '  : > "$MOVING_GIT_STATE"',
      'fi',
      'exec "$REAL_GIT" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', ['700', 'reports/moving-ref-bin/git']);

  const result = await runReviewPackage(fixture, localGreenFence, {
    processEnvironment: {
      MOVING_GIT_STATE: movementMarker,
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      REAL_GIT: realGit,
    },
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /(?:base|head|review).*(?:moved|changed|revision)|revision.*(?:moved|changed)/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet revalidates current-run gate evidence immediately before success', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const evidence = await writeCurrentRunEvidence(fixture);
  const realNode = (await fixture.run('sh', ['-c', 'command -v node'])).stdout.trim();
  const wrapperDirectory = join(fixture.root, 'reports/moving-evidence-bin');
  const mutationMarker = join(fixture.root, 'reports/moving-evidence.marker');
  await fixture.write(
    'reports/moving-evidence-bin/node',
    [
      '#!/usr/bin/env bash',
      'is_capability_check=no',
      'is_write_evidence=no',
      'gate_evidence_path=""',
      'previous_argument=""',
      'for argument in "$@"; do',
      '  [ "$argument" = "scripts/gates/check-capabilities.mjs" ] && is_capability_check=yes',
      '  [ "$argument" = "--write-evidence" ] && is_write_evidence=yes',
      '  [ "$previous_argument" != "--gate-evidence" ] || gate_evidence_path="$argument"',
      '  previous_argument="$argument"',
      'done',
      'if [ "$is_capability_check" = yes ] && [ "$is_write_evidence" = yes ]; then',
      '  "$REAL_NODE" "$@"',
      '  status=$?',
      '  if [ "$status" -eq 0 ] && [ ! -e "$MOVING_EVIDENCE_STATE" ]; then',
      '    printf "tampered\\n" > "$gate_evidence_path"',
      '    : > "$MOVING_EVIDENCE_STATE"',
      '  fi',
      '  exit "$status"',
      'fi',
      'exec "$REAL_NODE" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', ['700', 'reports/moving-evidence-bin/node']);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidencePath: evidence.gateEvidencePath,
    processEnvironment: {
      MOVING_EVIDENCE_STATE: mutationMarker,
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      REAL_NODE: realNode,
    },
  });

  assert.notEqual(result.code, 0);
  assert.match(
    result.stderr,
    /current-run.*(?:changed|malformed|evidence)|evidence.*(?:changed|malformed)/iu,
  );
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet revalidates a clean worktree after final evidence validation', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());
  const realGit = (await fixture.run('sh', ['-c', 'command -v git'])).stdout.trim();
  const wrapperDirectory = join(fixture.root, 'reports/late-worktree-mutation-bin');
  const invocationCounter = join(fixture.root, 'reports/base-revision-invocations');
  await fixture.write(
    'reports/late-worktree-mutation-bin/git',
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [ "${1:-}" = "rev-parse" ] && [ "${2:-}" = "--verify" ] && [ "${3:-}" = "HEAD~1^{commit}" ]; then',
      '  count=0',
      '  [ ! -f "$LATE_MUTATION_COUNTER" ] || count="$(cat "$LATE_MUTATION_COUNTER")"',
      '  count=$((count + 1))',
      '  printf "%s\\n" "$count" > "$LATE_MUTATION_COUNTER"',
      '  output="$("$REAL_GIT" "$@")"',
      '  status=$?',
      '  if [ "$status" -eq 0 ] && [ "$count" -eq 3 ]; then',
      '    printf "mutated after final evidence validation\\n" > subject.txt',
      '  fi',
      '  printf "%s\\n" "$output"',
      '  exit "$status"',
      'fi',
      'exec "$REAL_GIT" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', ['700', 'reports/late-worktree-mutation-bin/git']);

  const result = await runReviewPackage(fixture, localGreenFence, {
    processEnvironment: {
      LATE_MUTATION_COUNTER: invocationCounter,
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      REAL_GIT: realGit,
    },
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /review worktree.*clean|dirty.*worktree/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 rendered-evidence validation rejects image growth after discovery lstat', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const realNode = (await fixture.run('sh', ['-c', 'command -v node'])).stdout.trim();
  const wrapperDirectory = join(fixture.root, 'reports/evidence-grow-bin');
  const barrierDirectory = join(fixture.root, 'reports/evidence-grow-barrier');
  await mkdir(barrierDirectory, { recursive: true });
  await fixture.write(
    'reports/evidence-grow-injector.mjs',
    [
      "import { appendFileSync, existsSync, writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      'const [barrierDirectory, evidenceRoot] = process.argv.slice(2);',
      "const phase = 'after-discovery-before-read';",
      'const ready = join(barrierDirectory, `${phase}.ready`);',
      'const deadline = Date.now() + 10_000;',
      'while (!existsSync(ready)) {',
      "  if (Date.now() > deadline) throw new Error('evidence barrier timed out');",
      '  await new Promise((resolve) => setTimeout(resolve, 10));',
      '}',
      "appendFileSync(join(evidenceRoot, 'ki-fixture-default.png'), Buffer.from([0]));",
      "writeFileSync(join(barrierDirectory, `${phase}.continue`), 'continue\\n');",
      '',
    ].join('\n'),
  );
  await fixture.write(
    'reports/evidence-grow-bin/node',
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [ "${1:-}" = "scripts/lib/review-rendered-evidence.mjs" ]; then',
      '  "$REAL_NODE" "$EVIDENCE_GROW_INJECTOR" "$EVIDENCE_GROW_BARRIER" "${2:-}" &',
      'fi',
      'exec "$REAL_NODE" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', ['700', 'reports/evidence-grow-bin/node']);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
    processEnvironment: {
      EVIDENCE_GROW_BARRIER: barrierDirectory,
      EVIDENCE_GROW_INJECTOR: join(fixture.root, 'reports/evidence-grow-injector.mjs'),
      KIMEN_REVIEW_EVIDENCE_TEST_BARRIER_DIR: barrierDirectory,
      KIMEN_REVIEW_EVIDENCE_TEST_BARRIER_PHASE: 'after-discovery-before-read',
      KIMEN_REVIEW_EVIDENCE_TEST_MODE: '1',
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      REAL_NODE: realNode,
    },
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /changed.*bounded|grew beyond|rendered-evidence.*size/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet revalidates rendered evidence immediately before success', async (t) => {
  const fixture = await createReviewFixture({
    candidateContents: '.fixture { color: red; }\n',
    candidatePath: fixtureUiPath,
  });
  t.after(() => fixture.cleanup());
  const evidence = await createRenderedEvidence(fixture);
  const realNode = (await fixture.run('sh', ['-c', 'command -v node'])).stdout.trim();
  const wrapperDirectory = join(fixture.root, 'reports/moving-rendered-evidence-bin');
  const invocationCounter = join(fixture.root, 'reports/rendered-evidence-invocations');
  await fixture.write(
    'reports/moving-rendered-evidence-bin/node',
    [
      '#!/usr/bin/env bash',
      'if [ "${1:-}" = "scripts/lib/review-rendered-evidence.mjs" ]; then',
      '  count=0',
      '  [ ! -f "$RENDERED_EVIDENCE_COUNTER" ] || count="$(cat "$RENDERED_EVIDENCE_COUNTER")"',
      '  count=$((count + 1))',
      '  printf "%s\\n" "$count" > "$RENDERED_EVIDENCE_COUNTER"',
      '  "$REAL_NODE" "$@"',
      '  status=$?',
      '  if [ "$status" -eq 0 ] && [ "$count" -eq 2 ]; then',
      '    printf "tampered\\n" > "${2}/ki-fixture-default.png"',
      '  fi',
      '  exit "$status"',
      'fi',
      'exec "$REAL_NODE" "$@"',
      '',
    ].join('\n'),
  );
  await fixture.run('chmod', ['700', 'reports/moving-rendered-evidence-bin/node']);

  const result = await runReviewPackage(fixture, localGreenFence, {
    evidenceDirectory: evidence.evidenceDirectory,
    processEnvironment: {
      PATH: `${wrapperDirectory}:${process.env.PATH}`,
      REAL_NODE: realNode,
      RENDERED_EVIDENCE_COUNTER: invocationCounter,
    },
  });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /rendered evidence.*(?:changed|invalid|hash|sha256|truncated)/iu);
  await assertPacketWasRemoved(result.packetPath);
});

test('S2 review packet accepts the delegated CI green terminal fence', async (t) => {
  const fixture = await createReviewFixture();
  t.after(() => fixture.cleanup());

  const result = await runReviewPackage(fixture, delegatedGreenFence);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /review packet ready/u);
});
