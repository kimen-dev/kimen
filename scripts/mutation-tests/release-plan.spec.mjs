// @spec:151-release-automation
import { describe, expect, it } from 'vitest';

import {
  buildChangelog,
  mcpServerMetadataPath,
  mcpServerPinPaths,
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
  releaseTitlePattern,
  releaseVersionPattern,
  selectReleaseVersion,
  verifyMcpServerVersion,
  verifyVersionedFiles,
} from '../release/release-plan.mjs';
import {
  changelog,
  cursorLink,
  guide,
  mcpConfig,
  mcpName,
  nxEntry,
  pluginManifest,
  releasedChangelog,
  repositoryUrl,
  serverJson,
  versionedFiles,
  vscodeLink,
} from './fixtures/release-workspace.mjs';

// The daily mutation run executes this directory only, so the cases of
// scripts/tests/release-automation.test.mjs for release-plan.mjs are repeated
// here on the runner it uses, followed by the ones that pin details a mutant
// can change without breaking those.

const readerOf = (files) => async (path) => {
  if (!files.has(path)) throw new Error(`release preparation read an unlisted file: ${path}`);
  return files.get(path);
};

describe('release scope', () => {
  it('S6 the publication scope is exactly the three release packages', () => {
    expect([...releasePackages]).toEqual([
      ['@kimen/elements', 'packages/elements/package.json'],
      ['@kimen/tokens', 'packages/tokens/package.json'],
      ['@kimen/mcp-server', 'packages/mcp-server/package.json'],
    ]);
  });

  it('S9 the pin list names every file that installs kimen-mcp by version', () => {
    expect(mcpServerPinPaths).toEqual([
      'packages/mcp-server/README.md',
      'plugins/kimen/README.md',
      'plugins/kimen/gemini-extension.json',
      'plugins/kimen/mcp_config.json',
      'plugins/kimen/skills/kimen-components/references/install-from-source.md',
      'plugins/kimen/skills/kimen-genui/SKILL.md',
      'plugins/kimen/skills/kimen-genui/references/mcp-server.md',
      'site/docs/src/content/docs/guides/connect-agents.mdx',
    ]);
    expect(Object.isFrozen(mcpServerPinPaths)).toBe(true);
    expect(mcpServerMetadataPath).toBe('packages/mcp-server/server.json');
  });

  it('S10 the plugin manifests are the Claude Code, Antigravity and Gemini ones', () => {
    expect(pluginManifestPaths).toEqual([
      'plugins/kimen/.claude-plugin/plugin.json',
      'plugins/kimen/.antigravity-plugin/plugin.json',
      'plugins/kimen/gemini-extension.json',
    ]);
    expect(Object.isFrozen(pluginManifestPaths)).toBe(true);
  });

  it('S2 a release version is a stable x.y.z without leading zeros', () => {
    for (const version of ['0.2.0', '1.0.0', '10.20.30']) {
      expect(releaseVersionPattern.test(version), version).toBe(true);
    }
    for (const version of ['0.02.0', '01.0.0', '0.2', '0.2.0-rc.1', 'v0.2.0', ' 0.2.0', '0.2.0 ']) {
      expect(releaseVersionPattern.test(version), version).toBe(false);
    }
  });

  it('S3 a release title names one stable version after chore(release)', () => {
    expect(releaseTitlePattern.exec('chore(release): v0.2.0')?.[1]).toBe('0.2.0');
    expect(releaseTitlePattern.exec('chore(release): v10.0.12')?.[1]).toBe('10.0.12');
    for (const title of [
      'chore(release): 0.2.0',
      'chore(release): v0.02.0',
      'chore(release): v0.2.0 and more',
      'Revert chore(release): v0.2.0',
      'chore(deps): v0.2.0',
    ]) {
      expect(releaseTitlePattern.test(title), title).toBe(false);
    }
  });
});

