import assert from 'node:assert/strict';
import test from 'node:test';

import {
  changedFiles,
  classifyChangedFiles,
  classifyGithubEvent,
  eventRange,
  formatOutputs,
  isSharedInfrastructure,
  parseArguments,
  requiresFullSuite,
} from '../gates/classify-ci-scope.mjs';
import { requiresBrowserVerification } from '../gates/dependency-browser-impact.mjs';

const both = (files) => ({
  pull_request: classifyChangedFiles(files),
  merge_group: classifyChangedFiles(files, { event: 'merge_group' }),
});

// The real shapes of recent changes: #512 (docs and the constitution), #517
// (the agent plugin and a site guide), #521 (one package manifest), and a
// component, a token and a static site edit.
const CHANGES = {
  docs: [
    '.specify/memory/constitution.md',
    'AGENTS.md',
    'CLAUDE.md',
    'README.md',
    'NOTICE',
    'docs/roadmap.md',
    'specs/152-guardrail-containment/spec.md',
    '.agents/skills/zod/AGENTS.md',
  ],
  site: ['site/index.html', 'site/landing.css', 'site/landing.js', 'site/_headers'],
  plugin: [
    '.claude-plugin/marketplace.json',
    'plugins/kimen/README.md',
    'plugins/kimen/skills/kimen-components/SKILL.md',
    'plugins/kimen/evals/dark-mode-toggle/prompt.md',
  ],
  manifest: ['packages/mcp-server/package.json'],
  component: [
    'packages/elements/src/components/ki-card/ki-card.tsx',
    'packages/elements/src/components/ki-card/ki-card.css',
    'packages/elements/generated/custom-elements.json',
    'packages/elements/llms/ki-card.md',
    'llms-full.txt',
  ],
  tokens: ['packages/tokens/src/color.json', 'packages/tokens/dist/css/tokens.css'],
  infraTests: ['scripts/tests/ci-scope.test.mjs', 'scripts/release/release-plan.mjs'],
};

test('documentation, site, plugin, project and infra-test changes run the affected scope', () => {
  for (const [name, files] of Object.entries(CHANGES)) {
    assert.deepEqual(both(files), { pull_request: 'affected', merge_group: 'affected' }, name);
    assert.equal(requiresFullSuite(files), false, name);
  }
});

// The founder's list (2026-11-20): root config, pnpm-lock.yaml, nx.json,
// tsconfig.base.json, scripts/gates/**, scripts/lib/** and the workflows.
const SHARED_INFRASTRUCTURE = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.npmrc',
  'nx.json',
  'tsconfig.base.json',
  'tsconfig.json',
  'eslint.config.mjs',
  'biome.json',
  'knip.json',
  'stylelint.config.mjs',
  'vitest.mutation.config.ts',
  '.gitignore',
  'a-new-root.config.mjs',
  'scripts/gates/gates-core.sh',
  'scripts/gates/classify-ci-scope.mjs',
  'scripts/lib/bundle-size-budget.mjs',
  'scripts/run-infra-tests.mjs',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  '.github/actions/setup/action.yml',
  'patches/minimatch@3.1.5.patch',
  '.semgrep/p-default.vendored.yml',
  '.husky/pre-commit',
];

test('shared infrastructure forces the complete suite on every event, alone or mixed', () => {
  for (const file of SHARED_INFRASTRUCTURE) {
    assert.equal(isSharedInfrastructure(file), true, file);
    assert.deepEqual(
      both([...CHANGES.component, file]),
      { pull_request: 'full', merge_group: 'full' },
      file,
    );
    assert.equal(classifyChangedFiles([file], { event: 'merge_group' }), 'full', file);
  }
});

test('root documentation and the generated agent surfaces are not configuration', () => {
  for (const file of ['README.md', 'AGENTS.md', 'LICENSE', 'llms.txt', 'llms-full.txt']) {
    assert.equal(isSharedInfrastructure(file), false, file);
  }
});

test('a path outside every known area runs the complete suite', () => {
  for (const file of ['new-area/file.ts', '.github/dependabot.yml', '.devcontainer/x.json']) {
    assert.deepEqual(both([...CHANGES.docs, file]), {
      pull_request: 'full',
      merge_group: 'full',
    });
  }
});

test('an empty or unknown range runs the complete suite', () => {
  assert.deepEqual(both([]), { pull_request: 'full', merge_group: 'full' });
  assert.equal(requiresFullSuite(['', '  ']), true);
});

test('a workflow change is checked cheaply on its pull request and in full in the queue', () => {
  const files = ['.github/workflows/ci.yml', '.github/workflows/security.yml'];
  assert.deepEqual(both(files), { pull_request: 'workflows', merge_group: 'full' });
});

test('dependency resolution changes use dependency quality on the PR and the full queue', () => {
  for (const files of [
    ['package.json', 'packages/elements/package.json', 'pnpm-lock.yaml'],
    ['.github/workflows/ci.yml', 'packages/catalog/package.json', 'pnpm-lock.yaml'],
    ['pnpm-lock.yaml'],
    ['package.json'],
  ]) {
    assert.deepEqual(both(files), { pull_request: 'dependencies', merge_group: 'full' });
  }
});

test('a project manifest without a resolution change is a project change', () => {
  assert.deepEqual(both(['packages/mcp-server/package.json']), {
    pull_request: 'affected',
    merge_group: 'affected',
  });
  assert.deepEqual(both(['.github/workflows/ci.yml', 'packages/mcp-server/package.json']), {
    pull_request: 'full',
    merge_group: 'full',
  });
});

