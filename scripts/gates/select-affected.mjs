#!/usr/bin/env node
// Select what the affected scope of the quality suite verifies for one change
// range (.github/workflows/ci.yml). Prints environment assignments, one per
// line, for $GITHUB_ENV or `env $(...)`:
//
//   KIMEN_GATE_SCOPE=affected
//   KIMEN_AFFECTED_PROJECTS=<the Nx projects the range affects, comma-separated>
//   KIMEN_AFFECTED_LINT_PATHS=<their roots, and the top-level directory of
//                              each changed code file outside them>
//
// or `KIMEN_GATE_SCOPE=full` when the range touches shared infrastructure
// (classify-ci-scope.mjs) or yields a value it cannot pass on safely.
// Projects come from `nx show projects --affected` with base and head set
// explicitly: the projects that own a changed file or declare it as a target
// input, and every project that depends on them.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { changedFiles, requiresFullSuite } from './classify-ci-scope.mjs';

const SHA = /^[a-f0-9]{40}$/u;
// Values travel as comma-separated environment assignments.
const LIST_ITEM = /^[A-Za-z0-9@._/+-]+$/u;
const CODE_FILE = /\.(?:[cm]?[jt]sx?)$/u;

export function parseArguments(arguments_) {
  if (arguments_.length !== 4 || arguments_[0] !== '--base' || arguments_[2] !== '--head') {
    throw new Error('usage: select-affected.mjs --base <sha> --head <sha>');
  }
  const [, base, , head] = arguments_;
  if (!SHA.test(base) || !SHA.test(head)) {
    throw new Error('base and head must be full 40-character commit SHAs');
  }
  return { base, head };
}

/** Project name → root directory, from an `nx graph --file` document. */
export function projectRoots(graph) {
  const nodes = graph?.graph?.nodes;
  if (nodes === null || typeof nodes !== 'object') {
    throw new Error('the Nx graph document has no projects');
  }
  return new Map(
    Object.values(nodes).map(({ name, data }) => {
      if (typeof name !== 'string' || typeof data?.root !== 'string') {
        throw new Error('every Nx project needs a name and a root');
      }
      return [name, data.root.replace(/\/+$/u, '')];
    }),
  );
}

function within(file, root) {
  return root === '' || root === '.' || file === root || file.startsWith(`${root}/`);
}

/**
 * Lint covers each affected project's root and, for every changed code file
 * no project owns, its top-level directory: a helper's edit can change how
 * its importers lint, and those live next to it.
 */
export function lintPaths({ files, roots, projects, exists = existsSync }) {
  const paths = new Set(projects.map((project) => roots.get(project)));
  const allRoots = [...roots.values()];
  for (const file of files) {
    if (!CODE_FILE.test(file) || !exists(file)) continue;
    if (allRoots.some((root) => within(file, root))) continue;
    const separator = file.indexOf('/');
    if (separator > 0) paths.add(file.slice(0, separator));
  }
  return [...paths].sort((left, right) => left.localeCompare(right));
}

export function selectAffected({ files, roots, affected, exists = existsSync }) {
  if (requiresFullSuite(files)) return { scope: 'full' };
  const projects = [...new Set(affected)].sort((left, right) => left.localeCompare(right));
  for (const project of projects) {
    if (!roots.has(project)) throw new Error(`Nx reported an unknown project: ${project}`);
  }
  const paths = lintPaths({ files, roots, projects, exists });
  if ([...projects, ...paths].some((value) => !LIST_ITEM.test(value))) {
    return { scope: 'full' };
  }
  return { scope: 'affected', projects, lintPaths: paths };
}

export function formatEnvironment(selection) {
  if (selection.scope !== 'affected') return 'KIMEN_GATE_SCOPE=full\n';
  return [
    'KIMEN_GATE_SCOPE=affected',
    `KIMEN_AFFECTED_PROJECTS=${selection.projects.join(',')}`,
    `KIMEN_AFFECTED_LINT_PATHS=${selection.lintPaths.join(',')}`,
    '',
  ].join('\n');
}

function nx(execute, args) {
  return execute('pnpm', ['exec', 'nx', ...args], {
    encoding: 'utf8',
    env: { ...process.env, NX_TUI: 'false' },
    maxBuffer: 64 * 1024 * 1024,
  });
}

function affectedSelection({ base, head, files, execute, exists }) {
  const directory = mkdtempSync(join(tmpdir(), 'kimen-affected-'));
  try {
    const graphFile = join(directory, 'graph.json');
    nx(execute, ['graph', `--file=${graphFile}`]);
    const roots = projectRoots(JSON.parse(readFileSync(graphFile, 'utf8')));
    const affected = JSON.parse(
      nx(execute, ['show', 'projects', '--affected', `--base=${base}`, `--head=${head}`, '--json']),
    );
    if (!Array.isArray(affected)) throw new Error('nx show projects did not return a list');
    return selectAffected({ files, roots, affected, exists });
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

/**
 * Anything that stops the selection widens it to the complete suite, with a
 * warning on the run: a slower check is always a correct one.
 */
export function runCli({
  arguments_ = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  execute = execFileSync,
  exists = existsSync,
} = {}) {
  const { base, head } = parseArguments(arguments_);
  const files = changedFiles({ base, head, execute });
  let selection = { scope: 'full' };
  if (!requiresFullSuite(files)) {
    try {
      selection = affectedSelection({ base, head, files, execute, exists });
    } catch (error) {
      stderr.write(
        `::warning::affected selection failed, running the complete suite: ${error.message}\n`,
      );
    }
  }
  stderr.write(
    selection.scope === 'affected'
      ? `affected scope: ${String(files.length)} changed files; projects: ${selection.projects.join(', ') || 'none'}\n`
      : `full scope: ${String(files.length)} changed files need the complete suite\n`,
  );
  stdout.write(formatEnvironment(selection));
  return selection;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`select-affected: ${error.message}\n`);
    process.exitCode = 1;
  }
}