describe('release version selection', () => {
  it('S1 a null Nx version leaves nothing to release', () => {
    expect(selectReleaseVersion('0.1.0', null)).toBeNull();
    expect(selectReleaseVersion('not a version', null)).toBeNull();
  });

  it('S2 conventional commits keep feature and fix bumps and cap pre-1.0 breaking changes at minor', () => {
    expect(selectReleaseVersion('0.1.3', '0.2.0')).toBe('0.2.0');
    expect(selectReleaseVersion('0.1.3', '0.1.4')).toBe('0.1.4');
    expect(selectReleaseVersion('0.1.3', '1.0.0')).toBe('0.2.0');
    expect(selectReleaseVersion('0.9.3', '1.0.0')).toBe('0.10.0');
    expect(selectReleaseVersion('1.2.3', '2.0.0')).toBe('2.0.0');
    expect(selectReleaseVersion('1.2.3', '1.3.0')).toBe('1.3.0');
  });

  it('S2 an unstable or malformed version fails closed', () => {
    for (const [current, suggested] of [
      ['0.1', '0.2.0'],
      ['v0.1.0', '0.2.0'],
      ['0.1.0', '0.2.0-rc.0'],
      ['0.1.0', '0.2'],
    ]) {
      expect(() => selectReleaseVersion(current, suggested), `${current} -> ${suggested}`).toThrow(
        'Nx must resolve one fixed, stable release version',
      );
    }
  });
});

describe('release changelog', () => {
  it('S2 the dated entry folds in Unreleased notes and keeps previous versions', () => {
    const result = buildChangelog(changelog, '0.2.0', nxEntry());

    expect(result).toBe(releasedChangelog);
    expect(releaseNotes(result, '0.1.0')).toBe('### Fixed\n\n- Previous fix.');
    expect(() => buildChangelog(result, '0.2.0', nxEntry())).toThrow(
      'Changelog entry for 0.2.0 already exists',
    );
  });

  it('S2 Nx categories map to fixed Keep a Changelog sections and breaking changes are marked', () => {
    const unreleased = `# Changelog

## [Unreleased]

Highlights of this release.

### Notes

- A custom note.

### Security

- Hand-written security fix.

### Fixed

- Hand-written fix.

### Removed

- Removed the old API.

### Deprecated

- Deprecated the old prop.

### Other

### Changed

- Hand-written change.

### Added

- Hand-written feature.
`;
    const entry = `## 0.2.0 (2026-11-20)

### \u{1f680} Features

- Add search.

### \u{1fa79} Fixes

- Correct focus.

### \u{1f525} Performance

- Faster render.

### \u{1f9f1} Updated Dependencies

- Updated @kimen/tokens to 0.2.0.

### ⚠️  Breaking Changes

- Removed the legacy slot.
`;

    expect(buildChangelog(unreleased, '0.2.0', entry)).toBe(`# Changelog

## [0.2.0] - 2026-11-20

Highlights of this release.

### Added

- Hand-written feature.
- Add search.

### Changed

- Hand-written change.

- Faster render.

- Updated @kimen/tokens to 0.2.0.

**Breaking changes**

- Removed the legacy slot.

### Deprecated

- Deprecated the old prop.

### Removed

- Removed the old API.

### Fixed

- Hand-written fix.
- Correct focus.

### Security

- Hand-written security fix.

### Notes

- A custom note.
`);
  });

  it('S2 a changelog without an Unreleased section or intro takes the Nx notes alone', () => {
    const previous = '## [0.1.0] - 2026-11-01\n\n### Fixed\n\n- Previous fix.\n';

    expect(buildChangelog(previous, '0.2.0', nxEntry())).toBe(
      '\n\n## [0.2.0] - 2026-11-20\n\n### Added\n\n- Add search.\n\n### Fixed\n\n- Correct focus.\n\n## [0.1.0] - 2026-11-01\n\n### Fixed\n\n- Previous fix.\n',
    );
  });

  it('S2 Nx headings may use one or two hashes, a v prefix and surrounding blank lines', () => {
    const body = '\n\n### \u{1fa79} Fixes\n\n- Correct focus.\n';
    for (const heading of [
      '# 0.2.0 (2026-11-20)',
      '## v0.2.0 (2026-11-20)',
      '# v0.2.0 (2026-11-20)',
      '\n\n## 0.2.0 (2026-11-20)',
    ]) {
      expect(buildChangelog('# Changelog\n', '0.2.0', `${heading}${body}`), heading).toBe(
        '# Changelog\n\n## [0.2.0] - 2026-11-20\n\n### Fixed\n\n- Correct focus.\n',
      );
    }
    expect(buildChangelog('# Changelog\n', '10.11.12', `## 10.11.12 (2026-11-20)${body}`)).toBe(
      '# Changelog\n\n## [10.11.12] - 2026-11-20\n\n### Fixed\n\n- Correct focus.\n',
    );
  });

  it('S2 an Nx entry that is not one dated heading for the version is refused', () => {
    for (const entry of [
      nxEntry('0.3.0'),
      '## 0.2.0\n\n- Undated.',
      '## 0.2.0 (20-11-2026)\n\n- Wrong date.',
      '## 0.2.0 (2026-11-2)\n\n- Short day.',
      '### 0.2.0 (2026-11-20)\n\n- Three hashes.',
      `Preface\n${nxEntry()}`,
      '## v0.2.0 (2026-11-20) extra\n\n- Trailing text.',
      '',
    ]) {
      expect(() => buildChangelog(changelog, '0.2.0', entry), entry).toThrow(
        'Nx changelog must provide a dated entry for 0.2.0',
      );
    }
  });

  it('S2 a version with no notes at all is refused', () => {
    expect(() =>
      buildChangelog(
        '# Changelog\n\n## [Unreleased]\n',
        '0.2.0',
        '## 0.2.0 (2026-11-20)\n\n### \u{1fa79} Fixes\n',
      ),
    ).toThrow('The changelog entry for 0.2.0 is empty');
  });

  it('S2 an empty category is dropped and a heading inside a line stays text', () => {
    const notes = `# Changelog

## [Unreleased]

### Removed

### Fixed

- Use ### Fixed headings sparingly.
`;

    expect(buildChangelog(notes, '0.2.0', '## 0.2.0 (2026-11-20)\n\n### Notes\n')).toBe(
      '# Changelog\n\n## [0.2.0] - 2026-11-20\n\n### Fixed\n\n- Use ### Fixed headings sparingly.\n',
    );
  });

  it('S3 only whole-line version headings delimit changelog entries', () => {
    const text = `# Changelog

## [10.11.12] - 2026-11-21

### Fixed

- Mentions ## [0.0.9]
## [0.0.8] is not a heading line.

## [0.1.0]

- Undated entry.
`;

    expect(releaseNotes(text, '10.11.12')).toBe(
      '### Fixed\n\n- Mentions ## [0.0.9]\n## [0.0.8] is not a heading line.',
    );
    expect(releaseNotes(text, '0.1.0')).toBe('- Undated entry.');
    expect(releaseNotes(text, '0.0.9')).toBeUndefined();
    expect(releaseNotes(text, '0.0.8')).toBeUndefined();
    expect(releaseNotes('# Changelog\n', '0.1.0')).toBeUndefined();
  });

  it('S2 the release pull request names the three packages and carries only its notes', () => {
    const proposal = releaseProposal(releasedChangelog, '0.2.0');

    expect(proposal).toEqual({
      title: 'chore(release): v0.2.0',
      body: 'Release `@kimen/elements`, `@kimen/tokens` and `@kimen/mcp-server` at `0.2.0`. Merging this pull request starts tag creation and candidate validation.\n\n### Added\n\n- Hand-written feature.\n- Add search.\n\n### Fixed\n\n- Correct focus.',
    });
    expect(() => releaseProposal(releasedChangelog, '0.3.0')).toThrow(
      'Changelog entry for 0.3.0 is missing or empty',
    );
    expect(() => releaseProposal('## [0.3.0] - 2026-11-21\n', '0.3.0')).toThrow(
      'Changelog entry for 0.3.0 is missing or empty',
    );
  });
});

