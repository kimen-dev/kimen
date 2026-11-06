import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const repositoryRoot = new URL('../../', import.meta.url);
const rootRequire = createRequire(import.meta.url);

// The one consumer that still resolves minimatch 3: everything else in the
// tree is on 10. It calls minimatch's default export as a function, which is
// why it cannot simply be moved up a major.
const LEGACY_MINIMATCH_CONSUMER = 'eslint-plugin-jsx-a11y';

test('the legacy minimatch still expands braces on brace-expansion 5', () => {
  // `brace-expansion` is pinned to 5.0.12 workspace-wide: GHSA-mh99-v99m-4gvg
  // fixed at 5.0.8, GHSA-rgw5-rvv9-x895 moved the floor to 5.0.9, and
  // GHSA-6j4f-fj2g-mc7p, GHSA-qhr7-859c-m2p7 and GHSA-q2hr-2g5m-vwhr to 5.0.12.
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
  assert.equal(version, '5.0.12');
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

test('renovate batches coupled maintenance and defers incompatible majors', async () => {
  const renovate = await readFile(new URL('renovate.json', repositoryRoot), 'utf8').then(
    JSON.parse,
  );
  const rules = renovate.packageRules ?? [];

  const sandboxGroup = rules.find(({ groupName }) => groupName === 'sandbox toolchain');
  assert.deepEqual(sandboxGroup?.matchFileNames, ['sandbox/package.json']);

  const actionsGroup = rules.find(({ groupName }) => groupName === 'github actions');
  assert.deepEqual(actionsGroup?.matchManagers, ['github-actions']);

  for (const dependency of ['js-yaml', 'typescript']) {
    const rule = rules.find(
      ({ enabled, matchDepNames, matchUpdateTypes }) =>
        enabled === false &&
        matchDepNames?.includes(dependency) &&
        matchUpdateTypes?.includes('major'),
    );
    assert.ok(rule, `Renovate must defer the incompatible ${dependency} major`);
  }
});

// The subset of Renovate's packageRules matchers this repository uses. A rule
// that sets `rangeStrategy` through any other matcher (or a glob/regex/negated
// name) makes the test fail loudly instead of guessing how Renovate reads it.
function ruleMatchesNpmDependency(rule, { depName, depType, packageFile, updateType }) {
  const matchers = Object.keys(rule).filter((key) => key.startsWith('match'));
  return matchers.every((key) => {
    const values = rule[key];
    switch (key) {
      case 'matchDepTypes':
        return values.includes(depType);
      case 'matchDepNames':
      case 'matchPackageNames':
        return values.some((pattern) => {
          const regex = /^\/(.+)\/$/u.exec(pattern);
          if (regex) return new RegExp(regex[1], 'u').test(depName);
          assert.match(
            pattern,
            /^(\*|[@\w./-]+)$/u,
            `teach this test the ${key} pattern ${pattern}`,
          );
          return pattern === '*' || pattern === depName;
        });
      case 'matchFileNames':
        return values.some((pattern) => {
          assert.doesNotMatch(pattern, /[*?{}!]/u, `teach this test the glob ${pattern}`);
          return pattern === packageFile;
        });
      case 'matchManagers':
        return values.includes('npm');
      case 'matchUpdateTypes':
        return updateType !== undefined && values.includes(updateType);
      default:
        assert.fail(`teach this test the Renovate matcher ${key} (rule: ${rule.description})`);
    }
  });
}

function effectiveGroupName(renovate, dependency) {
  // Same ordering rule as rangeStrategy: the last matching groupName wins.
  let group;
  for (const rule of renovate.packageRules ?? []) {
    if (rule.groupName !== undefined && ruleMatchesNpmDependency(rule, dependency)) {
      group = rule.groupName;
    }
  }
  return group;
}

test('renovate keeps behaviour-changing dev tools out of the non-major dev group', async () => {
  // #135 bundled style-dictionary (changed token values and the onmars budget),
  // Biome (started formatting YAML) and the Stencil output targets (regenerate
  // the wrappers) with harmless bumps, so one red check held all of them back.
  // Each of these must land in its own PR; ordinary dev tools stay grouped.
  const renovate = await readFile(new URL('renovate.json', repositoryRoot), 'utf8').then(
    JSON.parse,
  );
  const devMinor = (depName) => ({
    depName,
    depType: 'devDependencies',
    packageFile: 'package.json',
    updateType: 'minor',
  });
  const separate = {
    'style-dictionary': 'style-dictionary',
    '@biomejs/biome': 'biome',
    '@stencil/angular-output-target': 'stencil output targets',
    '@stencil/react-output-target': 'stencil output targets',
    '@stencil/vue-output-target': 'stencil output targets',
  };
  for (const [depName, group] of Object.entries(separate)) {
    assert.equal(effectiveGroupName(renovate, devMinor(depName)), group, depName);
  }
  for (const depName of ['eslint', 'nx', 'knip']) {
    assert.equal(
      effectiveGroupName(renovate, devMinor(depName)),
      'dev dependencies (non-major)',
      depName,
    );
  }
});

function effectiveEnabled(renovate, dependency) {
  let enabled = true;
  for (const rule of renovate.packageRules ?? []) {
    if (rule.enabled !== undefined && ruleMatchesNpmDependency(rule, dependency)) {
      enabled = rule.enabled;
    }
  }
  return enabled;
}

test('renovate never proposes a major for an override held to one major line', async () => {
  // #218 and #219 proposed `postcss-selector-parser@6: 7.x` and `undici@7: 8.x`:
  // the key selects consumers of the old line, so a major there forces them onto
  // a major they never declared. Bumps inside the line, and bare keys, still flow.
  const renovate = await readFile(new URL('renovate.json', repositoryRoot), 'utf8').then(
    JSON.parse,
  );
  const override = (depName, updateType) => ({
    depName,
    depType: 'overrides',
    packageFile: 'pnpm-workspace.yaml',
    updateType,
  });
  for (const depName of ['undici@7', 'postcss-selector-parser@6', 'minimatch@3', '@scope/pkg@2']) {
    assert.equal(effectiveEnabled(renovate, override(depName, 'major')), false, depName);
    assert.equal(effectiveEnabled(renovate, override(depName, 'patch')), true, depName);
  }
  assert.equal(effectiveEnabled(renovate, override('axios', 'major')), true, 'axios');
});

function effectiveRangeStrategy(renovate, dependency) {
  // packageRules apply in order and a later match overrides an earlier one.
  let strategy = renovate.rangeStrategy ?? 'auto';
  for (const rule of renovate.packageRules ?? []) {
    if (rule.rangeStrategy !== undefined && ruleMatchesNpmDependency(rule, dependency)) {
      strategy = rule.rangeStrategy;
    }
  }
  return strategy;
}

test('renovate widens the wrappers peer ranges instead of pinning them', async () => {
  // #157: the repository-wide `rangeStrategy: pin` also rewrote the framework
  // wrappers' peerDependencies to one exact version (react `^18 || ^19` ->
  // `19.3.1`, vue `>=3.4.38` -> `3.5.45`). A peer range is the set of host
  // versions a consumer may bring; pinning it shuts out every other one. The
  // validator accepts that config, so the invariant lives here: every declared
  // peer resolves to `widen` (Renovate's own `:widenPeerDependencies`), which
  // appends a new major (`^18 || ^19 || ^20`) and leaves in-range releases alone.
  const renovate = await readFile(new URL('renovate.json', repositoryRoot), 'utf8').then(
    JSON.parse,
  );
  const packagesDirectory = new URL('packages/', repositoryRoot);
  const peers = [];
  for (const entry of await readdir(packagesDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageFile = `packages/${entry.name}/package.json`;
    const manifest = await readFile(new URL(packageFile, repositoryRoot), 'utf8')
      .then(JSON.parse)
      .catch(() => ({}));
    for (const depName of Object.keys(manifest.peerDependencies ?? {})) {
      peers.push({ depName, depType: 'peerDependencies', packageFile });
    }
  }
  assert.ok(peers.length > 0, 'the wrappers declare peer ranges');

  for (const peer of peers) {
    assert.equal(
      effectiveRangeStrategy(renovate, peer),
      'widen',
      `${peer.packageFile} peer ${peer.depName} must not be pinned by Renovate`,
    );
  }
});

test('pnpm 11 permits only the reviewed native build versions', async () => {
  const [manifest, workspace] = await Promise.all([
    readFile(new URL('package.json', repositoryRoot), 'utf8').then(JSON.parse),
    readFile(new URL('pnpm-workspace.yaml', repositoryRoot), 'utf8'),
  ]);

  assert.match(manifest.packageManager, /^pnpm@11\./u);
  // Reviewed-and-DECLINED entries (false) are decisions too: @parcel/watcher
  // (ng-packagr transitive, spec 034) never runs its native build script.
  assert.match(workspace, /^ {2}'@parcel\/watcher@2\.6\.0': false$/mu);
  assert.match(workspace, /^ {2}'esbuild@0\.28\.1': true$/mu);
  assert.match(workspace, /^ {2}'nx@23\.2\.1': true$/mu);
  assert.doesNotMatch(workspace, /^ {2}(?:@parcel\/watcher|esbuild|nx): (?:true|false)$/gmu);
});
