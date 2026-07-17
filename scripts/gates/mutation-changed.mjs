#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, lstat, mkdir, open, readdir, realpath, rm } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { canonicalJson, sha256File } from '../lib/canonical-json.mjs';
import {
  assertMutationThresholds,
  classifyChangedFiles,
  evaluateMutationReport,
  groupCoreFiles,
  hashMutationRunnerScope,
  hashMutationScope,
  MUTATION_SCOPE_SCHEMA_VERSION,
  MUTATION_THRESHOLD,
} from '../lib/mutation-policy.mjs';

const execFileAsync = promisify(execFile);
const POLICY_URL = new URL('../lib/mutation-policy.mjs', import.meta.url);
const CONFIG_PATHS = Object.freeze({
  elements: 'stryker.elements.config.mjs',
  node: 'stryker.node.config.mjs',
  vitest: 'vitest.mutation.config.ts',
  'vitest-elements': 'vitest.mutation.elements.config.ts',
  'vitest-node': 'vitest.mutation.node.config.ts',
});
const RUNNERS = Object.freeze(['node', 'elements']);
const GIT_BASE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._/@{}^~:+-]*$/;
const noFollow = fsConstants.O_NOFOLLOW ?? 0;
const nonBlock = fsConstants.O_NONBLOCK ?? 0;

const isPlainRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readStandardInput = async () => {
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input;
};

const parseJsonPaths = (input) => {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    throw new Error(`Cannot parse changed paths JSON: ${error.message}`, { cause: error });
  }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed.paths) === false ||
    Object.keys(parsed).some((key) => key !== 'paths')
  ) {
    throw new TypeError('JSON input must be an array of paths or an object containing only paths');
  }
  return parsed.paths;
};

const readChangedPaths = async (arguments_) => {
  if (arguments_.length > 0) {
    return arguments_;
  }
  if (process.stdin.isTTY) {
    throw new Error('No changed paths supplied; pass paths as arguments or JSON on stdin');
  }
  const input = await readStandardInput();
  if (input.trim().length === 0) {
    throw new Error('No changed paths supplied; pass paths as arguments or JSON on stdin');
  }
  return parseJsonPaths(input);
};

const hashConfigFiles = async (workspaceRoot) => {
  const entries = await Promise.all(
    Object.entries(CONFIG_PATHS).map(async ([name, relativePath]) => {
      const filePath = resolve(workspaceRoot, relativePath);
      try {
        return [name, await sha256File(filePath)];
      } catch (error) {
        throw new Error(`Cannot hash mutation config ${name} at ${filePath}: ${error.message}`, {
          cause: error,
        });
      }
    }),
  );
  return Object.fromEntries(entries);
};

export const buildReport = async ({ paths, workspaceRoot }) => {
  const files = classifyChangedFiles(paths);
  const groups = groupCoreFiles(files);
  const configHashes = await hashConfigFiles(workspaceRoot);
  const lockfilePath = resolve(workspaceRoot, 'pnpm-lock.yaml');
  let lockfileHash;
  try {
    lockfileHash = await sha256File(lockfilePath);
  } catch (error) {
    throw new Error(`Cannot hash mutation lockfile at ${lockfilePath}: ${error.message}`, {
      cause: error,
    });
  }
  const policyHash = await sha256File(POLICY_URL);
  const runnerScopes = Object.fromEntries(
    RUNNERS.map((runner) => [
      runner,
      groups[runner].length === 0
        ? null
        : hashMutationRunnerScope({
            runner,
            files: groups[runner],
            policyHash,
            configHashes,
            lockfileHash,
          }),
    ]),
  );
  return {
    schemaVersion: MUTATION_SCOPE_SCHEMA_VERSION,
    files,
    groups,
    runnerScopes,
    policyHash,
    configHashes,
    lockfileHash,
    scopeHash: hashMutationScope({
      files,
      policyHash,
      configHashes,
      lockfileHash,
    }),
  };
};

