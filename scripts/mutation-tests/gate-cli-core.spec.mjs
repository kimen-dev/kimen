// @spec:018-project-integrity-hardening#S7
// @spec:018-project-integrity-hardening#S9
// @spec:018-project-integrity-hardening#S10
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { expect, it, onTestFinished } from 'vitest';

import {
  checkComponentInventory,
  runComponentInventoryCli,
} from '../gates/check-component-inventory.mjs';
import {
  generatedGroups,
  runGeneratedSyncCli,
  validateGeneratedSync,
} from '../gates/check-generated-sync.mjs';
import { checkPackaging, createAttwPlan, runPackagingCli } from '../gates/check-packaging.mjs';
import {
  checkPublicApi,
  parsePublicApiArguments,
  readCanonicalJson,
  runPublicApiCli,
} from '../gates/check-public-api.mjs';
import { canonicalJson } from '../lib/canonical-json.mjs';
import { parseCandidateOptions, runCandidateCli } from '../release/candidate-cli.mjs';
import {
  runInfrastructureCli,
  runInfrastructureTests,
  selectInfrastructureTestFiles,
} from '../run-infra-tests.mjs';

const requiredGroups = Object.freeze([
  { id: 'ki-radio-group', members: ['ki-radio-group', 'ki-radio'] },
  { id: 'ki-select', members: ['ki-select', 'ki-option'] },
  { id: 'ki-tabs', members: ['ki-tabs', 'ki-tab', 'ki-tab-panel'] },
]);

const inventory = Object.freeze([
  { tag: 'ki-alert', publicSubpath: './ki-alert' },
  { tag: 'ki-button', publicSubpath: './ki-button' },
]);

const rootContract = Object.freeze({
  values: [{ name: 'defineCustomElements', replacement: '@kimen/elements/ki-alert' }],
  namedTypes: [{ name: 'KiButton', replacement: '@kimen/elements/ki-button' }],
});

function inventoryDependencies(overrides = {}) {
  return {
    discoverInventory: async () => inventory,
    readText: async (path) =>
      path.endsWith('package.json') ? JSON.stringify({ exports: { '.': './dist/index.js' } }) : '',
    validateExports: () => undefined,
    resolveSubpaths: () => ['./ki-alert', './ki-button'],
    validateRoot: () => rootContract,
    readGroups: async () => requiredGroups,
    ...overrides,
  };
}

async function temporaryDirectory(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  return root;
}

async function put(root, path, contents = `${path}\n`) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

it('checks source inventory, package exports, frozen root symbols, and exact composites', async () => {
  const calls = [];
  const dependencies = inventoryDependencies({
    validateExports: (exports) => calls.push(['exports', exports]),
    resolveSubpaths: (exports, discovered) => {
      calls.push(['subpaths', exports, discovered]);
      return ['./ki-alert', './ki-button'];
    },
    validateRoot: (source) => {
      calls.push(['root', source]);
      return rootContract;
    },
  });

  const result = await checkComponentInventory({
    workspaceRoot: '/workspace/..//workspace',
    ...dependencies,
  });

  expect(result).toEqual({
    inventory,
    directSubpaths: ['./ki-alert', './ki-button'],
    rootContract,
    groups: requiredGroups,
  });
  expect(calls).toEqual([
    ['exports', { '.': './dist/index.js' }],
    ['subpaths', { '.': './dist/index.js' }, inventory],
    ['root', ''],
  ]);
});

it('rejects any composite budget exception drift', async () => {
  await expect(
    checkComponentInventory({
      workspaceRoot: '/workspace',
      ...inventoryDependencies({ readGroups: async () => requiredGroups.slice(0, 2) }),
    }),
  ).rejects.toThrowError('Composite budget exceptions must be exactly');
});

it('rejects incomplete direct package subpaths', async () => {
  await expect(
    checkComponentInventory({
      workspaceRoot: '/workspace',
      ...inventoryDependencies({ resolveSubpaths: () => ['./ki-alert'] }),
    }),
  ).rejects.toThrowError('Direct package subpaths do not cover');
});

