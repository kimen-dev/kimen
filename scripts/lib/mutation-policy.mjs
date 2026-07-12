import { posix } from 'node:path';

import { canonicalJsonSha256 } from './canonical-json.mjs';

export const MUTATION_THRESHOLD = 70;
export const MUTATION_SCOPE_SCHEMA_VERSION = 1;

const MUTATION_RUNNERS = new Set(['elements', 'node']);
const FINAL_MUTATION_STATUSES = new Set([
  'CompileError',
  'Ignored',
  'Killed',
  'NoCoverage',
  'RuntimeError',
  'Survived',
  'Timeout',
]);

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const CONFIG_HASH_KEY = /^[a-z][a-z0-9-]*$/;
const EXECUTABLE_EXTENSIONS = new Set([
  '.bash',
  '.cjs',
  '.cts',
  '.go',
  '.java',
  '.js',
  '.jsx',
  '.kt',
  '.mjs',
  '.mts',
  '.py',
  '.rb',
  '.rs',
  '.sh',
  '.swift',
  '.ts',
  '.tsx',
]);

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const isPlainRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeRepositoryPath = (input) => {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new TypeError('Changed paths must be non-empty strings');
  }
  if (
    [...input].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 31 || codePoint === 127 || codePoint === 65_533;
    })
  ) {
    throw new TypeError('Changed paths cannot contain control or invalid UTF-8 characters');
  }

  const slashPath = input.replaceAll('\\', '/');
  const withoutDotPrefix = slashPath.replace(/^(?:\.\/)+/, '');
  if (posix.isAbsolute(withoutDotPrefix) || /^[a-zA-Z]:\//.test(withoutDotPrefix)) {
    throw new TypeError(`Changed path must be repository-relative: ${input}`);
  }

  const normalized = posix.normalize(withoutDotPrefix);
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.endsWith('/')
  ) {
    throw new TypeError(`Invalid repository path: ${input}`);
  }
  return normalized;
};

const isExecutablePath = (path) => EXECUTABLE_EXTENSIONS.has(posix.extname(path));

const excluded = (path, reason) => ({ path, classification: 'excluded', reason });
const core = (path, runner) => ({ path, classification: 'core', runner });

const classifyKnownPath = (path) => {
  if (
    /(?:^|\/)(?:node_modules|dist|generated|loader|coverage|reports|storybook-static|site-dist)(?:\/|$)/.test(
      path,
    ) ||
    /(?:^|\/)\.cache(?:\/|$)/.test(path)
  ) {
    return excluded(path, 'generated or vendored output is regenerated and verified separately');
  }
  if (
    /(?:^|\/)(?:tests?|__tests__|fixtures|browser-tests|size-limit)(?:\/|$)/.test(path) ||
    /\.(?:spec|test|e2e)(?:\.[^.]+)?\.[cm]?[jt]sx?$/.test(path) ||
    /\.stories\.[cm]?[jt]sx?$/.test(path)
  ) {
    return excluded(
      path,
      'test, fixture and story code is verification input, not a mutation target',
    );
  }
  if (/\.d\.[cm]?tsx?$/.test(path)) {
    return excluded(path, 'type declarations contain no runtime logic to mutate');
  }
  if (/^(?:\.agents|\.claude)\//.test(path)) {
    return excluded(path, 'local agent tooling is operational input outside shipped core logic');
  }
  if (
    /(?:^|\/)[^/]+\.config\.[cm]?[jt]s$/.test(path) ||
    /(?:^|\/)vitest\.setup\.mjs$/.test(path) ||
    /(?:^|\/)\.storybook(?:\/|$)/.test(path) ||
    /^\.github\/workflows\//.test(path)
  ) {
    return excluded(path, 'configuration is verified by deterministic integration gates');
  }
  if (
    /^packages\/elements\/src\/(?:index\.ts|components\.d\.ts)$/.test(path) ||
    /^packages\/[^/]+\/index\.mjs$/.test(path)
  ) {
    return excluded(
      path,
      'compatibility and package entry-point glue is verified by packaging gates',
    );
  }
  if (/^site\/.*\.[cm]?[jt]sx?$/.test(path)) {
    return excluded(
      path,
      'browser presentation code is verified by browser and accessibility gates',
    );
  }
  if (/^(?:scripts|sandbox)\/.*\.(?:bash|sh)$/.test(path)) {
    return excluded(path, 'shell orchestration is verified by integration and containment gates');
  }
  if (/^packages\/elements\/src\/.*\.[cm]?[jt]sx?$/.test(path)) {
    return core(path, 'elements');
  }
  if (
    /^(?:scripts|tools|\.github\/scripts|sandbox)\/.*\.[cm]?[jt]sx?$/.test(path) ||
    /^packages\/[^/]+\/(?:src|scripts)\/.*\.[cm]?[jt]sx?$/.test(path) ||
    /^packages\/tokens\/build\.mjs$/.test(path)
  ) {
    return core(path, 'node');
  }
  if (!isExecutablePath(path)) {
    return excluded(path, 'non-executable artifact is outside the mutation runner scope');
  }
  return undefined;
};

