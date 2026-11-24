import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, URLSearchParams } from 'node:url';
import {
  mcpServerMetadataPath,
  mcpServerPinPaths,
  pluginManifestPaths,
  prepareManifest,
  releaseNotes,
  releasePackages,
  releaseProposal,
  releaseTitlePattern,
  releaseVersionPattern,
  verifyVersionedFiles,
} from './release-plan.mjs';

const releaseBranch = 'release/next';
const releaseRef = `refs/heads/${releaseBranch}`;
const mainBranch = 'main';
// The MCP version is compiled into ignored build outputs. Its tracked
// package.json is included via releasePackages.
const generatedFiles = [
  'packages/elements/generated/public-api/index.json',
  'packages/catalog/src/generated/catalog.ts',
];
export const releaseCommitFiles = [
  ...new Set([
    'CHANGELOG.md',
    ...releasePackages.values(),
    mcpServerMetadataPath,
    ...mcpServerPinPaths,
    ...pluginManifestPaths,
    ...generatedFiles,
  ]),
];

export function mergedReleaseVersion(pulls, { repository, sha }) {
  const pull = pulls.find(
    ({ title, merged_at, merge_commit_sha, base, head }) =>
      merged_at &&
      merge_commit_sha === sha &&
      releaseTitlePattern.test(title) &&
      base.ref === mainBranch &&
      base.repo.full_name === repository &&
      head.ref === releaseBranch &&
      head.repo?.full_name === repository,
  );
  return pull ? releaseTitlePattern.exec(pull.title)[1] : null;
}

export async function syncReleasePullRequest({ github, owner, proposal }) {
  const query = new URLSearchParams({
    state: 'open',
    head: `${owner}:${releaseBranch}`,
    base: mainBranch,
  });
  const pulls = await github('GET', `/pulls?${query}`);
  if (pulls.length > 1) throw new Error('Expected at most one open release pull request');
  const [pull] = pulls;
  if (!pull) {
    await github('POST', '/pulls', { ...proposal, head: releaseBranch, base: mainBranch });
  } else if (pull.title !== proposal.title || pull.body !== proposal.body) {
    await github('PATCH', `/pulls/${pull.number}`, proposal);
  }
}

export async function ensureGitHubRelease({ readTag, pushTag, github, version, sha, notes }) {
  const tag = `v${version}`;
  const existingTag = await readTag(tag);
  if (!existingTag) {
    await pushTag(tag, sha);
  } else if (!existingTag.annotated || existingTag.sha !== sha) {
    throw new Error(
      `The existing tag ${tag} is not an annotated tag for ${sha}. It was left intact.`,
    );
  }
  if (!(await github('GET', `/releases/tags/${tag}`))) {
    await github('POST', '/releases', { tag_name: tag, name: tag, body: notes });
  }
}

