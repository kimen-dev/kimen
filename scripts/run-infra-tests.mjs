#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const INFRASTRUCTURE_TEST = /^[a-z0-9][a-z0-9-]*\.test\.mjs$/u;
const DEDICATED_TEST_FILES = new Set(['consumer-contract.test.mjs']);

export function selectInfrastructureTestFiles(entries) {
  return entries
    .filter((entry) => INFRASTRUCTURE_TEST.test(entry) && !DEDICATED_TEST_FILES.has(entry))
    .toSorted((left, right) => left.localeCompare(right));
}

export function runInfrastructureTests({
  entries,
  repositoryRoot,
  testsDirectory,
  execute = spawnSync,
  executable = process.execPath,
  environment = process.env,
}) {
  const files = selectInfrastructureTestFiles(entries);
  if (files.length === 0) {
    throw new Error('run-infra-tests: no infrastructure tests discovered');
  }
  const result = execute(
    executable,
    ['--test', ...files.map((file) => join(testsDirectory, file))],
    {
      cwd: repositoryRoot,
      env: environment,
      stdio: 'inherit',
    },
  );
  if (result.error) {
    throw result.error;
  }
  return { files, status: result.status ?? 1 };
}

export async function runInfrastructureCli({
  listDirectory = readdir,
  execute = spawnSync,
  executable = process.execPath,
  environment = process.env,
  setExitCode = () => undefined,
} = {}) {
  const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
  const testsDirectory = join(repositoryRoot, 'scripts/tests');
  const result = runInfrastructureTests({
    entries: await listDirectory(testsDirectory),
    repositoryRoot,
    testsDirectory,
    execute,
    executable,
    environment,
  });
  setExitCode(result.status);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runInfrastructureCli({ setExitCode: (value) => (process.exitCode = value) }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
