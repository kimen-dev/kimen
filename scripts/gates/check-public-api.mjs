#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S10
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { canonicalJson, canonicalJsonSha256 } from '../lib/canonical-json.mjs';
import { readDirectoryPublicApiSnapshot } from '../lib/public-api-storage.mjs';
import { createAcceptedPublicApiDeclaration, evaluatePublicApiChange } from '../lib/public-api.mjs';

const OPTIONS = Object.freeze(['--baseline', '--candidate', '--declarations', '--declaration']);
const USAGE =
  'usage: check-public-api.mjs --baseline <snapshot.json|none> --candidate <snapshot.json|directory> --declarations <directory>';
const MISSING_OPTIONS = `${USAGE}; explicit --baseline, --candidate, and --declarations are required`;
const PRE_067_SURFACE_SHA256 = '916315c023aa2c2168bcfd27b6e7f8171796000ed786778c293d598804e9264e';
const PUBLISHED_TOKEN_DEPRECATIONS_SHA256 =
  '97b9b39bdd074c31f2e2573af11d08ff4ae7b4677c9e52a66fb81947eb0c86a7';

export function parsePublicApiArguments(arguments_) {
  const values = new Map();
  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index];
    const value = arguments_[index + 1];
    if (!OPTIONS.includes(option) || value === undefined || value.startsWith('--')) {
      throw new TypeError(MISSING_OPTIONS);
    }
    if (values.has(option)) {
      throw new TypeError(`duplicate option ${option}; ${USAGE}`);
    }
    values.set(option, value);
  }
  if (
    values.size !== 3 ||
    !values.has('--baseline') ||
    !values.has('--candidate') ||
    !(values.has('--declarations') || values.has('--declaration'))
  ) {
    throw new TypeError(MISSING_OPTIONS);
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

export function readPublicApiCandidate(path, options) {
  return path.endsWith('.json')
    ? readCanonicalJson('candidate', path, options)
    : readDirectoryPublicApiSnapshot(path);
}

/** Token deprecations extracted from the public API snapshot at tag v0.6.0. */
export async function readPublishedTokenDeprecations(directory) {
  const path = resolve(directory, 'accepted/0.6.0-token-deprecations.json');
  let published;
  try {
    published = await readCanonicalJson('published token deprecations', path);
  } catch (error) {
    if (error.cause?.code === 'ENOENT') return undefined;
    throw error;
  }
  if (canonicalJsonSha256(published) !== PUBLISHED_TOKEN_DEPRECATIONS_SHA256) {
    throw new Error('The published v0.6.0 token deprecations are immutable');
  }
  return published;
}

export async function readPublicApiDeclarations(
  directory,
  { baseline, except, readText = readFile } = {},
) {
  const absolute = resolve(directory);
  const entries = await readdir(absolute, { withFileTypes: true });
  const paths = entries
    .filter((entry) => entry.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      if (!entry.isFile()) throw new Error(`API declaration is not a regular file: ${entry.name}`);
      return resolve(absolute, entry.name);
    });
  return Promise.all(
    paths
      .filter((path) => path !== except)
      .map(async (path) => {
        const record = await readCanonicalJson('declaration', path, { readText });
        if (path !== resolve(absolute, 'pre-067.json')) return record;

        const { acceptedSnapshot, legacyDeclaration } = record;
        const archivalName = /^[a-z0-9][a-z0-9-]*\.json$/u;
        if (
          Object.keys(record).length !== 2 ||
          !/^[a-z0-9][a-z0-9-]*\.json\.gz$/u.test(acceptedSnapshot) ||
          !archivalName.test(legacyDeclaration)
        ) {
          throw new Error('Invalid pre-067 accepted public API record');
        }
        const [candidate, declaration] = await Promise.all([
          readCanonicalJson('accepted snapshot', resolve(absolute, 'accepted', acceptedSnapshot), {
            readText: async (absolutePath) =>
              gunzipSync(await readFile(absolutePath), {
                maxOutputLength: 16 * 1024 ** 2,
              }).toString('utf8'),
          }),
          readCanonicalJson('legacy declaration', resolve(absolute, 'archive', legacyDeclaration), {
            readText,
          }),
        ]);
        if (candidate.surfaceSha256 !== PRE_067_SURFACE_SHA256) {
          throw new Error('The accepted pre-067 public API surface is immutable');
        }
        // Materialize the legacy release's exact delta bindings from its
        // frozen snapshot; no fingerprint depends on the working candidate.
        return createAcceptedPublicApiDeclaration({ baseline, candidate, declaration });
      }),
  );
}

export async function checkPublicApi({
  arguments_,
  readText = readFile,
  evaluate = evaluatePublicApiChange,
}) {
  const options = parsePublicApiArguments(arguments_);
  const [baseline, candidate] = await Promise.all([
    optionalContract('baseline', options.get('--baseline'), readText),
    readPublicApiCandidate(options.get('--candidate'), { readText }),
  ]);
  if (options.has('--declarations')) {
    const directory = options.get('--declarations');
    const [declarations, publishedTokens] = await Promise.all([
      readPublicApiDeclarations(directory, { baseline, readText }),
      readPublishedTokenDeprecations(directory),
    ]);
    return evaluate({ baseline, candidate, declarations, publishedTokens });
  }
  const declaration = await optionalContract('declaration', options.get('--declaration'), readText);
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
