import { isDeepStrictEqual } from 'node:util';

export const releasePackages = new Map([
  ['@kimen/elements', 'packages/elements/package.json'],
  ['@kimen/tokens', 'packages/tokens/package.json'],
  ['@kimen/mcp-server', 'packages/mcp-server/package.json'],
]);
const versionPattern = '(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)';
export const releaseVersionPattern = new RegExp(`^${versionPattern}$`, 'u');
export const releaseTitlePattern = new RegExp(`^chore\\(release\\): v(${versionPattern})$`, 'u');
const versionHeading = /^## \[(Unreleased|\d+\.\d+\.\d+)\](?: - \d{4}-\d{2}-\d{2})?$/gmu;
const categoryHeading = /^### (.+)$/gmu;
const categoryNames = new Map([
  ['🚀 Features', 'Added'],
  ['🩹 Fixes', 'Fixed'],
  ['🔥 Performance', 'Changed'],
  ['🧱 Updated Dependencies', 'Changed'],
  ['⚠️  Breaking Changes', 'Changed'],
]);
const categoryOrder = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

export function selectReleaseVersion(currentVersion, suggestedVersion) {
  if (suggestedVersion === null) return null;
  const current = releaseVersionPattern.exec(currentVersion);
  if (!current || !releaseVersionPattern.test(suggestedVersion)) {
    throw new Error('Nx must resolve one fixed, stable release version');
  }
  // Nx's default zero-major adjustment would also turn features into patches.
  // Keep its conventional-commit result and cap only the pre-1.0 major bump.
  if (current[1] === '0' && suggestedVersion === '1.0.0') {
    return `0.${Number(current[2]) + 1}.0`;
  }
  return suggestedVersion;
}

function sections(content, heading) {
  const matches = [...content.matchAll(heading)];
  return {
    intro: content.slice(0, matches[0]?.index ?? content.length).trim(),
    entries: matches.map((match, index) => ({
      name: match[1],
      heading: match[0],
      body: content.slice(match.index + match[0].length, matches[index + 1]?.index).trim(),
    })),
  };
}

function combineNotes(...notes) {
  const intros = [];
  const categories = new Map();
  for (const note of notes) {
    const { intro, entries } = sections(note, categoryHeading);
    if (intro) intros.push(intro);
    for (const { name, body } of entries) {
      if (!body) continue;
      const category = categoryNames.get(name) ?? name;
      const content = categories.get(category) ?? [];
      content.push(name.includes('Breaking Changes') ? `**Breaking changes**\n\n${body}` : body);
      categories.set(category, content);
    }
  }
  const order = new Set([...categoryOrder, ...categories.keys()]);
  for (const category of order) {
    const content = categories.get(category);
    if (!content) continue;
    const separator = content.every((entry) => entry.startsWith('- ')) ? '\n' : '\n\n';
    intros.push(`### ${category}\n\n${content.join(separator)}`);
  }
  return intros.join('\n\n');
}

export function buildChangelog(changelog, version, nxEntry) {
  const rendered = /^#{1,2} v?([^\s]+) \((\d{4}-\d{2}-\d{2})\)\n([\s\S]*)$/u.exec(nxEntry.trim());
  if (rendered?.[1] !== version) {
    throw new Error(`Nx changelog must provide a dated entry for ${version}`);
  }
  const { intro, entries } = sections(changelog, versionHeading);
  if (entries.some(({ name }) => name === version)) {
    throw new Error(`Changelog entry for ${version} already exists`);
  }
  const unreleased = entries.find(({ name }) => name === 'Unreleased')?.body ?? '';
  const body = combineNotes(unreleased, rendered[3]);
  if (!body) throw new Error(`The changelog entry for ${version} is empty`);
  const previous = entries.filter(({ name }) => name !== 'Unreleased');
  return [
    intro,
    `## [${version}] - ${rendered[2]}\n\n${body}`,
    ...previous.map(({ heading, body }) => `${heading}\n\n${body}`),
  ]
    .join('\n\n')
    .concat('\n');
}

export function releaseNotes(changelog, version) {
  return sections(changelog, versionHeading).entries.find(({ name }) => name === version)?.body;
}

export function releaseProposal(changelog, version) {
  const notes = releaseNotes(changelog, version);
  if (!notes) throw new Error(`Changelog entry for ${version} is missing or empty`);
  const packages = [...releasePackages.keys()].map((name) => `\`${name}\``);
  return {
    title: `chore(release): v${version}`,
    body: `Release ${packages.slice(0, -1).join(', ')} and ${packages.at(-1)} at \`${version}\`. Merging this pull request starts tag creation and candidate validation.\n\n${notes}`,
  };
}

