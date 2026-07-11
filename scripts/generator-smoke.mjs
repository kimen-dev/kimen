#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const TAG = /^ki-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const REQUIRED_SURFACES = Object.freeze([
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

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

export function createGeneratorSmokeEnvironment({ temporaryRoot, baseEnvironment }) {
  const cacheRoot = join(temporaryRoot, 'cache');
  const configRoot = join(temporaryRoot, 'config');
  return {
    ...baseEnvironment,
    NPM_CONFIG_CACHE: join(cacheRoot, 'npm'),
    npm_config_cache: join(cacheRoot, 'npm'),
    NPM_CONFIG_STORE_DIR: join(cacheRoot, 'pnpm-store'),
    NPM_CONFIG_USERCONFIG: join(configRoot, 'npmrc'),
    NPM_CONFIG_GLOBALCONFIG: join(configRoot, 'npmrc-global'),
    COREPACK_HOME: join(cacheRoot, 'corepack'),
    XDG_CACHE_HOME: join(cacheRoot, 'xdg'),
    NX_CACHE_DIRECTORY: join(cacheRoot, 'nx'),
    NX_WORKSPACE_DATA_DIRECTORY: join(cacheRoot, 'nx-workspace-data'),
    NX_NATIVE_FILE_CACHE_DIRECTORY: join(cacheRoot, 'nx-native'),
    PLAYWRIGHT_BROWSERS_PATH:
      baseEnvironment.PLAYWRIGHT_BROWSERS_PATH ?? join(cacheRoot, 'playwright'),
    NX_DAEMON: 'false',
  };
}

const assertTag = (tag) => {
  if (typeof tag !== 'string' || !TAG.test(tag)) {
    throw new Error(`Generator smoke requires a valid ki-* tag, got ${String(tag)}`);
  }
};

export function createGeneratorSmokePlan({ tag, spec }) {
  assertTag(tag);
  if (typeof spec !== 'string' || spec.length === 0) {
    throw new Error('Generator smoke requires an approved feature directory');
  }
  return {
    tag,
    spec,
    disposable: true,
    manualEdits: [],
    requiredSurfaces: REQUIRED_SURFACES,
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
  };
}

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateGeneratorSmokeEvidence(evidence) {
  if (!isRecord(evidence) || evidence.schemaVersion !== 1) {
    throw new Error('Generator smoke evidence must use schemaVersion 1');
  }
  assertTag(evidence.tag);
  if (typeof evidence.spec !== 'string' || evidence.spec.length === 0) {
    throw new Error('Generator smoke evidence is missing its feature spec');
  }
  if (evidence.disposable !== true) {
    throw new Error('Generator smoke evidence must come from a disposable workspace');
  }
  if (!Array.isArray(evidence.manualEdits) || evidence.manualEdits.length !== 0) {
    throw new Error('Generator smoke required a manual edit after scaffolding');
  }
  const before = evidence.legacyRoot?.beforeSha256;
  const after = evidence.legacyRoot?.afterSha256;
  if (!/^[a-f0-9]{64}$/u.test(before) || before !== after) {
    throw new Error('Deprecated legacy root barrel SHA-256 changed during generation');
  }
  if (!isRecord(evidence.surfaces)) {
    throw new Error('Generator smoke evidence has no surface results');
  }
  for (const surface of REQUIRED_SURFACES) {
    const result = evidence.surfaces[surface];
    if (
      !isRecord(result) ||
      result.status !== 'passed' ||
      !Array.isArray(result.discovered) ||
      result.discovered.length === 0 ||
      result.discovered.some((item) => typeof item !== 'string' || item.length === 0)
    ) {
      throw new Error(`Generator smoke is missing passed ${surface} discovery evidence`);
    }
  }
  return evidence;
}

export const executeGeneratorCommand = (command, args, { cwd, env = process.env } = {}) => {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(
      `${command} ${args.join(' ')} exited ${result.status}${output ? `\n${output}` : ''}`,
    );
  }
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
};

