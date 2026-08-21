import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// A publishable (non-`private`) package must not carry a `workspace:` range in
// any consumer-installed dependency field. The release path packs with
// `npm pack`, which — unlike `pnpm publish` — does NOT rewrite workspace
// ranges, so a published `workspace:*` reaches npm verbatim and fails the
// consumer install with EUNSUPPORTEDPROTOCOL (review finding, spec 034: the
// framework wrappers depend on `@kimen/elements` this way). `devDependencies`
// are exempt because npm never installs them for a dependency.
//
// This is a fail-closed future-proof: every wrapper/adapter is `private: true`
// today, so nothing is flagged. The moment one is flipped to `private: false`
// for publication without its workspace ranges rewritten to the release
// version, this gate fails and points at the exact field.
const CONSUMER_DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];
const packagesRoot = fileURLToPath(new URL('../../packages/', import.meta.url));

test('no publishable package declares a workspace: protocol in a consumer-installed dependency', () => {
  const offenders = [];
  for (const directory of readdirSync(packagesRoot)) {
    const manifestPath = `${packagesRoot}${directory}/package.json`;
    if (!existsSync(manifestPath)) {
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.private === true) {
      continue;
    }
    for (const field of CONSUMER_DEPENDENCY_FIELDS) {
      for (const [name, range] of Object.entries(manifest[field] ?? {})) {
        if (typeof range === 'string' && range.startsWith('workspace:')) {
          offenders.push(`${String(manifest.name)}: ${field}.${name} = "${range}"`);
        }
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `publishable packages must rewrite workspace: ranges before publish (npm pack does not):\n${offenders.join('\n')}`,
  );
});