describe('kimen-mcp pins', () => {
  it('S9 every plain and link-encoded kimen-mcp pin moves to the release version', () => {
    const { text, pins } = pinMcpServer(guide('0.1.0'), '0.2.0', 'guide.mdx');

    expect(text).toBe(guide('0.2.0'));
    expect(pins).toEqual(['0.1.0', '0.1.0', '0.1.0', '0.1.0', '0.1.0']);
    expect(pinMcpServer(text, '0.2.0', 'guide.mdx')).toEqual({
      text,
      pins: ['0.2.0', '0.2.0', '0.2.0', '0.2.0', '0.2.0'],
    });
    expect(() => pinMcpServer(guide('0.1.0'), '0.2', 'guide.mdx')).toThrow(
      'Invalid release version 0.2',
    );
  });

  it('S9 each install link is rewritten on its own and keeps its scheme', () => {
    expect(pinMcpServer(`[Cursor](${cursorLink('0.1.0')})\n`, '0.2.0', 'a.md')).toEqual({
      text: `[Cursor](${cursorLink('0.2.0')})\n`,
      pins: ['0.1.0'],
    });
    expect(pinMcpServer(`[VS Code](${vscodeLink('0.1.0')})\n`, '0.2.0', 'a.md')).toEqual({
      text: `[VS Code](${vscodeLink('0.2.0')})\n`,
      pins: ['0.1.0'],
    });
    expect(
      pinMcpServer(`[Insiders](${vscodeLink('0.1.0', 'vscode-insiders')})\n`, '0.2.0', 'a.md'),
    ).toEqual({ text: `[Insiders](${vscodeLink('0.2.0', 'vscode-insiders')})\n`, pins: ['0.1.0'] });
  });

  it('S9 a listed file that lost its pin or runs kimen-mcp unpinned fails closed', () => {
    expect(() =>
      pinMcpServer('The package is `@kimen/mcp-server`.\n', '0.2.0', 'README.md'),
    ).toThrow('README.md must pin @kimen/mcp-server to a version');
    for (const unpinned of [
      `${guide('0.1.0')}\nnpx -y -p @kimen/mcp-server kimen-mcp\n`,
      `${guide('0.1.0')}\nnpx -y -p   @kimen/mcp-server kimen-mcp\n`,
      `${guide('0.1.0')}\n"args": ["-y", "-p", "@kimen/mcp-server", "kimen-mcp"]\n`,
    ]) {
      expect(() => pinMcpServer(unpinned, '0.2.0', 'guide.mdx')).toThrow(
        'guide.mdx runs @kimen/mcp-server without a pinned version',
      );
    }
  });

  it('S9 an install link must carry exactly one pin and no unpinned command', () => {
    // Built, not written out: a literal pin here would count as a repository
    // pin for the "pin list covers every kimen-mcp pin" case of
    // scripts/tests/release-automation.test.mjs.
    const pinned = `@kimen/mcp-server@${'0.1.0'}`;
    const configs = [
      { command: 'npx', args: ['@kimen/mcp-server', 'kimen-mcp'] },
      { command: 'npx', args: ['kimen-mcp'] },
      { command: 'npx', args: ['-p', pinned, pinned] },
      { command: 'npx', args: ['-p', pinned, '-p', '@kimen/mcp-server'] },
    ];
    for (const config of configs) {
      for (const link of [cursorLink('0.1.0', config), vscodeLink('0.1.0', 'vscode', config)]) {
        expect(() => pinMcpServer(`${guide('0.1.0')}\n${link}\n`, '0.2.0', 'guide.mdx')).toThrow(
          'guide.mdx has an install link without one @kimen/mcp-server pin',
        );
      }
    }
  });

  it('S9 an install link that does not decode to JSON fails closed', () => {
    const notJson = encodeURIComponent(Buffer.from('not json').toString('base64'));
    expect(() =>
      pinMcpServer(
        `${guide('0.1.0')}\nhttps://cursor.com/install-mcp?name=kimen&config=${notJson}\n`,
        '0.2.0',
        'guide.mdx',
      ),
    ).toThrow('guide.mdx has a Cursor install link that is not base64 JSON');
    for (const encoded of ['not-json', '%25E0%25A4%25A']) {
      expect(() =>
        pinMcpServer(
          `${guide('0.1.0')}\nhttps://vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F${encoded}\n`,
          '0.2.0',
          'guide.mdx',
        ),
      ).toThrow('guide.mdx has a VS Code install link that is not encoded JSON');
    }
  });

  it('S9 server.json takes the release version in both fields and stays canonical', () => {
    expect(pinServerMetadata(serverJson('0.1.0'), '0.2.0', mcpName)).toBe(serverJson('0.2.0'));
    expect(() => pinServerMetadata(serverJson('0.1.0'), '0.2', mcpName)).toThrow(
      'Invalid release version 0.2',
    );
    expect(() =>
      pinServerMetadata(serverJson('0.1.0').replace(/\n {2}/gu, '\n    '), '0.2.0', mcpName),
    ).toThrow('packages/mcp-server/server.json must be canonical two-space JSON');
    expect(() => pinServerMetadata(serverJson('0.1.0').trimEnd(), '0.2.0', mcpName)).toThrow(
      'must be canonical two-space JSON',
    );
  });

  it('S9 server.json must name the server and describe only the npm package', () => {
    const npm = JSON.parse(serverJson('0.1.0')).packages[0];
    const refusals = [
      [serverJson('0.1.0'), 'io.github.other/kimen'],
      [serverJson('0.1.0', { packages: [npm, { ...npm, registryType: 'oci' }] }), mcpName],
      [serverJson('0.1.0', { packages: [{ ...npm, registryType: 'oci' }] }), mcpName],
      [serverJson('0.1.0', { packages: [{ ...npm, identifier: '@kimen/elements' }] }), mcpName],
      [serverJson('0.1.0', { packages: [] }), mcpName],
      [serverJson('0.1.0', { packages: undefined }), mcpName],
    ];
    for (const [source, name] of refusals) {
      expect(() => pinServerMetadata(source, '0.2.0', name), source).toThrow(
        `packages/mcp-server/server.json must name ${name} and describe only the npm package @kimen/mcp-server`,
      );
    }
  });

  it('S9 the release pull request pins exactly the listed files and server.json to its own version', async () => {
    const prepared = await prepareMcpServerVersion(
      readerOf(versionedFiles('0.1.0')),
      '0.2.0',
      mcpName,
    );
    const expected = versionedFiles('0.2.0', { plugin: '0.1.0' });

    expect([...prepared.keys()]).toEqual([...mcpServerPinPaths, mcpServerMetadataPath]);
    for (const [path, text] of prepared) expect(text, path).toBe(expected.get(path));
    await expect(
      verifyMcpServerVersion(readerOf(prepared), '0.2.0', mcpName),
    ).resolves.toBeUndefined();
    await expect(verifyMcpServerVersion(readerOf(prepared), '0.3.0', mcpName)).rejects.toThrow(
      'packages/mcp-server/README.md must pin @kimen/mcp-server to the release version 0.3.0',
    );
    const lagging = new Map(prepared).set(mcpServerMetadataPath, serverJson('0.1.0'));
    await expect(verifyMcpServerVersion(readerOf(lagging), '0.2.0', mcpName)).rejects.toThrow(
      'packages/mcp-server/server.json must pin @kimen/mcp-server to the release version 0.2.0',
    );
  });
});

