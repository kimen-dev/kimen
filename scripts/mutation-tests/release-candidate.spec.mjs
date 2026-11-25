import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  access,
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { canonicalJson } from '../lib/canonical-json.mjs';
import {
  buildCandidate,
  evaluatePublication,
  validateCandidateManifest,
  verifyCandidate,
} from '../release/build-candidate.mjs';
import { releasePackages } from '../release/release-plan.mjs';
import { builtManifest, writeBuiltPackage } from '../tests/fixtures/built-package.mjs';
import {
  candidateArchive,
  packageRecord as packedRecord,
} from '../tests/fixtures/candidate-archive.mjs';
import { mcpFixtureFields, writeMcpFixtureFiles } from '../tests/fixtures/mcp-package.mjs';

// @spec:018-project-integrity-hardening#S7

const version = '1.2.3';
const tag = `v${version}`;
const artifactId = 73_311;
const candidateSha256 = 'a'.repeat(64);
const repositoryUrl = 'git+https://github.com/kimen-dev/kimen.git';
const mcpName = '@kimen/mcp-server';
const packageNames = [...releasePackages.keys()];
const directoryOf = (name) => releasePackages.get(name).split('/')[1];
const fileOf = (name) => `${name.slice(1).replace('/', '-')}-${version}.tgz`;
const integrityOf = (name) =>
  `sha512-${Buffer.alloc(64, packageNames.indexOf(name) + 1).toString('base64')}`;
const elementsIntegrity = integrityOf('@kimen/elements');
const tokensIntegrity = integrityOf('@kimen/tokens');
// The runtime fields of the fixture packages mirror the repository.
const catalogDependent = {
  dependencies: { '@kimen/catalog': 'workspace:*' },
  devDependencies: { '@kimen/elements': 'workspace:*', vitest: '5.1.0' },
};
const elementsDependent = {
  dependencies: { '@kimen/elements': 'workspace:*' },
  devDependencies: { vitest: '5.1.0' },
};
const fixtureDependencies = {
  '@kimen/elements': { devDependencies: { '@kimen/tokens': 'workspace:*' } },
  '@kimen/catalog': { dependencies: { zod: '4.6.7' } },
  '@kimen/emitter': catalogDependent,
  '@kimen/adapter-a2ui': catalogDependent,
  '@kimen/adapter-mcp-apps': catalogDependent,
  '@kimen/react': elementsDependent,
  '@kimen/vue': elementsDependent,
  '@kimen/angular': elementsDependent,
};
const angularName = '@kimen/angular';

const hash = (algorithm, bytes, encoding = 'hex') =>
  createHash(algorithm).update(bytes).digest(encoding);

const run = (command, arguments_, cwd) =>
  execFileSync(command, arguments_, {
    cwd,
    encoding: 'utf8',
    env: { HOME: process.env.HOME, LC_ALL: 'C', PATH: process.env.PATH },
  }).trim();

const repositoryMetadata = (directory, overrides = {}) => ({
  type: 'git',
  url: repositoryUrl,
  directory: `packages/${directory}`,
  ...overrides,
});

const packageRecord = (name, file, integrity) => ({
  name,
  file,
  sha256: name === '@kimen/elements' ? 'b'.repeat(64) : 'c'.repeat(64),
  integrity,
  size: name === '@kimen/elements' ? 1_337 : 733,
});

const aManifest = (overrides = {}) => ({
  schemaVersion: 1,
  mode: 'release',
  sourceSha: '1'.repeat(40),
  tag,
  version,
  packages: packageNames.map((name) => packageRecord(name, fileOf(name), integrityOf(name))),
  ...overrides,
});

const withRecord = (patch, index = 0) => {
  const manifest = aManifest();
  manifest.packages = manifest.packages.map((record, recordIndex) =>
    recordIndex === index ? { ...record, ...patch } : record,
  );
  return manifest;
};

const successfulEvidence = (overrides = {}) => ({
  status: 'success',
  artifactId,
  candidateSha256,
  ...overrides,
});

const publicationInput = (overrides = {}) => {
  const manifest = overrides.manifest ?? aManifest();
  return {
    candidate: { manifest, candidateSha256 },
    artifactId,
    verificationEvidence: successfulEvidence({ oidc: false }),
    browserEvidence: {
      chromium: successfulEvidence(),
      firefox: successfulEvidence(),
      webkit: successfulEvidence(),
    },
    npmVersion: '11.5.1',
    registry: Object.fromEntries(
      packageNames.map((name) => [name, { exists: true, versions: {} }]),
    ),
    trustedPublishers: Object.fromEntries(
      packageNames.map((name) => [
        name,
        { configured: true, workflow: '.github/workflows/release.yml', environment: 'npm' },
      ]),
    ),
    authority: {
      kind: 'oidc',
      workflow: '.github/workflows/release.yml',
      environment: 'npm',
    },
    environment: {},
    ...overrides,
  };
};