it('rejects a frozen root replacement outside the source inventory', async () => {
  await expect(
    checkComponentInventory({
      workspaceRoot: '/workspace',
      ...inventoryDependencies({
        validateRoot: () => ({
          values: [{ name: 'Ghost', replacement: '@kimen/elements/ki-ghost' }],
          namedTypes: [],
        }),
      }),
    }),
  ).rejects.toThrowError(
    'Legacy root replacement is not a component subpath: @kimen/elements/ki-ghost',
  );
});

it('writes the human component inventory summary', async () => {
  const output = [];
  const result = await runComponentInventoryCli({
    arguments_: [],
    workspaceRoot: '/workspace',
    stdout: { write: (value) => output.push(value) },
    dependencies: inventoryDependencies(),
  });

  expect(result.inventory).toHaveLength(2);
  expect(output).toEqual([
    'GATE component-inventory: PASS (2 components, 3 composite groups, 2 frozen root symbols)\n',
  ]);
});

it('writes the complete component inventory as JSON when requested', async () => {
  const output = [];
  const result = await runComponentInventoryCli({
    arguments_: ['--json'],
    workspaceRoot: '/workspace',
    stdout: { write: (value) => output.push(value) },
    dependencies: inventoryDependencies(),
  });

  expect(JSON.parse(output[0])).toEqual(result);
  expect(output[0].endsWith('\n')).toBe(true);
});

const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

async function generatedRepository(group = 'tokens') {
  const root = await temporaryDirectory('kimen-gate-cli-generated-');
  git(root, 'init', '--quiet');
  git(root, 'config', 'user.name', 'fixture');
  git(root, 'config', 'user.email', 'fixture@kimen.local');
  await Promise.all(generatedGroups[group].required.map((path) => put(root, path)));
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'fixture');
  return root;
}

it('accepts exactly the tracked, declared, byte-clean generated group', async () => {
  const root = await generatedRepository('tokens');
  expect(validateGeneratedSync({ root, group: 'tokens' })).toEqual({ group: 'tokens', files: 6 });
});

it('rejects an unknown generated group', () => {
  expect(() => validateGeneratedSync({ root: '/workspace', group: 'unknown' })).toThrowError(
    'generated sync group must be tokens or surfaces; received unknown',
  );
});

it('rejects a required output that is not tracked', async () => {
  const root = await generatedRepository('tokens');
  git(root, 'rm', '--quiet', generatedGroups.tokens.required[0]);

  expect(() => validateGeneratedSync({ root, group: 'tokens' })).toThrowError(/must be tracked/u);
});

it('rejects an undeclared tracked output in a generated scope', async () => {
  const root = await generatedRepository('tokens');
  await put(root, 'packages/tokens/dist/css/undeclared.css');
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'undeclared');

  expect(() => validateGeneratedSync({ root, group: 'tokens' })).toThrowError(
    /undeclared tracked outputs.*undeclared\.css/u,
  );
});

it('rejects an untracked output in a generated scope', async () => {
  const root = await generatedRepository('tokens');
  await put(root, 'packages/tokens/dist/css/untracked.css');

  expect(() => validateGeneratedSync({ root, group: 'tokens' })).toThrowError(
    /untracked outputs.*untracked\.css/u,
  );
});

it('rejects byte drift in a required generated output', async () => {
  const root = await generatedRepository('tokens');
  await put(root, generatedGroups.tokens.required[0], 'drift\n');

  expect(() => validateGeneratedSync({ root, group: 'tokens' })).toThrowError(
    'generated sync tokens: generated output drift detected',
  );
});

it('propagates a git spawn failure diagnostic', () => {
  expect(() =>
    validateGeneratedSync({
      root: '/workspace',
      group: 'tokens',
      executeGit: () => {
        throw new Error('git unavailable');
      },
    }),
  ).toThrowError('git unavailable');
});

it('writes the generated sync CLI summary', () => {
  const output = [];
  const executeGit = (_root, args) => {
    if (args.includes('--error-unmatch')) return { status: 0, stdout: '', stderr: '' };
    if (args.includes('--others')) return { status: 0, stdout: '', stderr: '' };
    if (args.includes('--exit-code')) return { status: 0, stdout: '', stderr: '' };
    return { status: 0, stdout: `${generatedGroups.tokens.required.join('\n')}\n`, stderr: '' };
  };

  expect(
    runGeneratedSyncCli({
      arguments_: ['tokens'],
      root: '/workspace',
      stdout: { write: (value) => output.push(value) },
      executeGit,
    }),
  ).toEqual({ group: 'tokens', files: 6 });
  expect(output).toEqual(['PASS generated-sync tokens: 6 tracked files\n']);
});

