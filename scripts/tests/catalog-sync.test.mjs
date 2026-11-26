// @spec:027-runtime-catalog
// S9: a hand-edited committed catalog fails the sync gate pointing at the
// artifact. S10: regeneration is byte-identical from checkouts at different
// filesystem paths. Fixture-repo harness per generated-sync.test.mjs (018).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..');
const subjectUrl = new URL('../gates/check-generated-sync.mjs', import.meta.url);

// Every module the catalog generator writes (src/generated).
const GENERATED = ['catalog-guidance.ts', 'catalog-structure.ts', 'catalog.ts', 'url-scheme.ts'];

const git = (root, ...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });

async function put(root, path, contents = `${path}\n`) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

test('S9 a hand-edited committed catalog artifact fails the catalog sync gate', async (t) => {
  const subject = await import(subjectUrl.href);
  const group = subject.generatedGroups.catalog;
  assert.deepEqual(group.required, [
    'packages/catalog/src/generated/catalog-guidance.ts',
    'packages/catalog/src/generated/catalog-structure.ts',
    'packages/catalog/src/generated/catalog.ts',
    'packages/catalog/src/generated/url-scheme.ts',
  ]);

  const root = await mkdtemp(join(tmpdir(), 'kimen-catalog-sync-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  git(root, 'init', '--quiet');
  git(root, 'config', 'user.name', 'fixture');
  git(root, 'config', 'user.email', 'fixture@kimen.local');
  await Promise.all(group.required.map((path) => put(root, path)));
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'test: catalog baseline');

  assert.doesNotThrow(() => subject.validateGeneratedSync({ root, group: 'catalog' }));

  await put(root, group.required[0], 'hand edited\n');
  assert.throws(
    () => subject.validateGeneratedSync({ root, group: 'catalog' }),
    /catalog.*drift|drift.*catalog/iu,
  );
});

test('S10 catalog regeneration from checkouts at different paths is byte-identical', async (t) => {
  const outputs = [];
  const componentsRoot = 'packages/elements/src/components';
  const entries = await readdir(join(repoRoot, componentsRoot), { withFileTypes: true });
  const metadata = entries
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => join(componentsRoot, name, 'component.json'));
  for (const flavor of ['first', 'second']) {
    const checkout = await mkdtemp(join(tmpdir(), `kimen-catalog-checkout-${flavor}-`));
    t.after(() => rm(checkout, { force: true, recursive: true }));
    for (const path of [
      ...metadata,
      'packages/elements/scripts/component-metadata.mjs',
      'packages/elements/src/utils/url-scheme.ts',
      'packages/elements/generated/custom-elements.json',
      'packages/elements/package.json',
      'packages/catalog/scripts/generate-catalog.mjs',
      // The native primitives' one definition (spec 037), read by the generator.
      'packages/catalog/scripts/primitives.mjs',
    ]) {
      await mkdir(join(checkout, dirname(path)), { recursive: true });
      await copyFile(join(repoRoot, path), join(checkout, path));
    }
    execFileSync(
      'node',
      [join(checkout, 'packages/catalog/scripts/generate-catalog.mjs'), checkout],
      { encoding: 'utf8', stdio: 'pipe' },
    );
    const paths = GENERATED;
    outputs.push(
      await Promise.all(
        paths.map((file) =>
          readFile(join(checkout, 'packages/catalog/src/generated', file), 'utf8'),
        ),
      ),
    );
  }
  assert.deepEqual(outputs[0], outputs[1]);
  const committed = await Promise.all(
    GENERATED.map((file) =>
      readFile(join(repoRoot, 'packages/catalog/src/generated', file), 'utf8'),
    ),
  );
  assert.deepEqual(outputs[0], committed);
});