describe('plugin manifests', () => {
  it('S10 a plugin manifest takes the release version in its top-level version only', () => {
    expect(pinPluginManifest(pluginManifest('0.1.0'), '0.2.0', 'plugin.json')).toBe(
      pluginManifest('0.2.0'),
    );
    expect(
      pinPluginManifest(pluginManifest('0.1.0', '0.1.0'), '0.2.0', 'gemini-extension.json'),
    ).toBe(pluginManifest('0.2.0', '0.1.0'));
    expect(pinPluginManifest(pluginManifest('0.2.0'), '0.2.0', 'plugin.json')).toBe(
      pluginManifest('0.2.0'),
    );
    expect(() => pinPluginManifest(pluginManifest('0.1.0'), 'v0.2.0', 'plugin.json')).toThrow(
      'Invalid release version v0.2.0',
    );
  });

  it('S10 a nested version is left alone', () => {
    const nested = pluginManifest('0.1.0').replace(
      '"author": { "name": "Kimen", "url": "https://kimen.dev" },',
      '"author": {\n    "version": "9.9.9",\n    "name": "Kimen"\n  },',
    );

    expect(pinPluginManifest(nested, '0.2.0', 'plugin.json')).toBe(
      nested.replace('"version": "0.1.0"', '"version": "0.2.0"'),
    );
  });

  it('S10 a manifest without exactly one top-level version fails closed', () => {
    for (const manifest of [
      '{\n  "name": "kimen"\n}\n',
      pluginManifest('0.1.0').replace('"name": "kimen",', '"version": "0.1.0",'),
      '{\n  "name": "kimen",\n  "author": {\n    "version": "0.1.0"\n  }\n}\n',
      '{\n "version": "0.1.0"\n}\n',
      '{\n"author": {\n  "version": "0.1.0"\n},\n"name": "kimen"\n}\n',
      '{\n  "version": "0.1.0", "version": "0.0.1"\n}\n',
    ]) {
      expect(() => pinPluginManifest(manifest, '0.2.0', 'plugin.json'), manifest).toThrow(
        'plugin.json must declare one top-level version',
      );
    }
  });

  it('S10 the release pull request versions the plugin manifests along with the kimen-mcp pins', async () => {
    const before = versionedFiles('0.1.0');
    const prepared = await prepareVersionedFiles(readerOf(before), '0.2.0', mcpName);

    expect([...prepared.keys()]).toEqual([
      ...mcpServerPinPaths,
      mcpServerMetadataPath,
      'plugins/kimen/.claude-plugin/plugin.json',
      'plugins/kimen/.antigravity-plugin/plugin.json',
    ]);
    expect(prepared.get('plugins/kimen/gemini-extension.json')).toBe(
      pluginManifest('0.2.0', '0.2.0'),
    );
    expect(prepared.get(pluginManifestPaths[0])).toBe(pluginManifest('0.2.0'));
    expect(prepared.get(pluginManifestPaths[1])).toBe(pluginManifest('0.2.0'));
    expect(prepared.get('plugins/kimen/mcp_config.json')).toBe(mcpConfig('0.2.0'));
    await expect(
      verifyVersionedFiles(readerOf(prepared), '0.2.0', mcpName),
    ).resolves.toBeUndefined();
    const lagging = new Map(prepared).set(pluginManifestPaths[1], pluginManifest('0.1.0'));
    await expect(verifyVersionedFiles(readerOf(lagging), '0.2.0', mcpName)).rejects.toThrow(
      'plugins/kimen/.antigravity-plugin/plugin.json must declare the release version 0.2.0',
    );
    const laggingPin = new Map(prepared).set('plugins/kimen/mcp_config.json', mcpConfig('0.1.0'));
    await expect(verifyVersionedFiles(readerOf(laggingPin), '0.2.0', mcpName)).rejects.toThrow(
      'plugins/kimen/mcp_config.json must pin @kimen/mcp-server to the release version 0.2.0',
    );
  });
});

