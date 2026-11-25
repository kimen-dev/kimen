import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { releasePackages, releaseWorkspaceDependencies } from '../release/release-plan.mjs';

// A package a consumer can install must not carry a `workspace:` range in any
// consumer-installed dependency field. The release path packs with
// `npm pack`, which — unlike `pnpm publish` — does NOT rewrite workspace
// ranges, so a published `workspace:*` reaches npm verbatim and fails the
// consumer install with EUNSUPPORTEDPROTOCOL (review finding, spec 034).
// `devDependencies` are exempt because npm never installs them for a
// dependency.
//
// The release candidate builder rewrites exactly one shape: `workspace:*` in a
// release package on another release package published before it, staged to
// the exact candidate version before packing (scripts/release/stage-package.mjs).
// So a release package is checked whether or not it is still `private` (the
// release pull request flips it), and may only carry that shape. Any other
// package that is not `private` may carry none: nothing would rewrite it.
const CONSUMER_DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];
const packagesRoot = fileURLToPath(new URL('../../packages/', import.meta.url));

function workspaceProtocolOffenders(manifests) {
  const offenders = [];
  for (const manifest of manifests) {
    if (releasePackages.has(manifest.name)) {
      try {
        releaseWorkspaceDependencies(manifest);
      } catch (error) {
        offenders.push(error.message);
      }
      continue;
    }
    if (manifest.private === true) continue;
    for (const field of CONSUMER_DEPENDENCY_FIELDS) {
      for (const [name, range] of Object.entries(manifest[field] ?? {})) {
        if (typeof range === 'string' && range.startsWith('workspace:')) {
          offenders.push(`${String(manifest.name)}: ${field}.${name} = "${range}"`);
        }
      }
    }
  }
  return offenders;
}

function workspaceManifests() {
  return readdirSync(packagesRoot)
    .map((directory) => `${packagesRoot}${directory}/package.json`)
    .filter((path) => existsSync(path))
    .map((path) => JSON.parse(readFileSync(path, 'utf8')));
}

test('no package a consumer can install declares a workspace: range the release cannot rewrite', () => {
  const offenders = workspaceProtocolOffenders(workspaceManifests());
  assert.deepEqual(
    offenders,
    [],
    `publishable packages must not ship workspace: ranges npm pack would keep:\n${offenders.join('\n')}`,
  );
});

test('every release package in the repository is checked, private or not', () => {
  const names = workspaceManifests().map(({ name }) => name);
  for (const name of releasePackages.keys()) assert.ok(names.includes(name), name);
});

test('the release rewrites workspace:* on an earlier release package and refuses every other workspace range', () => {
  const emitter = (dependencies, extra = {}) => ({
    name: '@kimen/emitter',
    private: true,
    dependencies,
    devDependencies: { '@kimen/elements': 'workspace:*' },
    ...extra,
  });
  assert.deepEqual(workspaceProtocolOffenders([emitter({ '@kimen/catalog': 'workspace:*' })]), []);
  assert.match(
    workspaceProtocolOffenders([emitter({ '@kimen/catalog': 'workspace:^' })])[0],
    /@kimen\/emitter dependencies can only use workspace:\*/u,
  );
  assert.match(
    workspaceProtocolOffenders([emitter({ '@kimen/nx-plugin': 'workspace:*' })])[0],
    /@kimen\/nx-plugin is workspace:\*/u,
  );
  // A package outside the release set gets no rewrite once it is publishable.
  const outside = {
    name: '@kimen/nx-plugin',
    private: false,
    peerDependencies: { '@kimen/elements': 'workspace:*' },
  };
  assert.deepEqual(workspaceProtocolOffenders([outside]), [
    '@kimen/nx-plugin: peerDependencies.@kimen/elements = "workspace:*"',
  ]);
  assert.deepEqual(workspaceProtocolOffenders([{ ...outside, private: true }]), []);
});
