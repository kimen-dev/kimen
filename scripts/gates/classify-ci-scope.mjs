#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const WORKFLOW_FILE = /^\.github\/workflows\/[^/]+\.ya?ml$/u;
const SANDBOX_DEPENDENCY_FILE = /^sandbox\/(?:package-lock\.json|package\.json)$/u;
const WORKSPACE_MANIFEST =
  /^(?:package\.json|(?:packages|tools)\/[^/]+\/package\.json|site\/docs\/package\.json)$/u;
const DEPENDENCY_METADATA = /^(?:\.npmrc|pnpm-lock\.ya?ml|pnpm-workspace\.yaml)$/u;
const PATCH_FILE = /^patches\/[^/]+\.patch$/u;

function isDependencyMaintenanceFile(file) {
  return (
    WORKFLOW_FILE.test(file) ||
    SANDBOX_DEPENDENCY_FILE.test(file) ||
    WORKSPACE_MANIFEST.test(file) ||
    DEPENDENCY_METADATA.test(file) ||
    PATCH_FILE.test(file)
  );
}

export function classifyChangedFiles(files) {
  const normalized = files.map((file) => file.trim()).filter(Boolean);
  if (normalized.length === 0) return 'full';
  if (normalized.every((file) => SANDBOX_DEPENDENCY_FILE.test(file))) return 'sandbox';
  if (normalized.every((file) => WORKFLOW_FILE.test(file))) return 'workflows';
  if (normalized.every(isDependencyMaintenanceFile)) return 'dependencies';
  return 'full';
}

export function parseArguments(arguments_) {
  if (arguments_.length !== 4 || arguments_[0] !== '--base' || arguments_[2] !== '--head') {
    throw new Error('usage: classify-ci-scope.mjs --base <sha> --head <sha>');
  }
  const base = arguments_[1];
  const head = arguments_[3];
  if (!/^[a-f0-9]{40}$/u.test(base) || !/^[a-f0-9]{40}$/u.test(head)) {
    throw new Error('base and head must be full 40-character commit SHAs');
  }
  return { base, head };
}

export function changedFiles({ base, head, execute = execFileSync }) {
  const output = execute(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMRTUXB', base, head, '--'],
    { encoding: 'utf8' },
  );
  return output.split(/\r?\n/u).filter(Boolean);
}

export function runCli({ arguments_ = process.argv.slice(2), stdout = process.stdout } = {}) {
  const revisions = parseArguments(arguments_);
  const scope = classifyChangedFiles(changedFiles(revisions));
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