it.each([
  [],
  ['tokens', 'surfaces'],
])('rejects invalid generated sync CLI arity %#', (arguments_) => {
  expect(() => runGeneratedSyncCli({ arguments_ })).toThrowError(
    'usage: check-generated-sync.mjs <tokens|surfaces>',
  );
});

it('creates sorted ATTW entrypoint groups from the direct inventory', () => {
  expect(createAttwPlan([...inventory].reverse())).toEqual({
    rootEntrypoints: ['.'],
    loaderEntrypoints: ['./loader'],
    componentEntrypoints: ['./ki-alert', './ki-button'],
  });
});

it.each([
  [null, /non-empty component inventory/u],
  [[], /non-empty component inventory/u],
  [[null], /invalid direct component subpath/u],
  [[{ tag: 'ki-alert', publicSubpath: './wrong' }], /invalid direct component subpath/u],
  [[inventory[0], inventory[0]], /duplicate component entrypoints/u],
])('rejects an invalid ATTW plan inventory %#', (components, diagnostic) => {
  expect(() => createAttwPlan(components)).toThrowError(diagnostic);
});

it('runs package lint and every exact ATTW surface from the source inventory', async () => {
  const commands = [];
  const plan = await checkPackaging({
    workspaceRoot: '/workspace/../workspace',
    checkInventory: async (options) => commands.push(['inventory', options]),
    discoverInventory: async (options) => {
      commands.push(['discover', options]);
      return inventory;
    },
    execute: (command, args, cwd) => commands.push([command, args, cwd]),
  });

  expect(plan.componentEntrypoints).toEqual(['./ki-alert', './ki-button']);
  expect(commands).toEqual([
    ['inventory', { workspaceRoot: '/workspace' }],
    ['discover', { workspaceRoot: '/workspace' }],
    ['pnpm', ['exec', 'publint', 'packages/tokens'], '/workspace'],
    ['pnpm', ['exec', 'publint', 'packages/elements'], '/workspace'],
    ['pnpm', ['exec', 'publint', 'packages/catalog'], '/workspace'],
    ['pnpm', ['exec', 'publint', 'packages/kimen'], '/workspace'],
    [
      'pnpm',
      [
        'exec',
        'attw',
        '--pack',
        'packages/elements',
        '--profile',
        'esm-only',
        '--entrypoints',
        '.',
      ],
      '/workspace',
    ],
    [
      'pnpm',
      [
        'exec',
        'attw',
        '--pack',
        'packages/elements',
        '--profile',
        'esm-only',
        '--entrypoints',
        './loader',
        '--ignore-rules',
        'internal-resolution-error',
      ],
      '/workspace',
    ],
    ['pnpm', ['exec', 'attw', '--pack', 'packages/catalog', '--profile', 'esm-only'], '/workspace'],
    [
      'pnpm',
      [
        'exec',
        'attw',
        '--pack',
        'packages/elements',
        '--profile',
        'esm-only',
        '--entrypoints',
        './ki-alert',
        './ki-button',
        '--ignore-rules',
        'internal-resolution-error',
      ],
      '/workspace',
    ],
  ]);
});

it('writes the source-derived packaging count', async () => {
  const output = [];
  const result = await runPackagingCli({
    workspaceRoot: '/workspace',
    stdout: { write: (value) => output.push(value) },
    dependencies: {
      checkInventory: async () => undefined,
      discoverInventory: async () => inventory,
      execute: () => undefined,
    },
  });

  expect(result.componentEntrypoints).toHaveLength(2);
  expect(output).toEqual(['GATE packaging: PASS (2 source-derived component entrypoints)\n']);
});

const publicApiArguments = Object.freeze([
  '--baseline',
  'baseline.json',
  '--candidate',
  'candidate.json',
  '--declaration',
  'declaration.json',
]);

