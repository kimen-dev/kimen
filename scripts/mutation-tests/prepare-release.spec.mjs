// @spec:151-release-automation
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { releasePackages } from '../release/release-plan.mjs';
import {
  changelog,
  nxEntry,
  releasedChangelog,
  releaseManifest,
  releaseManifests,
  versionedFiles,
} from './fixtures/release-workspace.mjs';

// The daily mutation run executes this directory only. prepare-release.mjs is
// a script that prepares the release when it is loaded, so each case loads it
// again in this process against an in-memory checkout, a recorded git and a
// scripted Nx release API. Nothing touches the repository or the network.

const { workspace, git, nx } = vi.hoisted(() => ({
  workspace: { files: new Map(), writes: [], appends: [] },
  git: { calls: [], respond: () => '' },
  nx: { releaseVersion: vi.fn(), releaseChangelog: vi.fn() },
}));

vi.mock('node:child_process', () => ({
  execFileSync: (command, args, options) => {
    if (command !== 'git') throw new Error(`unexpected command ${command}`);
    git.calls.push(args);
    const output = git.respond(args);
    return options?.encoding === 'utf8' ? output : Buffer.from(output);
  },
}));

vi.mock('node:fs/promises', () => ({
  readFile: async (path, encoding) => {
    if (!workspace.files.has(path)) {
      throw Object.assign(new Error(`ENOENT: no such file, open '${path}'`), { code: 'ENOENT' });
    }
    const text = workspace.files.get(path);
    return encoding === 'utf8' ? text : Buffer.from(text);
  },
  writeFile: async (path, text) => {
    workspace.writes.push([path, text]);
    workspace.files.set(path, text);
  },
  appendFile: async (path, text) => {
    workspace.appends.push([path, text]);
  },
}));

vi.mock('nx/release', () => ({
  releaseVersion: nx.releaseVersion,
  releaseChangelog: nx.releaseChangelog,
}));

const names = [...releasePackages.keys()];
const manifestPaths = [...releasePackages.values()];
const noGitWrites = { stageChanges: false, gitCommit: false, gitTag: false, gitPush: false };

/** Git as the release workflow sees it after a merge into main. */
const aHistory =
  ({ parents = 'parent-sha\n', previous = '0.1.0', tags = 'v0.1.0\nv0.0.1\n' } = {}) =>
  (args) => {
    if (args.join(' ') === 'log -1 --format=%P') return parents;
    if (args[0] === 'show') {
      const [, path] = args[1].split(':');
      const name = names[manifestPaths.indexOf(path)];
      const version = typeof previous === 'string' ? previous : previous[name];
      return releaseManifest(name, version);
    }
    if (args.join(' ') === 'tag --merged HEAD --list v*') return tags;
    throw new Error(`unexpected git ${args.join(' ')}`);
  };

const projectsAt = (version, projects = names) =>
  Object.fromEntries(projects.map((name) => [name, { currentVersion: version, newVersion: null }]));

/** Nx planning `workspaceVersion` from 0.1.0 and writing it like `nx release version`. */
const anNx = ({
  workspaceVersion = '0.2.0',
  projects = projectsAt('0.1.0'),
  changelogs = { workspaceChangelog: { contents: nxEntry() } },
} = {}) => {
  nx.releaseVersion.mockImplementation(async (options) => {
    if (options.dryRun) {
      return { workspaceVersion, projectsVersionData: projects, releaseGraph: 'preview-graph' };
    }
    for (const path of manifestPaths) {
      const source = workspace.files.get(path);
      workspace.files.set(
        path,
        source.replace(/("version":\s*)"[^"]+"/u, `$1"${options.specifier}"`),
      );
    }
    return {
      workspaceVersion,
      projectsVersionData: 'written-versions',
      releaseGraph: 'written-graph',
    };
  });
  nx.releaseChangelog.mockImplementation(async () => changelogs);
};

const aCheckout = (files = []) => {
  workspace.files = new Map([
    ['CHANGELOG.md', changelog],
    ...releaseManifests('0.1.0'),
    ...versionedFiles('0.1.0'),
    ...files,
  ]);
};

/** Runs `node scripts/release/prepare-release.mjs` in this process. */
async function prepareRelease() {
  vi.resetModules();
  await import('../release/prepare-release.mjs');
}

let log;

