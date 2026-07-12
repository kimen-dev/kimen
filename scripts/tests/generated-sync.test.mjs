// @spec:018-project-integrity-hardening#S9
// @spec:018-project-integrity-hardening#S10
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

const subjectUrl = new URL('../gates/check-generated-sync.mjs', import.meta.url);

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
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'test: generated baseline');
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
  const tracked = group.required.filter(
    (path) => path !== 'packages/elements/generated/public-api.json',
  );
  const root = await aRepository(t, tracked);
  await put(root, 'packages/elements/generated/public-api.json', '{}\n');

  assert.throws(
    () => subject.validateGeneratedSync({ root, group: 'surfaces' }),
    /public-api\.json.*tracked|tracked.*public-api\.json/iu,
  );
});