function githubClient(repository, token) {
  return async (method, path, body) => {
    const response = await globalThis.fetch(`https://api.github.com/repos/${repository}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 404 && method === 'GET' && path.startsWith('/releases/tags/'))
      return null;
    if (!response.ok) throw new Error(`GitHub ${method} ${path} returned HTTP ${response.status}`);
    return response.json();
  };
}

function git(arguments_, env = process.env) {
  const gitEnv = { ...env };
  delete gitEnv.RELEASE_APP_TOKEN;
  return execFileSync('git', arguments_, { env: gitEnv, encoding: 'utf8' }).trimEnd();
}

function refs(output) {
  return new Map(
    output
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, ref] = line.split('\t');
        return [ref, sha];
      }),
  );
}

function releaseGit(repository, token) {
  const url = `https://github.com/${repository}.git`;
  const authorization = Buffer.from(`x-access-token:${token}`).toString('base64');
  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${authorization}`,
  };
  const identity = ['-c', 'user.name=Kimen Release App', '-c', 'user.email=release@kimen.dev'];
  return {
    list: (...patterns) => refs(git(['ls-remote', url, ...patterns], env)),
    commit: (title) => git([...identity, 'commit', '-m', title]),
    pushBranch: (expected) =>
      git(
        [
          'push',
          '--no-follow-tags',
          `--force-with-lease=${releaseRef}:${expected}`,
          url,
          `HEAD:${releaseRef}`,
        ],
        env,
      ),
    pushTag: (tag, sha) => {
      git([...identity, 'tag', '-a', tag, sha, '-m', tag]);
      const ref = `refs/tags/${tag}`;
      git(['push', '--no-follow-tags', url, `${ref}:${ref}`], env);
    },
  };
}

async function verifyManifests(version) {
  const manifests = new Map();
  for (const [name, path] of releasePackages) {
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    if (manifest.name !== name || manifest.private !== false) {
      throw new Error(`${path} must declare the publishable ${name} package`);
    }
    prepareManifest(manifest, version);
    manifests.set(name, manifest);
  }
  const { mcpName } = manifests.get('@kimen/mcp-server');
  await verifyVersionedFiles((path) => readFile(path, 'utf8'), version, mcpName);
}

async function proposeRelease({ github, remote, repository, sha, version }) {
  const mainRef = `refs/heads/${mainBranch}`;
  const remoteRefs = remote.list(mainRef, releaseRef);
  if (remoteRefs.get(mainRef) !== sha) {
    console.log('Skipping release preparation for a superseded main commit');
    return;
  }
  await verifyManifests(version);
  const proposal = releaseProposal(await readFile('CHANGELOG.md', 'utf8'), version);
  const changes = [
    ...git(['diff', '--name-only', '-z', 'HEAD']).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
  ].filter(Boolean);
  const unexpected = changes.filter((path) => !releaseCommitFiles.includes(path));
  if (unexpected.length > 0)
    throw new Error(`Unexpected release changes: ${unexpected.join(', ')}`);
  git(['add', '--', ...releaseCommitFiles]);
  const expectedBranch = remoteRefs.get(releaseRef);
  const previous = expectedBranch ? await github('GET', `/git/commits/${expectedBranch}`) : null;
  if (previous?.parents[0]?.sha !== sha || previous?.tree.sha !== git(['write-tree'])) {
    remote.commit(proposal.title);
    remote.pushBranch(expectedBranch ?? '');
  }
  await syncReleasePullRequest({ github, owner: repository.split('/')[0], proposal });
  console.log(`Release pull request is up to date for v${version}`);
}

async function tagRelease({ github, remote, repository, sha }) {
  const pulls = await github('GET', `/commits/${sha}/pulls`);
  const version = mergedReleaseVersion(pulls, { repository, sha });
  if (version === null) {
    console.log('No merged release pull request at this main commit');
    return;
  }
  await verifyManifests(version);
  const notes = releaseNotes(await readFile('CHANGELOG.md', 'utf8'), version);
  if (!notes) throw new Error(`Changelog entry for ${version} is missing or empty`);
  await ensureGitHubRelease({
    github,
    version,
    sha,
    notes,
    pushTag: remote.pushTag,
    readTag: (tag) => {
      const ref = `refs/tags/${tag}`;
      const peeled = `${ref}^{}`;
      const tags = remote.list(ref, peeled);
      if (!tags.has(ref)) return null;
      return { annotated: tags.has(peeled), sha: tags.get(peeled) ?? tags.get(ref) };
    },
  });
  console.log(`GitHub Release v${version} is available`);
}

async function run() {
  const { RELEASE_APP_TOKEN: token, GITHUB_REPOSITORY: repository, GITHUB_SHA: sha } = process.env;
  if (!token) throw new Error('A dedicated GitHub App token is required for release operations');
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repository ?? '') || !/^[a-f0-9]{40}$/u.test(sha ?? '')) {
    throw new Error('Release operations require the GitHub repository and push commit SHA');
  }
  if (git(['rev-parse', 'HEAD']) !== sha)
    throw new Error('The checkout must match the workflow SHA');
  const [command, version] = process.argv.slice(2);
  const options = {
    github: githubClient(repository, token),
    remote: releaseGit(repository, token),
    repository,
    sha,
  };
  if (command === 'pr' && releaseVersionPattern.test(version)) {
    await proposeRelease({ ...options, version });
  } else if (command === 'tag') {
    await tagRelease(options);
  } else {
    throw new Error('Usage: release-github.mjs pr <version> | tag');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run();