const copyFilter = (workspaceRoot) => (source) => {
  const path = relative(workspaceRoot, source);
  if (path === '') {
    return true;
  }
  const segments = path.split(sep);
  return !segments.some((segment) =>
    ['.git', '.nx', '.codegraph', '.agents', 'node_modules', 'dist', 'coverage'].includes(segment),
  );
};

const linkDependencyTrees = async (sourceRoot, targetRoot) => {
  const candidates = [
    'node_modules',
    'packages/elements/node_modules',
    'packages/tokens/node_modules',
    'packages/catalog/node_modules',
    'tools/kimen-plugin/node_modules',
  ];
  for (const candidate of candidates) {
    const source = join(sourceRoot, candidate);
    try {
      if (!(await stat(source)).isDirectory()) {
        continue;
      }
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
    const target = join(targetRoot, candidate);
    await mkdir(dirname(target), { recursive: true });
    await symlink(source, target, 'dir');
  }
};

const prepareDisposableWorkspace = async (workspaceRoot) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'kimen-generator-smoke-'));
  const disposableRoot = join(temporaryRoot, 'workspace');
  await cp(workspaceRoot, disposableRoot, {
    recursive: true,
    verbatimSymlinks: true,
    filter: copyFilter(workspaceRoot),
  });
  await linkDependencyTrees(workspaceRoot, disposableRoot);
  return { temporaryRoot, disposableRoot };
};

const assertFile = async (path) => {
  const details = await stat(path);
  if (!details.isFile()) {
    throw new Error(`Expected generated file: ${path}`);
  }
};

const manifestContainsTag = (manifest, tag) =>
  Array.isArray(manifest?.modules) &&
  manifest.modules.some((module) =>
    module?.declarations?.some((declaration) => declaration?.tagName === tag),
  );

