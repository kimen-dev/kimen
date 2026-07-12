#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S10
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson } from '../lib/canonical-json.mjs';
import { evaluatePublicApiChange } from '../lib/public-api.mjs';

const REQUIRED_OPTIONS = Object.freeze(['--baseline', '--candidate', '--declaration']);
const USAGE =
  'usage: check-public-api.mjs --baseline <snapshot.json|none> --candidate <snapshot.json> --declaration <change.json|none>';

export function parsePublicApiArguments(arguments_) {
  const values = new Map();
  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index];
    const value = arguments_[index + 1];
    if (!REQUIRED_OPTIONS.includes(option) || value === undefined || value.startsWith('--')) {
      throw new TypeError(
        `${USAGE}; explicit --baseline, --candidate, and --declaration are required`,
      );
    }
    if (values.has(option)) {
      throw new TypeError(`duplicate option ${option}; ${USAGE}`);
    }
    values.set(option, value);
  }
  if (
    arguments_.length !== REQUIRED_OPTIONS.length * 2 ||
    REQUIRED_OPTIONS.some((option) => !values.has(option))
  ) {
    throw new TypeError(
      `${USAGE}; explicit --baseline, --candidate, and --declaration are required`,
    );
  }
  if (values.get('--candidate') === 'none') {
    throw new TypeError(`--candidate cannot be none; ${USAGE}`);
  }
  return values;
}

export async function readCanonicalJson(label, path, { readText = readFile } = {}) {
  const absolutePath = resolve(path);
  let bytes;
  try {
    bytes = await readText(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(`${label} file cannot be read: ${absolutePath}`, { cause: error });
  }

  let value;
  try {
    value = JSON.parse(bytes);
  } catch (error) {
    throw new Error(`${label} file is not valid JSON: ${absolutePath}`, { cause: error });
  }
  if (bytes !== canonicalJson(value)) {
    throw new Error(`${label} file must use canonical JSON bytes: ${absolutePath}`);
  }
  return value;
}

async function optionalContract(label, path, readText) {
  return path === 'none' ? null : readCanonicalJson(label, path, { readText });
}

export async function checkPublicApi({
  arguments_,
  readText = readFile,
  evaluate = evaluatePublicApiChange,
}) {
  const options = parsePublicApiArguments(arguments_);
  const [baseline, candidate, declaration] = await Promise.all([
    optionalContract('baseline', options.get('--baseline'), readText),
    readCanonicalJson('candidate', options.get('--candidate'), { readText }),
    optionalContract('declaration', options.get('--declaration'), readText),
  ]);
  return evaluate({ baseline, candidate, declaration });
}

export async function runPublicApiCli({
  arguments_ = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  setExitCode = () => undefined,
  readText = readFile,
  evaluate = evaluatePublicApiChange,
} = {}) {
  const result = await checkPublicApi({ arguments_, readText, evaluate });

  if (result.decision === 'blocked') {
    stderr.write(`BLOCKED public-api: release=${result.release}\n`);
    for (const reason of result.reasons) {
      stderr.write(`- ${reason}\n`);
    }
    setExitCode(1);
    return result;
  }

  stdout.write(`PASS public-api: release=${result.release} decision=${result.decision}\n`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runPublicApiCli({ setExitCode: (value) => (process.exitCode = value) }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`check-public-api: ${message}\n`);
    process.exitCode = 1;
  });
}
