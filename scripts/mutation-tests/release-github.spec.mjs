// @spec:151-release-automation
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ensureGitHubRelease,
  mergedReleaseVersion,
  releaseCommitFiles,
  syncReleasePullRequest,
} from '../release/release-github.mjs';
import {
  changelog,
  pluginManifest,
  releasedChangelog,
  releaseManifests,
  versionedFiles,
} from './fixtures/release-workspace.mjs';

// The daily mutation run executes this directory only. The exported helpers
// repeat the cases of scripts/tests/release-automation.test.mjs; the command
// itself (`release-github.mjs pr <version> | tag`) runs in process against a
// recorded git, an in-memory checkout and a fake GitHub API, so no case
// touches the network or a real repository.

const { workspace, git, api } = vi.hoisted(() => ({
  workspace: new Map(),
  git: { calls: [], respond: () => '' },
  api: { calls: [], respond: () => ({ status: 404 }) },
}));

vi.mock('node:child_process', () => ({
  execFileSync: (command, args, options) => {
    if (command !== 'git') throw new Error(`unexpected command ${command}`);
    git.calls.push({ args, env: options?.env });
    const output = git.respond(args);
    return options?.encoding === 'utf8' ? output : Buffer.from(output);
  },
}));

vi.mock('node:fs/promises', () => ({
  readFile: async (path, encoding) => {
    if (!workspace.has(path)) {
      throw Object.assign(new Error(`ENOENT: no such file, open '${path}'`), { code: 'ENOENT' });
    }
    const text = workspace.get(path);
    return encoding === 'utf8' ? text : Buffer.from(text);
  },
}));

const repository = 'kimen-dev/kimen';
const remoteUrl = 'https://github.com/kimen-dev/kimen.git';
const sha = '0123456789abcdef0123456789abcdef01234567';
const token = 'release-app-token-for-tests';
const authorization = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`;
const identity = ['-c', 'user.name=Kimen Release App', '-c', 'user.email=release@kimen.dev'];
const pullsQuery = '/pulls?state=open&head=kimen-dev%3Arelease%2Fnext&base=main';
const notes =
  '### Added\n\n- Hand-written feature.\n- Add search.\n\n### Fixed\n\n- Correct focus.';
const proposal = {
  title: 'chore(release): v0.2.0',
  body: `Release \`@kimen/elements\`, \`@kimen/tokens\`, \`@kimen/mcp-server\`, \`@kimen/catalog\`, \`@kimen/emitter\`, \`@kimen/adapter-a2ui\`, \`@kimen/adapter-mcp-apps\`, \`@kimen/react\`, \`@kimen/vue\` and \`@kimen/angular\` at \`0.2.0\`. Merging this pull request starts tag creation and candidate validation.\n\n${notes}`,
};
const releasePull = {
  title: 'chore(release): v0.2.0',
  merged_at: '2026-11-20T12:00:00Z',
  merge_commit_sha: sha,
  base: { ref: 'main', repo: { full_name: repository } },
  head: { ref: 'release/next', repo: { full_name: repository } },
};

/** A remote with refs, a checkout at `head` and the changes the release left in it. */
const aRemote = (overrides = {}) => ({
  head: sha,
  refs: new Map([['refs/heads/main', sha]]),
  changed: ['CHANGELOG.md', 'packages/elements/package.json'],
  untracked: ['plugins/kimen/.antigravity-plugin/plugin.json'],
  tree: 'release-tree',
  ...overrides,
});

const serve = (remote) => (args) => {
  const local = args[0] === '-c' ? args[4] : args[0];
  switch (local) {
    case 'rev-parse':
      return `${remote.head}\n`;
    case 'ls-remote':
      return args
        .slice(2)
        .filter((ref) => remote.refs.has(ref))
        .map((ref) => `${remote.refs.get(ref)}\t${ref}\n`)
        .join('');
    case 'diff':
      return remote.changed.map((path) => `${path}\0`).join('');
    case 'ls-files':
      return remote.untracked.map((path) => `${path}\0`).join('');
    case 'write-tree':
      return `${remote.tree}\n`;
    case 'add':
    case 'commit':
    case 'push':
    case 'tag':
      return '';
    default:
      throw new Error(`unexpected git ${args.join(' ')}`);
  }
};

