// @spec:151-release-automation
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildChangelog,
  prepareManifest,
  releaseNotes,
  releaseProposal,
  selectReleaseVersion,
} from '../release/release-plan.mjs';
import {
  ensureGitHubRelease,
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

test('S6 only the two public manifests can be prepared and their runtime ranges stay installable', () => {
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
  assert.deepEqual(prepareManifest(elements, '0.2.0'), { ...elements, private: false });
  assert.throws(() => prepareManifest({ ...elements, name: '@kimen/catalog' }, '0.2.0'), /scope/u);
  assert.throws(
    () => prepareManifest({ ...elements, dependencies: elements.devDependencies }, '0.2.0'),
    /workspace:/u,
  );
  assert.throws(() => prepareManifest({ ...elements, version: '0.1.0' }, '0.2.0'), /version/u);
});
