import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// The framework wrappers must expose per-component subpaths so a consumer can
// import exactly one component (`@kimen/react/ki-button`) and register only
// that element — the tree-shakable-per-component contract (spec 034
// FR-005/S11). The root "." barrel registers every element at import time for
// non-tree-shaking consumers; the "./ki-*" subpath is the opt-in
// single-component entry, and pinning it here keeps the public wrapper
// surface from regressing to root-only (review finding: S11 previously only
// exercised a non-public `../src` path).
const WRAPPERS = ['react', 'vue'];
const packagesRoot = fileURLToPath(new URL('../../packages/', import.meta.url));

for (const wrapper of WRAPPERS) {
  test(`@kimen/${wrapper} exposes a public per-component subpath`, () => {
    const manifest = JSON.parse(readFileSync(`${packagesRoot}${wrapper}/package.json`, 'utf8'));
    assert.equal(
      manifest.sideEffects,
      false,
      'wrapper must flag sideEffects:false so bundlers can prune the barrel',
    );
    const exportsMap = manifest.exports ?? {};
    assert.ok(exportsMap['.'], 'root export "." must exist');
    const perComponent = exportsMap['./ki-*'];
    assert.ok(perComponent, 'per-component subpath "./ki-*" must exist');
    assert.equal(perComponent.import, './dist/ki-*.js');
    assert.equal(perComponent.types, './dist/ki-*.d.ts');
  });
}
