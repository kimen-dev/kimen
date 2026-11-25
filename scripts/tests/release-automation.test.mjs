// @spec:151-release-automation
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  adapterVersionPaths,
  buildChangelog,
  mcpServerMetadataPath,
  mcpServerPinPaths,
  pinAdapterVersion,
  pinMcpServer,
  pinPluginManifest,
  pinServerMetadata,
  pluginManifestPaths,
  prepareManifest,
  prepareMcpServerVersion,
  prepareVersionedFiles,
  releaseNotes,
  releasePackages,
  releaseProposal,
  releaseWorkspaceDependencies,
  selectReleaseVersion,
  verifyMcpServerVersion,
  verifyVersionedFiles,
} from '../release/release-plan.mjs';
import {
  ensureGitHubRelease,
  releaseCommitFiles,
  syncReleasePullRequest,
  mergedReleaseVersion,
} from '../release/release-github.mjs';

const changelog = `# Changelog

All notable changes are recorded here.

## [Unreleased]

### Added

- Hand-written feature.

### Changed

- Hand-written change.

## [0.1.0] - 2026-11-01

### Fixed

- Previous fix.
`;
const nxEntry = `## 0.2.0 (2026-11-20)

### \u{1f680} Features

- Add search.

### \u{1fa79} Fixes

- Correct focus.
`;
const releasePull = {
  title: 'chore(release): v0.2.0',
  merged_at: '2026-11-20T12:00:00Z',
  merge_commit_sha: 'release-sha',
  base: { ref: 'main', repo: { full_name: 'kimen-dev/kimen' } },
  head: { ref: 'release/next', repo: { full_name: 'kimen-dev/kimen' } },
};

test('S1 a null Nx version leaves nothing to release', () => {
  assert.equal(selectReleaseVersion('0.1.0', null), null);
});

test('S2 conventional commits keep feature and fix bumps and cap pre-1.0 breaking changes at minor', () => {
  assert.equal(selectReleaseVersion('0.1.3', '0.2.0'), '0.2.0');
  assert.equal(selectReleaseVersion('0.1.3', '0.1.4'), '0.1.4');
  assert.equal(selectReleaseVersion('0.1.3', '1.0.0'), '0.2.0');
  assert.equal(selectReleaseVersion('1.2.3', '2.0.0'), '2.0.0');
});