// kimen-mcp is installed by exact version (`npx -y -p @kimen/mcp-server@X.Y.Z
// kimen-mcp`) in the agent plugin, its docs and the one-click install links.
// The release pull request rewrites the pins in exactly these files, and each
// of them must keep at least one pin. Nothing outside the list is touched.
export const mcpServerPinPaths = Object.freeze([
  'packages/mcp-server/README.md',
  'plugins/kimen/README.md',
  'plugins/kimen/gemini-extension.json',
  'plugins/kimen/mcp_config.json',
  'plugins/kimen/skills/kimen-components/references/install-from-source.md',
  'plugins/kimen/skills/kimen-genui/SKILL.md',
  'plugins/kimen/skills/kimen-genui/references/mcp-server.md',
  'site/docs/src/content/docs/guides/connect-agents.mdx',
]);
export const mcpServerMetadataPath = 'packages/mcp-server/server.json';

const mcpServerPin = new RegExp(
  `@kimen/mcp-server@(${versionPattern})(?![0-9A-Za-z+-]|\\.[0-9])`,
  'gu',
);
// A command or argument naming the package without a version runs `latest`.
const unpinnedMcpServer = /-p\s+@kimen\/mcp-server(?!@)|"@kimen\/mcp-server"/u;
const cursorInstallLink = /https:\/\/cursor\.com\/install-mcp\?name=kimen&config=([A-Za-z0-9%]+)/gu;
const vscodeInstallLink =
  /https:\/\/vscode\.dev\/redirect\?url=(vscode(?:-insiders)?)%3Amcp%2Finstall%3F([A-Za-z0-9%._~-]+)/gu;

function rewritePlainPins(text, version, found) {
  return text.replace(mcpServerPin, (_pin, current) => {
    found.push(current);
    return `@kimen/mcp-server@${version}`;
  });
}

function rewriteInstallConfig(json, version, path) {
  const found = [];
  const rewritten = rewritePlainPins(json, version, found);
  if (found.length !== 1 || unpinnedMcpServer.test(rewritten)) {
    throw new Error(`${path} has an install link without one @kimen/mcp-server pin`);
  }
  return { rewritten, found };
}

/**
 * Rewrites every `@kimen/mcp-server@X.Y.Z` pin in one listed file to
 * `version`, including the pins encoded in the Cursor and VS Code install
 * links. Fails closed when the file has no pin, names the package without a
 * version, or carries an install link it cannot decode.
 */
export function pinMcpServer(source, version, path) {
  if (!releaseVersionPattern.test(version)) throw new Error(`Invalid release version ${version}`);
  const found = [];
  let text = rewritePlainPins(source, version, found);
  text = text.replace(cursorInstallLink, (_link, encoded) => {
    let json;
    try {
      json = Buffer.from(decodeURIComponent(encoded), 'base64').toString('utf8');
      JSON.parse(json);
    } catch {
      throw new Error(`${path} has a Cursor install link that is not base64 JSON`);
    }
    const config = rewriteInstallConfig(json, version, path);
    found.push(...config.found);
    const base64 = Buffer.from(config.rewritten, 'utf8').toString('base64');
    return `https://cursor.com/install-mcp?name=kimen&config=${encodeURIComponent(base64)}`;
  });
  text = text.replace(vscodeInstallLink, (_link, scheme, encoded) => {
    let json;
    try {
      json = decodeURIComponent(decodeURIComponent(encoded));
      JSON.parse(json);
    } catch {
      throw new Error(`${path} has a VS Code install link that is not encoded JSON`);
    }
    const config = rewriteInstallConfig(json, version, path);
    found.push(...config.found);
    const target = `${scheme}:mcp/install?${encodeURIComponent(config.rewritten)}`;
    return `https://vscode.dev/redirect?url=${encodeURIComponent(target)}`;
  });
  if (found.length === 0) throw new Error(`${path} must pin @kimen/mcp-server to a version`);
  if (unpinnedMcpServer.test(text)) {
    throw new Error(`${path} runs @kimen/mcp-server without a pinned version`);
  }
  return { text, pins: found };
}

/**
 * Sets both versions in the MCP Registry metadata. The file must stay in
 * canonical two-space JSON, describe one npm package, and carry the name the
 * package publishes as `mcpName`.
 */
