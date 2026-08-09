#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { changedFiles, parseArguments } from './classify-ci-scope.mjs';

const MANIFEST_FILE =
  /^(?:package\.json|(?:packages|tools)\/[^/]+\/package\.json|site\/docs\/package\.json)$/u;
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const BROWSER_DEPENDENCIES = new Set([
  '@axe-core/playwright',
  '@playwright/test',
  '@stencil/core',
  '@stencil/vitest',
  '@vitest/browser',
  '@vitest/browser-playwright',
  'axe-core',
  'playwright',
  'typescript',
  'vitest',
]);

export function requiresBrowserVerification(dependencyNames) {
  return dependencyNames.some((name) => BROWSER_DEPENDENCIES.has(name));
}

function manifestAtRevision(revision, file, execute) {
  try {
    return JSON.parse(execute('git', ['show', `${revision}:${file}`], { encoding: 'utf8' }));
  } catch {
    return {};
  }
}

function dependencyVersions(manifest) {
  return Object.fromEntries(
    DEPENDENCY_FIELDS.flatMap((field) => Object.entries(manifest[field] ?? {})),
  );
}

export function changedDependencyNames({ base, head, files, execute = execFileSync }) {
  const names = new Set();
  for (const file of files.filter((candidate) => MANIFEST_FILE.test(candidate))) {
    const before = dependencyVersions(manifestAtRevision(base, file, execute));
    const after = dependencyVersions(manifestAtRevision(head, file, execute));
    for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (before[name] !== after[name]) names.add(name);
    }
  }
  return [...names].sort();
}

export function dependencyChangeNeedsBrowser({ base, head, files, execute = execFileSync }) {
  // Package-manager policy or a lock-only update can alter every resolved
  // browser package without naming the direct dependency in a manifest.
  if (files.includes('pnpm-workspace.yaml')) return true;
  const names = changedDependencyNames({ base, head, files, execute });
  if (requiresBrowserVerification(names)) return true;
  return names.length === 0 && files.includes('pnpm-lock.yaml');
}

export function runCli({ arguments_ = process.argv.slice(2), stdout = process.stdout } = {}) {
  const revisions = parseArguments(arguments_);
  const needed = dependencyChangeNeedsBrowser({
    ...revisions,
    files: changedFiles(revisions),
  });
  stdout.write(`${needed}\n`);
  return needed;
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