it('parses all explicit public API contracts independent of option order', () => {
  expect(
    Object.fromEntries(
      parsePublicApiArguments([
        '--candidate',
        'candidate.json',
        '--declaration',
        'none',
        '--baseline',
        'none',
      ]),
    ),
  ).toEqual({
    '--candidate': 'candidate.json',
    '--declaration': 'none',
    '--baseline': 'none',
  });
});

it.each([
  [[], /explicit --baseline/u],
  [['--baseline', 'a'], /explicit --baseline/u],
  [[...publicApiArguments, '--unknown', 'x'], /explicit --baseline/u],
  [
    ['--baseline', 'a', '--candidate', '--declaration', '--declaration', 'none'],
    /explicit --baseline/u,
  ],
  [['--baseline', 'a', '--candidate', 'b', '--candidate', 'c'], /duplicate option --candidate/u],
  [
    ['--baseline', 'none', '--candidate', 'none', '--declaration', 'none'],
    /--candidate cannot be none/u,
  ],
])('rejects invalid public API arguments %#', (arguments_, diagnostic) => {
  expect(() => parsePublicApiArguments(arguments_)).toThrowError(diagnostic);
});

it('reads only canonical JSON bytes', async () => {
  const value = { b: 2, a: 1 };
  const reads = [];
  await expect(
    readCanonicalJson('candidate', 'candidate.json', {
      readText: async (path, encoding) => {
        reads.push([path, encoding]);
        return canonicalJson(value);
      },
    }),
  ).resolves.toEqual(value);
  expect(reads).toEqual([[resolve('candidate.json'), 'utf8']]);
});

it('wraps unreadable public API files with their absolute path', async () => {
  await expect(
    readCanonicalJson('candidate', 'missing.json', {
      readText: async () => {
        throw new Error('ENOENT');
      },
    }),
  ).rejects.toThrowError(`candidate file cannot be read: ${resolve('missing.json')}`);
});

it('rejects invalid and non-canonical public API JSON', async () => {
  await expect(
    readCanonicalJson('candidate', 'bad.json', { readText: async () => '{' }),
  ).rejects.toThrowError(/candidate file is not valid JSON/u);
  await expect(
    readCanonicalJson('candidate', 'pretty.json', {
      readText: async () => JSON.stringify({ a: 1 }),
    }),
  ).rejects.toThrowError(/candidate file must use canonical JSON bytes/u);
});

it('loads explicit contracts and delegates the exact values to evaluation', async () => {
  const documents = new Map([
    [resolve('baseline.json'), canonicalJson({ id: 'baseline' })],
    [resolve('candidate.json'), canonicalJson({ id: 'candidate' })],
    [resolve('declaration.json'), canonicalJson({ id: 'declaration' })],
  ]);
  const evaluations = [];

  const result = await checkPublicApi({
    arguments_: publicApiArguments,
    readText: async (path) => documents.get(path),
    evaluate: (contracts) => {
      evaluations.push(contracts);
      return { decision: 'passed', release: 'minor', reasons: [] };
    },
  });

  expect(result).toEqual({ decision: 'passed', release: 'minor', reasons: [] });
  expect(evaluations).toEqual([
    {
      baseline: { id: 'baseline' },
      candidate: { id: 'candidate' },
      declaration: { id: 'declaration' },
    },
  ]);
});

it('maps explicit none to null only for optional public API contracts', async () => {
  const evaluations = [];

  await checkPublicApi({
    arguments_: ['--baseline', 'none', '--candidate', 'candidate.json', '--declaration', 'none'],
    readText: async () => canonicalJson({ id: 'candidate' }),
    evaluate: (contracts) => {
      evaluations.push(contracts);
      return { decision: 'passed', release: 'minor', reasons: [] };
    },
  });

  expect(evaluations).toEqual([
    { baseline: null, candidate: { id: 'candidate' }, declaration: null },
  ]);
});

it('writes a passing public API decision', async () => {
  const output = [];
  const result = await runPublicApiCli({
    arguments_: ['--baseline', 'none', '--candidate', 'candidate.json', '--declaration', 'none'],
    stdout: { write: (value) => output.push(value) },
    readText: async () => canonicalJson({ id: 'candidate' }),
    evaluate: () => ({ decision: 'passed', release: 'patch', reasons: [] }),
  });

  expect(result.decision).toBe('passed');
  expect(output).toEqual(['PASS public-api: release=patch decision=passed\n']);
});