const defaultRunGit = async (arguments_, workspaceRoot) => {
  try {
    const result = await execFileAsync('git', arguments_, {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: { ...process.env, LC_ALL: 'C' },
      maxBuffer: 16 * 1024 * 1024,
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      code: typeof error.code === 'number' ? error.code : 1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? error.message,
    };
  }
};

const requireGit = async (runGit, arguments_, workspaceRoot, label) => {
  const result = await runGit(arguments_, workspaceRoot);
  if (result.code !== 0) {
    throw new Error(`${label} failed: ${result.stderr.trim() || `git exited ${result.code}`}`);
  }
  return result.stdout;
};

const tryResolveCommit = async (runGit, reference, workspaceRoot) => {
  const result = await runGit(
    ['rev-parse', '--verify', '--quiet', '--end-of-options', `${reference}^{commit}`],
    workspaceRoot,
  );
  if (result.code !== 0) {
    return undefined;
  }
  const sha = result.stdout.trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(`Git resolved ${reference} to an invalid commit SHA`);
  }
  return sha;
};

const resolveMergeBase = async (runGit, left, right, workspaceRoot, label) => {
  const output = await requireGit(runGit, ['merge-base', left, right], workspaceRoot, label);
  const sha = output.trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(`${label} returned an invalid commit SHA`);
  }
  return sha;
};

const validateExplicitBase = (base) => {
  if (
    typeof base !== 'string' ||
    base.length === 0 ||
    base.length > 256 ||
    !GIT_BASE_PATTERN.test(base)
  ) {
    throw new Error('KIMEN_MUTATION_BASE is not a safe Git commit reference');
  }
  return base;
};

const selectMutationBase = async ({ workspaceRoot, environment, runGit }) => {
  const head = await tryResolveCommit(runGit, 'HEAD', workspaceRoot);
  if (head === undefined) {
    throw new Error('Mutation discovery requires a valid HEAD commit');
  }
  if (environment.KIMEN_MUTATION_BASE !== undefined) {
    const reference = validateExplicitBase(environment.KIMEN_MUTATION_BASE);
    const baseSha = await tryResolveCommit(runGit, reference, workspaceRoot);
    if (baseSha === undefined) {
      throw new Error(`KIMEN_MUTATION_BASE does not resolve to a commit: ${reference}`);
    }
    return { baseSha, baseSource: 'KIMEN_MUTATION_BASE' };
  }

  const originMain = await tryResolveCommit(runGit, 'refs/remotes/origin/main', workspaceRoot);
  if (originMain !== undefined) {
    return {
      baseSha: await resolveMergeBase(
        runGit,
        head,
        originMain,
        workspaceRoot,
        'origin/main merge-base',
      ),
      baseSource: 'origin/main merge-base',
    };
  }

  const upstream = await tryResolveCommit(runGit, '@{upstream}', workspaceRoot);
  if (upstream !== undefined) {
    return {
      baseSha: await resolveMergeBase(runGit, head, upstream, workspaceRoot, 'upstream merge-base'),
      baseSource: 'upstream merge-base',
    };
  }
  return { baseSha: head, baseSource: 'HEAD fallback' };
};

const parseNameStatus = (output, label) => {
  const fields = output.split('\0');
  if (fields.at(-1) === '') {
    fields.pop();
  }
  const paths = [];
  for (let index = 0; index < fields.length; index += 2) {
    const status = fields[index];
    const path = fields[index + 1];
    if (path === undefined || !/^[AMD]$/.test(status)) {
      throw new Error(
        `${label} contains an unsupported or malformed Git status: ${String(status)}`,
      );
    }
    paths.push(path);
  }
  return paths;
};

const parseNullPaths = (output, label) => {
  const paths = output.split('\0');
  if (paths.at(-1) === '') {
    paths.pop();
  }
  if (paths.some((path) => path.length === 0)) {
    throw new Error(`${label} contains an empty Git path`);
  }
  return paths;
};

