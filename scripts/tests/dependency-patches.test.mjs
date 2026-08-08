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
  // `brace-expansion` is pinned to 5.0.9 workspace-wide: GHSA-mh99-v99m-4gvg
  // fixed at 5.0.8, then GHSA-rgw5-rvv9-x895 moved the floor to 5.0.9.
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
  assert.equal(version, '5.0.9');
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

// A two-space-indented key block under a top-level `section:` heading, e.g.
// the `overrides:` and `patchedDependencies:` maps of pnpm-workspace.yaml.
function workspaceSectionKeys(workspace, section) {
  const lines = workspace.split('\n');
  const start = lines.indexOf(`${section}:`);
  assert.notEqual(start, -1, `pnpm-workspace.yaml declares ${section}`);
  const keys = [];
  for (const line of lines.slice(start + 1)) {
    const match = /^ {2}([^\s:]+):/u.exec(line);
    if (match) {
      keys.push(match[1]);
      continue;
    }
    if (!line.startsWith('#') && !line.startsWith(' ')) {
      break;
    }
  }
  return keys;
}

test('renovate ignores every name that pins a patched dependency', async () => {
  // #111: Renovate rewrote the `minimatch@3` override to v10 and orphaned the
  // patch — ignoreDeps listed only bare `minimatch`, and a selector-keyed
  // override is its own depName to Renovate, so the ignore never matched.
  // The config validator only checks the schema and stays green over that
  // gap; this invariant is what holds it closed: every patched package stays
  // in ignoreDeps under its bare name AND under every override key that pins
  // it, present or future.
  const [workspace, renovate] = await Promise.all([
    readFile(new URL('pnpm-workspace.yaml', repositoryRoot), 'utf8'),
    readFile(new URL('renovate.json', repositoryRoot), 'utf8').then(JSON.parse),
  ]);

  const patchedNames = workspaceSectionKeys(workspace, 'patchedDependencies').map((key) =>
    key.slice(0, key.lastIndexOf('@')),
  );
  assert.ok(patchedNames.length > 0, 'the patch inventory is readable');

  const ignored = new Set(renovate.ignoreDeps ?? []);
  for (const name of patchedNames) {
    assert.ok(ignored.has(name), `renovate.json ignoreDeps must keep bare ${name}`);
    const pinKeys = workspaceSectionKeys(workspace, 'overrides').filter(
      (key) => key === name || key.startsWith(`${name}@`),
    );
    assert.ok(pinKeys.length > 0, `an override holds the ${name} patch target`);
    for (const key of pinKeys) {
      assert.ok(ignored.has(key), `renovate.json ignoreDeps must keep override key ${key}`);
    }
  }
});
