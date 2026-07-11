// @spec:018-project-integrity-hardening#S7
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
import test from 'node:test';

import { canonicalJson } from '../lib/canonical-json.mjs';

const subjectUrl = new URL('../release/build-candidate.mjs', import.meta.url);
const version = '1.2.3';
const releaseTag = `v${version}`;
const artifactId = 73_311;
const candidateSha256 = 'a'.repeat(64);
const elementsIntegrity = `sha512-${Buffer.alloc(64, 1).toString('base64')}`;
const tokensIntegrity = `sha512-${Buffer.alloc(64, 2).toString('base64')}`;
const repositoryUrl = 'git+https://github.com/kimen-dev/kimen.git';

async function loadSubject() {
  let subject;
  try {
    subject = await import(subjectUrl.href);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      assert.fail('T035 RED: scripts/release/build-candidate.mjs is not implemented');
    }
    throw error;
  }

  assert.equal(typeof subject.buildCandidate, 'function', 'buildCandidate export is required');
  assert.equal(typeof subject.verifyCandidate, 'function', 'verifyCandidate export is required');
  assert.equal(
    typeof subject.validateCandidateManifest,
    'function',
    'validateCandidateManifest export is required',
  );
  assert.equal(
    typeof subject.evaluatePublication,
    'function',
    'evaluatePublication export is required',
  );
  return subject;
}