const writePackage = async (root, name, directory, options) => {
  const packageDirectory = join(root, 'packages', directory);
  const manifest = {
    name,
    version: options.packageVersions[name] ?? options.version,
    private: options.privatePackages,
    type: 'module',
    license: 'Apache-2.0',
    repository: repositoryMetadata(directory, options.repositoryOverrides[name]),
    files: ['dist', 'NOTICE'],
    ...fixtureDependencies[name],
    ...options.manifestOverrides[name],
    ...(name === mcpName ? mcpFixtureFields : {}),
    ...(options.scripts[name] === undefined ? {} : { scripts: options.scripts[name] }),
  };
  if (name === angularName) delete manifest.files;
  // A published package carries its licence and its notices. `null` leaves a
  // file out of the fixture, an empty string writes an empty one.
  const legalFiles = {
    LICENSE: 'Apache License, Version 2.0 (fixture)\n',
    NOTICE: 'Kimen fixture notices\n',
    ...options.legalFiles[name],
  };
  await mkdir(join(packageDirectory, 'dist'), { recursive: true });
  await Promise.all([
    writeFile(join(packageDirectory, 'package.json'), canonicalJson(manifest)),
    writeFile(join(packageDirectory, 'dist/index.js'), `export const name = '${name}';\n`),
    writeFile(join(packageDirectory, 'README.md'), `# ${name}\n`),
    ...Object.entries(legalFiles)
      .filter(([, contents]) => contents !== null)
      .map(([file, contents]) => writeFile(join(packageDirectory, file), contents)),
  ]);
  if (name === mcpName) await writeMcpFixtureFiles(packageDirectory, manifest.version);
  if (name === angularName && options.builtOverrides !== null) {
    await writeBuiltPackage(packageDirectory, manifest, options.builtOverrides);
  }
  return { directory: packageDirectory, manifest };
};

const createRepositoryFixture = async (overrides = {}) => {
  const options = {
    version,
    privatePackages: false,
    tag,
    candidateOutsideMain: false,
    legalFiles: {},
    packageVersions: {},
    manifestOverrides: {},
    builtOverrides: {},
    repositoryOverrides: {},
    scripts: {},
    extraPackages: [],
    ...overrides,
  };
  const root = await mkdtemp(join(tmpdir(), 'kimen-release-mutation-repo-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  const packageInputs = await Promise.all([
    ...packageNames.map((name) => writePackage(root, name, directoryOf(name), options)),
    ...options.extraPackages.map(({ name, directory }) =>
      writePackage(root, name, directory, options),
    ),
  ]);
  await writeFile(join(root, 'README.md'), '# release mutation fixture\n');
  run('git', ['init', '-b', 'main'], root);
  run('git', ['config', 'user.name', 'Kimen fixture'], root);
  run('git', ['config', 'user.email', 'fixture@kimen.invalid'], root);
  run('git', ['add', '.'], root);
  run('git', ['commit', '-m', 'fixture: release candidate'], root);
  if (options.candidateOutsideMain) {
    run('git', ['switch', '-c', 'candidate-outside-main'], root);
    await writeFile(join(root, 'candidate-only.txt'), 'not reachable from main\n');
    run('git', ['add', 'candidate-only.txt'], root);
    run('git', ['commit', '-m', 'fixture: outside main'], root);
  }
  if (options.tag !== null) {
    run('git', ['tag', options.tag], root);
  }
  return {
    root,
    sourceSha: run('git', ['rev-parse', 'HEAD'], root),
    packageDirectories: packageInputs.map(({ directory }) => directory),
    packages: Object.fromEntries(
      packageInputs.map((input) => [input.manifest.name, input.directory]),
    ),
  };
};

const buildFixture = async (fixture, overrides = {}) => {
  const outputDirectory =
    overrides.outputDirectory ?? (await mkdtemp(join(tmpdir(), 'kimen-release-mutation-output-')));
  if (overrides.outputDirectory === undefined) {
    onTestFinished(() => rm(outputDirectory, { recursive: true, force: true }));
  }
  return buildCandidate({
    mode: 'release',
    repositoryRoot: fixture.root,
    outputDirectory,
    sourceSha: fixture.sourceSha,
    tag,
    protectedMainRef: 'refs/heads/main',
    packageDirectories: fixture.packageDirectories,
    ...overrides,
  });
};

const extractCandidate = async (archivePath) => {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-release-mutation-extract-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const listing = run('tar', ['-tf', archivePath], directory).split('\n');
  run('tar', ['-xf', archivePath, '-C', directory], directory);
  return { directory, listing };
};

const rewriteFirstTarChecksum = (bytes) => {
  bytes.fill(32, 148, 156);
  const sum = bytes.subarray(0, 512).reduce((total, byte) => total + byte, 0);
  Buffer.from(`${sum.toString(8).padStart(6, '0')}\0 `).copy(bytes, 148);
};

const firstTarSize = (bytes) =>
  Number.parseInt(bytes.subarray(124, 136).toString('ascii').replaceAll('\0', '').trim(), 8);