export const discoverChangedPaths = async ({
  workspaceRoot,
  environment = process.env,
  runGit = defaultRunGit,
}) => {
  const rootOutput = await requireGit(
    runGit,
    ['rev-parse', '--show-toplevel'],
    workspaceRoot,
    'Git repository discovery',
  );
  const observedRoot = await realpath(rootOutput.trim());
  const expectedRoot = await realpath(workspaceRoot);
  if (observedRoot !== expectedRoot) {
    throw new Error(`Mutation discovery must run at the repository root: ${observedRoot}`);
  }
  const base = await selectMutationBase({ workspaceRoot, environment, runGit });
  const committed = parseNameStatus(
    await requireGit(
      runGit,
      ['diff', '--name-status', '-z', '--no-ext-diff', '--no-renames', `${base.baseSha}..HEAD`],
      workspaceRoot,
      'Committed change discovery',
    ),
    'Committed change discovery',
  );
  const staged = parseNameStatus(
    await requireGit(
      runGit,
      ['diff', '--cached', '--name-status', '-z', '--no-ext-diff', '--no-renames'],
      workspaceRoot,
      'Staged change discovery',
    ),
    'Staged change discovery',
  );
  const unstaged = parseNameStatus(
    await requireGit(
      runGit,
      ['diff', '--name-status', '-z', '--no-ext-diff', '--no-renames'],
      workspaceRoot,
      'Unstaged change discovery',
    ),
    'Unstaged change discovery',
  );
  const untracked = parseNullPaths(
    await requireGit(
      runGit,
      ['ls-files', '--others', '--exclude-standard', '-z'],
      workspaceRoot,
      'Untracked change discovery',
    ),
    'Untracked change discovery',
  );
  return {
    ...base,
    paths: [...new Set([...committed, ...staged, ...unstaged, ...untracked])].sort(),
  };
};

const FULL_ELEMENTS_ROOT = 'packages/elements/src/components';
const COMPONENT_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Weekly full-component scope: every executable component source under
 * packages/elements/src/components. The classifier stays the single policy
 * authority — spec/story/declaration files collected here are classified as
 * excluded, exactly as in changed-core mode, so only elements-core
 * implementation files are mutated. Optional filters name component
 * directories (diagnostic narrowing, e.g. `--scope full-elements ki-badge`).
 */
const discoverFullElementsScope = async ({ workspaceRoot, filters }) => {
  const componentsRoot = resolve(workspaceRoot, FULL_ELEMENTS_ROOT);
  let entries;
  try {
    entries = await readdir(componentsRoot, { withFileTypes: true });
  } catch (error) {
    throw new Error(`full-elements scope requires ${FULL_ELEMENTS_ROOT}: ${error.message}`, {
      cause: error,
    });
  }
  const components = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  let selected = components;
  if (filters.length > 0) {
    const malformed = filters.filter((filter) => !COMPONENT_NAME_PATTERN.test(filter));
    if (malformed.length > 0) {
      throw new Error(
        `full-elements scope filters must be component directory names: ${malformed.join(', ')}`,
      );
    }
    const unknown = filters.filter((filter) => !components.includes(filter));
    if (unknown.length > 0) {
      throw new Error(
        `full-elements scope has no component directory named: ${unknown.join(', ')}`,
      );
    }
    selected = [...new Set(filters)].sort();
  }
  const paths = [];
  for (const component of selected) {
    const files = await readdir(join(componentsRoot, component), {
      recursive: true,
      withFileTypes: true,
    });
    for (const file of files) {
      if (!file.isFile() || !/\.tsx?$/.test(file.name)) {
        continue;
      }
      paths.push(relative(workspaceRoot, join(file.parentPath, file.name)).split(sep).join('/'));
    }
  }
  return {
    baseSha: null,
    baseSource: filters.length > 0 ? 'full-elements scope (filtered)' : 'full-elements scope',
    paths: paths.sort(),
  };
};

const SCOPE_DISCOVERIES = Object.freeze({
  'full-elements': discoverFullElementsScope,
});

const discoverScopedPaths = async ({ workspaceRoot, scope, filters }) =>
  SCOPE_DISCOVERIES[scope]({ workspaceRoot, filters });