test('sandbox lock maintenance delegates to the containment workflow on every event', () => {
  assert.deepEqual(both(['sandbox/package.json', 'sandbox/package-lock.json']), {
    pull_request: 'sandbox',
    merge_group: 'sandbox',
  });
});

test('the classifier knows only the pull request and merge queue events', () => {
  assert.throws(() => classifyChangedFiles(['README.md'], { event: 'push' }), /event must be/u);
  const sha = 'a'.repeat(40);
  assert.deepEqual(parseArguments(['--base', sha, '--head', sha]), {
    base: sha,
    head: sha,
    event: 'pull_request',
  });
  assert.equal(
    parseArguments(['--base', sha, '--head', sha, '--event', 'merge_group']).event,
    'merge_group',
  );
  assert.throws(() => parseArguments(['--base', 'main', '--head', sha]), /40-character/u);
  assert.throws(() => parseArguments(['--base', sha, '--head', sha, '--event', 'push']), /event/u);
});

test('deletions and both sides of a rename are part of the change', () => {
  const calls = [];
  const files = changedFiles({
    base: 'b'.repeat(40),
    head: 'h'.repeat(40),
    execute: (command, args) => {
      calls.push([command, ...args]);
      return 'scripts/gates/removed.sh\nREADME.md\n';
    },
  });
  assert.deepEqual(files, ['scripts/gates/removed.sh', 'README.md']);
  assert.deepEqual(calls, [
    ['git', 'diff', '--name-only', '--no-renames', 'b'.repeat(40), 'h'.repeat(40), '--'],
  ]);
  assert.equal(classifyChangedFiles(files), 'full');
});

const BASE = '1'.repeat(40);
const HEAD = '2'.repeat(40);
const MAIN = '3'.repeat(40);
const QUEUED = '4'.repeat(40);

function fakeGit({ files = ['README.md'] } = {}) {
  const calls = [];
  const execute = (command, args) => {
    calls.push(args.join(' '));
    if (args[0] === 'merge-base') return `${MAIN}\n`;
    if (args[0] === 'diff') return `${files.join('\n')}\n`;
    throw new Error(`unexpected git ${args.join(' ')}`);
  };
  return { calls, execute };
}

test('a pull request is verified from where it left its base branch', () => {
  const git = fakeGit();
  const range = eventRange({
    event: 'pull_request',
    payload: { pull_request: { base: { sha: BASE }, head: { sha: HEAD } } },
    execute: git.execute,
  });
  assert.deepEqual(range, { base: MAIN, head: HEAD });
  assert.deepEqual(git.calls, [`merge-base ${BASE} ${HEAD}`]);
});

// HEADGREEN lands every group ahead of a green one, and each group is built
// on the previous group's head: the range must reach back to main.
test('a merge group is verified against what its target branch already holds', () => {
  const git = fakeGit();
  const range = eventRange({
    event: 'merge_group',
    payload: { merge_group: { base_sha: QUEUED, base_ref: 'refs/heads/main', head_sha: HEAD } },
    execute: git.execute,
  });
  assert.deepEqual(range, { base: MAIN, head: HEAD });
  assert.deepEqual(git.calls, [`merge-base ${QUEUED} refs/remotes/origin/main`]);
});

function githubEvent(event, payload, files) {
  const git = fakeGit({ files });
  const warnings = [];
  const result = classifyGithubEvent({
    environment: { GITHUB_EVENT_NAME: event, GITHUB_EVENT_PATH: '/event.json' },
    readText: () => JSON.stringify(payload),
    execute: git.execute,
    warn: (message) => warnings.push(message),
  });
  return { result, warnings };
}

test('the nightly and manual runs are the complete suite', () => {
  for (const event of ['schedule', 'workflow_dispatch', 'push']) {
    assert.deepEqual(githubEvent(event, {}).result, { scope: 'full' });
  }
});

test('a queued dependency or workflow change runs in full, a queued docs change does not', () => {
  const payload = {
    merge_group: { base_sha: QUEUED, base_ref: 'refs/heads/main', head_sha: HEAD },
  };
  assert.deepEqual(githubEvent('merge_group', payload, ['pnpm-lock.yaml']).result, {
    scope: 'full',
    base: MAIN,
    head: HEAD,
  });
  assert.deepEqual(githubEvent('merge_group', payload, ['.github/workflows/ci.yml']).result, {
    scope: 'full',
    base: MAIN,
    head: HEAD,
  });
  assert.equal(githubEvent('merge_group', payload, CHANGES.docs).result.scope, 'affected');
});

test('an unreadable event widens to the complete suite, with a warning', () => {
  const { result, warnings } = githubEvent('merge_group', { merge_group: { base_sha: 'x' } });
  assert.deepEqual(result, { scope: 'full' });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /complete suite/u);
});

test('outputs are $GITHUB_OUTPUT lines', () => {
  assert.equal(formatOutputs({ scope: 'full' }), 'scope=full\n');
  assert.equal(
    formatOutputs({ scope: 'affected', base: MAIN, head: HEAD }),
    `scope=affected\nbase=${MAIN}\nhead=${HEAD}\n`,
  );
});

test('browser infrastructure dependencies retain Chromium verification', () => {
  assert.equal(requiresBrowserVerification(['playwright']), true);
  assert.equal(requiresBrowserVerification(['@stencil/core']), true);
  assert.equal(requiresBrowserVerification(['@vitest/browser-playwright']), true);
  assert.equal(requiresBrowserVerification(['typescript']), true);
});

test('unrelated dependency bumps avoid Chromium startup', () => {
  assert.equal(requiresBrowserVerification(['size-limit', 'zod', '@types/node']), false);
});
