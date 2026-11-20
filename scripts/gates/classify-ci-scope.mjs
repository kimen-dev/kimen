#!/usr/bin/env node
// Decide how much of the quality suite a change needs (.github/workflows/ci.yml).
//
//   full          the complete suite: shared infrastructure changed, the path
//                 is not one this classifier knows, or the range is unknown
//   affected      the suite in its affected scope: repository-wide gates stay
//                 whole, project gates cover what Nx reports affected
//                 (scripts/gates/select-affected.mjs)
//   dependencies  dependency maintenance (pull requests only)
//   workflows     workflow maintenance (pull requests only)
//   sandbox       sandbox dependency maintenance (containment.yml owns it)
//
// The merge queue tests the tree that lands, so it never takes the dependency
// or workflow shortcuts: there they are shared infrastructure, and full.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const WORKFLOW_FILE = /^\.github\/workflows\/[^/]+\.ya?ml$/u;
const SANDBOX_DEPENDENCY_FILE = /^sandbox\/(?:package-lock\.json|package\.json)$/u;
const WORKSPACE_MANIFEST =
  /^(?:package\.json|(?:packages|tools)\/[^/]+\/package\.json|site\/docs\/package\.json)$/u;
const DEPENDENCY_METADATA = /^(?:\.npmrc|package\.json|pnpm-lock\.ya?ml|pnpm-workspace\.yaml)$/u;
const PATCH_FILE = /^patches\/[^/]+\.patch$/u;

// A change to any of these can alter how every project resolves, builds or is
// verified, which no project graph models: the complete suite runs.
export const SHARED_INFRASTRUCTURE = Object.freeze([
  // CI itself and the gates it runs, with their shared libraries.
  /^\.github\/(?:workflows|actions)\//u,
  /^scripts\/(?:gates|lib)\//u,
  /^scripts\/run-infra-tests\.mjs$/u,
  // Dependency resolution, the SAST ruleset and the hooks.
  /^patches\//u,
  /^\.semgrep\//u,
  /^\.husky\//u,
  // Root configuration: package.json, pnpm-lock.yaml, pnpm-workspace.yaml,
  // .npmrc, nx.json, tsconfig.base.json, tsconfig.json, eslint, biome, knip,
  // stylelint, vitest and stryker configs, .gitignore... every root file except
  // the documentation and the generated agent surfaces listed below.
  /^[^/]+$/u,
]);

// Root files that configure nothing. The two llms files are build outputs of
// @kimen/elements, checked by the surfaces generated-sync gate.
const ROOT_CONTENT = new Set([
  'AGENTS.md',
  'CHANGELOG.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'NOTICE',
  'README.md',
  'SECURITY.md',
  'llms-full.txt',
  'llms.txt',
]);

// Everything outside shared infrastructure that the affected scope knows how
// to verify: Nx projects (packages, tools, site/docs), and content the
// repository-wide gates read (contracts, docs, skills, the static site...).
// A path in none of these, or in shared infrastructure, runs the full suite.
const KNOWN_AREAS = Object.freeze([
  /^(?:packages|tools|site|docs|specs|changes|llms|plugins|sandbox)\//u,
  /^\.(?:agents|claude|claude-plugin|specify|supply-chain-risk-auditor)\//u,
  /^scripts\/(?:tests|mutation-tests|release|dev|github)\//u,
  /^scripts\/[^/]+\.(?:mjs|sh)$/u,
  /^\.github\/(?:rulesets\/|ISSUE_TEMPLATE\/|PULL_REQUEST_TEMPLATE\.md$)/u,
]);

export const EVENTS = Object.freeze(['pull_request', 'merge_group']);

function isDependencyMaintenanceFile(file) {
  return (
    WORKFLOW_FILE.test(file) ||
    SANDBOX_DEPENDENCY_FILE.test(file) ||
    WORKSPACE_MANIFEST.test(file) ||
    DEPENDENCY_METADATA.test(file) ||
    PATCH_FILE.test(file)
  );
}

// A project manifest alone is a project change, which Nx scopes; the
// dependency path is for changes that touch resolution itself.
function isDependencyResolutionFile(file) {
  return DEPENDENCY_METADATA.test(file) || PATCH_FILE.test(file);
}

export function isSharedInfrastructure(file) {
  if (ROOT_CONTENT.has(file)) return false;
  return SHARED_INFRASTRUCTURE.some((pattern) => pattern.test(file));
}

function isKnownArea(file) {
  return ROOT_CONTENT.has(file) || KNOWN_AREAS.some((pattern) => pattern.test(file));
}

/** True when nothing narrower than the complete suite is safe for these files. */
export function requiresFullSuite(files) {
  const normalized = files.map((file) => file.trim()).filter(Boolean);
  if (normalized.length === 0) return true;
  return normalized.some((file) => isSharedInfrastructure(file) || !isKnownArea(file));
}