export const validateRunnableFiles = async ({ files, workspaceRoot }) => {
  const physicalWorkspaceRoot = await realpath(workspaceRoot);
  const coreFiles = files.filter((file) => file.classification === 'core');
  for (const file of coreFiles) {
    const absolutePath = resolve(workspaceRoot, file.path);
    let stats;
    try {
      stats = await lstat(absolutePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Cannot mutation-test deleted executable path: ${file.path}`, {
          cause: error,
        });
      }
      throw new Error(`Cannot inspect changed core path ${file.path}: ${error.message}`, {
        cause: error,
      });
    }
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error(`Changed core path must be a regular non-symlink file: ${file.path}`);
    }
    const physicalPath = await realpath(absolutePath);
    const pathFromRoot = relative(physicalWorkspaceRoot, physicalPath);
    if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) {
      throw new Error(`Changed core path resolves outside the repository: ${file.path}`);
    }
  }
};

const ensureDirectory = async (path, label) => {
  try {
    await mkdir(path);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw new Error(`${label} could not be created: ${error.message}`, { cause: error });
    }
  }
  const stats = await lstat(path);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be a non-symlink directory`);
  }
};

const prepareCacheRoot = async (cacheRoot) => {
  if (typeof cacheRoot !== 'string' || !isAbsolute(cacheRoot)) {
    throw new Error('KIMEN_MUTATION_CACHE_DIR must be an absolute path');
  }
  const stats = await lstat(cacheRoot).catch((error) => {
    throw new Error(`KIMEN_MUTATION_CACHE_DIR is unavailable: ${error.message}`, { cause: error });
  });
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error('KIMEN_MUTATION_CACHE_DIR must be a non-symlink directory');
  }
  await access(cacheRoot, fsConstants.R_OK | fsConstants.W_OK | fsConstants.X_OK);
  return realpath(cacheRoot);
};

const assertWithinCache = (cacheRoot, candidate, label) => {
  const pathFromRoot = relative(cacheRoot, candidate);
  if (pathFromRoot === '' || pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) {
    throw new Error(`${label} escapes KIMEN_MUTATION_CACHE_DIR`);
  }
};

const loadRunnerConfig = async (workspaceRoot, runner) => {
  const configUrl = pathToFileURL(resolve(workspaceRoot, CONFIG_PATHS[runner]));
  const module = await import(configUrl.href);
  if (!isPlainRecord(module.default)) {
    throw new Error(`Mutation config for ${runner} must export an object`);
  }
  return module.default;
};

const defaultExecuteStryker = async (options) => {
  const { Stryker } = await import('@stryker-mutator/core');
  const stryker = new Stryker(options);
  await stryker.runMutationTest();
};

