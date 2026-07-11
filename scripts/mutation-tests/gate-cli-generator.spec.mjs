// @spec:018-project-integrity-hardening#S12
import { existsSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { expect, it, onTestFinished } from 'vitest';

import {
  createGeneratorSmokeEnvironment,
  createGeneratorSmokePlan,
  executeGeneratorCommand,
  runGeneratorCli,
  runGeneratorSmoke,
  validateGeneratorSmokeEvidence,
} from '../generator-smoke.mjs';

const tag = 'ki-avatar';
const spec = '018-project-integrity-hardening';
const digest = 'a'.repeat(64);

const discovered = (value) => ({ status: 'passed', discovered: [value] });

function completeEvidence() {
  return {
    schemaVersion: 1,
    tag,
    spec,
    disposable: true,
    manualEdits: [],
    legacyRoot: { beforeSha256: digest, afterSha256: digest },
    surfaces: {
      unit: discovered('unit'),
      tokens: discovered('tokens'),
      cem: discovered('cem'),
      llms: discovered('llms'),
      build: discovered('build'),
      pack: discovered('pack'),
      attw: discovered('attw'),
      budget: discovered('budget'),
      browser: discovered('browser'),
    },
  };
}

async function minimalWorkspace() {
  const root = await mkdtemp(join(tmpdir(), 'kimen-generator-cli-fixture-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  await mkdir(join(root, 'packages/elements/src'), { recursive: true });
  await writeFile(join(root, 'packages/elements/src/index.ts'), 'export {};\n');
  await mkdir(join(root, 'node_modules'), { recursive: true });
  await writeFile(join(root, 'packages/elements/node_modules'), 'not-a-directory');
  return root;
}

function putSync(path, contents = '') {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, 'utf8');
}

function simulatedExecutor({ manifestTag = tag, tarballCount = 1 } = {}) {
  const calls = [];
  const execute = (command, args, { cwd, env }) => {
    calls.push({ command, args, cwd, env });
    if (args.includes('@kimen/nx-plugin:component')) {
      expect(lstatSync(join(cwd, 'node_modules')).isSymbolicLink()).toBe(true);
      putSync(join(cwd, `packages/elements/src/components/${tag}/${tag}.tsx`));
      putSync(join(cwd, `packages/elements/src/components/${tag}/${tag}.spec.tsx`));
      putSync(join(cwd, `packages/elements/browser-tests/${tag}.browser.spec.ts`));
      putSync(join(cwd, 'packages/tokens/tokens/component/avatar.tokens.json'), '{}\n');
    }
    if (args.includes('@kimen/elements:build')) {
      putSync(
        join(cwd, 'packages/elements/generated/custom-elements.json'),
        `${JSON.stringify({
          modules: [{ declarations: [{ tagName: manifestTag }] }],
        })}\n`,
      );
      putSync(join(cwd, 'packages/elements/llms.txt'), `${tag}\n`);
      putSync(join(cwd, 'llms.txt'), `${tag}\n`);
    }
    const destinationIndex = args.indexOf('--pack-destination');
    if (destinationIndex !== -1) {
      const destination = args[destinationIndex + 1];
      for (let index = 0; index < tarballCount; index += 1) {
        putSync(join(destination, `elements-${String(index)}.tgz`), 'archive');
      }
    }
    return '';
  };
  return { calls, execute };
}

it('executes a successful command and returns its combined output', () => {
  expect(
    executeGeneratorCommand(process.execPath, ['-e', "process.stdout.write('ok')"], {
      cwd: process.cwd(),
      env: process.env,
    }),
  ).toBe('ok');
});

it('rejects a command that cannot be spawned', () => {
  expect(() =>
    executeGeneratorCommand('kimen-command-that-does-not-exist', [], {
      cwd: process.cwd(),
      env: process.env,
    }),
  ).toThrow();
});

it('includes command, arguments, status, and output for non-zero execution', () => {
  expect(() =>
    executeGeneratorCommand(
      process.execPath,
      ['-e', "process.stderr.write('broken'); process.exit(7)"],
      { cwd: process.cwd(), env: process.env },
    ),
  ).toThrowError(/node .* exited 7\nbroken/u);
});

it('creates the exact disposable smoke plan', () => {
  expect(createGeneratorSmokePlan({ tag, spec })).toEqual({
    tag,
    spec,
    disposable: true,
    manualEdits: [],
    requiredSurfaces: [
      'unit',
      'tokens',
      'cem',
      'llms',
      'build',
      'pack',
      'attw',
      'budget',
      'browser',
    ],
    steps: [
      { id: 'scaffold' },
      { id: 'tokens' },
      { id: 'build' },
      { id: 'unit' },
      { id: 'cem' },
      { id: 'llms' },
      { id: 'pack' },
      { id: 'attw' },
      { id: 'budget' },
      { id: 'browser' },
    ],
  });
});

it.each([
  [null, spec, /valid ki-\* tag/u],
  ['avatar', spec, /valid ki-\* tag/u],
  ['ki-Avatar', spec, /valid ki-\* tag/u],
  [tag, '', /approved feature directory/u],
  [tag, null, /approved feature directory/u],
])('rejects an invalid plan tag/spec pair %#', (invalidTag, invalidSpec, diagnostic) => {
  expect(() => createGeneratorSmokePlan({ tag: invalidTag, spec: invalidSpec })).toThrowError(
    diagnostic,
  );
});

it('isolates every mutable tool cache while preserving an explicit browser installation', () => {
  const environment = createGeneratorSmokeEnvironment({
    temporaryRoot: '/temporary',
    baseEnvironment: { PATH: '/bin', PLAYWRIGHT_BROWSERS_PATH: '/trusted/browsers' },
  });

  expect(environment).toMatchObject({
    PATH: '/bin',
    NPM_CONFIG_CACHE: '/temporary/cache/npm',
    npm_config_cache: '/temporary/cache/npm',
    NPM_CONFIG_STORE_DIR: '/temporary/cache/pnpm-store',
    NPM_CONFIG_USERCONFIG: '/temporary/config/npmrc',
    NPM_CONFIG_GLOBALCONFIG: '/temporary/config/npmrc-global',
    COREPACK_HOME: '/temporary/cache/corepack',
    XDG_CACHE_HOME: '/temporary/cache/xdg',
    NX_CACHE_DIRECTORY: '/temporary/cache/nx',
    NX_WORKSPACE_DATA_DIRECTORY: '/temporary/cache/nx-workspace-data',
    NX_NATIVE_FILE_CACHE_DIRECTORY: '/temporary/cache/nx-native',
    PLAYWRIGHT_BROWSERS_PATH: '/trusted/browsers',
    NX_DAEMON: 'false',
  });
});

it('uses a disposable browser cache when none is explicitly trusted', () => {
  expect(
    createGeneratorSmokeEnvironment({ temporaryRoot: '/temporary', baseEnvironment: {} })
      .PLAYWRIGHT_BROWSERS_PATH,
  ).toBe('/temporary/cache/playwright');
});

it('accepts complete evidence and returns the same object', () => {
  const evidence = completeEvidence();
  expect(validateGeneratorSmokeEvidence(evidence)).toBe(evidence);
});

it.each([
  [null, /schemaVersion 1/u],
  [{}, /schemaVersion 1/u],
  [{ ...completeEvidence(), schemaVersion: 2 }, /schemaVersion 1/u],
  [{ ...completeEvidence(), tag: 'avatar' }, /valid ki-\* tag/u],
  [{ ...completeEvidence(), spec: '' }, /missing its feature spec/u],
  [{ ...completeEvidence(), disposable: false }, /disposable workspace/u],
  [{ ...completeEvidence(), manualEdits: null }, /manual edit/u],
  [{ ...completeEvidence(), manualEdits: ['edit'] }, /manual edit/u],
  [
    { ...completeEvidence(), legacyRoot: { beforeSha256: 'bad', afterSha256: 'bad' } },
    /legacy root barrel/u,
  ],
  [
    { ...completeEvidence(), legacyRoot: { beforeSha256: digest, afterSha256: 'b'.repeat(64) } },
    /legacy root barrel/u,
  ],
  [{ ...completeEvidence(), surfaces: null }, /no surface results/u],
  [
    { ...completeEvidence(), surfaces: { ...completeEvidence().surfaces, unit: undefined } },
    /passed unit discovery/u,
  ],
  [
    {
      ...completeEvidence(),
      surfaces: {
        ...completeEvidence().surfaces,
        unit: { status: 'failed', discovered: ['unit'] },
      },
    },
    /passed unit discovery/u,
  ],
  [
    {
      ...completeEvidence(),
      surfaces: { ...completeEvidence().surfaces, unit: { status: 'passed', discovered: [] } },
    },
    /passed unit discovery/u,
  ],
  [
    {
      ...completeEvidence(),
      surfaces: { ...completeEvidence().surfaces, unit: { status: 'passed', discovered: [0] } },
    },
    /passed unit discovery/u,
  ],
  [
    {
      ...completeEvidence(),
      surfaces: { ...completeEvidence().surfaces, unit: { status: 'passed', discovered: [''] } },
    },
    /passed unit discovery/u,
  ],
])('rejects malformed evidence %#', (evidence, diagnostic) => {
  expect(() => validateGeneratorSmokeEvidence(evidence)).toThrowError(diagnostic);
});

it('runs every generator surface in an isolated workspace and removes it afterwards', async () => {
  const workspaceRoot = await minimalWorkspace();
  const simulation = simulatedExecutor();

  const evidence = await runGeneratorSmoke({
    workspaceRoot,
    tag,
    spec,
    execute: simulation.execute,
  });

  expect(evidence.tag).toBe(tag);
  expect(evidence.legacyRoot.beforeSha256).toBe(evidence.legacyRoot.afterSha256);
  expect(Object.keys(evidence.surfaces)).toEqual([
    'unit',
    'tokens',
    'cem',
    'llms',
    'build',
    'pack',
    'attw',
    'budget',
    'browser',
  ]);
  expect(simulation.calls).toHaveLength(8);
  expect(simulation.calls.map(({ command }) => command)).toEqual([
    'pnpm',
    'node',
    'pnpm',
    'pnpm',
    'pnpm',
    'pnpm',
    'node',
    'pnpm',
  ]);
  expect(existsSync(dirname(simulation.calls[0].cwd))).toBe(false);
});

it('cleans the disposable workspace when an injected command fails', async () => {
  const workspaceRoot = await minimalWorkspace();
  let disposableRoot;

  await expect(
    runGeneratorSmoke({
      workspaceRoot,
      execute: (_command, _args, { cwd }) => {
        disposableRoot = cwd;
        throw new Error('injected command failure');
      },
    }),
  ).rejects.toThrowError('injected command failure');
  expect(existsSync(dirname(disposableRoot))).toBe(false);
});

it('fails when scaffolding does not discover all required source files', async () => {
  const workspaceRoot = await minimalWorkspace();

  await expect(runGeneratorSmoke({ workspaceRoot, execute: () => '' })).rejects.toThrowError(
    /ENOENT.*ki-avatar\.tsx/u,
  );
});

it('fails when the generated CEM does not contain the requested tag', async () => {
  const workspaceRoot = await minimalWorkspace();

  await expect(
    runGeneratorSmoke({
      workspaceRoot,
      execute: simulatedExecutor({ manifestTag: 'ki-other' }).execute,
    }),
  ).rejects.toThrowError('Generated CEM did not discover ki-avatar');
});

it.each([0, 2])('requires exactly one disposable tarball, received %i', async (tarballCount) => {
  const workspaceRoot = await minimalWorkspace();

  await expect(
    runGeneratorSmoke({
      workspaceRoot,
      execute: simulatedExecutor({ tarballCount }).execute,
    }),
  ).rejects.toThrowError(`Expected one disposable elements tarball, found ${String(tarballCount)}`);
});

it('forwards explicit CLI arguments and writes the evidence summary', async () => {
  const output = [];
  const calls = [];
  const evidence = completeEvidence();

  const result = await runGeneratorCli({
    arguments_: ['--tag', 'ki-card', '--spec', '123-card'],
    workspaceRoot: '/workspace',
    stdout: { write: (value) => output.push(value) },
    runSmoke: async (options) => {
      calls.push(options);
      return { ...evidence, tag: 'ki-card' };
    },
  });

  expect(result.tag).toBe('ki-card');
  expect(calls).toEqual([{ workspaceRoot: '/workspace', tag: 'ki-card', spec: '123-card' }]);
  expect(output).toEqual(['GENERATOR smoke: PASS (ki-card, 9 surfaces, disposable)\n']);
});

it('uses the documented CLI defaults', async () => {
  const calls = [];

  await runGeneratorCli({
    arguments_: [],
    workspaceRoot: '/workspace',
    stdout: { write: () => undefined },
    runSmoke: async (options) => {
      calls.push(options);
      return completeEvidence();
    },
  });

  expect(calls).toEqual([{ workspaceRoot: '/workspace', tag, spec }]);
});