it('writes every blocking reason and sets a failing exit code', async () => {
  const errors = [];
  const exitCodes = [];
  const result = await runPublicApiCli({
    arguments_: ['--baseline', 'none', '--candidate', 'candidate.json', '--declaration', 'none'],
    stderr: { write: (value) => errors.push(value) },
    setExitCode: (value) => exitCodes.push(value),
    readText: async () => canonicalJson({ id: 'candidate' }),
    evaluate: () => ({
      decision: 'blocked',
      release: 'major',
      reasons: ['first reason', 'second reason'],
    }),
  });

  expect(result.decision).toBe('blocked');
  expect(errors).toEqual([
    'BLOCKED public-api: release=major\n',
    '- first reason\n',
    '- second reason\n',
  ]);
  expect(exitCodes).toEqual([1]);
});

it('parses distinct candidate CLI options', () => {
  expect(
    Object.fromEntries(
      parseCandidateOptions(
        ['--archive', 'a', '--sha256', 'b'],
        new Set(['--archive', '--sha256']),
      ),
    ),
  ).toEqual({ '--archive': 'a', '--sha256': 'b' });
});

it.each([
  [['--unknown', 'a'], /invalid or duplicate option --unknown/u],
  [['--archive'], /invalid or duplicate option --archive/u],
  [['--archive', 'a', '--archive', 'b'], /invalid or duplicate option --archive/u],
])('rejects invalid candidate option lists %#', (arguments_, diagnostic) => {
  expect(() => parseCandidateOptions(arguments_, new Set(['--archive']))).toThrowError(diagnostic);
});

it('builds a candidate from exact package directories and sanitizes CLI output', async () => {
  const calls = [];
  const output = [];
  const buildResult = {
    archivePath: '/output/candidate.tgz',
    candidateSha256: 'a'.repeat(64),
    manifest: { mode: 'release', tag: 'v1.2.3' },
    internal: 'must-not-leak',
  };

  const result = await runCandidateCli({
    arguments_: [
      'build',
      '--mode',
      'release',
      '--output-directory',
      '/output',
      '--repository-root',
      '/repository',
      '--source-sha',
      'b'.repeat(40),
      '--tag',
      'v1.2.3',
    ],
    stdout: { write: (value) => output.push(value) },
    buildCandidateImpl: async (options) => {
      calls.push(options);
      return buildResult;
    },
  });

  expect(calls).toEqual([
    {
      mode: 'release',
      outputDirectory: '/output',
      packageDirectories: ['/repository/packages/elements', '/repository/packages/tokens'],
      protectedMainRef: 'refs/heads/main',
      repositoryRoot: '/repository',
      sourceSha: 'b'.repeat(40),
      tag: 'v1.2.3',
    },
  ]);
  expect(result).toEqual({
    archivePath: '/output/candidate.tgz',
    candidateSha256: 'a'.repeat(64),
    manifest: { mode: 'release', tag: 'v1.2.3' },
  });
  expect(JSON.parse(output[0])).toEqual(result);
});

it('defaults an omitted build tag to null', async () => {
  const calls = [];
  await runCandidateCli({
    arguments_: [
      'build',
      '--mode',
      'dry-run',
      '--output-directory',
      '/output',
      '--repository-root',
      '/repository',
      '--source-sha',
      'b'.repeat(40),
    ],
    stdout: { write: () => undefined },
    buildCandidateImpl: async (options) => {
      calls.push(options);
      return { archivePath: 'a', candidateSha256: 'b', manifest: {} };
    },
  });

  expect(calls[0].tag).toBeNull();
});

it('verifies an archive with the exact injected environment', async () => {
  const calls = [];
  const environment = { RELEASE_ID: 'fixture' };
  const result = await runCandidateCli({
    arguments_: ['verify', '--archive', '/archive.tgz', '--sha256', 'a'.repeat(64)],
    environment,
    stdout: { write: () => undefined },
    verifyCandidateImpl: async (options) => {
      calls.push(options);
      return { candidateSha256: options.expectedSha256 };
    },
  });

  expect(calls).toEqual([
    {
      archivePath: '/archive.tgz',
      environment,
      expectedSha256: 'a'.repeat(64),
    },
  ]);
  expect(result.candidateSha256).toBe('a'.repeat(64));
});

