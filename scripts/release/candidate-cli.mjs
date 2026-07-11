#!/usr/bin/env node
// Thin workflow boundary for release-candidate-v1. Core behavior remains in
// build-candidate.mjs and is mutation-tested independently.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildCandidate, verifyCandidate } from './build-candidate.mjs';

function fail(message) {
  throw new Error(`candidate-cli: ${message}`);
}

export function parseCandidateOptions(arguments_, allowed) {
  const values = new Map();
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (!allowed.has(flag) || value === undefined || values.has(flag)) {
      fail(`invalid or duplicate option ${String(flag)}`);
    }
    values.set(flag, value);
  }
  return values;
}

function required(options, flag) {
  const value = options.get(flag);
  if (value === undefined || value === '') fail(`missing ${flag}`);
  return value;
}

async function build(arguments_, buildCandidateImpl) {
  const options = parseCandidateOptions(
    arguments_,
    new Set(['--mode', '--output-directory', '--repository-root', '--source-sha', '--tag']),
  );
  const repositoryRoot = resolve(required(options, '--repository-root'));
  const mode = required(options, '--mode');
  const tag = options.get('--tag') ?? null;
  const result = await buildCandidateImpl({
    mode,
    outputDirectory: resolve(required(options, '--output-directory')),
    packageDirectories: [
      resolve(repositoryRoot, 'packages/elements'),
      resolve(repositoryRoot, 'packages/tokens'),
    ],
    protectedMainRef: 'refs/heads/main',
    repositoryRoot,
    sourceSha: required(options, '--source-sha'),
    tag,
  });
  return {
    archivePath: result.archivePath,
    candidateSha256: result.candidateSha256,
    manifest: result.manifest,
  };
}

async function verify(arguments_, verifyCandidateImpl, environment) {
  const options = parseCandidateOptions(arguments_, new Set(['--archive', '--sha256']));
  return verifyCandidateImpl({
    archivePath: resolve(required(options, '--archive')),
    environment,
    expectedSha256: required(options, '--sha256'),
  });
}

export async function runCandidateCli({
  arguments_ = process.argv.slice(2),
  stdout = process.stdout,
  environment = process.env,
  buildCandidateImpl = buildCandidate,
  verifyCandidateImpl = verifyCandidate,
} = {}) {
  const [command, ...commandArguments] = arguments_;
  let result;
  if (command === 'build') result = await build(commandArguments, buildCandidateImpl);
  else if (command === 'verify') {
    result = await verify(commandArguments, verifyCandidateImpl, environment);
  } else fail('usage: candidate-cli.mjs <build|verify> [options]');
  stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runCandidateCli().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