function run(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: 'utf8',
    env: {
      HOME: process.env.HOME,
      LC_ALL: 'C',
      PATH: process.env.PATH,
    },
  });
  assert.equal(
    result.status,
    0,
    `${command} ${arguments_.join(' ')} failed\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout.trim();
}

function repositoryMetadata(directory, overrides = {}) {
  return {
    type: 'git',
    url: repositoryUrl,
    directory: `packages/${directory}`,
    ...overrides,
  };
}

function packageFixture(name, directory, options) {
  return {
    directory,
    manifest: {
      name,
      version: options.version,
      private: options.privatePackages,
      type: 'module',
      license: 'Apache-2.0',
      repository: repositoryMetadata(directory, options.repositoryOverrides?.[name]),
      files: ['dist'],
      ...(options.scripts?.[name] === undefined ? {} : { scripts: options.scripts[name] }),
    },
  };
}

async function writePackage(root, fixture) {
  const directory = join(root, 'packages', fixture.directory);
  await mkdir(join(directory, 'dist'), { recursive: true });
  await Promise.all([
    writeFile(join(directory, 'package.json'), canonicalJson(fixture.manifest)),
    writeFile(
      join(directory, 'dist', 'index.js'),
      `export const packageName = '${fixture.manifest.name}';\n`,
    ),
  ]);
  return directory;
}

async function createRepositoryFixture(t, overrides = {}) {
  const options = {
    version,
    privatePackages: false,
    tag: releaseTag,
    candidateOutsideMain: false,
    repositoryOverrides: {},
    scripts: {},
    extraPackages: [],
    ...overrides,
  };
  const root = await mkdtemp(join(tmpdir(), 'kimen-release-candidate-repo-'));
  t.after(() => rm(root, { force: true, recursive: true }));

  const fixtures = [
    packageFixture('@kimen/elements', 'elements', options),
    packageFixture('@kimen/tokens', 'tokens', options),
    ...options.extraPackages.map(({ name, directory, manifest = {} }) => ({
      directory,
      manifest: {
        name,
        version: options.version,
        private: options.privatePackages,
        type: 'module',
        license: 'Apache-2.0',
        repository: repositoryMetadata(directory),
        files: ['dist'],
        ...manifest,
      },
    })),
  ];
  const packageDirectories = await Promise.all(
    fixtures.map((fixture) => writePackage(root, fixture)),
  );
  await writeFile(join(root, 'README.md'), '# release fixture\n');

  run('git', ['init', '-b', 'main'], root);
  run('git', ['config', 'user.name', 'Kimen fixture'], root);
  run('git', ['config', 'user.email', 'fixture@kimen.invalid'], root);
  run('git', ['add', '.'], root);
  run('git', ['commit', '-m', 'fixture: release candidate'], root);

  if (options.candidateOutsideMain) {
    run('git', ['switch', '-c', 'candidate-outside-main'], root);
    await writeFile(join(root, 'candidate-only.txt'), 'not reachable from protected main\n');
    run('git', ['add', 'candidate-only.txt'], root);
    run('git', ['commit', '-m', 'fixture: unreachable candidate'], root);
  }
  if (options.tag !== null) {
    run('git', ['tag', options.tag], root);
  }

  return {
    root,
    sourceSha: run('git', ['rev-parse', 'HEAD'], root),
    packageDirectories,
    packages: Object.fromEntries(
      fixtures.map((fixture, index) => [fixture.manifest.name, packageDirectories[index]]),
    ),
  };
}

async function buildFixture(t, fixture, overrides = {}) {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'kimen-release-candidate-output-'));
  t.after(() => rm(outputDirectory, { force: true, recursive: true }));
  const { buildCandidate } = await loadSubject();
  return buildCandidate({
    mode: 'release',
    repositoryRoot: fixture.root,
    outputDirectory,
    sourceSha: fixture.sourceSha,
    tag: releaseTag,
    protectedMainRef: 'refs/heads/main',
    packageDirectories: fixture.packageDirectories,
    ...overrides,
  });
}

function hash(algorithm, bytes, encoding = 'hex') {
  return createHash(algorithm).update(bytes).digest(encoding);
}

async function extractCandidate(t, archivePath) {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-release-candidate-extract-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const listing = run('tar', ['-tf', archivePath], directory).split('\n');
  run('tar', ['-xf', archivePath, '-C', directory], directory);
  return { directory, listing };
}

function packageRecord(name, file, integrity) {
  return {
    name,
    file,
    sha256: name === '@kimen/elements' ? 'b'.repeat(64) : 'c'.repeat(64),
    integrity,
    size: name === '@kimen/elements' ? 1_337 : 733,
  };
}

function aCandidateManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: 'release',
    sourceSha: '1'.repeat(40),
    tag: releaseTag,
    version,
    packages: [
      packageRecord('@kimen/elements', `kimen-elements-${version}.tgz`, elementsIntegrity),
      packageRecord('@kimen/tokens', `kimen-tokens-${version}.tgz`, tokensIntegrity),
    ],
    ...overrides,
  };
}

function successfulEvidence(overrides = {}) {
  return {
    status: 'success',
    artifactId,
    candidateSha256,
    ...overrides,
  };
}

function publicationInput(overrides = {}) {
  const manifest = overrides.manifest ?? aCandidateManifest();
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
}

async function evaluate(input) {
  const { evaluatePublication } = await loadSubject();
  return evaluatePublication(input);
}

test('S7 accepts the canonical release-candidate-v1 manifest', async () => {
  const { validateCandidateManifest } = await loadSubject();

  assert.deepEqual(validateCandidateManifest(aCandidateManifest()), aCandidateManifest());
});

test('S7 rejects a candidate missing @kimen/tokens', async () => {
  const { validateCandidateManifest } = await loadSubject();
  const elementsOnly = aCandidateManifest({ packages: [aCandidateManifest().packages[0]] });

  assert.throws(
    () => validateCandidateManifest(elementsOnly),
    /exact.*(?:elements.*tokens|package set)|missing.*tokens/i,
  );
});

test('S7 rejects @kimen/catalog before its later approved release change', async () => {
  const { validateCandidateManifest } = await loadSubject();
  const withCatalog = aCandidateManifest({
    packages: [
      ...aCandidateManifest().packages,
      packageRecord('@kimen/catalog', `kimen-catalog-${version}.tgz`, tokensIntegrity),
    ],
  });

  assert.throws(
    () => validateCandidateManifest(withCatalog),
    /catalog|unexpected.*package|exact.*package set/i,
  );
});

test('S7 rejects the unscoped placeholder package', async () => {
  const { validateCandidateManifest } = await loadSubject();
  const withPlaceholder = aCandidateManifest({
    packages: [
      ...aCandidateManifest().packages,
      packageRecord('kimen', `kimen-${version}.tgz`, tokensIntegrity),
    ],
  });

  assert.throws(
    () => validateCandidateManifest(withPlaceholder),
    /kimen|unscoped|unexpected.*package|exact.*package set/i,
  );
});

test('S7 rejects a non-SHA-256 package digest', async () => {
  const { validateCandidateManifest } = await loadSubject();
  const packages = aCandidateManifest().packages.map((record) => ({ ...record }));
  packages[0].sha256 = 'not-a-digest';

  assert.throws(
    () => validateCandidateManifest(aCandidateManifest({ packages })),
    /sha-?256|digest/i,
  );
});

test('S7 rejects a package integrity that is not SHA-512 SRI', async () => {
  const { validateCandidateManifest } = await loadSubject();
  const packages = aCandidateManifest().packages.map((record) => ({ ...record }));
  packages[0].integrity = `sha256-${Buffer.alloc(32, 1).toString('base64')}`;

  assert.throws(
    () => validateCandidateManifest(aCandidateManifest({ packages })),
    /sha-?512|sri|integrity/i,
  );
});

test('S7 dry-run accepts private packages, preserves versions and emits a null tag', async (t) => {
  const fixture = await createRepositoryFixture(t, {
    version: '0.0.0',
    privatePackages: true,
    tag: null,
  });
  const result = await buildFixture(t, fixture, {
    mode: 'dry-run',
    tag: null,
  });

  assert.equal(result.manifest.mode, 'dry-run');
  assert.equal(result.manifest.tag, null);
  assert.equal(result.manifest.version, '0.0.0');
  assert.deepEqual(
    result.manifest.packages.map(({ name }) => name),
    ['@kimen/elements', '@kimen/tokens'],
  );
});

test('S7 dry-run never mutates package versions, refs or the source worktree', async (t) => {
  const fixture = await createRepositoryFixture(t, {
    version: '0.0.0',
    privatePackages: true,
    tag: null,
  });
  const elementsManifestPath = join(fixture.packages['@kimen/elements'], 'package.json');
  const tokensManifestPath = join(fixture.packages['@kimen/tokens'], 'package.json');
  const before = {
    elements: await readFile(elementsManifestPath, 'utf8'),
    tokens: await readFile(tokensManifestPath, 'utf8'),
    head: run('git', ['rev-parse', 'HEAD'], fixture.root),
    tags: run('git', ['tag', '--list'], fixture.root),
    status: run('git', ['status', '--porcelain=v1', '--untracked-files=all'], fixture.root),
  };

  await buildFixture(t, fixture, { mode: 'dry-run', tag: null });

  assert.deepEqual(
    {
      elements: await readFile(elementsManifestPath, 'utf8'),
      tokens: await readFile(tokensManifestPath, 'utf8'),
      head: run('git', ['rev-parse', 'HEAD'], fixture.root),
      tags: run('git', ['tag', '--list'], fixture.root),
      status: run('git', ['status', '--porcelain=v1', '--untracked-files=all'], fixture.root),
    },
    before,
  );
});

test('S7 dry-run rejects a release tag instead of advancing release state', async (t) => {
  const fixture = await createRepositoryFixture(t, {
    privatePackages: true,
    tag: null,
  });

  await assert.rejects(
    buildFixture(t, fixture, { mode: 'dry-run', tag: releaseTag }),
    /dry-run.*tag.*null|tag.*dry-run/i,
  );
});

test('S7 release binds source SHA, tag and both package versions', async (t) => {
  const fixture = await createRepositoryFixture(t);
  const result = await buildFixture(t, fixture);

  assert.equal(result.manifest.mode, 'release');
  assert.equal(result.manifest.sourceSha, fixture.sourceSha);
  assert.equal(result.manifest.tag, releaseTag);
  assert.equal(result.manifest.version, version);
  assert.deepEqual(
    result.manifest.packages.map(({ name }) => name),
    ['@kimen/elements', '@kimen/tokens'],
  );
});

test('S7 release rejects a missing tag', async (t) => {
  const fixture = await createRepositoryFixture(t, { tag: null });

  await assert.rejects(buildFixture(t, fixture, { tag: null }), /release.*tag|required.*tag/i);
});

test('S7 release rejects a tag that does not match package versions', async (t) => {
  const fixture = await createRepositoryFixture(t, { tag: 'v1.2.4' });

  await assert.rejects(
    buildFixture(t, fixture, { tag: 'v1.2.4' }),
    /tag.*version|version.*tag|1\.2\.4.*1\.2\.3/i,
  );
});

test('S7 release rejects a tagged source outside protected main', async (t) => {
  const fixture = await createRepositoryFixture(t, { candidateOutsideMain: true });

  await assert.rejects(buildFixture(t, fixture), /protected.*main|reachable.*main|source.*main/i);
});

test('S7 release rejects private packages', async (t) => {
  const fixture = await createRepositoryFixture(t, { privatePackages: true });

  await assert.rejects(buildFixture(t, fixture), /private.*(?:elements|tokens|release)/i);
});

test('S7 release requires exact npm repository metadata', async (t) => {
  const fixture = await createRepositoryFixture(t, {
    repositoryOverrides: {
      '@kimen/elements': { url: 'git+https://example.invalid/not-kimen.git' },
    },
  });

  await assert.rejects(buildFixture(t, fixture), /repository.*(?:metadata|url)|example\.invalid/i);
});

test('S7 candidate archive is canonical and records exact SHA-256, SHA-512 SRI and sizes', async (t) => {
  const fixture = await createRepositoryFixture(t);
  const result = await buildFixture(t, fixture);
  const extracted = await extractCandidate(t, result.archivePath);
  const expectedFiles = [
    'SHA256SUMS',
    `kimen-elements-${version}.tgz`,
    `kimen-tokens-${version}.tgz`,
    'manifest.json',
  ];
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

  assert.deepEqual(extracted.listing, expectedFiles);
  assert.equal(manifestBytes.toString('utf8'), canonicalJson(manifest));
  assert.deepEqual(manifest.packages, packageFacts);
  assert.equal(await readFile(join(extracted.directory, 'SHA256SUMS'), 'utf8'), expectedSums);
  assert.equal(result.candidateSha256, hash('sha256', await readFile(result.archivePath)));
});

test('S7 rebuilding unchanged package bytes yields the same canonical candidate digest', async (t) => {
  const fixture = await createRepositoryFixture(t);
  const first = await buildFixture(t, fixture);
  const second = await buildFixture(t, fixture);

  assert.equal(second.candidateSha256, first.candidateSha256);
  assert.deepEqual(await readFile(second.archivePath), await readFile(first.archivePath));
});

test('S7 rejects a prepack lifecycle hook before npm can execute it', async (t) => {
  const fixture = await createRepositoryFixture(t, {
    scripts: {
      '@kimen/elements': {
        prepack: "node -e \"require('node:fs').writeFileSync('lifecycle-executed', 'bad')\"",
      },
    },
  });
  const sentinel = join(fixture.packages['@kimen/elements'], 'lifecycle-executed');

  await assert.rejects(buildFixture(t, fixture), /lifecycle|prepack/i);
  await assert.rejects(access(sentinel), { code: 'ENOENT' });
});

test('S7 rejects publish lifecycle hooks in candidate manifests', async (t) => {
  const fixture = await createRepositoryFixture(t, {
    scripts: {
      '@kimen/tokens': { publish: 'node publish.js', postpublish: 'node postpublish.js' },
    },
  });

  await assert.rejects(buildFixture(t, fixture), /lifecycle|publish|postpublish/i);
});

test('S7 independent verification accepts the exact immutable candidate', async (t) => {
  const fixture = await createRepositoryFixture(t);
  const candidate = await buildFixture(t, fixture);
  const { verifyCandidate } = await loadSubject();
  const verified = await verifyCandidate({
    archivePath: candidate.archivePath,
    expectedSha256: candidate.candidateSha256,
    environment: {},
  });

  assert.equal(verified.candidateSha256, candidate.candidateSha256);
  assert.deepEqual(verified.manifest, candidate.manifest);
});

test('S7 independent verification blocks candidate-byte tampering', async (t) => {
  const fixture = await createRepositoryFixture(t);
  const candidate = await buildFixture(t, fixture);
  const { verifyCandidate } = await loadSubject();
  await appendFile(candidate.archivePath, Buffer.from([0]));

  await assert.rejects(
    verifyCandidate({
      archivePath: candidate.archivePath,
      expectedSha256: candidate.candidateSha256,
      environment: {},
    }),
    /candidate.*sha-?256|digest.*mismatch|immutable/i,
  );
});

test('S7 independent verifier fails closed if OIDC authority is present', async (t) => {
  const fixture = await createRepositoryFixture(t);
  const candidate = await buildFixture(t, fixture);
  const { verifyCandidate } = await loadSubject();

  await assert.rejects(
    verifyCandidate({
      archivePath: candidate.archivePath,
      expectedSha256: candidate.candidateSha256,
      environment: {
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'ephemeral-fixture-token',
        ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example.invalid',
      },
    }),
    /verif.*(?:no OIDC|identity)|OIDC.*verif/i,
  );
});

test('S7 dry-run stops after verification without publication authority', async () => {
  const input = publicationInput({
    manifest: aCandidateManifest({ mode: 'dry-run', tag: null }),
    authority: { kind: 'none' },
  });

  assert.deepEqual(await evaluate(input), { status: 'validation-only', actions: [] });
});

test('S7 dry-run rejects OIDC instead of carrying dormant publication authority', async () => {
  const input = publicationInput({
    manifest: aCandidateManifest({ mode: 'dry-run', tag: null }),
  });

  await assert.rejects(evaluate(input), /dry-run.*OIDC|OIDC.*dry-run|validation-only/i);
});

test('S7 publication accepts complete same-artifact evidence and npm 11.5.1', async () => {
  const result = await evaluate(publicationInput());

  assert.equal(result.status, 'eligible');
  assert.deepEqual(
    result.actions.map(({ name, action }) => ({ name, action })),
    [
      { name: '@kimen/elements', action: 'publish' },
      { name: '@kimen/tokens', action: 'publish' },
    ],
  );
});

test('S7 publication rejects browser evidence for rebuilt bytes', async () => {
  const input = publicationInput();
  input.browserEvidence.webkit.candidateSha256 = 'd'.repeat(64);

  await assert.rejects(evaluate(input), /webkit.*(?:candidate|digest)|same.*artifact|rebuilt/i);
});

test('S7 publication rejects browser evidence for a different artifact ID', async () => {
  const input = publicationInput();
  input.browserEvidence.firefox.artifactId = artifactId + 1;

  await assert.rejects(evaluate(input), /firefox.*artifact|same.*artifact/i);
});

test('S7 publication rejects verification evidence that had OIDC authority', async () => {
  const input = publicationInput();
  input.verificationEvidence.oidc = true;

  await assert.rejects(evaluate(input), /verif.*(?:no OIDC|identity)|OIDC.*verif/i);
});

test('S7 publication rejects npm older than 11.5.1', async () => {
  const input = publicationInput({ npmVersion: '11.5.0' });

  await assert.rejects(evaluate(input), /npm.*11\.5\.1|11\.5\.0.*unsupported/i);
});

test('S7 publication rejects long-lived npm credentials', async () => {
  const input = publicationInput({ environment: { NPM_TOKEN: 'durable-fixture-token' } });

  await assert.rejects(evaluate(input), /long-lived|NPM_TOKEN|durable.*credential/i);
});

test('S7 publication accepts only release-scoped OIDC authority', async () => {
  const input = publicationInput({
    authority: {
      kind: 'oidc',
      workflow: '.github/workflows/other.yml',
      environment: 'development',
    },
  });

  await assert.rejects(evaluate(input), /release.*OIDC|OIDC.*scope|workflow|environment/i);
});

test('S7 publication fails when trusted publisher configuration is missing', async () => {
  const input = publicationInput();
  input.trustedPublishers['@kimen/tokens'].configured = false;

  await assert.rejects(evaluate(input), /trusted publisher.*tokens|tokens.*trusted publisher/i);
});

test('S7 first publication fails closed without a token bootstrap exception', async () => {
  const input = publicationInput();
  input.registry['@kimen/elements'] = { exists: false, versions: {} };
  input.trustedPublishers['@kimen/elements'].configured = false;

  await assert.rejects(
    evaluate(input),
    /first publication|package.*does not exist|bootstrap.*forbidden/i,
  );
});

test('S7 partial retry skips the identical published package and publishes only the missing one', async () => {
  const input = publicationInput();
  input.registry['@kimen/elements'].versions[version] = {
    integrity: elementsIntegrity,
  };

  const result = await evaluate(input);

  assert.equal(result.status, 'eligible');
  assert.deepEqual(
    result.actions.map(({ name, action }) => ({ name, action })),
    [
      { name: '@kimen/elements', action: 'skip' },
      { name: '@kimen/tokens', action: 'publish' },
    ],
  );
});

test('S7 partial retry treats conflicting registry integrity as a security failure', async () => {
  const input = publicationInput();
  input.registry['@kimen/elements'].versions[version] = {
    integrity: `sha512-${Buffer.alloc(64, 9).toString('base64')}`,
  };

  await assert.rejects(
    evaluate(input),
    /integrity.*conflict|conflicting.*integrity|security failure/i,
  );
});

test('S7 idempotent retry skips both packages when both immutable versions already match', async () => {
  const input = publicationInput();
  input.registry['@kimen/elements'].versions[version] = {
    integrity: elementsIntegrity,
  };
  input.registry['@kimen/tokens'].versions[version] = { integrity: tokensIntegrity };

  const result = await evaluate(input);

  assert.equal(result.status, 'eligible');
  assert.deepEqual(
    result.actions.map(({ name, action }) => ({ name, action })),
    [
      { name: '@kimen/elements', action: 'skip' },
      { name: '@kimen/tokens', action: 'skip' },
    ],
  );
});
