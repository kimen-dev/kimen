#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const tokens = Object.freeze([
  'packages/tokens/dist/css/tokens.css',
  'packages/tokens/dist/css/tokens.dark.css',
  'packages/tokens/dist/css/tokens.light.css',
  'packages/tokens/dist/css/tokens.material3.css',
  'packages/tokens/dist/css/tokens.material3.dark.css',
  'packages/tokens/dist/css/tokens.material3.light.css',
]);
const surfaces = Object.freeze([
  'llms.txt',
  'packages/elements/generated/custom-elements.json',
  'packages/elements/generated/docs.d.ts',
  'packages/elements/generated/docs.json',
  'packages/elements/generated/public-api.json',
  'packages/elements/llms.txt',
]);

export const generatedGroups = Object.freeze({
  tokens: Object.freeze({
    required: tokens,
    scopes: Object.freeze(['packages/tokens/dist/css']),
  }),
  surfaces: Object.freeze({
    required: surfaces,
    scopes: Object.freeze([
      'llms.txt',
      'packages/elements/generated',
      'packages/elements/llms.txt',
    ]),
  }),
});

function git(root, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || (!allowFailure && result.status !== 0)) {
    throw new Error(
      result.stderr.trim() || result.error?.message || `git ${args.join(' ')} failed`,
    );
  }
  return result;
}

const lines = (source) => source.split(/\r?\n/u).filter(Boolean);

export function validateGeneratedSync({ root, group, executeGit = git }) {
  const contract = generatedGroups[group];
  if (contract === undefined) {
    throw new Error(`generated sync group must be tokens or surfaces; received ${String(group)}`);
  }
  const required = new Set(contract.required);
  for (const path of contract.required) {
    const result = executeGit(root, ['ls-files', '--error-unmatch', '--', path], {
      allowFailure: true,
    });
    if (result.status !== 0) {
      throw new Error(`generated sync ${group}: ${path} must be tracked`);
    }
  }
  const tracked = lines(executeGit(root, ['ls-files', '--', ...contract.scopes]).stdout);
  const undeclaredTracked = tracked.filter((path) => !required.has(path));
  if (undeclaredTracked.length > 0) {
    throw new Error(
      `generated sync ${group}: undeclared tracked outputs: ${undeclaredTracked.join(', ')}`,
    );
  }
  const untracked = lines(
    executeGit(root, ['ls-files', '--others', '--exclude-standard', '--', ...contract.scopes])
      .stdout,
  );
  if (untracked.length > 0) {
    throw new Error(`generated sync ${group}: untracked outputs: ${untracked.join(', ')}`);
  }
  const diff = executeGit(root, ['diff', '--exit-code', '--', ...contract.required], {
    allowFailure: true,
  });
  if (diff.status !== 0) {
    throw new Error(`generated sync ${group}: generated output drift detected`);
  }
  return { group, files: contract.required.length };
}

export function runGeneratedSyncCli({
  arguments_ = process.argv.slice(2),
  root = process.cwd(),
  stdout = process.stdout,
  executeGit = git,
} = {}) {
  if (arguments_.length !== 1) {
    throw new Error('usage: check-generated-sync.mjs <tokens|surfaces>');
  }
  const result = validateGeneratedSync({ root, group: arguments_[0], executeGit });
  stdout.write(`PASS generated-sync ${result.group}: ${String(result.files)} tracked files\n`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    runGeneratedSyncCli();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
