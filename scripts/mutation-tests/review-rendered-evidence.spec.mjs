import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

import { describe, expect, it, onTestFinished } from 'vitest';

import {
  assertSafeRenderedPath,
  requiredRenderedStates,
  runRenderedEvidenceCli,
  validateRenderedEvidence,
  validateRenderedImageBytes,
} from '../lib/review-rendered-evidence.mjs';

// @spec:018-project-integrity-hardening#S2
// @spec:018-project-integrity-hardening#S3

const baseSha = 'a'.repeat(40);
const headSha = 'b'.repeat(40);
const componentPath = 'packages/elements/src/components/ki-fixture/ki-fixture.css';
const componentSurface = 'component:ki-fixture';

function crc32(bytes) {
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
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function aPng({ decoded = Buffer.from([0, 1, 2, 3, 255]), height = 1, width = 1 } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(decoded)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function anEvidenceFixture(t) {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'kimen-rendered-mutation-'));
  const registerCleanup = t?.onTestFinished?.bind(t) ?? onTestFinished;
  registerCleanup(() => rm(workspaceRoot, { recursive: true, force: true }));
  const evidenceRoot = join(workspaceRoot, 'evidence');
  await mkdir(evidenceRoot);
  const requiredRecordsPath = join(workspaceRoot, 'required.records');
  await writeFile(requiredRecordsPath, `${componentSurface}\0${componentPath}\0`);

  const states = [];
  for (const [index, name] of ['default', 'dark', 'rtl'].entries()) {
    const image = `${name}.png`;
    const bytes = aPng({ decoded: Buffer.from([0, index + 1, index + 2, index + 3, 255]) });
    await writeFile(join(evidenceRoot, image), bytes);
    states.push({
      image,
      name,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  const manifestPath = join(evidenceRoot, 'review-evidence.json');
  const manifest = {
    baseSha,
    headSha,
    schemaVersion: 1,
    surfaces: [{ id: componentSurface, paths: [componentPath], states }],
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  return { manifest, manifestPath, requiredRecordsPath, root: evidenceRoot };
}

async function expectManifestFailure(t, mutateFixture, message) {
  const fixture = await anEvidenceFixture(t);
  await mutateFixture(fixture);
  await writeFile(fixture.manifestPath, `${JSON.stringify(fixture.manifest)}\n`);

  await expect(
    validateRenderedEvidence({
      baseSha,
      evidenceRoot: fixture.root,
      headSha,
      requiredRecordsPath: fixture.requiredRecordsPath,
    }),
  ).rejects.toThrow(message);
}

describe('rendered evidence mutation boundary', () => {
  it('@spec:018 S2 validates and decodes a bounded PNG', () => {
    const bytes = aPng();

    expect(validateRenderedImageBytes('fixture.png', bytes, { decode: false })).toEqual({
      decodedBytes: 5,
    });
    expect(validateRenderedImageBytes('fixture.png', bytes, { decode: true })).toEqual({
      decodedBytes: 5,
    });
  });

  it.each([
    ['fixture.webp', aPng(), /schema v1.*PNG|unsupported rendered evidence/iu],
    ['fixture.png', Buffer.from('not a png'), /invalid or truncated/iu],
    ['fixture.png', aPng({ decoded: Buffer.from([5, 1, 2, 3, 255]) }), /scanline filter/iu],
  ])('@spec:018 S2 rejects unsafe image payload %#', (path, bytes, message) => {
    expect(() => validateRenderedImageBytes(path, bytes, { decode: true })).toThrow(message);
  });

  it('@spec:018 S2 rejects a PNG chunk whose CRC no longer matches', () => {
    const bytes = Buffer.from(aPng());
    bytes[bytes.length - 1] ^= 1;

    expect(() => validateRenderedImageBytes('fixture.png', bytes, { decode: true })).toThrow(
      /CRC/iu,
    );
  });

  it.each([
    ['component:ki-button', ['default', 'dark', 'rtl']],
    ['component-generator', ['default', 'dark', 'rtl']],
    ['elements-config', ['default', 'dark', 'rtl']],
    ['tokens', ['light', 'dark']],
    ['site', ['wide', 'narrow']],
    ['path:README.md', ['default']],
  ])('@spec:018 S2 derives the contractual states for %s', (surface, states) => {
    expect(requiredRenderedStates(surface)).toEqual(states);
  });

  it('@spec:018 S2 rejects unknown surfaces and non-canonical manifest paths', () => {
    expect(() => requiredRenderedStates('unknown')).toThrow(/no contractual state inventory/iu);
    expect(() => assertSafeRenderedPath('../escape.png', 'image')).toThrow(/without traversal/iu);
    expect(() => assertSafeRenderedPath('nested/image.png', 'image')).not.toThrow();
  });

  it('@spec:018 S2 validates a complete integrity-bound manifest', async (t) => {
    const fixture = await anEvidenceFixture(t);

    const result = await validateRenderedEvidence({
      baseSha,
      evidenceRoot: fixture.root,
      headSha,
      requiredRecordsPath: fixture.requiredRecordsPath,
    });

    expect(result).toEqual({
      imageCount: 3,
      manifestSha256: createHash('sha256')
        .update(await readFile(fixture.manifestPath))
        .digest('hex'),
    });
  });

  it('@spec:018 S2 rejects evidence bound to another frozen revision', async (t) => {
    const fixture = await anEvidenceFixture(t);

    await expect(
      validateRenderedEvidence({
        baseSha: 'c'.repeat(40),
        evidenceRoot: fixture.root,
        headSha,
        requiredRecordsPath: fixture.requiredRecordsPath,
      }),
    ).rejects.toThrow(/baseSha.*frozen review base/iu);
  });

  it('@spec:018 S2 rejects a missing contractual rendered state', async (t) => {
    const fixture = await anEvidenceFixture(t);
    fixture.manifest.surfaces[0].states.pop();
    await writeFile(fixture.manifestPath, `${JSON.stringify(fixture.manifest)}\n`);

    await expect(
      validateRenderedEvidence({
        baseSha,
        evidenceRoot: fixture.root,
        headSha,
        requiredRecordsPath: fixture.requiredRecordsPath,
      }),
    ).rejects.toThrow(/missing required rendered state.*rtl/iu);
  });

  it('@spec:018 S2 rejects duplicate state bytes within one surface', async (t) => {
    const fixture = await anEvidenceFixture(t);
    fixture.manifest.surfaces[0].states[1].sha256 = fixture.manifest.surfaces[0].states[0].sha256;
    await writeFile(fixture.manifestPath, `${JSON.stringify(fixture.manifest)}\n`);

    await expect(
      validateRenderedEvidence({
        baseSha,
        evidenceRoot: fixture.root,
        headSha,
        requiredRecordsPath: fixture.requiredRecordsPath,
      }),
    ).rejects.toThrow(/duplicate state image digest/iu);
  });

  it('@spec:018 S2 rejects a symbolic link discovered inside evidence', async (t) => {
    const fixture = await anEvidenceFixture(t);
    await symlink(join(fixture.root, 'default.png'), join(fixture.root, 'linked.png'));

    await expect(
      validateRenderedEvidence({
        baseSha,
        evidenceRoot: fixture.root,
        headSha,
        requiredRecordsPath: fixture.requiredRecordsPath,
      }),
    ).rejects.toThrow(/symbolic link/iu);
  });

  it.each([
    [
      'an unsupported manifest schema',
      ({ manifest }) => {
        manifest.schemaVersion = 2;
      },
      /schemaVersion must be 1/iu,
    ],
    [
      'a non-array surface roster',
      ({ manifest }) => {
        manifest.surfaces = null;
      },
      /surfaces must be an array/iu,
    ],
    [
      'an empty surface id',
      ({ manifest }) => {
        manifest.surfaces[0].id = '';
      },
      /surface id must be non-empty/iu,
    ],
    [
      'an unrelated surface id',
      ({ manifest }) => {
        manifest.surfaces[0].id = 'component:other';
      },
      /does not match an affected UI surface/iu,
    ],
    [
      'an empty path roster',
      ({ manifest }) => {
        manifest.surfaces[0].paths = [];
      },
      /paths must be a non-empty array/iu,
    ],
    [
      'an unexpected changed path',
      ({ manifest }) => {
        manifest.surfaces[0].paths = ['packages/elements/src/other.css'];
      },
      /missing affected UI path|unexpected UI path/iu,
    ],
    [
      'an empty state roster',
      ({ manifest }) => {
        manifest.surfaces[0].states = [];
      },
      /at least one rendered state/iu,
    ],
    [
      'an unstable state name',
      ({ manifest }) => {
        manifest.surfaces[0].states[0].name = 'Default State';
      },
      /stable lowercase identifier/iu,
    ],
    [
      'a duplicate state name',
      ({ manifest }) => {
        manifest.surfaces[0].states[1].name = 'default';
      },
      /duplicate manifest state/iu,
    ],
    [
      'a traversing image path',
      ({ manifest }) => {
        manifest.surfaces[0].states[0].image = '../default.png';
      },
      /without traversal/iu,
    ],
    [
      'an invalid image digest',
      ({ manifest }) => {
        manifest.surfaces[0].states[0].sha256 = 'invalid';
      },
      /sha256 is invalid/iu,
    ],
    [
      'a missing image',
      ({ manifest }) => {
        manifest.surfaces[0].states[0].image = 'missing.png';
      },
      /image is missing from EVIDENCE_DIR/iu,
    ],
    [
      'a mismatched image digest',
      ({ manifest }) => {
        manifest.surfaces[0].states[0].sha256 = 'c'.repeat(64);
      },
      /sha256 does not match/iu,
    ],
    [
      'a missing affected surface',
      ({ manifest }) => {
        manifest.surfaces = [];
      },
      /missing affected UI surface/iu,
    ],
    [
      'an unbound extra image',
      async ({ root }) => {
        await writeFile(join(root, 'extra.png'), aPng());
      },
      /not integrity-bound by the manifest/iu,
    ],
  ])('@spec:018 S2 rejects %s', async (_label, mutateFixture, message, t) => {
    await expectManifestFailure(t, mutateFixture, message);
  });

  it('@spec:018 S2 binds both frozen revision SHAs', async (t) => {
    const fixture = await anEvidenceFixture(t);

    await expect(
      validateRenderedEvidence({
        baseSha,
        evidenceRoot: fixture.root,
        headSha: 'c'.repeat(40),
        requiredRecordsPath: fixture.requiredRecordsPath,
      }),
    ).rejects.toThrow(/headSha.*frozen review head/iu);
  });

  it('@spec:018 S2 rejects malformed and duplicate required UI records', async (t) => {
    const fixture = await anEvidenceFixture(t);
    await writeFile(fixture.requiredRecordsPath, `${componentSurface}\0`);
    await expect(
      validateRenderedEvidence({
        baseSha,
        evidenceRoot: fixture.root,
        headSha,
        requiredRecordsPath: fixture.requiredRecordsPath,
      }),
    ).rejects.toThrow(/record is malformed/iu);

    await writeFile(
      fixture.requiredRecordsPath,
      `${componentSurface}\0${componentPath}\0${componentSurface}\0${componentPath}\0`,
    );
    await expect(
      validateRenderedEvidence({
        baseSha,
        evidenceRoot: fixture.root,
        headSha,
        requiredRecordsPath: fixture.requiredRecordsPath,
      }),
    ).rejects.toThrow(/duplicate affected UI path/iu);
  });

  it('@spec:018 S2 exposes an awaitable CLI boundary without executing on import', async (t) => {
    const fixture = await anEvidenceFixture(t);
    let stdout = '';

    await runRenderedEvidenceCli({
      arguments_: [fixture.root, fixture.requiredRecordsPath, baseSha, headSha],
      writeStdout: (value) => {
        stdout += value;
      },
    });

    expect(stdout).toMatch(/^3\t[0-9a-f]{64}\n$/u);
    await expect(
      runRenderedEvidenceCli({ arguments_: [], writeStdout: () => undefined }),
    ).rejects.toThrow(/usage/iu);
  });
});
