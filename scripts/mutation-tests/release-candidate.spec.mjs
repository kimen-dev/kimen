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

// @spec:018-project-integrity-hardening#S7

const version = '1.2.3';
const tag = `v${version}`;
const artifactId = 73_311;
const candidateSha256 = 'a'.repeat(64);
const repositoryUrl = 'git+https://github.com/kimen-dev/kimen.git';
const elementsIntegrity = `sha512-${Buffer.alloc(64, 1).toString('base64')}`;
const tokensIntegrity = `sha512-${Buffer.alloc(64, 2).toString('base64')}`;

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
  packages: [
    packageRecord('@kimen/elements', `kimen-elements-${version}.tgz`, elementsIntegrity),
    packageRecord('@kimen/tokens', `kimen-tokens-${version}.tgz`, tokensIntegrity),
  ],
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
    registry: {
      '@kimen/elements': { exists: true, versions: {} },
      '@kimen/tokens': { exists: true, versions: {} },
    },
    trustedPublishers: {
      '@kimen/elements': {
        configured: true,
        workflow: '.github/workflows/release.yml',
        environment: 'npm',
      },
      '@kimen/tokens': {
        configured: true,
        workflow: '.github/workflows/release.yml',
        environment: 'npm',
      },
    },
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
    files: ['dist'],
    ...(options.scripts[name] === undefined ? {} : { scripts: options.scripts[name] }),
  };
  await mkdir(join(packageDirectory, 'dist'), { recursive: true });
  await Promise.all([
    writeFile(join(packageDirectory, 'package.json'), canonicalJson(manifest)),
    writeFile(join(packageDirectory, 'dist/index.js'), `export const name = '${name}';\n`),
  ]);
  return { directory: packageDirectory, manifest };
};

const createRepositoryFixture = async (overrides = {}) => {
  const options = {
    version,
    privatePackages: false,
    tag,
    candidateOutsideMain: false,
    packageVersions: {},
    repositoryOverrides: {},
    scripts: {},
    extraPackages: [],
    ...overrides,
  };
  const root = await mkdtemp(join(tmpdir(), 'kimen-release-mutation-repo-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  const packageInputs = await Promise.all([
    writePackage(root, '@kimen/elements', 'elements', options),
    writePackage(root, '@kimen/tokens', 'tokens', options),
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
  it('S7 accepts only the canonical exact-two-package manifest', () => {
    const manifest = aManifest();

    expect(validateCandidateManifest(manifest)).toBe(manifest);
  });

  it.each([
    ['missing package', [aManifest().packages[0]], /exact package set/i],
    [
      'catalog package',
      [
        ...aManifest().packages,
        packageRecord('@kimen/catalog', 'kimen-catalog-1.2.3.tgz', tokensIntegrity),
      ],
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

describe('release candidate build and verification mutation boundary', () => {
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
    expect(result.manifest.packages.map(({ name }) => name)).toEqual([
      '@kimen/elements',
      '@kimen/tokens',
    ]);
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
      `kimen-elements-${version}.tgz`,
      `kimen-tokens-${version}.tgz`,
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
        packageDirectories: [fixture.packageDirectories[0], fixture.packageDirectories[0]],
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
  ])('S7 verifier rejects %s before reading bytes', async (_name, digest, environment, expected) => {
    await expect(
      verifyCandidate({ archivePath: '/not-read', expectedSha256: digest, environment }),
    ).rejects.toThrow(expected);
  });

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

describe('release publication evaluation mutation boundary', () => {
  it('S7 authorizes only complete same-artifact evidence', async () => {
    await expect(evaluatePublication(publicationInput())).resolves.toEqual({
      status: 'eligible',
      actions: [
        {
          name: '@kimen/elements',
          action: 'publish',
          file: `kimen-elements-${version}.tgz`,
          integrity: elementsIntegrity,
        },
        {
          name: '@kimen/tokens',
          action: 'publish',
          file: `kimen-tokens-${version}.tgz`,
          integrity: tokensIntegrity,
        },
      ],
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

    await expect(evaluatePublication(partial)).resolves.toMatchObject({
      status: 'eligible',
      actions: [
        { name: '@kimen/elements', action: 'skip' },
        { name: '@kimen/tokens', action: 'publish' },
      ],
    });

    partial.registry['@kimen/tokens'].versions[version] = { integrity: tokensIntegrity };
    await expect(evaluatePublication(partial)).resolves.toMatchObject({
      actions: [
        { name: '@kimen/elements', action: 'skip' },
        { name: '@kimen/tokens', action: 'skip' },
      ],
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