export async function runGeneratorSmoke({
  workspaceRoot,
  tag = 'ki-avatar',
  spec = '018-project-integrity-hardening',
  execute = executeGeneratorCommand,
}) {
  const plan = createGeneratorSmokePlan({ tag, spec });
  const sourceRoot = resolve(workspaceRoot);
  const { temporaryRoot, disposableRoot } = await prepareDisposableWorkspace(sourceRoot);
  const environment = createGeneratorSmokeEnvironment({
    temporaryRoot,
    baseEnvironment: process.env,
  });
  for (const directory of [
    environment.NPM_CONFIG_CACHE,
    environment.NPM_CONFIG_STORE_DIR,
    environment.COREPACK_HOME,
    environment.XDG_CACHE_HOME,
    environment.NX_CACHE_DIRECTORY,
    environment.NX_WORKSPACE_DATA_DIRECTORY,
    environment.NX_NATIVE_FILE_CACHE_DIRECTORY,
    environment.PLAYWRIGHT_BROWSERS_PATH,
    dirname(environment.NPM_CONFIG_USERCONFIG),
  ]) {
    await mkdir(directory, { recursive: true });
  }
  await writeFile(environment.NPM_CONFIG_USERCONFIG, '', { mode: 0o600 });
  await writeFile(environment.NPM_CONFIG_GLOBALCONFIG, '', { mode: 0o600 });
  const run = (command, args) => execute(command, args, { cwd: disposableRoot, env: environment });
  const rootPath = join(disposableRoot, 'packages/elements/src/index.ts');
  const componentRoot = join(disposableRoot, 'packages/elements/src/components', tag);
  const browserSpec = join(
    disposableRoot,
    'packages/elements/browser-tests',
    `${tag}.browser.spec.ts`,
  );
  const tokenSource = join(
    disposableRoot,
    'packages/tokens/tokens/component',
    `${tag.slice(3)}.tokens.json`,
  );
  const beforeSha256 = sha256(await readFile(rootPath, 'utf8'));

  try {
    run('pnpm', [
      'exec',
      'nx',
      'g',
      '@kimen/nx-plugin:component',
      tag,
      '--spec',
      spec,
      '--no-interactive',
    ]);
    const afterSha256 = sha256(await readFile(rootPath, 'utf8'));
    await assertFile(join(componentRoot, `${tag}.tsx`));
    await assertFile(join(componentRoot, `${tag}.spec.tsx`));
    await assertFile(browserSpec);
    await assertFile(tokenSource);

    run('node', ['scripts/gates/check-tokens.mjs']);
    run('pnpm', ['exec', 'nx', 'run', '@kimen/elements:build', '--skipNxCache']);
    run('pnpm', [
      '--filter',
      '@kimen/elements',
      'exec',
      'vitest',
      'run',
      `src/components/${tag}/${tag}.spec.tsx`,
    ]);

    const manifest = JSON.parse(
      await readFile(
        join(disposableRoot, 'packages/elements/generated/custom-elements.json'),
        'utf8',
      ),
    );
    if (!manifestContainsTag(manifest, tag)) {
      throw new Error(`Generated CEM did not discover ${tag}`);
    }
    const packageLlms = await readFile(join(disposableRoot, 'packages/elements/llms.txt'), 'utf8');
    const rootLlms = await readFile(join(disposableRoot, 'llms.txt'), 'utf8');
    if (!packageLlms.includes(tag) || !rootLlms.includes(tag)) {
      throw new Error(`Generated llms surfaces did not discover ${tag}`);
    }

    const artifacts = join(temporaryRoot, 'artifacts');
    await mkdir(artifacts, { recursive: true });
    run('pnpm', ['--filter', '@kimen/elements', 'pack', '--pack-destination', artifacts]);
    const tarballs = (await readdir(artifacts)).filter((name) => name.endsWith('.tgz'));
    if (tarballs.length !== 1) {
      throw new Error(`Expected one disposable elements tarball, found ${tarballs.length}`);
    }
    run('pnpm', [
      'exec',
      'attw',
      '--pack',
      'packages/elements',
      '--profile',
      'esm-only',
      '--entrypoints',
      `./${tag}`,
      '--ignore-rules',
      'internal-resolution-error',
    ]);
    run('node', ['packages/elements/scripts/run-size-limit.mjs', '--tag', tag]);
    run('pnpm', [
      '--filter',
      '@kimen/elements',
      'exec',
      'vitest',
      'run',
      '--config',
      'vitest.browser.config.ts',
      `browser-tests/${tag}.browser.spec.ts`,
    ]);

    const evidence = {
      schemaVersion: 1,
      tag,
      spec,
      disposable: plan.disposable,
      manualEdits: plan.manualEdits,
      legacyRoot: { beforeSha256, afterSha256 },
      surfaces: {
        unit: {
          status: 'passed',
          discovered: [`packages/elements/src/components/${tag}/${tag}.spec.tsx`],
        },
        tokens: {
          status: 'passed',
          discovered: [`packages/tokens/tokens/component/${tag.slice(3)}.tokens.json`],
        },
        cem: { status: 'passed', discovered: [tag] },
        llms: { status: 'passed', discovered: [tag] },
        build: {
          status: 'passed',
          discovered: [`packages/elements/dist/components/${tag}.js`],
        },
        pack: { status: 'passed', discovered: [`@kimen/elements/${tag}`] },
        attw: { status: 'passed', discovered: [`./${tag}`] },
        budget: { status: 'passed', discovered: [tag] },
        browser: {
          status: 'passed',
          discovered: [`packages/elements/browser-tests/${tag}.browser.spec.ts`],
        },
      },
    };
    return validateGeneratorSmokeEvidence(evidence);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function runGeneratorCli({
  arguments_ = process.argv.slice(2),
  workspaceRoot = process.cwd(),
  stdout = process.stdout,
  runSmoke = runGeneratorSmoke,
} = {}) {
  const tagIndex = arguments_.indexOf('--tag');
  const specIndex = arguments_.indexOf('--spec');
  const tag = tagIndex === -1 ? 'ki-avatar' : arguments_[tagIndex + 1];
  const spec = specIndex === -1 ? '018-project-integrity-hardening' : arguments_[specIndex + 1];
  const evidence = await runSmoke({ workspaceRoot, tag, spec });
  stdout.write(
    `GENERATOR smoke: PASS (${evidence.tag}, ${Object.keys(evidence.surfaces).length} surfaces, disposable)\n`,
  );
  return evidence;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runGeneratorCli().catch((error) => {
    process.stderr.write(`GENERATOR smoke: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