describe('release manifests', () => {
  const elements = {
    name: '@kimen/elements',
    version: '0.2.0',
    private: true,
    repository: { type: 'git', url: repositoryUrl, directory: 'packages/elements' },
    devDependencies: { '@kimen/tokens': 'workspace:*', vitest: '^4.0.0' },
  };

  it('S6 only the three release manifests can be prepared and become publishable', () => {
    for (const name of ['elements', 'tokens', 'mcp-server']) {
      const manifest = {
        ...elements,
        name: `@kimen/${name}`,
        repository: { ...elements.repository, directory: `packages/${name}` },
      };
      expect(prepareManifest(manifest, '0.2.0')).toEqual({ ...manifest, private: false });
    }
    expect(prepareManifest({ ...elements, private: false }, '0.2.0').private).toBe(false);
    expect(() => prepareManifest({ ...elements, name: '@kimen/catalog' }, '0.2.0')).toThrow(
      '@kimen/catalog is outside the release scope',
    );
  });

  it('S6 the manifest must already carry the release version', () => {
    expect(() => prepareManifest({ ...elements, version: '0.1.0' }, '0.2.0')).toThrow(
      '@kimen/elements version must be 0.2.0',
    );
    expect(() => prepareManifest({ ...elements, version: '0.2' }, '0.2')).toThrow(
      '@kimen/elements version must be 0.2',
    );
  });

  it('S6 the repository metadata must point at the package directory', () => {
    for (const repository of [
      { ...elements.repository, directory: 'packages/elements/package.json' },
      { ...elements.repository, directory: 'packages/tokens' },
      { ...elements.repository, url: 'https://github.com/kimen-dev/kimen' },
      { ...elements.repository, type: 'svn' },
      undefined,
    ]) {
      expect(() => prepareManifest({ ...elements, repository }, '0.2.0')).toThrow(
        '@kimen/elements repository metadata must match the release candidate contract',
      );
    }
  });

  it('S6 no consumer dependency of a published package keeps a workspace range', () => {
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      expect(() =>
        prepareManifest(
          { ...elements, [field]: { lit: '^3.0.0', '@kimen/tokens': 'workspace:^' } },
          '0.2.0',
        ),
      ).toThrow(`@kimen/elements ${field} cannot contain workspace: ranges`);
      expect(prepareManifest({ ...elements, [field]: { lit: '^3.0.0' } }, '0.2.0')).toEqual({
        ...elements,
        [field]: { lit: '^3.0.0' },
        private: false,
      });
    }
  });

  it('S6 release preparation cannot add or change a workspace dev range', () => {
    const before = { ...elements, version: '0.1.0' };

    expect(
      prepareManifest(
        { ...elements, devDependencies: { ...elements.devDependencies, vitest: '^5.0.0' } },
        '0.2.0',
        before,
      ).devDependencies,
    ).toEqual({ '@kimen/tokens': 'workspace:*', vitest: '^5.0.0' });
    for (const devDependencies of [
      { '@kimen/tokens': 'workspace:^' },
      { ...elements.devDependencies, '@kimen/catalog': 'workspace:*' },
      { vitest: '^4.0.0' },
    ]) {
      expect(() => prepareManifest({ ...elements, devDependencies }, '0.2.0', before)).toThrow(
        '@kimen/elements cannot add or change a workspace: range',
      );
    }
  });
});