export function pinServerMetadata(source, version, mcpName) {
  if (!releaseVersionPattern.test(version)) throw new Error(`Invalid release version ${version}`);
  const metadata = JSON.parse(source);
  if (`${JSON.stringify(metadata, null, 2)}\n` !== source) {
    throw new Error(`${mcpServerMetadataPath} must be canonical two-space JSON`);
  }
  const [npmPackage, ...others] = metadata.packages ?? [];
  if (
    metadata.name !== mcpName ||
    others.length > 0 ||
    npmPackage?.registryType !== 'npm' ||
    npmPackage.identifier !== '@kimen/mcp-server'
  ) {
    throw new Error(
      `${mcpServerMetadataPath} must name ${mcpName} and describe only the npm package @kimen/mcp-server`,
    );
  }
  metadata.version = version;
  npmPackage.version = version;
  return `${JSON.stringify(metadata, null, 2)}\n`;
}

/** The pinned files and server.json as the release pull request writes them. */
export async function prepareMcpServerVersion(read, version, mcpName) {
  const files = new Map();
  for (const path of mcpServerPinPaths) {
    files.set(path, pinMcpServer(await read(path), version, path).text);
  }
  files.set(
    mcpServerMetadataPath,
    pinServerMetadata(await read(mcpServerMetadataPath), version, mcpName),
  );
  return files;
}

/** Fails unless every pin and both server.json versions already name `version`. */
export async function verifyMcpServerVersion(read, version, mcpName) {
  for (const [path, text] of await prepareMcpServerVersion(read, version, mcpName)) {
    if (text !== (await read(path))) {
      throw new Error(`${path} must pin @kimen/mcp-server to the release version ${version}`);
    }
  }
}

// An installed agent plugin refreshes only when its manifest version moves, so
// the three plugin manifests carry the package release version. The release
// pull request rewrites their top-level `version` and nothing else.
export const pluginManifestPaths = Object.freeze([
  'plugins/kimen/.claude-plugin/plugin.json',
  'plugins/kimen/.antigravity-plugin/plugin.json',
  'plugins/kimen/gemini-extension.json',
]);
const pluginVersionField = /^ {2}"version": "[^"\n]*"/gmu;

/**
 * Sets the top-level `version` of one plugin manifest to `version`, leaving
 * every other byte alone. Fails closed unless the manifest declares exactly
 * one top-level version on its own two-space-indented line.
 */
export function pinPluginManifest(source, version, path) {
  if (!releaseVersionPattern.test(version)) throw new Error(`Invalid release version ${version}`);
  let fields = 0;
  const text = source.replace(pluginVersionField, () => {
    fields += 1;
    return `  "version": "${version}"`;
  });
  if (fields !== 1 || JSON.parse(text).version !== version) {
    throw new Error(`${path} must declare one top-level version`);
  }
  return text;
}

/** The kimen-mcp pins, server.json and plugin manifests as the release pull request writes them. */
export async function prepareVersionedFiles(read, version, mcpName) {
  const files = await prepareMcpServerVersion(read, version, mcpName);
  for (const path of pluginManifestPaths) {
    files.set(path, pinPluginManifest(files.get(path) ?? (await read(path)), version, path));
  }
  return files;
}

/** Fails unless every kimen-mcp pin and every plugin manifest already names `version`. */
export async function verifyVersionedFiles(read, version, mcpName) {
  await verifyMcpServerVersion(read, version, mcpName);
  for (const path of pluginManifestPaths) {
    const source = await read(path);
    if (pinPluginManifest(source, version, path) !== source) {
      throw new Error(`${path} must declare the release version ${version}`);
    }
  }
}

function workspaceRanges(dependencies = {}) {
  return Object.fromEntries(
    Object.entries(dependencies).filter(([, range]) => range.startsWith('workspace:')),
  );
}

export function prepareManifest(manifest, version, before = manifest) {
  const path = releasePackages.get(manifest.name);
  if (!path) throw new Error(`${manifest.name} is outside the release scope`);
  if (manifest.version !== version || !releaseVersionPattern.test(version)) {
    throw new Error(`${manifest.name} version must be ${version}`);
  }
  const expectedRepository = {
    type: 'git',
    url: 'git+https://github.com/kimen-dev/kimen.git',
    directory: path.replace('/package.json', ''),
  };
  if (!isDeepStrictEqual(manifest.repository, expectedRepository)) {
    throw new Error(
      `${manifest.name} repository metadata must match the release candidate contract`,
    );
  }
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    if (Object.keys(workspaceRanges(manifest[field])).length > 0) {
      throw new Error(`${manifest.name} ${field} cannot contain workspace: ranges`);
    }
  }
  if (
    !isDeepStrictEqual(
      workspaceRanges(manifest.devDependencies),
      workspaceRanges(before.devDependencies),
    )
  ) {
    throw new Error(`${manifest.name} cannot add or change a workspace: range`);
  }
  return { ...manifest, private: false };
}
