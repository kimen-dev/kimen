// @spec:018-project-integrity-hardening#S9
// @spec:018-project-integrity-hardening#S10
// @spec:067-merge-friendly-checks#S3
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createPublicApiSnapshot } from '../lib/public-api.mjs';

const subjectUrl = new URL('../gates/check-generated-sync.mjs', import.meta.url);
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const packageSummary = 'elements summary\n';
const siteSummary = `${packageSummary}\n## GenUI layer\n\nsite-only guidance\n`;

const git = (root, ...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });

async function put(root, path, contents = `${path}\n`) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

async function aRepository(t, paths) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-generated-sync-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  git(root, 'init', '--quiet');
  git(root, 'config', 'user.name', 'fixture');
  git(root, 'config', 'user.email', 'fixture@kimen.local');
  await Promise.all(paths.map((path) => put(root, path)));
  if (paths.includes('llms-full.txt')) {
    await put(root, '.gitignore', '/packages/elements/llms-full.txt\n');
    await put(root, 'llms-full.txt', siteSummary);
    await put(root, 'packages/elements/llms-full.txt', packageSummary);
  }
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '--allow-empty', '-m', 'test: generated baseline');
  return root;
}

test('S9-S10 generated sync requires the exact tracked output set and clean bytes', async (t) => {
  const subject = await import(subjectUrl.href).catch((error) => {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      assert.fail('check-generated-sync.mjs is required');
    }
    throw error;
  });
  const group = subject.generatedGroups.surfaces;
  const root = await aRepository(t, group.required);

  assert.doesNotThrow(() => subject.validateGeneratedSync({ root, group: 'surfaces' }));

  await put(root, group.required[0], 'drift\n');
  assert.throws(
    () => subject.validateGeneratedSync({ root, group: 'surfaces' }),
    /generated.*drift|drift.*generated/iu,
  );
  await put(root, group.required[0]);
  await put(root, 'packages/elements/generated/undeclared.json', '{}\n');
  assert.throws(
    () => subject.validateGeneratedSync({ root, group: 'surfaces' }),
    /undeclared|untracked/iu,
  );
});

test('S10 an untracked public-api candidate cannot satisfy surfaces sync', async (t) => {
  const subject = await import(subjectUrl.href);
  const group = subject.generatedGroups.surfaces;
  const publicApiIndex = 'packages/elements/generated/public-api/index.json';
  const tracked = group.required.filter((path) => path !== publicApiIndex);
  const root = await aRepository(t, tracked);
  await put(root, publicApiIndex, '{}\n');

  assert.throws(
    () => subject.validateGeneratedSync({ root, group: 'surfaces' }),
    /public-api\/index\.json.*tracked/iu,
  );
});

test('S3 the merge driver selects incoming generated files and does not select handwritten files', async (t) => {
  const { generatedGroups, generatedOutputs } = await import(subjectUrl.href);
  const handwritten = generatedGroups.wrappers.handWritten;
  const attributes = execFileSync(
    'git',
    ['check-attr', 'merge', '--', ...generatedOutputs, ...handwritten],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    },
  );
  for (const path of generatedOutputs) {
    assert.ok(attributes.includes(`${path}: merge: kimen-generated\n`), path);
  }
  for (const path of handwritten) {
    assert.ok(attributes.includes(`${path}: merge: unspecified\n`), path);
  }

  const generated = 'packages/tokens/dist/css/tokens.css';
  const source = 'theme.txt';
  const root = await aRepository(t, [generated, source]);
  await put(root, '.gitattributes', await readFile(join(repositoryRoot, '.gitattributes'), 'utf8'));
  git(root, 'add', '.gitattributes');
  git(root, 'commit', '-m', 'test: declare generated paths');
  const setup = join(repositoryRoot, 'scripts/dev/setup-merge-drivers.sh');
  execFileSync('bash', [setup], { cwd: root });
  git(root, 'branch', 'incoming-main');
  await put(root, generated, 'feature output\n');
  await put(root, source, 'feature source\n');
  git(root, 'commit', '-am', 'test: feature');
  const feature = git(root, 'branch', '--show-current').trim();
  git(root, 'switch', 'incoming-main');
  await put(root, generated, 'main output\n');
  git(root, 'commit', '-am', 'test: main');
  git(root, 'switch', feature);
  git(root, 'merge', '--no-commit', 'incoming-main');
  assert.equal(await readFile(join(root, generated), 'utf8'), 'main output\n');
  assert.equal(await readFile(join(root, source), 'utf8'), 'feature source\n');
  assert.equal(git(root, 'ls-files', '--unmerged'), '');
});

test('S3 the split candidate round-trips and a changed component only rewrites its shard and index', async (t) => {
  const { splitPublicApiSnapshot, readDirectoryPublicApiSnapshot } = await import(
    '../lib/public-api-storage.mjs'
  );
  const root = await aRepository(t, []);
  const candidate = createPublicApiSnapshot({
    browserBaseline: ['chromium'],
    packages: {
      '@kimen/elements': {
        version: '0.0.0',
        exports: {
          './ki-first': {
            target: './dist/components/ki-first.js',
            deprecatedSince: null,
            replacement: null,
          },
        },
        components: { 'ki-first': { events: {} }, 'ki-second': { events: {} } },
      },
    },
  });
  const changed = structuredClone(candidate.surface);
  changed.packages['@kimen/elements'].components['ki-first'].events.change = {};
  const originalFiles = splitPublicApiSnapshot(candidate);
  const newFiles = splitPublicApiSnapshot(createPublicApiSnapshot(changed));
  assert.deepEqual(
    [...newFiles.keys()].filter((path) => newFiles.get(path) !== originalFiles.get(path)),
    ['index.json', 'components/ki-first.json'],
  );
  assert.doesNotMatch(originalFiles.get('index.json'), /ki-first\.js/u);
  assert.match(originalFiles.get('components/ki-first.json'), /ki-first\.js/u);

  for (const [path, bytes] of originalFiles) await put(root, path, bytes);
  assert.deepEqual(await readDirectoryPublicApiSnapshot(root), candidate);

  const shard = 'components/ki-first.json';
  await put(root, shard, '{\n  "component": {}\n}\n');
  await assert.rejects(readDirectoryPublicApiSnapshot(root), /digest/iu);
  await put(root, shard, `${originalFiles.get(shard)}\n`);
  await assert.rejects(readDirectoryPublicApiSnapshot(root), /canonical JSON/iu);
  await rm(join(root, shard));
  await assert.rejects(readDirectoryPublicApiSnapshot(root), /digest/iu);
});

test('S3 the untracked package summary must match the committed site summary before packing', async (t) => {
  const subject = await import(subjectUrl.href);
  const root = await aRepository(t, subject.generatedGroups.surfaces.required);
  await rm(join(root, 'packages/elements/llms-full.txt'));
  assert.throws(() => subject.validateGeneratedSync({ root, group: 'surfaces' }), /llms-full/iu);
  await put(root, 'packages/elements/llms-full.txt', packageSummary);
  assert.doesNotThrow(() => subject.validateGeneratedSync({ root, group: 'surfaces' }));
  await put(root, 'packages/elements/llms-full.txt', 'stale summary\n');
  assert.throws(() => subject.validateGeneratedSync({ root, group: 'surfaces' }), /llms-full/iu);
});