test('S2 the dated entry folds in Unreleased notes and keeps previous versions', () => {
  const result = buildChangelog(changelog, '0.2.0', nxEntry);
  assert.match(result, /^# Changelog\n\nAll notable changes are recorded here\./u);
  assert.match(result, /## \[0\.2\.0\] - 2026-11-20/u);
  assert.doesNotMatch(result, /\[Unreleased\]/u);
  assert.equal((result.match(/^### Added$/gmu) ?? []).length, 1);
  assert.match(result, /### Added\n\n- Hand-written feature\.\n- Add search\./u);
  assert.match(result, /### Changed\n\n- Hand-written change\./u);
  assert.match(result, /### Fixed\n\n- Correct focus\./u);
  assert.equal(releaseNotes(result, '0.1.0'), '### Fixed\n\n- Previous fix.');
  assert.throws(() => buildChangelog(result, '0.2.0', nxEntry), /already exists/u);
  const proposal = releaseProposal(result, '0.2.0');
  assert.ok(
    proposal.body.startsWith(
      'Release `@kimen/elements`, `@kimen/tokens`, `@kimen/mcp-server`, `@kimen/catalog`, `@kimen/emitter`, `@kimen/adapter-a2ui`, `@kimen/adapter-mcp-apps`, `@kimen/react`, `@kimen/vue` and `@kimen/angular` at `0.2.0`.',
    ),
  );
  assert.equal(proposal.title, 'chore(release): v0.2.0');
  assert.match(proposal.body, /@kimen\/elements.*@kimen\/tokens/u);
  assert.ok(proposal.body.endsWith(releaseNotes(result, '0.2.0')));
  assert.doesNotMatch(proposal.body, /Previous fix/u);
});

test('S2 the same release PR is updated in place and reused when already current', async () => {
  const proposal = { title: 'chore(release): v0.2.0', body: 'Release notes' };
  for (const pulls of [[], [{ number: 4 }], [{ number: 4, ...proposal }]]) {
    const calls = [];
    await syncReleasePullRequest({
      github: async (method, path, body) => {
        calls.push({ method, path, body });
        return pulls;
      },
      owner: 'kimen-dev',
      proposal,
    });
    const [lookup, write] = calls;
    assert.equal(lookup.method, 'GET');
    assert.match(lookup.path, /state=open&head=kimen-dev%3Arelease%2Fnext&base=main/u);
    if (pulls.length === 0) {
      assert.deepEqual(write, {
        method: 'POST',
        path: '/pulls',
        body: { ...proposal, head: 'release/next', base: 'main' },
      });
    } else if (pulls[0].body === undefined) {
      assert.deepEqual(write, { method: 'PATCH', path: '/pulls/4', body: proposal });
    } else {
      assert.equal(write, undefined);
    }
  }
});

test('S3 only a same-repository release PR merged at the pushed SHA qualifies', () => {
  const push = { repository: 'kimen-dev/kimen', sha: 'release-sha' };
  assert.equal(mergedReleaseVersion([releasePull], push), '0.2.0');
  assert.equal(mergedReleaseVersion([releasePull], { ...push, sha: 'other-sha' }), null);
  for (const disqualified of [
    { ...releasePull, merged_at: null },
    { ...releasePull, title: 'chore(release): v0.02.0' },
    { ...releasePull, head: { ...releasePull.head, ref: 'other-branch' } },
    { ...releasePull, head: { ...releasePull.head, repo: { full_name: 'fork/kimen' } } },
  ]) {
    assert.equal(mergedReleaseVersion([disqualified], push), null);
  }
});

test('S3 a missing tag is created with annotation and a release uses the selected notes', async () => {
  const calls = [];
  await ensureGitHubRelease({
    readTag: async () => null,
    pushTag: async (tag, sha) => calls.push({ tag, sha, annotated: true }),
    github: async (method, path, body) => {
      calls.push({ method, path, body });
      return null;
    },
    version: '0.2.0',
    sha: 'release-sha',
    notes: 'This version only',
  });
  assert.deepEqual(calls, [
    { tag: 'v0.2.0', sha: 'release-sha', annotated: true },
    { method: 'GET', path: '/releases/tags/v0.2.0', body: undefined },
    {
      method: 'POST',
      path: '/releases',
      body: { tag_name: 'v0.2.0', name: 'v0.2.0', body: 'This version only' },
    },
  ]);
});

test('S4 GitHub writes reject the default token when the App token is missing', () => {
  const script = fileURLToPath(new URL('../release/release-github.mjs', import.meta.url));
  for (const args of [['pr', '0.2.0'], ['tag']]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      env: { GITHUB_TOKEN: 'default-token' },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /dedicated GitHub App token is required/u);
  }
});

test('S5 existing tags cannot be rewritten and a partial release can be retried', async () => {
  const options = {
    pushTag: () => assert.fail('an existing tag must never be pushed again'),
    version: '0.2.0',
    sha: 'release-sha',
    notes: 'Release notes',
  };
  await assert.rejects(
    ensureGitHubRelease({
      ...options,
      readTag: async () => ({ annotated: true, sha: 'other-sha' }),
      github: () => assert.fail('a conflicting tag must not get a release'),
    }),
    /existing tag/u,
  );
  const methods = [];
  await ensureGitHubRelease({
    ...options,
    readTag: async () => ({ annotated: true, sha: 'release-sha' }),
    github: async (method) => {
      methods.push(method);
      return null;
    },
  });
  assert.deepEqual(methods, ['GET', 'POST']);
});

test('S6 only the release manifests can be prepared and their runtime ranges stay installable', () => {
  const elements = {
    name: '@kimen/elements',
    version: '0.2.0',
    private: true,
    repository: {
      type: 'git',
      url: 'git+https://github.com/kimen-dev/kimen.git',
      directory: 'packages/elements',
    },
    devDependencies: { '@kimen/tokens': 'workspace:*' },
  };
  const named = (name, extra = {}) => ({
    ...elements,
    name: `@kimen/${name}`,
    repository: { ...elements.repository, directory: `packages/${name}` },
    ...extra,
  });
  for (const name of [
    'elements',
    'tokens',
    'mcp-server',
    'catalog',
    'emitter',
    'adapter-a2ui',
    'adapter-mcp-apps',
    'react',
    'vue',
    'angular',
  ]) {
    const manifest = named(name);
    assert.deepEqual(prepareManifest(manifest, '0.2.0'), { ...manifest, private: false });
  }
  assert.deepEqual(
    [...releasePackages.keys()],
    [
      '@kimen/elements',
      '@kimen/tokens',
      '@kimen/mcp-server',
      '@kimen/catalog',
      '@kimen/emitter',
      '@kimen/adapter-a2ui',
      '@kimen/adapter-mcp-apps',
      '@kimen/react',
      '@kimen/vue',
      '@kimen/angular',
    ],
  );
  assert.throws(() => prepareManifest(named('nx-plugin'), '0.2.0'), /scope/u);
  assert.throws(
    () =>
      prepareManifest({ ...elements, dependencies: { '@kimen/tokens': 'workspace:^' } }, '0.2.0'),
    /workspace:\*/u,
  );
  assert.throws(() => prepareManifest({ ...elements, version: '0.1.0' }, '0.2.0'), /version/u);
});

// The candidate builder rewrites workspace:* to the exact release version;
// it can only do so for a package the same release publishes first.
test('S6 a release manifest needs other release packages only as workspace:* on ones published before it', () => {
  const emitter = (field, range, name = '@kimen/catalog') => ({
    name: '@kimen/emitter',
    [field]: { [name]: range, zod: '4.6.7' },
  });
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    assert.deepEqual(releaseWorkspaceDependencies(emitter(field, 'workspace:*')), [
      { field, name: '@kimen/catalog' },
    ]);
    for (const range of ['workspace:^', 'workspace:~', 'workspace:0.2.0']) {
      assert.throws(
        () => releaseWorkspaceDependencies(emitter(field, range)),
        new RegExp(`@kimen/emitter ${field} can only use workspace:\\* on a release package`, 'u'),
      );
    }
    assert.throws(
      () => releaseWorkspaceDependencies(emitter(field, 'workspace:*', '@kimen/nx-plugin')),
      /on a release package; @kimen\/nx-plugin is workspace:\*/u,
    );
    assert.throws(
      () => releaseWorkspaceDependencies(emitter(field, 'workspace:*', '@kimen/adapter-a2ui')),
      /needs @kimen\/adapter-a2ui, which must be published before it/u,
    );
  }
  assert.deepEqual(
    releaseWorkspaceDependencies({
      name: '@kimen/catalog',
      dependencies: { zod: '4.6.7' },
      devDependencies: { '@kimen/elements': 'workspace:*' },
    }),
    [],
  );
  assert.deepEqual(
    releaseWorkspaceDependencies({
      name: '@kimen/react',
      dependencies: { '@kimen/elements': 'workspace:*' },
    }),
    [{ field: 'dependencies', name: '@kimen/elements' }],
  );
  assert.throws(
    () =>
      releaseWorkspaceDependencies({
        name: '@kimen/nx-plugin',
        dependencies: { '@kimen/elements': 'workspace:*' },
      }),
    /must be published before it/u,
  );
});

// Every release package reached from another one at runtime is in the set
// and comes first, as the repository manifests declare them today.
test('S6 the repository release manifests only need earlier release packages', async () => {
  for (const [name, path] of releasePackages) {
    const manifest = JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), 'utf8'));
    assert.equal(manifest.name, name);
    for (const { name: dependency } of releaseWorkspaceDependencies(manifest)) {
      assert.ok(releasePackages.has(dependency), `${name} needs ${dependency}`);
    }
  }
});

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const readRepositoryFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const mcpName = 'io.github.kimen-dev/kimen';
const installArgs = (version) => ['-y', '-p', `@kimen/mcp-server@${version}`, 'kimen-mcp'];
const cursorLink = (version) => {
  const config = JSON.stringify({ command: 'npx', args: installArgs(version) });
  const base64 = Buffer.from(config).toString('base64');
  return `https://cursor.com/install-mcp?name=kimen&config=${encodeURIComponent(base64)}`;
};
const vscodeLink = (version, scheme = 'vscode') => {
  const config = JSON.stringify({
    name: 'kimen',
    type: 'stdio',
    command: 'npx',
    args: installArgs(version),
  });
  const target = `${scheme}:mcp/install?${encodeURIComponent(config)}`;
  return `https://vscode.dev/redirect?url=${encodeURIComponent(target)}`;
};
const guide = (version) => `Run \`npx -y -p @kimen/mcp-server@${version} kimen-mcp\`.

\`\`\`json
{ "args": ["-y", "-p", "@kimen/mcp-server@${version}", "kimen-mcp"] }
\`\`\`

- [Add to Cursor](${cursorLink(version)})
- [Install in VS Code](${vscodeLink(version)}) ([Insiders](${vscodeLink(version, 'vscode-insiders')}))

The package is \`@kimen/mcp-server\`; a build is at \`/@kimen/mcp-server/dist/kimen-mcp.mjs\`.
`;
const serverJson = (version) =>
  `${JSON.stringify(
    {
      name: mcpName,
      version,
      packages: [
        {
          registryType: 'npm',
          identifier: '@kimen/mcp-server',
          version,
          transport: { type: 'stdio' },
        },
      ],
    },
    null,
    2,
  )}\n`;

test('S9 every plain and link-encoded kimen-mcp pin moves to the release version', () => {
  const { text, pins } = pinMcpServer(guide('0.1.0'), '0.2.0', 'guide.mdx');
  assert.equal(text, guide('0.2.0'));
  assert.deepEqual(pins, ['0.1.0', '0.1.0', '0.1.0', '0.1.0', '0.1.0']);
  assert.equal(pinMcpServer(text, '0.2.0', 'guide.mdx').text, text);
  assert.doesNotMatch(text, /0\.1\.0/u);
  assert.throws(() => pinMcpServer(guide('0.1.0'), '0.2', 'guide.mdx'), /Invalid release version/u);
});

test('S9 server.json takes the release version in both fields and stays canonical', () => {
  assert.equal(pinServerMetadata(serverJson('0.1.0'), '0.2.0', mcpName), serverJson('0.2.0'));
  assert.throws(
    () => pinServerMetadata(serverJson('0.1.0').replace(/\n {2}/gu, '\n    '), '0.2.0', mcpName),
    /canonical/u,
  );
  assert.throws(
    () => pinServerMetadata(serverJson('0.1.0'), '0.2.0', 'io.github.other/kimen'),
    /must name io\.github\.other\/kimen/u,
  );
  const twoPackages = JSON.parse(serverJson('0.1.0'));
  twoPackages.packages.push({ ...twoPackages.packages[0], registryType: 'oci' });
  assert.throws(
    () => pinServerMetadata(`${JSON.stringify(twoPackages, null, 2)}\n`, '0.2.0', mcpName),
    /only the npm package/u,
  );
});

test('S9 a listed file that lost its pin or runs kimen-mcp unpinned fails closed', () => {
  assert.throws(
    () => pinMcpServer('The package is `@kimen/mcp-server`.\n', '0.2.0', 'README.md'),
    /README\.md must pin @kimen\/mcp-server/u,
  );
  for (const unpinned of [
    `${guide('0.1.0')}\nnpx -y -p @kimen/mcp-server kimen-mcp\n`,
    `${guide('0.1.0')}\n"args": ["-y", "-p", "@kimen/mcp-server", "kimen-mcp"]\n`,
  ]) {
    assert.throws(() => pinMcpServer(unpinned, '0.2.0', 'guide.mdx'), /without a pinned version/u);
  }
  const unpinnedConfig = '{"command":"npx","args":["@kimen/mcp-server","kimen-mcp"]}';
  const unpinnedLink = guide('0.1.0').replace(
    cursorLink('0.1.0'),
    `https://cursor.com/install-mcp?name=kimen&config=${encodeURIComponent(
      Buffer.from(unpinnedConfig).toString('base64'),
    )}`,
  );
  assert.throws(() => pinMcpServer(unpinnedLink, '0.2.0', 'guide.mdx'), /install link/u);
});

test('S9 the release pull request pins exactly the listed files and server.json to its own version', async () => {
  const before = new Map([
    ...mcpServerPinPaths.map((path) => [
      path,
      path.endsWith('.json') ? '"@kimen/mcp-server@0.1.0"\n' : guide('0.1.0'),
    ]),
    [mcpServerMetadataPath, serverJson('0.1.0')],
  ]);
  const read = async (path) => {
    if (!before.has(path)) assert.fail(`release preparation read an unlisted file: ${path}`);
    return before.get(path);
  };
  const prepared = await prepareMcpServerVersion(read, '0.2.0', mcpName);
  assert.deepEqual([...prepared.keys()].toSorted(), [...before.keys()].toSorted());
  await verifyMcpServerVersion(async (path) => prepared.get(path), '0.2.0', mcpName);
  await assert.rejects(
    verifyMcpServerVersion(async (path) => prepared.get(path), '0.3.0', mcpName),
    /must pin @kimen\/mcp-server to the release version 0\.3\.0/u,
  );
  const lagging = new Map(prepared).set(mcpServerPinPaths[0], guide('0.1.0'));
  await assert.rejects(
    verifyMcpServerVersion(async (path) => lagging.get(path), '0.2.0', mcpName),
    /packages\/mcp-server\/README\.md must pin/u,
  );
  for (const path of [mcpServerMetadataPath, ...mcpServerPinPaths]) {
    assert.ok(releaseCommitFiles.includes(path), `${path} is committed with the release`);
  }
});

test('S9 the pin list covers every kimen-mcp pin in the repository, all at one version', async () => {
  const search = spawnSync('git', ['grep', '-l', '-E', '@kimen/mcp-server@[0-9]'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  assert.equal(search.status, 0, search.stderr);
  const pinned = search.stdout
    .split('\n')
    .filter((path) => path && path !== 'scripts/tests/release-automation.test.mjs');
  assert.deepEqual(
    pinned.filter((path) => !mcpServerPinPaths.includes(path)),
    [],
    'every file that pins @kimen/mcp-server is listed in mcpServerPinPaths',
  );
  const manifest = JSON.parse(await readRepositoryFile(releasePackages.get('@kimen/mcp-server')));
  assert.equal(manifest.mcpName, mcpName);
  const { version } = JSON.parse(await readRepositoryFile(mcpServerMetadataPath));
  const versions = new Set();
  for (const path of mcpServerPinPaths) {
    for (const pin of pinMcpServer(await readRepositoryFile(path), version, path).pins) {
      versions.add(pin);
    }
  }
  assert.deepEqual([...versions], [version], 'every pin agrees with server.json');
  await verifyMcpServerVersion(readRepositoryFile, version, manifest.mcpName);
});

const compatibility = (version) => `| Adapter version | Protocol | Status |
| --- | --- | --- |
| ${version} | 2026-01-26 | supported |
`;
const surface = (version) => `/** The surface's \`appInfo\`. */
export const KIMEN_APP_INFO: Implementation = {
  name: 'kimen-surface',
  version: '${version}',
};
`;

test('S11 an adapter states the release version in every compatibility row and in its surface', () => {
  assert.equal(
    pinAdapterVersion(compatibility('0.1.0'), '0.2.0', 'COMPAT.md'),
    compatibility('0.2.0'),
  );
  const padded = '| 0.1.0           | 1.0 | preferred |\n| 0.1.0           | 0.9.1 | previous |\n';
  assert.equal(
    pinAdapterVersion(padded, '10.20.30', 'COMPAT.md'),
    '| 10.20.30        | 1.0 | preferred |\n| 10.20.30        | 0.9.1 | previous |\n',
  );
  assert.equal(
    pinAdapterVersion(compatibility('9.9.9'), '10.20.300', 'COMPAT.md'),
    compatibility('10.20.300'),
  );
  assert.equal(pinAdapterVersion(surface('0.1.0'), '0.2.0', 'bridge.ts'), surface('0.2.0'));
  for (const [source, path, pattern] of [
    ['No table here.\n', 'COMPAT.md', /COMPAT\.md must list its compatibility rows/u],
    [
      `${compatibility('0.1.0')}| 0.0.9 | 2025-06-18 | previous |\n`,
      'COMPAT.md',
      /one adapter version/u,
    ],
    [surface('0.1.0').replace("'kimen-surface'", "'other'"), 'bridge.ts', /exactly once/u],
    [`${surface('0.1.0')}${surface('0.1.0')}`, 'bridge.ts', /exactly once/u],
  ]) {
    assert.throws(() => pinAdapterVersion(source, '0.2.0', path), pattern);
  }
  assert.throws(
    () => pinAdapterVersion(surface('0.1.0'), '0.2', 'bridge.ts'),
    /Invalid release version/u,
  );
});

test('S11 the repository adapter files declare the version of the release packages', async () => {
  const { version } = JSON.parse(
    await readRepositoryFile(releasePackages.get('@kimen/adapter-mcp-apps')),
  );
  for (const path of adapterVersionPaths) {
    const source = await readRepositoryFile(path);
    assert.equal(pinAdapterVersion(source, version, path), source, `${path} declares ${version}`);
    assert.ok(releaseCommitFiles.includes(path), `${path} is committed with the release`);
  }
});

const pluginManifest = (version, pin) =>
  `{
  "name": "kimen",
  "version": "${version}",
  "author": { "name": "Kimen", "url": "https://kimen.dev" },${
    pin
      ? `
  "mcpServers": {
    "kimen": { "command": "npx", "args": ["-y", "-p", "@kimen/mcp-server@${pin}", "kimen-mcp"] }
  },`
      : ''
  }
  "keywords": ["kimen"]
}
`;

test('S10 a plugin manifest takes the release version in its top-level version only', () => {
  assert.equal(
    pinPluginManifest(pluginManifest('0.1.0'), '0.2.0', 'plugin.json'),
    pluginManifest('0.2.0'),
  );
  assert.equal(
    pinPluginManifest(pluginManifest('0.1.0', '0.1.0'), '0.2.0', 'gemini-extension.json'),
    pluginManifest('0.2.0', '0.1.0'),
    'the kimen-mcp pin is left to the pin list',
  );
  assert.equal(
    pinPluginManifest(pluginManifest('0.2.0'), '0.2.0', 'plugin.json'),
    pluginManifest('0.2.0'),
  );
  assert.throws(
    () => pinPluginManifest(pluginManifest('0.1.0'), 'v0.2.0', 'plugin.json'),
    /Invalid release version/u,
  );
  for (const manifest of [
    '{\n  "name": "kimen"\n}\n',
    pluginManifest('0.1.0').replace('"name": "kimen",', '"version": "0.1.0",'),
    '{\n  "name": "kimen",\n  "author": {\n    "version": "0.1.0"\n  }\n}\n',
  ]) {
    assert.throws(
      () => pinPluginManifest(manifest, '0.2.0', 'plugin.json'),
      /plugin\.json must declare one top-level version/u,
    );
  }
});

test('S10 the release pull request versions the plugin manifests along with the kimen-mcp pins', async () => {
  const before = new Map([
    ...mcpServerPinPaths.map((path) => [
      path,
      path.endsWith('.json') ? '"@kimen/mcp-server@0.1.0"\n' : guide('0.1.0'),
    ]),
    ...pluginManifestPaths.map((path) => [path, pluginManifest('0.1.0')]),
    ['plugins/kimen/gemini-extension.json', pluginManifest('0.1.0', '0.1.0')],
    [mcpServerMetadataPath, serverJson('0.1.0')],
    ...adapterVersionPaths.map((path) => [
      path,
      path.endsWith('.ts') ? surface('0.1.0') : compatibility('0.1.0'),
    ]),
  ]);
  const read = async (path) => {
    if (!before.has(path)) assert.fail(`release preparation read an unlisted file: ${path}`);
    return before.get(path);
  };
  assert.deepEqual(pluginManifestPaths, [
    'plugins/kimen/.claude-plugin/plugin.json',
    'plugins/kimen/.antigravity-plugin/plugin.json',
    'plugins/kimen/gemini-extension.json',
  ]);
  const prepared = await prepareVersionedFiles(read, '0.2.0', mcpName);
  assert.deepEqual([...prepared.keys()].toSorted(), [...before.keys()].toSorted());
  assert.equal(
    prepared.get('plugins/kimen/gemini-extension.json'),
    pluginManifest('0.2.0', '0.2.0'),
  );
  assert.equal(prepared.get(pluginManifestPaths[0]), pluginManifest('0.2.0'));
  await verifyVersionedFiles(async (path) => prepared.get(path), '0.2.0', mcpName);
  assert.equal(prepared.get(adapterVersionPaths[2]), surface('0.2.0'));
  const lagging = new Map(prepared).set(pluginManifestPaths[1], pluginManifest('0.1.0'));
  await assert.rejects(
    verifyVersionedFiles(async (path) => lagging.get(path), '0.2.0', mcpName),
    /\.antigravity-plugin\/plugin\.json must declare the release version 0\.2\.0/u,
  );
  const laggingAdapter = new Map(prepared).set(adapterVersionPaths[0], compatibility('0.1.0'));
  await assert.rejects(
    verifyVersionedFiles(async (path) => laggingAdapter.get(path), '0.2.0', mcpName),
    /adapter-a2ui\/COMPAT\.md must declare the release version 0\.2\.0/u,
  );
  for (const path of pluginManifestPaths) {
    assert.ok(releaseCommitFiles.includes(path), `${path} is committed with the release`);
  }
  assert.equal(
    new Set(releaseCommitFiles).size,
    releaseCommitFiles.length,
    'each file is listed once',
  );
});

test('S10 the plugin manifests declare the version of the release packages', async () => {
  const versions = new Set();
  for (const path of releasePackages.values()) {
    versions.add(JSON.parse(await readRepositoryFile(path)).version);
  }
  assert.equal(versions.size, 1, 'the release packages share one version');
  const [version] = versions;
  for (const path of pluginManifestPaths) {
    assert.equal(
      JSON.parse(await readRepositoryFile(path)).version,
      version,
      `${path} declares the package release version`,
    );
  }
  const { mcpName: name } = JSON.parse(
    await readRepositoryFile(releasePackages.get('@kimen/mcp-server')),
  );
  await verifyVersionedFiles(readRepositoryFile, version, name);
});