export function classifyChangedFiles(files, { event = 'pull_request' } = {}) {
  if (!EVENTS.includes(event)) {
    throw new Error(`event must be one of ${EVENTS.join(', ')}; received ${String(event)}`);
  }
  const normalized = files.map((file) => file.trim()).filter(Boolean);
  if (normalized.length === 0) return 'full';
  if (normalized.every((file) => SANDBOX_DEPENDENCY_FILE.test(file))) return 'sandbox';
  if (event === 'pull_request') {
    if (normalized.every((file) => WORKFLOW_FILE.test(file))) return 'workflows';
    if (
      normalized.every(isDependencyMaintenanceFile) &&
      normalized.some(isDependencyResolutionFile)
    ) {
      return 'dependencies';
    }
  }
  return requiresFullSuite(normalized) ? 'full' : 'affected';
}

const SHA = /^[a-f0-9]{40}$/u;

export function parseArguments(arguments_) {
  const options = new Map();
  for (let index = 0; index < arguments_.length; index += 2) {
    const [name, value] = [arguments_[index], arguments_[index + 1]];
    if (!['--base', '--head', '--event'].includes(name) || value === undefined) {
      throw new Error(
        'usage: classify-ci-scope.mjs --base <sha> --head <sha> [--event pull_request|merge_group] | --github-event',
      );
    }
    if (options.has(name)) throw new Error(`${name} given twice`);
    options.set(name, value);
  }
  const base = options.get('--base');
  const head = options.get('--head');
  if (base === undefined || head === undefined) {
    throw new Error('--base and --head are required');
  }
  if (!SHA.test(base) || !SHA.test(head)) {
    throw new Error('base and head must be full 40-character commit SHAs');
  }
  const event = options.get('--event') ?? 'pull_request';
  if (!EVENTS.includes(event)) {
    throw new Error(`event must be one of ${EVENTS.join(', ')}; received ${event}`);
  }
  return { base, head, event };
}

// Deletions and both sides of a rename count: removing a gate is a change to
// shared infrastructure as much as editing one.
export function changedFiles({ base, head, execute = execFileSync }) {
  const output = execute('git', ['diff', '--name-only', '--no-renames', base, head, '--'], {
    encoding: 'utf8',
  });
  return output.split(/\r?\n/u).filter(Boolean);
}

/**
 * The range a CI event verifies. A pull request is its own commits since it
 * left the base branch. A merge group is everything it would land: the queue
 * builds each group on the previous one (`base_sha` is that group's head), and
 * a HEADGREEN group that passes lands every group before it, so the range
 * reaches back to the commit the target branch already holds.
 */
export function eventRange({ event, payload, execute = execFileSync }) {
  const git = (...args) => execute('git', args, { encoding: 'utf8' }).trim();
  if (event === 'pull_request') {
    const base = payload?.pull_request?.base?.sha;
    const head = payload?.pull_request?.head?.sha;
    if (!SHA.test(base ?? '') || !SHA.test(head ?? '')) {
      throw new Error('pull_request payload lacks base and head SHAs');
    }
    return { base: git('merge-base', base, head), head };
  }
  if (event === 'merge_group') {
    const { base_ref: baseRef, base_sha: baseSha, head_sha: head } = payload?.merge_group ?? {};
    const branch = /^refs\/heads\/([A-Za-z0-9._/-]+)$/u.exec(baseRef ?? '')?.[1];
    if (!SHA.test(baseSha ?? '') || !SHA.test(head ?? '') || branch === undefined) {
      throw new Error('merge_group payload lacks base_sha, base_ref and head_sha');
    }
    return { base: git('merge-base', baseSha, `refs/remotes/origin/${branch}`), head };
  }
  return null;
}

/**
 * Classify the GitHub event this job runs for, as $GITHUB_OUTPUT lines. Any
 * other event (schedule, workflow_dispatch) runs the complete suite, and so
 * does a range that cannot be resolved: widening is always safe.
 */
export function classifyGithubEvent({
  environment = process.env,
  readText = (path) => readFileSync(path, 'utf8'),
  execute = execFileSync,
  warn = (message) => process.stderr.write(`::warning::${message}\n`),
} = {}) {
  const event = environment.GITHUB_EVENT_NAME;
  if (!EVENTS.includes(event)) return { scope: 'full' };
  try {
    const payload = JSON.parse(readText(environment.GITHUB_EVENT_PATH));
    const range = eventRange({ event, payload, execute });
    const base = range.base;
    if (!SHA.test(base)) throw new Error(`merge base is not a commit SHA: ${base}`);
    const files = changedFiles({ ...range, execute });
    return { scope: classifyChangedFiles(files, { event }), base, head: range.head };
  } catch (error) {
    warn(`ci scope: running the complete suite, the change range is unknown (${error.message})`);
    return { scope: 'full' };
  }
}

export function formatOutputs(result) {
  return Object.entries(result)
    .map(([key, value]) => `${key}=${value}\n`)
    .join('');
}

export function runCli({ arguments_ = process.argv.slice(2), stdout = process.stdout } = {}) {
  if (arguments_.length === 1 && arguments_[0] === '--github-event') {
    const result = classifyGithubEvent();
    stdout.write(formatOutputs(result));
    return result.scope;
  }
  const revisions = parseArguments(arguments_);
  const scope = classifyChangedFiles(changedFiles(revisions), { event: revisions.event });
  stdout.write(`${scope}\n`);
  return scope;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