const readMutationJson = async (reportPath, runner) => {
  let handle;
  try {
    handle = await open(reportPath, fsConstants.O_RDONLY | noFollow | nonBlock);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Mutation report for ${runner} is missing: ${reportPath}`, { cause: error });
    }
    if (['ELOOP', 'EMLINK'].includes(error.code)) {
      throw new Error(`Mutation report for ${runner} must be a regular non-symlink file`, {
        cause: error,
      });
    }
    throw error;
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new Error(`Mutation report for ${runner} must be a regular non-symlink file`);
    }
    const contents = await handle.readFile('utf8');
    try {
      return JSON.parse(contents);
    } catch (error) {
      throw new Error(`Mutation report for ${runner} is invalid JSON: ${error.message}`, {
        cause: error,
      });
    }
  } finally {
    await handle.close();
  }
};

export const runMutationGroups = async ({
  report,
  workspaceRoot,
  cacheRoot,
  force,
  executeStryker = defaultExecuteStryker,
}) => {
  if (!isPlainRecord(report) || !isPlainRecord(report.groups)) {
    throw new TypeError('Mutation run requires a classified scope report');
  }
  if (typeof force !== 'boolean') {
    throw new TypeError('Mutation force flag must be boolean');
  }
  const hasCoreFiles = RUNNERS.some((runner) => report.groups[runner]?.length > 0);
  const physicalCacheRoot = hasCoreFiles ? await prepareCacheRoot(cacheRoot) : undefined;
  const results = {};

  for (const runner of RUNNERS) {
    const files = report.groups[runner];
    if (!Array.isArray(files)) {
      throw new Error(`Mutation scope is missing the ${runner} group`);
    }
    if (files.length === 0) {
      results[runner] = {
        decision: 'N/A',
        files: [],
        reason: `no changed core files for ${runner}`,
        threshold: MUTATION_THRESHOLD,
      };
      continue;
    }
    const runnerScopeHash = report.runnerScopes?.[runner];
    if (typeof runnerScopeHash !== 'string' || !/^[0-9a-f]{64}$/.test(runnerScopeHash)) {
      throw new Error(`Mutation scope is missing a valid ${runner} runner hash`);
    }
    const runnerRoot = join(physicalCacheRoot, runner);
    const scopeRoot = join(runnerRoot, runnerScopeHash);
    assertWithinCache(physicalCacheRoot, runnerRoot, `${runner} cache`);
    assertWithinCache(physicalCacheRoot, scopeRoot, `${runner} scope cache`);
    await ensureDirectory(runnerRoot, `${runner} cache`);
    await ensureDirectory(scopeRoot, `${runner} scope cache`);
    const incrementalFile = join(scopeRoot, 'incremental.json');
    const mutationFile = join(scopeRoot, 'mutation.json');
    const tempDirName = join(scopeRoot, 'tmp');
    await rm(mutationFile, { force: true });
    await rm(tempDirName, { recursive: true, force: true });
    const stableConfig = await loadRunnerConfig(workspaceRoot, runner);
    assertMutationThresholds(stableConfig.thresholds, `${runner} stable mutation config`);
    const options = {
      ...stableConfig,
      mutate: files,
      incrementalFile,
      jsonReporter: { fileName: mutationFile },
      tempDirName,
      force,
      cleanTempDir: 'always',
      symlinkNodeModules: true,
      disableTypeChecks: true,
    };
    try {
      await executeStryker(options);
      const parsedReport = await readMutationJson(mutationFile, runner);
      const evaluation = evaluateMutationReport(parsedReport, files);
      if (evaluation.decision !== 'pass') {
        throw new Error(
          `${runner} mutation score ${evaluation.counts.detected}/${evaluation.counts.valid} (${evaluation.score.toFixed(2)}%) is below ${MUTATION_THRESHOLD}%`,
        );
      }
      results[runner] = {
        ...evaluation,
        files,
        runnerScopeHash,
        incrementalFile,
        mutationFile,
      };
    } finally {
      await rm(tempDirName, { recursive: true, force: true });
    }
  }
  return results;
};

const parseCliArguments = (arguments_) => {
  const paths = [];
  let run = false;
  let force = false;
  let pathsOnly = false;
  let scope;
  let expectScopeValue = false;
  for (const argument of arguments_) {
    if (expectScopeValue) {
      if (!Object.hasOwn(SCOPE_DISCOVERIES, argument)) {
        throw new Error(
          `Unknown mutation scope: ${argument} (supported: ${Object.keys(SCOPE_DISCOVERIES).join(', ')})`,
        );
      }
      scope = argument;
      expectScopeValue = false;
    } else if (!pathsOnly && argument === '--') {
      pathsOnly = true;
    } else if (!pathsOnly && argument === '--run') {
      run = true;
    } else if (!pathsOnly && argument === '--force') {
      run = true;
      force = true;
    } else if (!pathsOnly && argument === '--scope') {
      expectScopeValue = true;
    } else if (!pathsOnly && argument.startsWith('--')) {
      throw new Error(`Unknown mutation option: ${argument}`);
    } else {
      paths.push(argument);
    }
  }
  if (expectScopeValue) {
    throw new Error(
      `--scope requires a value (supported: ${Object.keys(SCOPE_DISCOVERIES).join(', ')})`,
    );
  }
  return { force, paths, run, scope };
};

export const main = async ({
  arguments_ = process.argv.slice(2),
  environment = process.env,
  workspaceRoot = process.cwd(),
} = {}) => {
  const options = parseCliArguments(arguments_);
  if (!options.run) {
    const paths =
      options.scope === undefined
        ? await readChangedPaths(options.paths)
        : (
            await discoverScopedPaths({
              workspaceRoot,
              scope: options.scope,
              filters: options.paths,
            })
          ).paths;
    const report = await buildReport({ paths, workspaceRoot });
    process.stdout.write(canonicalJson(report));
    return;
  }

  const discovery =
    options.scope !== undefined
      ? await discoverScopedPaths({
          workspaceRoot,
          scope: options.scope,
          filters: options.paths,
        })
      : options.paths.length > 0
        ? { baseSha: null, baseSource: 'explicit paths', paths: options.paths }
        : await discoverChangedPaths({ workspaceRoot, environment });
  const report = await buildReport({ paths: discovery.paths, workspaceRoot });
  await validateRunnableFiles({ files: report.files, workspaceRoot });
  const mutation = await runMutationGroups({
    report,
    workspaceRoot,
    cacheRoot: environment.KIMEN_MUTATION_CACHE_DIR,
    force: options.force,
  });
  process.stdout.write(
    canonicalJson({
      ...report,
      baseSha: discovery.baseSha,
      baseSource: discovery.baseSource,
      force: options.force,
      mutation,
    }),
  );
};

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`GATE mutation-changed: FAIL — ${message}`);
    process.exitCode = 1;
  }
}