describe('release candidate manifest mutation boundary', () => {
  it('S7 accepts only the canonical exact release-package manifest', () => {
    const manifest = aManifest();

    expect(validateCandidateManifest(manifest)).toBe(manifest);
  });

  it.each([
    ['missing package', [aManifest().packages[0]], /exact package set/i],
    [
      'tooling package',
      [
        ...aManifest().packages,
        packageRecord('@kimen/nx-plugin', 'kimen-nx-plugin-1.2.3.tgz', tokensIntegrity),
      ],
      /exact package set/i,
    ],
    [
      'missing catalog',
      aManifest().packages.filter(({ name }) => name !== '@kimen/catalog'),
      /exact package set/i,
    ],
    [
      'unscoped placeholder',
      [...aManifest().packages, packageRecord('kimen', 'kimen-1.2.3.tgz', tokensIntegrity)],
      /exact package set/i,
    ],
    ['reversed packages', [...aManifest().packages].reverse(), /canonical order/i],
  ])('S7 rejects %s', (_name, packages, expected) => {
    expect(() => validateCandidateManifest(aManifest({ packages }))).toThrow(expected);
  });

  it.each([
    ['non-object', null, /must be an object/i],
    ['extra field', { ...aManifest(), extra: true }, /unexpected or missing fields/i],
    ['schema', aManifest({ schemaVersion: 2 }), /schemaVersion must be 1/i],
    ['mode', aManifest({ mode: 'publish' }), /release or dry-run/i],
    ['source SHA', aManifest({ sourceSha: 'not-a-sha' }), /40-character Git SHA/i],
    ['version', aManifest({ version: 'v1.2.3' }), /exact X\.Y\.Z/i],
    ['release tag', aManifest({ tag: 'v1.2.4' }), /match candidate version/i],
    ['dry-run tag', aManifest({ mode: 'dry-run' }), /dry-run candidate tag must be null/i],
  ])('S7 rejects malformed manifest %s', (_name, manifest, expected) => {
    expect(() => validateCandidateManifest(manifest)).toThrow(expected);
  });

  it.each([
    ['record fields', { extra: true }, /unexpected or missing fields/i],
    ['file', { file: 'wrong.tgz' }, /file must be kimen-elements/i],
    ['SHA-256', { sha256: 'bad' }, /SHA-256 digest/i],
    [
      'SRI algorithm',
      { integrity: `sha256-${Buffer.alloc(32).toString('base64')}` },
      /SHA-512 SRI/i,
    ],
    ['SRI bytes', { integrity: 'sha512-YQ==' }, /canonical SHA-512 SRI/i],
    ['zero size', { size: 0 }, /positive safe integer/i],
    ['fractional size', { size: 1.5 }, /positive safe integer/i],
  ])('S7 rejects malformed package %s', (_name, patch, expected) => {
    expect(() => validateCandidateManifest(withRecord(patch))).toThrow(expected);
  });
});

