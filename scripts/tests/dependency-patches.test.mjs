import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const repositoryRoot = new URL('../../', import.meta.url);
const rootRequire = createRequire(import.meta.url);

// The one consumer that still resolves minimatch 3: everything else in the
// tree is on 10. It calls minimatch's default export as a function, which is
// why it cannot simply be moved up a major.
const LEGACY_MINIMATCH_CONSUMER = 'eslint-plugin-jsx-a11y';

test('the legacy minimatch still expands braces on brace-expansion 5', () => {
  // `brace-expansion` is pinned to 5.0.8 workspace-wide because GHSA-mh99-v99m-4gvg
  // has no fix below it — OSV records a single range, introduced=0 fixed=5.0.8.
  // That pin crosses a major for this consumer: minimatch 3 does
  // `require('brace-expansion')` and calls the result, while v5 exports an
  // object carrying a named `expand`. Unpatched, every pattern containing
  // braces throws `TypeError: expand is not a function` — and only those, which
  // is why a full gate run went green over the break.
  const consumerRequire = createRequire(rootRequire.resolve(LEGACY_MINIMATCH_CONSUMER));
  const minimatch = consumerRequire('minimatch');

  assert.equal(typeof minimatch, 'function', `${LEGACY_MINIMATCH_CONSUMER} calls minimatch itself`);
  assert.equal(minimatch('src/a.ts', 'src/*.ts'), true);
  // The assertion that fails without the patch.
  assert.equal(minimatch('src/a.ts', 'src/*.{ts,tsx}'), true);
  assert.equal(minimatch('src/a.css', 'src/*.{ts,tsx}'), false);

  // ...and the patch must not have been "fixed" by dropping back to a
  // vulnerable brace-expansion instead.
  const { version } = consumerRequire('brace-expansion/package.json');
  assert.equal(version, '5.0.8');
});

test('every patch is declared where pnpm reads it', async () => {
  // pnpm 10 reads neither overrides nor patches from the `pnpm` field in
  // package.json. A patch declared there would be silently inert, which is the
  // failure this repository already had with an override.
  const [workspace, manifest] = await Promise.all([
    readFile(new URL('pnpm-workspace.yaml', repositoryRoot), 'utf8'),
    readFile(new URL('package.json', repositoryRoot), 'utf8').then(JSON.parse),
  ]);

  assert.match(workspace, /^patchedDependencies:\n {2}minimatch@3\.1\.5:/mu);
  assert.equal(manifest.pnpm, undefined);
});
