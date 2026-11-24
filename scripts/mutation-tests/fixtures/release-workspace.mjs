// Release files for the mutation specs of scripts/release/: the three release
// manifests, the kimen-mcp pins, server.json, the plugin manifests and the
// changelog, built in memory at the versions a case needs. The builders match
// the ones of scripts/tests/release-automation.test.mjs.
import {
  mcpServerMetadataPath,
  mcpServerPinPaths,
  pluginManifestPaths,
  releasePackages,
} from '../../release/release-plan.mjs';

export const mcpName = 'io.github.kimen-dev/kimen';
export const repositoryUrl = 'git+https://github.com/kimen-dev/kimen.git';

const installArgs = (version) => ['-y', '-p', `@kimen/mcp-server@${version}`, 'kimen-mcp'];

export const cursorLink = (version, config = { command: 'npx', args: installArgs(version) }) => {
  const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
  return `https://cursor.com/install-mcp?name=kimen&config=${encodeURIComponent(base64)}`;
};

export const vscodeLink = (
  version,
  scheme = 'vscode',
  config = { name: 'kimen', type: 'stdio', command: 'npx', args: installArgs(version) },
) => {
  const target = `${scheme}:mcp/install?${encodeURIComponent(JSON.stringify(config))}`;
  return `https://vscode.dev/redirect?url=${encodeURIComponent(target)}`;
};

export const guide = (version) => `Run \`npx -y -p @kimen/mcp-server@${version} kimen-mcp\`.

\`\`\`json
{ "args": ["-y", "-p", "@kimen/mcp-server@${version}", "kimen-mcp"] }
\`\`\`

- [Add to Cursor](${cursorLink(version)})
- [Install in VS Code](${vscodeLink(version)}) ([Insiders](${vscodeLink(version, 'vscode-insiders')}))

The package is \`@kimen/mcp-server\`; a build is at \`/@kimen/mcp-server/dist/kimen-mcp.mjs\`.
`;

export const serverJson = (version, overrides = {}) =>
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
      ...overrides,
    },
    null,
    2,
  )}\n`;

export const pluginManifest = (version, pin) =>
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

export const mcpConfig = (version) => `{
  "mcpServers": {
    "kimen": {
      "command": "npx",
      "args": ["-y", "-p", "@kimen/mcp-server@${version}", "kimen-mcp"]
    }
  }
}
`;

/**
 * A release manifest as the repository writes it: two-space JSON with a
 * one-line `files` array, so an in-place edit and a full re-serialization
 * produce different bytes.
 */
export const releaseManifest = (name, version, { isPrivate = true, extra = '' } = {}) => {
  const directory = releasePackages.get(name).replace('/package.json', '');
  const mcp = name === '@kimen/mcp-server' ? `\n  "mcpName": "${mcpName}",` : '';
  return `{
  "name": "${name}",${mcp}
  "version": "${version}",
  "private": ${String(isPrivate)},
  "files": ["dist"],
  "repository": {
    "type": "git",
    "url": "${repositoryUrl}",
    "directory": "${directory}"
  },${extra}
  "devDependencies": { "@kimen/tokens": "workspace:*" }
}
`;
};

export const changelog = `# Changelog

All notable changes are recorded here.

## [Unreleased]

### Added

- Hand-written feature.

## [0.1.0] - 2026-11-01

### Fixed

- Previous fix.
`;

export const nxEntry = (version = '0.2.0') => `## ${version} (2026-11-20)

### \u{1f680} Features

- Add search.

### \u{1fa79} Fixes

- Correct focus.
`;

/** The changelog buildChangelog writes for `changelog` and `nxEntry()`. */
export const releasedChangelog = `# Changelog

All notable changes are recorded here.

## [0.2.0] - 2026-11-20

### Added

- Hand-written feature.
- Add search.

### Fixed

- Correct focus.

## [0.1.0] - 2026-11-01

### Fixed

- Previous fix.
`;

/** Every kimen-mcp pin file, server.json and plugin manifest at one version. */
export const versionedFiles = (version, { pin = version, plugin = version } = {}) => {
  const files = new Map();
  for (const path of mcpServerPinPaths) {
    files.set(path, path.endsWith('mcp_config.json') ? mcpConfig(pin) : guide(pin));
  }
  files.set(mcpServerMetadataPath, serverJson(pin));
  for (const path of pluginManifestPaths) files.set(path, pluginManifest(plugin));
  files.set('plugins/kimen/gemini-extension.json', pluginManifest(plugin, pin));
  return files;
};

/** The release manifests at `version`, keyed by path. */
export const releaseManifests = (version, options = {}) =>
  new Map(
    [...releasePackages].map(([name, path]) => [path, releaseManifest(name, version, options)]),
  );