/**
 * Classify every supplied repository-relative path exactly once.
 * Unknown executable code is a policy failure, never an implicit exclusion.
 */
export function classifyChangedFiles(paths) {
  if (!Array.isArray(paths)) {
    throw new TypeError('Changed paths must be an array');
  }

  const normalizedPaths = paths.map(normalizeRepositoryPath).sort(compareText);
  const duplicate = normalizedPaths.find((path, index) => path === normalizedPaths[index - 1]);
  if (duplicate !== undefined) {
    throw new Error(`Duplicate changed path after normalization: ${duplicate}`);
  }

  const classified = normalizedPaths.map(classifyKnownPath);
  const unclassified = normalizedPaths.filter((_, index) => classified[index] === undefined);
  if (unclassified.length > 0) {
    throw new Error(`Unclassified executable paths: ${unclassified.join(', ')}`);
  }
  return classified;
}

const normalizeClassifiedFiles = (files) => {
  if (!Array.isArray(files)) {
    throw new TypeError('Mutation scope files must be an array');
  }
  const normalized = files.map((file) => {
    if (!isPlainRecord(file)) {
      throw new TypeError('Mutation scope file entries must be objects');
    }
    const path = normalizeRepositoryPath(file.path);
    if (file.classification === 'core') {
      if (file.runner !== 'node' && file.runner !== 'elements') {
        throw new TypeError(`Core mutation file requires a named runner: ${path}`);
      }
      return { path, classification: 'core', runner: file.runner };
    }
    if (file.classification === 'excluded') {
      if (typeof file.reason !== 'string' || file.reason.trim().length === 0) {
        throw new TypeError(`Excluded mutation file requires a reason: ${path}`);
      }
      return { path, classification: 'excluded', reason: file.reason };
    }
    throw new TypeError(`Invalid mutation classification for ${path}`);
  });
  normalized.sort((left, right) => compareText(left.path, right.path));
  const duplicate = normalized.find(({ path }, index) => path === normalized[index - 1]?.path);
  if (duplicate !== undefined) {
    throw new Error(`Duplicate mutation scope file: ${duplicate.path}`);
  }
  return normalized;
};

export function groupCoreFiles(files) {
  const groups = { elements: [], node: [] };
  for (const file of normalizeClassifiedFiles(files)) {
    if (file.classification === 'core') {
      groups[file.runner].push(file.path);
    }
  }
  return groups;
}

const normalizeHash = (value, label) => {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
};

const normalizeConfigHashes = (configHashes) => {
  if (!isPlainRecord(configHashes) || Object.keys(configHashes).length === 0) {
    throw new TypeError('Mutation scope requires at least one config hash');
  }
  const normalized = {};
  for (const key of Object.keys(configHashes).sort(compareText)) {
    if (!CONFIG_HASH_KEY.test(key)) {
      throw new TypeError(`Invalid mutation config hash key: ${key}`);
    }
    normalized[key] = normalizeHash(configHashes[key], `Config hash ${key}`);
  }
  return normalized;
};

export function hashMutationScope(scope) {
  if (!isPlainRecord(scope)) {
    throw new TypeError('Mutation scope must be an object');
  }
  return canonicalJsonSha256({
    schemaVersion: MUTATION_SCOPE_SCHEMA_VERSION,
    files: normalizeClassifiedFiles(scope.files),
    policyHash: normalizeHash(scope.policyHash, 'Policy hash'),
    configHashes: normalizeConfigHashes(scope.configHashes),
    lockfileHash: normalizeHash(scope.lockfileHash, 'Lockfile hash'),
  });
}

const normalizeRunner = (runner) => {
  if (typeof runner !== 'string' || !MUTATION_RUNNERS.has(runner)) {
    throw new TypeError('Mutation runner must be node or elements');
  }
  return runner;
};

const normalizePathList = (paths, label, { allowEmpty = false } = {}) => {
  if (!Array.isArray(paths) || (!allowEmpty && paths.length === 0)) {
    throw new TypeError(`${label} must be a non-empty array`);
  }
  const normalized = paths.map(normalizeRepositoryPath).sort(compareText);
  const duplicate = normalized.find((path, index) => path === normalized[index - 1]);
  if (duplicate !== undefined) {
    throw new Error(`Duplicate ${label.toLowerCase()} path: ${duplicate}`);
  }
  return normalized;
};

/**
 * Hash the exact mutate set for one runner. Stryker itself detects source/test
 * content changes inside the incremental report; this hash prevents results
 * from a different mutate set, policy, runner config or dependency graph from
 * sharing that report in the first place.
 */
export function hashMutationRunnerScope(scope) {
  if (!isPlainRecord(scope)) {
    throw new TypeError('Mutation runner scope must be an object');
  }
  return canonicalJsonSha256({
    schemaVersion: MUTATION_SCOPE_SCHEMA_VERSION,
    runner: normalizeRunner(scope.runner),
    files: normalizePathList(scope.files, 'Mutation runner files'),
    policyHash: normalizeHash(scope.policyHash, 'Policy hash'),
    configHashes: normalizeConfigHashes(scope.configHashes),
    lockfileHash: normalizeHash(scope.lockfileHash, 'Lockfile hash'),
  });
}