const respondWith = (routes) => (method, path) => {
  const route = routes[`${method} ${path}`];
  if (route === undefined) throw new Error(`unexpected GitHub ${method} ${path}`);
  return typeof route === 'function' ? route() : route;
};

const releaseCheckout = (version = '0.2.0') =>
  new Map([
    ['CHANGELOG.md', releasedChangelog],
    ...releaseManifests(version, { isPrivate: false }),
    ...versionedFiles(version),
  ]);

const modulePath = fileURLToPath(new URL('../release/release-github.mjs', import.meta.url));

/** Runs `node scripts/release/release-github.mjs ...args` in this process. */
async function releaseGithub(...args) {
  vi.resetModules();
  const argv = process.argv;
  process.argv = [argv[0], modulePath, ...args];
  try {
    await import('../release/release-github.mjs');
  } finally {
    process.argv = argv;
  }
}

const gitArgs = () => git.calls.map(({ args }) => args);
const apiCalls = () => api.calls.map(({ method, path, body }) => ({ method, path, body }));
let log;

beforeEach(() => {
  workspace.clear();
  git.calls.length = 0;
  api.calls.length = 0;
  git.respond = serve(aRemote());
  api.respond = respondWith({});
  vi.stubEnv('RELEASE_APP_TOKEN', token);
  vi.stubEnv('GITHUB_REPOSITORY', repository);
  vi.stubEnv('GITHUB_SHA', sha);
  vi.stubEnv('GITHUB_TOKEN', 'default-workflow-token');
  vi.stubGlobal('fetch', async (url, init) => {
    const prefix = `https://api.github.com/repos/${repository}`;
    expect(url.startsWith(prefix), url).toBe(true);
    const path = url.slice(prefix.length);
    const call = {
      method: init.method,
      path,
      body: init.body === undefined ? undefined : JSON.parse(init.body),
      rawBody: init.body,
      headers: init.headers,
    };
    api.calls.push(call);
    const { status = 200, json } = api.respond(init.method, path, call.body);
    return new globalThis.Response(json === undefined ? null : JSON.stringify(json), { status });
  });
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('release commit and pull request helpers', () => {
  it('S9 the release commit holds the changelog, manifests, pins, plugin manifests, adapter versions and generated API', () => {
    expect(releaseCommitFiles).toEqual([
      'CHANGELOG.md',
      'packages/elements/package.json',
      'packages/tokens/package.json',
      'packages/mcp-server/package.json',
      'packages/catalog/package.json',
      'packages/emitter/package.json',
      'packages/adapter-a2ui/package.json',
      'packages/adapter-mcp-apps/package.json',
      'packages/react/package.json',
      'packages/vue/package.json',
      'packages/angular/package.json',
      'packages/mcp-server/server.json',
      'packages/mcp-server/README.md',
      'plugins/kimen/README.md',
      'plugins/kimen/gemini-extension.json',
      'plugins/kimen/mcp_config.json',
      'plugins/kimen/skills/kimen-components/references/install-from-source.md',
      'plugins/kimen/skills/kimen-genui/SKILL.md',
      'plugins/kimen/skills/kimen-genui/references/mcp-server.md',
      'site/docs/src/content/docs/guides/connect-agents.mdx',
      'plugins/kimen/.claude-plugin/plugin.json',
      'plugins/kimen/.antigravity-plugin/plugin.json',
      'packages/adapter-a2ui/COMPAT.md',
      'packages/adapter-mcp-apps/COMPAT.md',
      'packages/adapter-mcp-apps/src/bridge.ts',
      'packages/elements/generated/public-api/index.json',
      'packages/catalog/src/generated/catalog.ts',
    ]);
  });

  it('S2 the same release PR is updated in place and reused when already current', async () => {
    const cases = [
      [
        [],
        {
          method: 'POST',
          path: '/pulls',
          body: { ...proposal, head: 'release/next', base: 'main' },
        },
      ],
      [[{ number: 4 }], { method: 'PATCH', path: '/pulls/4', body: proposal }],
      [
        [{ number: 4, ...proposal, title: 'chore(release): v0.1.9' }],
        { method: 'PATCH', path: '/pulls/4', body: proposal },
      ],
      [
        [{ number: 4, ...proposal, body: 'Older notes' }],
        { method: 'PATCH', path: '/pulls/4', body: proposal },
      ],
      [[{ number: 4, ...proposal }], undefined],
    ];
    for (const [pulls, write] of cases) {
      const calls = [];
      await syncReleasePullRequest({
        github: async (method, path, body) => {
          calls.push({ method, path, body });
          return pulls;
        },
        owner: 'kimen-dev',
        proposal,
      });
      expect(calls).toEqual([
        { method: 'GET', path: pullsQuery, body: undefined },
        ...(write ? [write] : []),
      ]);
    }
  });

  it('S2 more than one open release pull request is refused', async () => {
    const github = vi.fn(async () => [{ number: 4 }, { number: 5 }]);

    await expect(syncReleasePullRequest({ github, owner: 'kimen-dev', proposal })).rejects.toThrow(
      'Expected at most one open release pull request',
    );
    expect(github).toHaveBeenCalledTimes(1);
  });

  it('S3 only a same-repository release PR merged at the pushed SHA qualifies', () => {
    const push = { repository, sha };
    expect(mergedReleaseVersion([releasePull], push)).toBe('0.2.0');
    expect(mergedReleaseVersion([{ ...releasePull, title: 'chore(release): v0.10.3' }], push)).toBe(
      '0.10.3',
    );
    expect(mergedReleaseVersion([releasePull], { ...push, sha: 'other-sha' })).toBeNull();
    expect(mergedReleaseVersion([releasePull], { ...push, repository: 'fork/kimen' })).toBeNull();
    expect(mergedReleaseVersion([], push)).toBeNull();
    for (const disqualified of [
      { ...releasePull, merged_at: null },
      { ...releasePull, merge_commit_sha: 'other-sha' },
      { ...releasePull, title: 'chore(release): v0.02.0' },
      { ...releasePull, base: { ...releasePull.base, ref: 'develop' } },
      { ...releasePull, base: { ...releasePull.base, repo: { full_name: 'fork/kimen' } } },
      { ...releasePull, head: { ...releasePull.head, ref: 'other-branch' } },
      { ...releasePull, head: { ...releasePull.head, repo: { full_name: 'fork/kimen' } } },
      { ...releasePull, head: { ...releasePull.head, repo: null } },
    ]) {
      expect(mergedReleaseVersion([disqualified], push)).toBeNull();
    }
    const other = { ...releasePull, title: 'chore(release): v0.1.9', merged_at: null };
    expect(mergedReleaseVersion([other, releasePull], push)).toBe('0.2.0');
  });

  it('S3 a missing tag is created with annotation and a release uses the selected notes', async () => {
    const calls = [];
    await ensureGitHubRelease({
      readTag: async (tag) => {
        calls.push({ readTag: tag });
        return null;
      },
      pushTag: async (tag, target) => calls.push({ tag, target }),
      github: async (method, path, body) => {
        calls.push({ method, path, body });
        return null;
      },
      version: '0.2.0',
      sha,
      notes: 'This version only',
    });
    expect(calls).toEqual([
      { readTag: 'v0.2.0' },
      { tag: 'v0.2.0', target: sha },
      { method: 'GET', path: '/releases/tags/v0.2.0', body: undefined },
      {
        method: 'POST',
        path: '/releases',
        body: { tag_name: 'v0.2.0', name: 'v0.2.0', body: 'This version only' },
      },
    ]);
  });

  it('S5 existing tags cannot be rewritten and a partial release can be retried', async () => {
    const options = {
      pushTag: () => expect.unreachable('an existing tag must never be pushed again'),
      version: '0.2.0',
      sha,
      notes: 'Release notes',
    };
    for (const existing of [
      { annotated: true, sha: 'other-sha' },
      { annotated: false, sha },
    ]) {
      await expect(
        ensureGitHubRelease({
          ...options,
          readTag: async () => existing,
          github: () => expect.unreachable('a conflicting tag must not get a release'),
        }),
      ).rejects.toThrow(
        `The existing tag v0.2.0 is not an annotated tag for ${sha}. It was left intact.`,
      );
    }
    const methods = [];
    await ensureGitHubRelease({
      ...options,
      readTag: async () => ({ annotated: true, sha }),
      github: async (method) => {
        methods.push(method);
        return null;
      },
    });
    expect(methods).toEqual(['GET', 'POST']);
    methods.length = 0;
    await ensureGitHubRelease({
      ...options,
      readTag: async () => ({ annotated: true, sha }),
      github: async (method) => {
        methods.push(method);
        return { id: 1 };
      },
    });
    expect(methods).toEqual(['GET']);
  });
});

describe('release-github command boundary', () => {
  it('S4 GitHub writes reject the default token when the App token is missing', async () => {
    vi.stubEnv('RELEASE_APP_TOKEN', undefined);
    for (const args of [['pr', '0.2.0'], ['tag']]) {
      await expect(releaseGithub(...args)).rejects.toThrow(
        'A dedicated GitHub App token is required for release operations',
      );
    }
    vi.stubEnv('RELEASE_APP_TOKEN', '');
    await expect(releaseGithub('tag')).rejects.toThrow('A dedicated GitHub App token is required');
    expect(git.calls).toEqual([]);
    expect(api.calls).toEqual([]);
  });

  it('S4 release operations need the repository and the full push commit SHA', async () => {
    const refusals = [
      { GITHUB_REPOSITORY: undefined },
      { GITHUB_REPOSITORY: '' },
      { GITHUB_REPOSITORY: 'kimen' },
      { GITHUB_REPOSITORY: 'kimen dev/kimen' },
      { GITHUB_REPOSITORY: 'kimen-dev/kimen extra' },
      { GITHUB_REPOSITORY: 'kimen-dev/kimen/extra' },
      { GITHUB_REPOSITORY: 'kimen-dev/' },
      { GITHUB_SHA: undefined },
      { GITHUB_SHA: sha.slice(1) },
      { GITHUB_SHA: `${sha}0` },
      { GITHUB_SHA: `0${sha}` },
      { GITHUB_SHA: sha.toUpperCase() },
      { GITHUB_SHA: 'g'.repeat(40) },
    ];
    for (const environment of refusals) {
      vi.stubEnv('GITHUB_REPOSITORY', repository);
      vi.stubEnv('GITHUB_SHA', sha);
      for (const [name, value] of Object.entries(environment)) vi.stubEnv(name, value);
      await expect(releaseGithub('tag'), JSON.stringify(environment)).rejects.toThrow(
        'Release operations require the GitHub repository and push commit SHA',
      );
    }
    expect(git.calls).toEqual([]);
  });

  it('S4 the checkout must be the pushed commit', async () => {
    git.respond = serve(aRemote({ head: 'f'.repeat(40) }));

    await expect(releaseGithub('tag')).rejects.toThrow('The checkout must match the workflow SHA');
    expect(gitArgs()).toEqual([['rev-parse', 'HEAD']]);
    expect(api.calls).toEqual([]);
  });

  it('S4 an unknown command or a malformed version is refused after the checkout check', async () => {
    for (const args of [
      [],
      ['pr'],
      ['pr', 'v0.2.0'],
      ['pr', '0.2'],
      ['publish', '0.2.0'],
      ['tags'],
    ]) {
      git.calls.length = 0;
      await expect(releaseGithub(...args), args.join(' ')).rejects.toThrow(
        'Usage: release-github.mjs pr <version> | tag',
      );
      expect(gitArgs()).toEqual([['rev-parse', 'HEAD']]);
    }
    expect(api.calls).toEqual([]);
  });

  it('S4 importing the release script as a module performs no release operation', async () => {
    const argv = process.argv;
    for (const replacement of [
      [argv[0], fileURLToPath(new URL('./release-plan.spec.mjs', import.meta.url)), 'tag'],
      [argv[0]],
    ]) {
      vi.resetModules();
      process.argv = replacement;
      try {
        await import('../release/release-github.mjs');
      } finally {
        process.argv = argv;
      }
    }
    expect(git.calls).toEqual([]);
    expect(api.calls).toEqual([]);
  });
});

describe('release pull request preparation', () => {
  it('S2 a superseded main commit prepares nothing', async () => {
    git.respond = serve(aRemote({ refs: new Map([['refs/heads/main', 'f'.repeat(40)]]) }));

    await releaseGithub('pr', '0.2.0');

    expect(gitArgs()).toEqual([
      ['rev-parse', 'HEAD'],
      ['ls-remote', remoteUrl, 'refs/heads/main', 'refs/heads/release/next'],
    ]);
    expect(api.calls).toEqual([]);
    expect(log).toHaveBeenCalledWith('Skipping release preparation for a superseded main commit');
  });

  it('S2 the first release pull request commits the release files to release/next and opens it', async () => {
    for (const [path, text] of releaseCheckout()) workspace.set(path, text);
    api.respond = respondWith({
      [`GET ${pullsQuery}`]: { json: [] },
      'POST /pulls': { status: 201, json: {} },
    });

    await releaseGithub('pr', '0.2.0');

    expect(gitArgs()).toEqual([
      ['rev-parse', 'HEAD'],
      ['ls-remote', remoteUrl, 'refs/heads/main', 'refs/heads/release/next'],
      ['diff', '--name-only', '-z', 'HEAD'],
      ['ls-files', '--others', '--exclude-standard', '-z'],
      ['add', '--', ...releaseCommitFiles],
      [...identity, 'commit', '-m', 'chore(release): v0.2.0'],
      [
        'push',
        '--no-follow-tags',
        '--force-with-lease=refs/heads/release/next:',
        remoteUrl,
        'HEAD:refs/heads/release/next',
      ],
    ]);
    expect(apiCalls()).toEqual([
      { method: 'GET', path: pullsQuery, body: undefined },
      { method: 'POST', path: '/pulls', body: { ...proposal, head: 'release/next', base: 'main' } },
    ]);
    expect(api.calls[0].rawBody).toBeUndefined();
    for (const { headers } of api.calls) {
      expect(headers).toEqual({
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      });
    }
    expect(log).toHaveBeenCalledWith('Release pull request is up to date for v0.2.0');
  });

  it('S4 only remote git operations carry the App credentials and no git sees the token variable', async () => {
    for (const [path, text] of releaseCheckout()) workspace.set(path, text);
    api.respond = respondWith({ [`GET ${pullsQuery}`]: { json: [] }, 'POST /pulls': { json: {} } });

    await releaseGithub('pr', '0.2.0');

    const remoteOperations = new Set(['ls-remote', 'push']);
    for (const { args, env } of git.calls) {
      expect(env, args.join(' ')).toBeDefined();
      expect(env.RELEASE_APP_TOKEN, args.join(' ')).toBeUndefined();
      expect(env.GITHUB_SHA).toBe(sha);
      if (remoteOperations.has(args[0])) {
        expect(env).toMatchObject({
          GIT_TERMINAL_PROMPT: '0',
          GIT_CONFIG_COUNT: '1',
          GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
          GIT_CONFIG_VALUE_0: authorization,
        });
      } else {
        expect(env.GIT_CONFIG_VALUE_0, args.join(' ')).toBeUndefined();
      }
    }
    expect(process.env.RELEASE_APP_TOKEN).toBe(token);
  });

  it('S2 an up-to-date release branch and pull request are reused as they are', async () => {
    for (const [path, text] of releaseCheckout()) workspace.set(path, text);
    git.respond = serve(
      aRemote({
        refs: new Map([
          ['refs/heads/main', sha],
          ['refs/heads/release/next', 'branch-head'],
        ]),
      }),
    );
    api.respond = respondWith({
      'GET /git/commits/branch-head': {
        json: { parents: [{ sha }], tree: { sha: 'release-tree' } },
      },
      [`GET ${pullsQuery}`]: { json: [{ number: 7, ...proposal }] },
    });

    await releaseGithub('pr', '0.2.0');

    expect(gitArgs().map(([command]) => command)).toEqual([
      'rev-parse',
      'ls-remote',
      'diff',
      'ls-files',
      'add',
      'write-tree',
    ]);
    expect(apiCalls()).toEqual([
      { method: 'GET', path: '/git/commits/branch-head', body: undefined },
      { method: 'GET', path: pullsQuery, body: undefined },
    ]);
    expect(log).toHaveBeenCalledWith('Release pull request is up to date for v0.2.0');
  });

  it('S2 a stale release branch is replaced under a lease on its previous head', async () => {
    for (const previous of [
      { parents: [{ sha }], tree: { sha: 'older-tree' } },
      { parents: [{ sha: 'older-main' }], tree: { sha: 'release-tree' } },
      { parents: [], tree: { sha: 'release-tree' } },
    ]) {
      git.calls.length = 0;
      api.calls.length = 0;
      for (const [path, text] of releaseCheckout()) workspace.set(path, text);
      git.respond = serve(
        aRemote({
          refs: new Map([
            ['refs/heads/main', sha],
            ['refs/heads/release/next', 'branch-head'],
          ]),
        }),
      );
      api.respond = respondWith({
        'GET /git/commits/branch-head': { json: previous },
        [`GET ${pullsQuery}`]: {
          json: [{ number: 7, title: 'chore(release): v0.1.9', body: 'Old' }],
        },
        'PATCH /pulls/7': { json: {} },
      });

      await releaseGithub('pr', '0.2.0');

      expect(gitArgs().slice(-2), JSON.stringify(previous)).toEqual([
        [...identity, 'commit', '-m', 'chore(release): v0.2.0'],
        [
          'push',
          '--no-follow-tags',
          '--force-with-lease=refs/heads/release/next:branch-head',
          remoteUrl,
          'HEAD:refs/heads/release/next',
        ],
      ]);
      expect(apiCalls().at(-1)).toEqual({ method: 'PATCH', path: '/pulls/7', body: proposal });
    }
  });

  it('S9 a change outside the release files stops the release pull request', async () => {
    for (const [path, text] of releaseCheckout()) workspace.set(path, text);
    git.respond = serve(
      aRemote({
        changed: ['CHANGELOG.md', 'scripts/release/release-plan.mjs'],
        untracked: ['notes.txt'],
      }),
    );

    await expect(releaseGithub('pr', '0.2.0')).rejects.toThrow(
      'Unexpected release changes: scripts/release/release-plan.mjs, notes.txt',
    );
    expect(gitArgs().map(([command]) => command)).toEqual([
      'rev-parse',
      'ls-remote',
      'diff',
      'ls-files',
    ]);
    expect(api.calls).toEqual([]);
  });

  it('S6 the release pull request needs three publishable manifests at its version', async () => {
    const cases = [
      [
        releaseManifests('0.2.0'),
        'packages/elements/package.json must declare the publishable @kimen/elements package',
      ],
      [
        new Map([
          ...releaseManifests('0.2.0', { isPrivate: false }),
          [
            'packages/tokens/package.json',
            releaseManifests('0.2.0', { isPrivate: false }).get('packages/elements/package.json'),
          ],
        ]),
        'packages/tokens/package.json must declare the publishable @kimen/tokens package',
      ],
      [releaseManifests('0.1.9', { isPrivate: false }), '@kimen/elements version must be 0.2.0'],
    ];
    for (const [manifests, message] of cases) {
      git.calls.length = 0;
      workspace.clear();
      for (const [path, text] of [...releaseCheckout(), ...manifests]) workspace.set(path, text);

      await expect(releaseGithub('pr', '0.2.0')).rejects.toThrow(message);
      expect(gitArgs().map(([command]) => command)).toEqual(['rev-parse', 'ls-remote']);
    }
    expect(api.calls).toEqual([]);
  });

  it('S10 the release pull request is refused while a plugin manifest or pin declares another version', async () => {
    const cases = [
      [
        'plugins/kimen/.claude-plugin/plugin.json',
        pluginManifest('0.1.0'),
        'plugins/kimen/.claude-plugin/plugin.json must declare the release version 0.2.0',
      ],
      [
        'plugins/kimen/mcp_config.json',
        versionedFiles('0.1.0').get('plugins/kimen/mcp_config.json'),
        'plugins/kimen/mcp_config.json must pin @kimen/mcp-server to the release version 0.2.0',
      ],
    ];
    for (const [path, text, message] of cases) {
      for (const [file, contents] of releaseCheckout()) workspace.set(file, contents);
      workspace.set(path, text);

      await expect(releaseGithub('pr', '0.2.0')).rejects.toThrow(message);
    }
    expect(api.calls).toEqual([]);
  });

  it('S2 a release version without changelog notes opens no pull request', async () => {
    for (const [path, text] of releaseCheckout()) workspace.set(path, text);
    workspace.set('CHANGELOG.md', changelog);

    await expect(releaseGithub('pr', '0.2.0')).rejects.toThrow(
      'Changelog entry for 0.2.0 is missing or empty',
    );
    expect(gitArgs().map(([command]) => command)).toEqual(['rev-parse', 'ls-remote']);
  });

  it('S2 a failed GitHub request stops the release with its method, path and status', async () => {
    for (const [path, text] of releaseCheckout()) workspace.set(path, text);
    api.respond = respondWith({ [`GET ${pullsQuery}`]: { status: 500 } });

    await expect(releaseGithub('pr', '0.2.0')).rejects.toThrow(
      `GitHub GET ${pullsQuery} returned HTTP 500`,
    );

    git.respond = serve(
      aRemote({
        refs: new Map([
          ['refs/heads/main', sha],
          ['refs/heads/release/next', 'gone'],
        ]),
      }),
    );
    api.respond = respondWith({ 'GET /git/commits/gone': { status: 404 } });
    await expect(releaseGithub('pr', '0.2.0')).rejects.toThrow(
      'GitHub GET /git/commits/gone returned HTTP 404',
    );

    git.respond = serve(aRemote());
    api.respond = respondWith({
      [`GET ${pullsQuery}`]: { json: [] },
      'POST /pulls': { status: 422, json: { message: 'Validation Failed' } },
    });
    await expect(releaseGithub('pr', '0.2.0')).rejects.toThrow(
      'GitHub POST /pulls returned HTTP 422',
    );
  });
});

describe('release tagging', () => {
  const merged = () => ({ [`GET /commits/${sha}/pulls`]: { json: [releasePull] } });

  it('S3 a push that is not a merged release pull request tags nothing', async () => {
    api.respond = respondWith({
      [`GET /commits/${sha}/pulls`]: { json: [{ ...releasePull, merged_at: null }] },
    });

    await releaseGithub('tag');

    expect(gitArgs()).toEqual([['rev-parse', 'HEAD']]);
    expect(apiCalls()).toEqual([{ method: 'GET', path: `/commits/${sha}/pulls`, body: undefined }]);
    expect(log).toHaveBeenCalledWith('No merged release pull request at this main commit');
  });

  it('S3 merging the release pull request tags its merge commit and publishes its notes', async () => {
    for (const [path, text] of releaseCheckout()) workspace.set(path, text);
    api.respond = respondWith({
      ...merged(),
      'GET /releases/tags/v0.2.0': { status: 404 },
      'POST /releases': { status: 201, json: {} },
    });

    await releaseGithub('tag');

    expect(gitArgs()).toEqual([
      ['rev-parse', 'HEAD'],
      ['ls-remote', remoteUrl, 'refs/tags/v0.2.0', 'refs/tags/v0.2.0^{}'],
      [...identity, 'tag', '-a', 'v0.2.0', sha, '-m', 'v0.2.0'],
      ['push', '--no-follow-tags', remoteUrl, 'refs/tags/v0.2.0:refs/tags/v0.2.0'],
    ]);
    expect(git.calls[3].env.GIT_CONFIG_VALUE_0).toBe(authorization);
    expect(git.calls[2].env.GIT_CONFIG_VALUE_0).toBeUndefined();
    expect(apiCalls()).toEqual([
      { method: 'GET', path: `/commits/${sha}/pulls`, body: undefined },
      { method: 'GET', path: '/releases/tags/v0.2.0', body: undefined },
      {
        method: 'POST',
        path: '/releases',
        body: { tag_name: 'v0.2.0', name: 'v0.2.0', body: notes },
      },
    ]);
    expect(log).toHaveBeenCalledWith('GitHub Release v0.2.0 is available');
  });

  it('S5 an existing annotated tag at the merge commit is kept and a missing release is retried', async () => {
    for (const [release, writes] of [
      [{ status: 404 }, ['POST /releases']],
      [{ json: { id: 1 } }, []],
    ]) {
      git.calls.length = 0;
      api.calls.length = 0;
      for (const [path, text] of releaseCheckout()) workspace.set(path, text);
      git.respond = serve(
        aRemote({
          refs: new Map([
            ['refs/heads/main', sha],
            ['refs/tags/v0.2.0', 'tag-object'],
            ['refs/tags/v0.2.0^{}', sha],
          ]),
        }),
      );
      api.respond = respondWith({
        ...merged(),
        'GET /releases/tags/v0.2.0': release,
        'POST /releases': { json: {} },
      });

      await releaseGithub('tag');

      expect(gitArgs().map(([command]) => command)).toEqual(['rev-parse', 'ls-remote']);
      expect(
        apiCalls()
          .slice(2)
          .map(({ method, path }) => `${method} ${path}`),
      ).toEqual(writes);
      expect(log).toHaveBeenCalledWith('GitHub Release v0.2.0 is available');
    }
  });

  it('S5 a lightweight or misplaced tag is left intact and stops the release', async () => {
    for (const refs of [
      [['refs/tags/v0.2.0', sha]],
      [
        ['refs/tags/v0.2.0', 'tag-object'],
        ['refs/tags/v0.2.0^{}', 'f'.repeat(40)],
      ],
    ]) {
      git.calls.length = 0;
      api.calls.length = 0;
      for (const [path, text] of releaseCheckout()) workspace.set(path, text);
      git.respond = serve(aRemote({ refs: new Map([['refs/heads/main', sha], ...refs]) }));
      api.respond = respondWith(merged());

      await expect(releaseGithub('tag')).rejects.toThrow(
        `The existing tag v0.2.0 is not an annotated tag for ${sha}. It was left intact.`,
      );
      expect(gitArgs().map(([command]) => command)).toEqual(['rev-parse', 'ls-remote']);
      expect(api.calls).toHaveLength(1);
    }
  });

  it('S3 tagging refuses a release without notes or with a lagging manifest', async () => {
    for (const [path, text] of releaseCheckout()) workspace.set(path, text);
    workspace.set('CHANGELOG.md', changelog);
    api.respond = respondWith(merged());

    await expect(releaseGithub('tag')).rejects.toThrow(
      'Changelog entry for 0.2.0 is missing or empty',
    );

    workspace.set('CHANGELOG.md', releasedChangelog);
    workspace.set('plugins/kimen/gemini-extension.json', pluginManifest('0.1.0', '0.2.0'));
    await expect(releaseGithub('tag')).rejects.toThrow(
      'plugins/kimen/gemini-extension.json must declare the release version 0.2.0',
    );
    expect(gitArgs().filter(([command]) => command !== 'rev-parse')).toEqual([]);
  });

  it('S3 a failed release lookup is an error, not a missing release', async () => {
    for (const [path, text] of releaseCheckout()) workspace.set(path, text);
    api.respond = respondWith({ ...merged(), 'GET /releases/tags/v0.2.0': { status: 500 } });

    await expect(releaseGithub('tag')).rejects.toThrow(
      'GitHub GET /releases/tags/v0.2.0 returned HTTP 500',
    );
    expect(apiCalls().map(({ method }) => method)).toEqual(['GET', 'GET']);
  });
});