it.each([
  [[], /usage/u],
  [['unknown'], /usage/u],
  [['build'], /missing --repository-root/u],
  [['verify', '--archive', '', '--sha256', 'a'], /missing --archive/u],
])('rejects invalid candidate CLI input %#', async (arguments_, diagnostic) => {
  await expect(runCandidateCli({ arguments_ })).rejects.toThrowError(diagnostic);
});

it('selects only dedicated infrastructure test filenames in stable order', () => {
  expect(
    selectInfrastructureTestFiles([
      'z.test.mjs',
      'consumer-contract.test.mjs',
      'A.test.mjs',
      'a.spec.mjs',
      'a.test.mjs',
      '-bad.test.mjs',
    ]),
  ).toEqual(['a.test.mjs', 'z.test.mjs']);
});

it('executes every selected infrastructure test in one node invocation', () => {
  const calls = [];
  const environment = { PATH: '/bin' };
  const result = runInfrastructureTests({
    entries: ['b.test.mjs', 'a.test.mjs'],
    repositoryRoot: '/repository',
    testsDirectory: '/repository/scripts/tests',
    executable: '/node',
    environment,
    execute: (...args) => {
      calls.push(args);
      return { status: 3 };
    },
  });

  expect(result).toEqual({ files: ['a.test.mjs', 'b.test.mjs'], status: 3 });
  expect(calls).toEqual([
    [
      '/node',
      ['--test', '/repository/scripts/tests/a.test.mjs', '/repository/scripts/tests/b.test.mjs'],
      { cwd: '/repository', env: environment, stdio: 'inherit' },
    ],
  ]);
});

it('fails closed when no infrastructure tests are discovered', () => {
  expect(() =>
    runInfrastructureTests({
      entries: ['README.md', 'consumer-contract.test.mjs'],
      repositoryRoot: '/repository',
      testsDirectory: '/repository/scripts/tests',
    }),
  ).toThrowError('run-infra-tests: no infrastructure tests discovered');
});

it('propagates an infrastructure process spawn error', () => {
  const failure = new Error('spawn failed');
  expect(() =>
    runInfrastructureTests({
      entries: ['fixture.test.mjs'],
      repositoryRoot: '/repository',
      testsDirectory: '/repository/scripts/tests',
      execute: () => ({ error: failure, status: null }),
    }),
  ).toThrow(failure);
});

it('maps a missing infrastructure process status to failure', () => {
  expect(
    runInfrastructureTests({
      entries: ['fixture.test.mjs'],
      repositoryRoot: '/repository',
      testsDirectory: '/repository/scripts/tests',
      execute: () => ({ status: null }),
    }).status,
  ).toBe(1);
});

it('runs a real isolated node infrastructure test with the default executor', async () => {
  const root = await temporaryDirectory('kimen-gate-cli-infra-');
  const testsDirectory = join(root, 'scripts/tests');
  await put(
    root,
    'scripts/tests/fixture.test.mjs',
    "import test from 'node:test'; test('fixture', () => {});\n",
  );

  expect(
    runInfrastructureTests({
      entries: ['fixture.test.mjs'],
      repositoryRoot: root,
      testsDirectory,
    }),
  ).toEqual({ files: ['fixture.test.mjs'], status: 0 });
});

it('discovers infrastructure entries and assigns their child status to the CLI', async () => {
  const exitCodes = [];
  const calls = [];
  const result = await runInfrastructureCli({
    listDirectory: async (path) => {
      calls.push(['read', path]);
      return ['fixture.test.mjs'];
    },
    execute: (command, args, options) => {
      calls.push(['execute', command, args, options]);
      return { status: 4 };
    },
    executable: '/node',
    environment: { PATH: '/bin' },
    setExitCode: (value) => exitCodes.push(value),
  });

  expect(result.files).toEqual(['fixture.test.mjs']);
  expect(exitCodes).toEqual([4]);
  expect(calls[0][0]).toBe('read');
  expect(calls[1][0]).toBe('execute');
});