describe('release candidate build and verification mutation boundary', { timeout: 30_000 }, () => {
  it('S7 dry-run preserves private versions, refs and worktree state', async () => {
    const fixture = await createRepositoryFixture({
      version: '0.0.0',
      privatePackages: true,
      tag: null,
    });
    const before = {
      elements: await readFile(join(fixture.packages['@kimen/elements'], 'package.json'), 'utf8'),
      tokens: await readFile(join(fixture.packages['@kimen/tokens'], 'package.json'), 'utf8'),
      head: run('git', ['rev-parse', 'HEAD'], fixture.root),
      tags: run('git', ['tag', '--list'], fixture.root),
      status: run('git', ['status', '--porcelain=v1'], fixture.root),
    };

    const result = await buildFixture(fixture, { mode: 'dry-run', tag: null });

    expect(result.manifest).toMatchObject({ mode: 'dry-run', tag: null, version: '0.0.0' });
    expect(result.manifest.packages.map(({ name }) => name)).toEqual(packageNames);
    expect({
      elements: await readFile(join(fixture.packages['@kimen/elements'], 'package.json'), 'utf8'),
      tokens: await readFile(join(fixture.packages['@kimen/tokens'], 'package.json'), 'utf8'),
      head: run('git', ['rev-parse', 'HEAD'], fixture.root),
      tags: run('git', ['tag', '--list'], fixture.root),
      status: run('git', ['status', '--porcelain=v1'], fixture.root),
    }).toEqual(before);
  });

  it('S7 builds deterministic canonical package facts and checksums', async () => {
    const fixture = await createRepositoryFixture();
    const first = await buildFixture(fixture);
    const second = await buildFixture(fixture);
    const extracted = await extractCandidate(first.archivePath);
    const manifestBytes = await readFile(join(extracted.directory, 'manifest.json'));
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const packageFacts = await Promise.all(
      manifest.packages.map(async ({ file, name }) => {
        const bytes = await readFile(join(extracted.directory, file));
        return {
          name,
          file,
          sha256: hash('sha256', bytes),
          integrity: `sha512-${hash('sha512', bytes, 'base64')}`,
          size: (await stat(join(extracted.directory, file))).size,
        };
      }),
    );
    const sumFiles = ['manifest.json', ...manifest.packages.map(({ file }) => file)].sort();
    const expectedSums = `${(
      await Promise.all(
        sumFiles.map(
          async (file) =>
            `${hash('sha256', await readFile(join(extracted.directory, file)))}  ${file}`,
        ),
      )
    ).join('\n')}\n`;

    expect(extracted.listing).toEqual([
      'SHA256SUMS',
      ...packageNames.map(fileOf).sort(),
      'manifest.json',
    ]);
    expect(manifestBytes.toString('utf8')).toBe(canonicalJson(manifest));
    expect(manifest.packages).toEqual(packageFacts);
    expect(await readFile(join(extracted.directory, 'SHA256SUMS'), 'utf8')).toBe(expectedSums);
    expect(first.candidateSha256).toBe(hash('sha256', await readFile(first.archivePath)));
    expect(second.candidateSha256).toBe(first.candidateSha256);
    expect(await readFile(second.archivePath)).toEqual(await readFile(first.archivePath));
  });

  it.each([
    ['dry-run tag', { fixture: { tag: null }, build: { mode: 'dry-run' } }, /tag must be null/i],
    ['missing release tag', { fixture: { tag: null }, build: { tag: null } }, /requires a tag/i],
    [
      'tag/version mismatch',
      { fixture: { tag: 'v1.2.4' }, build: { tag: 'v1.2.4' } },
      /does not match package version/i,
    ],
    [
      'source outside main',
      { fixture: { candidateOutsideMain: true }, build: {} },
      /reachable from protected main/i,
    ],
    ['private release', { fixture: { privatePackages: true }, build: {} }, /private release/i],
    [
      'repository URL',
      {
        fixture: {
          repositoryOverrides: {
            '@kimen/elements': { url: 'git+https://example.invalid/not-kimen.git' },
          },
        },
        build: {},
      },
      /repository metadata/i,
    ],
    [
      'repository directory',
      {
        fixture: {
          repositoryOverrides: { '@kimen/tokens': { directory: 'packages/elements' } },
        },
        build: {},
      },
      /repository metadata/i,
    ],
    [
      'prepack lifecycle',
      {
        fixture: { scripts: { '@kimen/elements': { prepack: 'node malicious.js' } } },
        build: {},
      },
      /lifecycle scripts.*prepack/i,
    ],
    [
      'publish lifecycle',
      {
        fixture: { scripts: { '@kimen/tokens': { postpublish: 'node malicious.js' } } },
        build: {},
      },
      /lifecycle scripts.*postpublish/i,
    ],
  ])('S7 fails closed on %s', async (_name, options, expected) => {
    const fixture = await createRepositoryFixture(options.fixture);

    await expect(buildFixture(fixture, options.build)).rejects.toThrow(expected);
  });

  it.each([
    ['@kimen/elements', 'LICENSE', null],
    ['@kimen/elements', 'NOTICE', null],
    ['@kimen/tokens', 'LICENSE', ''],
    ['@kimen/tokens', 'NOTICE', ''],
  ])(
    'S7 refuses a candidate whose %s tarball would lack a usable %s',
    async (name, file, contents) => {
      const fixture = await createRepositoryFixture({
        legalFiles: { [name]: { [file]: contents } },
      });

      await expect(buildFixture(fixture)).rejects.toThrow(
        `${name} tarball is missing package/${file}; a published package carries its licence and its notices`,
      );
    },
  );

  it('S7 a legal file only counts when it is a regular file at the package root', async () => {
    // A directory named NOTICE packs its contents under package/NOTICE/, and
    // a nested dist/LICENSE is not the package's licence.
    const fixture = await createRepositoryFixture({
      legalFiles: { '@kimen/tokens': { NOTICE: null } },
    });
    const tokens = fixture.packageDirectories[1];
    await mkdir(join(tokens, 'NOTICE'), { recursive: true });
    await writeFile(join(tokens, 'NOTICE/inner.txt'), 'not a notice file\n');
    await writeFile(join(tokens, 'dist/NOTICE'), 'nested, not at the root\n');
    run('git', ['add', '.'], fixture.root);
    run('git', ['commit', '-m', 'fixture: notice directory'], fixture.root);

    await expect(
      buildFixture(fixture, {
        sourceSha: run('git', ['rev-parse', 'HEAD'], fixture.root),
        tag: null,
        mode: 'dry-run',
      }),
    ).rejects.toThrow(/@kimen\/tokens tarball is missing package\/NOTICE/u);
  });

  it('S7 packs LICENSE and NOTICE into every tarball of a complete candidate', async () => {
    const fixture = await createRepositoryFixture();
    const candidate = await buildFixture(fixture);
    const directory = await mkdtemp(join(tmpdir(), 'kimen-release-mutation-legal-'));
    onTestFinished(() => rm(directory, { recursive: true, force: true }));
    run('tar', ['-xf', candidate.archivePath, '-C', directory], directory);

    for (const { file } of candidate.manifest.packages) {
      const listing = run('tar', ['-tzf', join(directory, file)], directory).split('\n');
      expect(listing).toContain('package/LICENSE');
      expect(listing).toContain('package/NOTICE');
    }
  });

  it('S7 rejects lifecycle scripts before npm can execute them', async () => {
    const fixture = await createRepositoryFixture({
      scripts: {
        '@kimen/elements': {
          prepack: "node -e \"require('node:fs').writeFileSync('executed', 'bad')\"",
        },
      },
    });
    const sentinel = join(fixture.packages['@kimen/elements'], 'executed');

    await expect(buildFixture(fixture)).rejects.toThrow(/prepack/i);
    await expect(access(sentinel)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('S7 rejects missing, duplicate and version-drifted package inputs', async () => {
    const fixture = await createRepositoryFixture();
    await expect(
      buildFixture(fixture, { packageDirectories: [fixture.packageDirectories[0]] }),
    ).rejects.toThrow(/exactly.*elements.*tokens/i);
    await expect(
      buildFixture(fixture, {
        packageDirectories: [
          fixture.packageDirectories[0],
          fixture.packageDirectories[0],
          ...fixture.packageDirectories.slice(2),
        ],
      }),
    ).rejects.toThrow(/unexpected or duplicate/i);

    const drifted = await createRepositoryFixture({
      packageVersions: { '@kimen/tokens': '1.2.4' },
    });
    await expect(buildFixture(drifted)).rejects.toThrow(/versions must match/i);
  });

  it('S7 validates build arguments and protected-main identity', async () => {
    await expect(buildCandidate({ mode: 'invalid' })).rejects.toThrow(/mode must be/i);
    await expect(buildCandidate({ mode: 'release', sourceSha: 'bad' })).rejects.toThrow(
      /40-character Git SHA/i,
    );
    const fixture = await createRepositoryFixture();
    await expect(
      buildFixture(fixture, { protectedMainRef: 'refs/heads/not-main' }),
    ).rejects.toThrow(/protected main ref must be refs\/heads\/main/i);
  });

  it('S7 never overwrites an existing immutable candidate', async () => {
    const fixture = await createRepositoryFixture();
    const outputDirectory = await mkdtemp(join(tmpdir(), 'kimen-release-mutation-output-'));
    onTestFinished(() => rm(outputDirectory, { recursive: true, force: true }));
    await buildFixture(fixture, { outputDirectory });

    await expect(buildFixture(fixture, { outputDirectory })).rejects.toMatchObject({
      code: 'EEXIST',
    });
  });

  it('S7 independently verifies the exact immutable candidate', async () => {
    const fixture = await createRepositoryFixture();
    const candidate = await buildFixture(fixture);

    await expect(
      verifyCandidate({
        archivePath: candidate.archivePath,
        expectedSha256: candidate.candidateSha256,
        environment: {},
      }),
    ).resolves.toEqual({
      candidateSha256: candidate.candidateSha256,
      manifest: candidate.manifest,
      mcpServer: { name: mcpName, source: 'tarball', workspaceLinked: false },
    });
  });

  it.each([
    ['invalid expected digest', 'bad', {}, /expected candidate SHA-256/i],
    [
      'GitHub OIDC token',
      candidateSha256,
      { ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'ephemeral' },
      /no OIDC identity/i,
    ],
    [
      'GitHub OIDC URL',
      candidateSha256,
      { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.invalid' },
      /no OIDC identity/i,
    ],
    [
      'cloud workload identity',
      candidateSha256,
      { AWS_WEB_IDENTITY_TOKEN_FILE: '/tmp/token' },
      /no OIDC identity/i,
    ],
  ])(
    'S7 verifier rejects %s before reading bytes',
    async (_name, digest, environment, expected) => {
      await expect(
        verifyCandidate({ archivePath: '/not-read', expectedSha256: digest, environment }),
      ).rejects.toThrow(expected);
    },
  );

  it('S7 rejects outer candidate-byte tampering', async () => {
    const fixture = await createRepositoryFixture();
    const candidate = await buildFixture(fixture);
    await appendFile(candidate.archivePath, Buffer.from([0]));

    await expect(
      verifyCandidate({
        archivePath: candidate.archivePath,
        expectedSha256: candidate.candidateSha256,
        environment: {},
      }),
    ).rejects.toThrow(/digest mismatch/i);
  });

  it('S7 rejects non-canonical TAR metadata even with a matching outer digest', async () => {
    const fixture = await createRepositoryFixture();
    const candidate = await buildFixture(fixture);
    const bytes = await readFile(candidate.archivePath);
    bytes[104] = '7'.charCodeAt(0);
    rewriteFirstTarChecksum(bytes);
    await writeFile(candidate.archivePath, bytes);

    await expect(
      verifyCandidate({
        archivePath: candidate.archivePath,
        expectedSha256: hash('sha256', bytes),
        environment: {},
      }),
    ).rejects.toThrow(/metadata is not canonical/i);
  });

  it('S7 rejects non-zero TAR padding even with a matching outer digest', async () => {
    const fixture = await createRepositoryFixture();
    const candidate = await buildFixture(fixture);
    const bytes = await readFile(candidate.archivePath);
    bytes[512 + firstTarSize(bytes)] = 1;
    await writeFile(candidate.archivePath, bytes);

    await expect(
      verifyCandidate({
        archivePath: candidate.archivePath,
        expectedSha256: hash('sha256', bytes),
        environment: {},
      }),
    ).rejects.toThrow(/padding is not canonical/i);
  });

  it('S7 rejects internal SHA256SUMS tampering even with a matching outer digest', async () => {
    const fixture = await createRepositoryFixture();
    const candidate = await buildFixture(fixture);
    const bytes = await readFile(candidate.archivePath);
    bytes[512] = bytes[512] === 97 ? 98 : 97;
    await writeFile(candidate.archivePath, bytes);

    await expect(
      verifyCandidate({
        archivePath: candidate.archivePath,
        expectedSha256: hash('sha256', bytes),
        environment: {},
      }),
    ).rejects.toThrow(/SHA256SUMS/i);
  });
});

const packedManifest = (directory, file) =>
  JSON.parse(run('tar', ['-xOzf', join(directory, file), 'package/package.json'], directory));

const packedListing = (directory, file) =>
  run('tar', ['-tzf', join(directory, file)], directory)
    .split('\n')
    .sort();

// npm pack of a package directory as the candidate builder runs it.
const npmPack = async (directory) => {
  const home = await mkdtemp(join(tmpdir(), 'kimen-release-mutation-pack-'));
  onTestFinished(() => rm(home, { recursive: true, force: true }));
  await writeFile(join(home, '.npmrc'), '');
  const [{ filename }] = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', home], {
      cwd: directory,
      encoding: 'utf8',
      env: {
        HOME: home,
        LC_ALL: 'C',
        PATH: process.env.PATH,
        npm_config_cache: join(home, '.npm-cache'),
        npm_config_offline: 'true',
        npm_config_userconfig: join(home, '.npmrc'),
      },
    }),
  );
  return readFile(join(home, filename));
};

describe('release candidate workspace rewrite mutation boundary', { timeout: 30_000 }, () => {
  it('S7 stages each catalog dependent with the exact candidate range and no development dependencies', async () => {
    const fixture = await createRepositoryFixture();
    const candidate = await buildFixture(fixture);
    const { directory } = await extractCandidate(candidate.archivePath);

    for (const name of [
      '@kimen/emitter',
      '@kimen/adapter-a2ui',
      '@kimen/adapter-mcp-apps',
      '@kimen/react',
      '@kimen/vue',
    ]) {
      const source = JSON.parse(
        await readFile(join(fixture.packages[name], 'package.json'), 'utf8'),
      );
      const published = { ...source };
      delete published.devDependencies;
      const [dependency] = Object.keys(source.dependencies);
      expect(packedManifest(directory, fileOf(name))).toEqual({
        ...published,
        dependencies: { [dependency]: version },
      });
      expect(packedListing(directory, fileOf(name))).toEqual([
        'package/LICENSE',
        'package/NOTICE',
        'package/README.md',
        'package/dist/index.js',
        'package/package.json',
      ]);
    }
  });

  it('S7 packs @kimen/angular from its build output with the source legal files and README', async () => {
    const fixture = await createRepositoryFixture();
    const candidate = await buildFixture(fixture);
    const { directory } = await extractCandidate(candidate.archivePath);
    const source = JSON.parse(
      await readFile(join(fixture.packages[angularName], 'package.json'), 'utf8'),
    );

    expect(packedManifest(directory, fileOf(angularName))).toEqual({
      ...builtManifest(source),
      dependencies: { '@kimen/elements': version },
    });
    expect(packedListing(directory, fileOf(angularName))).toEqual([
      'package/LICENSE',
      'package/NOTICE',
      'package/README.md',
      'package/fesm2022/kimen-angular.mjs',
      'package/index.js',
      'package/package.json',
      'package/types/kimen-angular.d.ts',
    ]);
    for (const [file, contents] of [
      ['README.md', `# ${angularName}`],
      ['LICENSE', 'Apache License, Version 2.0 (fixture)'],
      ['NOTICE', 'Kimen fixture notices'],
    ]) {
      expect(
        run('tar', ['-xOzf', join(directory, fileOf(angularName)), `package/${file}`], directory),
      ).toBe(contents);
    }
  });

  it.each([
    ['version', { version: '1.2.2' }],
    ['private', { private: true }],
    ['license', { license: 'MIT' }],
    ['repository', { repository: repositoryMetadata('react') }],
    ['dependencies', { dependencies: { '@kimen/elements': 'workspace:*', tslib: '2.9.1' } }],
    ['optionalDependencies', { optionalDependencies: { lit: '^3.0.0' } }],
    ['peerDependencies', { peerDependencies: { '@angular/core': '^21.0.0' } }],
    ['name', { name: '@kimen/react' }],
  ])('S7 refuses an Angular build whose %s differs from its source', async (field, overrides) => {
    const fixture = await createRepositoryFixture({ builtOverrides: overrides });

    await expect(buildFixture(fixture)).rejects.toThrow(
      `@kimen/angular dist/package.json ${field} differs from its source manifest; rebuild it`,
    );
  });

  it('S7 refuses to pack @kimen/angular before it is built', async () => {
    const fixture = await createRepositoryFixture({ builtOverrides: null });

    await expect(buildFixture(fixture)).rejects.toThrow(
      /^@kimen\/angular has no readable dist\/package\.json; build it first: ENOENT/u,
    );
  });

  it('S7 packs elements, tokens and the catalog from their directories, byte for byte', async () => {
    const fixture = await createRepositoryFixture();
    const candidate = await buildFixture(fixture);
    const { directory } = await extractCandidate(candidate.archivePath);

    for (const name of ['@kimen/elements', '@kimen/tokens', '@kimen/catalog']) {
      expect(
        (await readFile(join(directory, fileOf(name)))).equals(
          await npmPack(fixture.packages[name]),
        ),
      ).toBe(true);
    }
    expect(packedManifest(directory, fileOf('@kimen/catalog')).dependencies).toEqual({
      zod: '4.6.7',
    });
  });

  it.each([
    [
      'a caret workspace range',
      { '@kimen/emitter': { dependencies: { '@kimen/catalog': 'workspace:^' } } },
      '@kimen/emitter dependencies can only use workspace:* on a release package; @kimen/catalog is workspace:^',
    ],
    [
      'a workspace range outside the release set',
      { '@kimen/adapter-a2ui': { optionalDependencies: { '@kimen/nx-plugin': 'workspace:*' } } },
      '@kimen/adapter-a2ui optionalDependencies can only use workspace:* on a release package; @kimen/nx-plugin is workspace:*',
    ],
    [
      'a workspace range on a later package',
      { '@kimen/catalog': { peerDependencies: { '@kimen/emitter': 'workspace:*' } } },
      '@kimen/catalog peerDependencies needs @kimen/emitter, which must be published before it',
    ],
  ])('S7 refuses %s before packing', async (_name, manifestOverrides, message) => {
    const fixture = await createRepositoryFixture({ manifestOverrides });

    await expect(buildFixture(fixture)).rejects.toThrow(message);
  });

  it.each([
    [
      'dependencies',
      { '@kimen/elements': '1.2.4' },
      '@kimen/catalog packed dependencies.@kimen/elements must be 1.2.3, a package of this candidate; found 1.2.4',
    ],
    [
      'peerDependencies',
      { '@kimen/nx-plugin': version },
      '@kimen/catalog packed peerDependencies.@kimen/nx-plugin must be 1.2.3, a package of this candidate; found 1.2.3',
    ],
    [
      'optionalDependencies',
      { '@kimen/tokens': '^1.2.3' },
      '@kimen/catalog packed optionalDependencies.@kimen/tokens must be 1.2.3, a package of this candidate; found ^1.2.3',
    ],
  ])(
    'S7 refuses a packed %s entry a clean consumer cannot install',
    async (field, dependencies, message) => {
      const fixture = await createRepositoryFixture({
        manifestOverrides: {
          '@kimen/catalog': { dependencies: { zod: '4.6.7' }, [field]: dependencies },
        },
      });

      await expect(buildFixture(fixture)).rejects.toThrow(message);
    },
  );

  it('S7 accepts a packed non-Kimen dependency at any range and a Kimen one at the candidate version', async () => {
    const fixture = await createRepositoryFixture({
      manifestOverrides: {
        '@kimen/catalog': { dependencies: { zod: '^4.0.0', '@kimen/elements': version } },
      },
    });
    const candidate = await buildFixture(fixture);
    const { directory } = await extractCandidate(candidate.archivePath);

    expect(packedManifest(directory, fileOf('@kimen/catalog')).dependencies).toEqual({
      zod: '^4.0.0',
      '@kimen/elements': version,
    });
  });

  it('S7 refuses a packed runtime field that is not an object', async () => {
    const fixture = await createRepositoryFixture({
      manifestOverrides: { '@kimen/tokens': { peerDependencies: ['@kimen/elements'] } },
    });

    await expect(buildFixture(fixture)).rejects.toThrow(
      '@kimen/tokens packed peerDependencies must be an object',
    );
  });

  it('S7 independent verification refuses a candidate whose dependent tarball kept workspace:*', async () => {
    const fixture = await createRepositoryFixture();
    const built = await buildFixture(fixture);
    const { directory } = await extractCandidate(built.archivePath);
    const unstaged = await npmPack(fixture.packages['@kimen/adapter-mcp-apps']);
    const files = new Map();
    for (const { name, file } of built.manifest.packages) {
      files.set(
        file,
        name === '@kimen/adapter-mcp-apps' ? unstaged : await readFile(join(directory, file)),
      );
    }
    const manifest = {
      ...built.manifest,
      packages: built.manifest.packages.map(({ name, file }) =>
        packedRecord(name, file, files.get(file)),
      ),
    };
    const { archive, sha256 } = candidateArchive(manifest, files);
    const archivePath = join(directory, 'tampered.tar');
    await writeFile(archivePath, archive);

    await expect(
      verifyCandidate({ archivePath, expectedSha256: sha256, environment: {} }),
    ).rejects.toThrow(
      '@kimen/adapter-mcp-apps packed dependencies.@kimen/catalog must be a registry range, not workspace:',
    );
  });
});

describe('release publication evaluation mutation boundary', () => {
  it('S7 authorizes only complete same-artifact evidence', async () => {
    await expect(evaluatePublication(publicationInput())).resolves.toEqual({
      status: 'eligible',
      actions: packageNames.map((name) => ({
        name,
        action: 'publish',
        file: fileOf(name),
        integrity: integrityOf(name),
      })),
    });
  });

  it('S7 dry-run is validation-only and has no authority', async () => {
    const input = publicationInput({
      manifest: aManifest({ mode: 'dry-run', tag: null }),
      authority: { kind: 'none' },
    });

    await expect(evaluatePublication(input)).resolves.toEqual({
      status: 'validation-only',
      actions: [],
    });
    await expect(
      evaluatePublication({ ...input, authority: publicationInput().authority }),
    ).rejects.toThrow(/validation-only.*OIDC/i);
    await expect(
      evaluatePublication({
        ...input,
        environment: { ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'ephemeral' },
      }),
    ).rejects.toThrow(/validation-only.*OIDC/i);
  });

  it.each([
    [
      'candidate digest',
      (input) => {
        input.candidate.candidateSha256 = 'bad';
      },
      /candidate evidence.*SHA-256/i,
    ],
    [
      'artifact ID',
      (input) => {
        input.artifactId = 0;
      },
      /artifact ID.*positive/i,
    ],
    [
      'verification status',
      (input) => {
        input.verificationEvidence.status = 'failure';
      },
      /verification evidence.*success/i,
    ],
    [
      'verification artifact',
      (input) => {
        input.verificationEvidence.artifactId += 1;
      },
      /verification evidence.*same artifact/i,
    ],
    [
      'verification digest',
      (input) => {
        input.verificationEvidence.candidateSha256 = 'd'.repeat(64);
      },
      /verification evidence.*same candidate/i,
    ],
    [
      'verification OIDC',
      (input) => {
        input.verificationEvidence.oidc = true;
      },
      /verification evidence.*no OIDC/i,
    ],
    [
      'missing browser',
      (input) => {
        delete input.browserEvidence.webkit;
      },
      /exactly chromium, firefox and webkit/i,
    ],
    [
      'browser status',
      (input) => {
        input.browserEvidence.chromium.status = 'failure';
      },
      /chromium browser evidence.*success/i,
    ],
    [
      'browser artifact',
      (input) => {
        input.browserEvidence.firefox.artifactId += 1;
      },
      /firefox browser evidence.*same artifact/i,
    ],
    [
      'browser digest',
      (input) => {
        input.browserEvidence.webkit.candidateSha256 = 'd'.repeat(64);
      },
      /webkit browser evidence.*same candidate/i,
    ],
  ])('S7 rejects stale or incomplete %s evidence', async (_name, mutate, expected) => {
    const input = publicationInput();
    mutate(input);

    await expect(evaluatePublication(input)).rejects.toThrow(expected);
  });

  it.each([
    [
      'wrong authority kind',
      {
        authority: { kind: 'token', workflow: '.github/workflows/release.yml', environment: 'npm' },
      },
      /release OIDC authority/i,
    ],
    [
      'wrong workflow',
      { authority: { kind: 'oidc', workflow: '.github/workflows/other.yml', environment: 'npm' } },
      /release OIDC authority/i,
    ],
    [
      'wrong environment',
      {
        authority: {
          kind: 'oidc',
          workflow: '.github/workflows/release.yml',
          environment: 'development',
        },
      },
      /release OIDC authority/i,
    ],
    ['old npm', { npmVersion: '11.5.0' }, /npm >=11\.5\.1/i],
    ['prerelease npm', { npmVersion: '11.5.1-beta.0' }, /npm >=11\.5\.1/i],
    ['npm token', { environment: { NPM_TOKEN: 'durable' } }, /long-lived npm credentials/i],
    [
      'node auth token',
      { environment: { NODE_AUTH_TOKEN: 'durable' } },
      /long-lived npm credentials/i,
    ],
  ])('S7 rejects %s', async (_name, override, expected) => {
    await expect(evaluatePublication(publicationInput(override))).rejects.toThrow(expected);
  });

  it('S7 fails closed on first publication and publisher-scope gaps', async () => {
    const firstPublication = publicationInput();
    firstPublication.registry['@kimen/elements'] = { exists: false, versions: {} };
    await expect(evaluatePublication(firstPublication)).rejects.toThrow(/first publication/i);

    const missingPublisher = publicationInput();
    missingPublisher.trustedPublishers['@kimen/tokens'].configured = false;
    await expect(evaluatePublication(missingPublisher)).rejects.toThrow(
      /trusted publisher.*tokens/i,
    );

    const wrongPublisherWorkflow = publicationInput();
    wrongPublisherWorkflow.trustedPublishers['@kimen/elements'].workflow =
      '.github/workflows/other.yml';
    await expect(evaluatePublication(wrongPublisherWorkflow)).rejects.toThrow(
      /trusted publisher.*elements/i,
    );
  });

  it('S7 reconciles identical partial retries without rebuilding', async () => {
    const partial = publicationInput();
    partial.registry['@kimen/elements'].versions[version] = { integrity: elementsIntegrity };

    const actions = (skipped) =>
      packageNames.map((name) => ({ name, action: skipped.includes(name) ? 'skip' : 'publish' }));
    await expect(evaluatePublication(partial)).resolves.toMatchObject({
      status: 'eligible',
      actions: actions(['@kimen/elements']),
    });

    partial.registry['@kimen/tokens'].versions[version] = { integrity: tokensIntegrity };
    await expect(evaluatePublication(partial)).resolves.toMatchObject({
      actions: actions(['@kimen/elements', '@kimen/tokens']),
    });
  });

  it('S7 treats conflicting immutable registry integrity as a security failure', async () => {
    const input = publicationInput();
    input.registry['@kimen/elements'].versions[version] = {
      integrity: `sha512-${Buffer.alloc(64, 9).toString('base64')}`,
    };

    await expect(evaluatePublication(input)).rejects.toThrow(
      /integrity conflict.*security failure/i,
    );
  });
});
