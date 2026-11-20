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