export const assertMutationThresholds = (thresholds, label) => {
  if (
    !isPlainRecord(thresholds) ||
    thresholds.high !== MUTATION_THRESHOLD ||
    thresholds.low !== MUTATION_THRESHOLD ||
    thresholds.break !== MUTATION_THRESHOLD
  ) {
    throw new Error(`${label} must keep high, low and break threshold at 70`);
  }
};

const incrementStatus = (counts, status) => {
  switch (status) {
    case 'Killed':
      counts.killed += 1;
      counts.detected += 1;
      counts.valid += 1;
      break;
    case 'Timeout':
      counts.timeout += 1;
      counts.detected += 1;
      counts.valid += 1;
      break;
    case 'Survived':
      counts.survived += 1;
      counts.valid += 1;
      break;
    case 'NoCoverage':
      counts.noCoverage += 1;
      counts.valid += 1;
      break;
    case 'CompileError':
      counts.compileError += 1;
      counts.invalid += 1;
      break;
    case 'RuntimeError':
      counts.runtimeError += 1;
      counts.invalid += 1;
      break;
    case 'Ignored':
      counts.ignored += 1;
      counts.invalid += 1;
      break;
    default:
      throw new Error(`Unknown mutation status: ${String(status)}`);
  }
};

/**
 * Validate and score the JSON report emitted by the pinned Stryker runner.
 * The integer inequality avoids floating-point rounding at the 70% boundary.
 * CompileError, RuntimeError and Ignored are surfaced as invalid rather than
 * scored: they cannot improve the result and cannot make an otherwise empty
 * group valid. Pending or unknown statuses reject the entire report.
 */
export function evaluateMutationReport(report, expectedFiles) {
  const expected = normalizePathList(expectedFiles, 'Expected mutation files');
  if (!isPlainRecord(report)) {
    throw new TypeError('Mutation report must be an object');
  }
  if (report.schemaVersion !== '1.0') {
    throw new Error(`Unsupported mutation report schema: ${String(report.schemaVersion)}`);
  }
  assertMutationThresholds(report.thresholds, 'Mutation report thresholds');
  if (!isPlainRecord(report.config)) {
    throw new Error('Mutation report is missing its effective config');
  }
  assertMutationThresholds(report.config.thresholds, 'Mutation report config thresholds');
  const configuredMutate = normalizePathList(
    report.config.mutate,
    'Mutation report configured files',
  );
  if (configuredMutate.join('\0') !== expected.join('\0')) {
    throw new Error(
      `Mutation report configured files differ from exact files: expected ${expected.join(', ')}; observed ${configuredMutate.join(', ')}`,
    );
  }
  if (!isPlainRecord(report.files)) {
    throw new Error('Mutation report files must be an object');
  }
  const observed = normalizePathList(Object.keys(report.files), 'Mutation report files');
  if (observed.join('\0') !== expected.join('\0')) {
    throw new Error(
      `Mutation report does not contain the exact files: expected ${expected.join(', ')}; observed ${observed.join(', ')}`,
    );
  }

  const counts = {
    detected: 0,
    invalid: 0,
    killed: 0,
    noCoverage: 0,
    runtimeError: 0,
    compileError: 0,
    ignored: 0,
    survived: 0,
    timeout: 0,
    valid: 0,
  };
  for (const path of observed) {
    const file = report.files[path];
    if (!isPlainRecord(file) || !Array.isArray(file.mutants)) {
      throw new Error(`Mutation report file has no mutant array: ${path}`);
    }
    for (const mutant of file.mutants) {
      if (!isPlainRecord(mutant)) {
        throw new Error(`Mutation report contains a non-object mutant in ${path}`);
      }
      if (mutant.status === 'Pending') {
        throw new Error(`Pending is not a final mutation status in ${path}`);
      }
      if (typeof mutant.status !== 'string' || !FINAL_MUTATION_STATUSES.has(mutant.status)) {
        throw new Error(`Unknown mutation status: ${String(mutant.status)}`);
      }
      incrementStatus(counts, mutant.status);
    }
  }
  if (counts.valid === 0) {
    throw new Error('Mutation report contains zero valid mutants');
  }
  const passes = counts.detected * 100 >= MUTATION_THRESHOLD * counts.valid;
  return {
    counts,
    decision: passes ? 'pass' : 'fail',
    score: (counts.detected * 100) / counts.valid,
    threshold: MUTATION_THRESHOLD,
  };
}

export function evaluateMutationScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
    throw new TypeError('Mutation score must be a finite number from 0 through 100');
  }
  return {
    score,
    threshold: MUTATION_THRESHOLD,
    decision: score >= MUTATION_THRESHOLD ? 'pass' : 'fail',
  };
}