beforeEach(() => {
  workspace.writes = [];
  workspace.appends = [];
  git.calls = [];
  git.respond = aHistory();
  nx.releaseVersion.mockReset();
  nx.releaseChangelog.mockReset();
  aCheckout();
  anNx();
  vi.stubEnv('GITHUB_OUTPUT', 'github-output.txt');
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('release preparation', () => {
  it('S2 a feature after v0.1.0 versions the scope, pins kimen-mcp and dates the changelog', async () => {
    await prepareRelease();

    expect(git.calls).toEqual([
      ['log', '-1', '--format=%P'],
      ['show', 'parent-sha:packages/elements/package.json'],
      ['tag', '--merged', 'HEAD', '--list', 'v*'],
    ]);
    expect(nx.releaseVersion.mock.calls).toEqual([
      [{ ...noGitWrites, firstRelease: false, dryRun: true }],
      [{ ...noGitWrites, firstRelease: false, specifier: '0.2.0', releaseGraph: 'preview-graph' }],
    ]);
    expect(nx.releaseChangelog.mock.calls).toEqual([
      [
        {
          ...noGitWrites,
          firstRelease: false,
          dryRun: true,
          createRelease: false,
          version: '0.2.0',
          versionData: 'written-versions',
          releaseGraph: 'written-graph',
        },
      ],
    ]);
    expect(workspace.writes).toEqual([
      ...releaseManifests('0.2.0', { isPrivate: false }),
      ...versionedFiles('0.2.0'),
      ['CHANGELOG.md', releasedChangelog],
    ]);
    expect(workspace.appends).toEqual([['github-output.txt', 'version=0.2.0\n']]);
    expect(log).toHaveBeenCalledWith('Prepared v0.2.0');
  });

  it('S2 the first release reads no history and leaves the workflow output alone without GITHUB_OUTPUT', async () => {
    vi.stubEnv('GITHUB_OUTPUT', undefined);
    aCheckout([['CHANGELOG.md', changelog.slice(0, changelog.indexOf('## [0.1.0]'))]]);
    git.respond = aHistory({ tags: 'vnext\nv1.2\nx0.1.0\n' });

    await prepareRelease();

    expect(git.calls).toEqual([['tag', '--merged', 'HEAD', '--list', 'v*']]);
    expect(nx.releaseVersion.mock.calls.map(([options]) => options.firstRelease)).toEqual([
      true,
      true,
    ]);
    expect(nx.releaseChangelog.mock.calls[0][0].firstRelease).toBe(true);
    expect(workspace.files.get('CHANGELOG.md')).toBe(
      '# Changelog\n\nAll notable changes are recorded here.\n\n## [0.2.0] - 2026-11-20\n\n### Added\n\n- Hand-written feature.\n- Add search.\n\n### Fixed\n\n- Correct focus.\n',
    );
    expect(workspace.appends).toEqual([]);
    expect(log).toHaveBeenCalledWith('Prepared v0.2.0');
  });

  it('S1 a push without release-worthy changes writes nothing', async () => {
    anNx({ workspaceVersion: null });

    await prepareRelease();

    expect(nx.releaseVersion).toHaveBeenCalledTimes(1);
    expect(nx.releaseChangelog).not.toHaveBeenCalled();
    expect(workspace.writes).toEqual([]);
    expect(workspace.appends).toEqual([]);
    expect(log).toHaveBeenCalledWith('No release-worthy changes in the publication scope');
  });

  it('S2 a pre-1.0 breaking change is proposed as the next minor version', async () => {
    anNx({ workspaceVersion: '1.0.0' });

    await prepareRelease();

    expect(nx.releaseVersion.mock.calls[1][0].specifier).toBe('0.2.0');
    expect(log).toHaveBeenCalledWith('Prepared v0.2.0');
  });

  it('S3 the merge of the release pull request itself prepares no further release', async () => {
    git.respond = aHistory({ parents: 'parent-sha second-parent\n', previous: '0.0.9' });

    await prepareRelease();

    expect(git.calls).toEqual([
      ['log', '-1', '--format=%P'],
      ...manifestPaths.map((path) => ['show', `parent-sha:${path}`]),
    ]);
    expect(nx.releaseVersion).not.toHaveBeenCalled();
    expect(workspace.writes).toEqual([]);
    expect(log).toHaveBeenCalledWith('Skipping release commit for v0.1.0');
  });

  it('S3 a release already merged before the parent still needs its tag', async () => {
    for (const history of [
      {
        previous: {
          '@kimen/elements': '0.0.9',
          '@kimen/tokens': '0.1.0',
          '@kimen/mcp-server': '0.0.9',
        },
        tags: 'v0.0.9\n',
      },
      { parents: '\n', tags: '' },
    ]) {
      git.calls = [];
      git.respond = aHistory(history);

      await expect(prepareRelease()).rejects.toThrow(
        'Merged release v0.1.0 is awaiting its tag. Retry release preparation after release tagging succeeds.',
      );
      expect(git.calls.at(-1)).toEqual(['tag', '--merged', 'HEAD', '--list', 'v*']);
      expect(git.calls.filter(([command]) => command === 'show')).toHaveLength(
        history.parents === '\n' ? 0 : 2,
      );
    }
    expect(nx.releaseVersion).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('S6 the release packages start at one stable version under their own names', async () => {
    const elements = 'packages/elements/package.json';
    const refusals = [
      [
        [[elements, releaseManifest('@kimen/elements', '0.1.1')]],
        'Release packages must start at one fixed, stable version',
      ],
      [releaseManifests('0.1.0-rc.1'), 'Release packages must start at one fixed, stable version'],
      [
        [[elements, releaseManifest('@kimen/tokens', '0.1.0')]],
        `${elements} must declare @kimen/elements`,
      ],
    ];
    for (const [manifests, message] of refusals) {
      aCheckout(manifests);

      await expect(prepareRelease()).rejects.toThrow(message);
    }
    expect(git.calls).toEqual([]);
    expect(nx.releaseVersion).not.toHaveBeenCalled();
  });

  it('S6 Nx must plan exactly the publication scope from the versions on main', async () => {
    const refusals = [
      [
        projectsAt('0.1.0', names.slice(0, 2)),
        'Nx must plan exactly the packages in the release scope',
      ],
      [
        projectsAt('0.1.0', [...names, '@kimen/nx-plugin']),
        'Nx must plan exactly the packages in the release scope',
      ],
      [
        projectsAt('0.1.0', ['@kimen/nx-plugin', ...names.slice(1)]),
        'Nx must plan exactly the packages in the release scope',
      ],
      [
        { ...projectsAt('0.1.0'), '@kimen/tokens': { currentVersion: '0.0.9' } },
        'Nx resolved a release baseline different from the versions on main',
      ],
    ];
    for (const [projects, message] of refusals) {
      nx.releaseVersion.mockClear();
      anNx({ projects });

      await expect(prepareRelease()).rejects.toThrow(message);
      expect(nx.releaseVersion).toHaveBeenCalledTimes(1);
    }
    expect(workspace.writes).toEqual([]);
  });

  it('S9 a file that lost its kimen-mcp pin fails before Nx writes any manifest', async () => {
    aCheckout([['plugins/kimen/README.md', 'Install the plugin.\n']]);

    await expect(prepareRelease()).rejects.toThrow(
      'plugins/kimen/README.md must pin @kimen/mcp-server to a version',
    );
    expect(nx.releaseVersion).toHaveBeenCalledTimes(1);
    expect(workspace.writes).toEqual([]);
  });

  it('S10 a plugin manifest without one top-level version fails before Nx writes any manifest', async () => {
    aCheckout([['plugins/kimen/.claude-plugin/plugin.json', '{\n  "name": "kimen"\n}\n']]);

    await expect(prepareRelease()).rejects.toThrow(
      'plugins/kimen/.claude-plugin/plugin.json must declare one top-level version',
    );
    expect(nx.releaseVersion).toHaveBeenCalledTimes(1);
  });

  it('S2 an Nx changelog without the dated entry writes nothing', async () => {
    for (const changelogs of [
      {},
      { workspaceChangelog: {} },
      { workspaceChangelog: { contents: nxEntry('0.3.0') } },
    ]) {
      aCheckout();
      anNx({ changelogs });

      await expect(prepareRelease()).rejects.toThrow(
        'Nx changelog must provide a dated entry for 0.2.0',
      );
    }
    expect(workspace.writes).toEqual([]);
    expect(workspace.appends).toEqual([]);
  });

  it('S6 a manifest keeps its formatting and only loses the private flag', async () => {
    const compact = `${JSON.stringify(JSON.parse(releaseManifest('@kimen/tokens', '0.1.0')))}\n`;
    const nested = releaseManifest('@kimen/mcp-server', '0.1.0')
      .replace('  "private": true,\n', '')
      .replace(
        '  "files": ["dist"],',
        '  "files": ["dist"],\n  "publishConfig": {\n    "private": true,\n    "access": "public"\n  },',
      )
      .replace(/\n\}\n$/u, ',\n  "private": true\n}\n');
    aCheckout([
      [
        'packages/elements/package.json',
        releaseManifest('@kimen/elements', '0.1.0', { isPrivate: false }),
      ],
      ['packages/tokens/package.json', compact],
      ['packages/mcp-server/package.json', nested],
    ]);

    await prepareRelease();

    const written = new Map(workspace.writes);
    expect(written.has('packages/elements/package.json')).toBe(false);
    expect(written.get('packages/tokens/package.json')).toBe(
      `${JSON.stringify({ ...JSON.parse(compact), version: '0.2.0', private: false }, null, 2)}\n`,
    );
    const mcp = JSON.parse(written.get('packages/mcp-server/package.json'));
    expect(mcp.private).toBe(false);
    expect(mcp.publishConfig.private).toBe(true);
    expect(written.get('packages/mcp-server/package.json')).toBe(
      `${JSON.stringify({ ...JSON.parse(nested), version: '0.2.0', private: false }, null, 2)}\n`,
    );
  });
});
