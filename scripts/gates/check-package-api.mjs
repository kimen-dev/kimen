#!/usr/bin/env node
// Gate: an exported name or signature of a generative package changes only
// together with its committed snapshot under changes/api/packages/. It reads
// each package's built declarations, so it runs after `build`. After a
// deliberate change, `pnpm api:snapshot` (--write) rewrites the snapshots.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { canonicalJson } from '../lib/canonical-json.mjs';
import {
  buildPackageApiSnapshot,
  describeSnapshotChanges,
  GENERATIVE_PACKAGES,
} from '../lib/package-api-snapshot.mjs';

const WRITE_COMMAND = 'pnpm api:snapshot';

async function readCommitted(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function checkPackageApi({ root, packages = GENERATIVE_PACKAGES, write = false }) {
  const problems = [];
  for (const { name, directory, snapshot: snapshotPath, dataExports } of packages) {
    const packageRoot = join(root, directory);
    const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    const snapshot = buildPackageApiSnapshot({ name, packageRoot, packageJson, dataExports });
    const expected = canonicalJson(snapshot);
    const path = join(root, snapshotPath);
    if (write) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, expected, 'utf8');
      continue;
    }
    const committed = await readCommitted(path);
    if (committed === null) {
      problems.push(
        `${name}: no committed snapshot at ${snapshotPath}; run \`${WRITE_COMMAND}\` and commit it`,
      );
    } else if (committed !== expected) {
      const changes = describeSnapshotChanges(JSON.parse(committed), snapshot);
      problems.push(
        `${name}: the public API changed (${changes.join('; ') || 'the snapshot bytes differ'}) but ${snapshotPath} did not; review the change, run \`${WRITE_COMMAND}\` and commit the snapshot with it`,
      );
    }
  }
  return { problems };
}

async function main(arguments_) {
  const unknown = arguments_.filter((argument) => argument !== '--write');
  if (unknown.length > 0) {
    throw new Error(`unknown argument ${unknown[0]}; usage: check-package-api.mjs [--write]`);
  }
  const write = arguments_.includes('--write');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const { problems } = await checkPackageApi({ root, write });
  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`BLOCKED package-api: ${problem}\n`);
    process.exitCode = 1;
    return;
  }
  const verb = write ? 'wrote' : 'PASS';
  process.stdout.write(`${verb} package-api: ${String(GENERATIVE_PACKAGES.length)} packages\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`check-package-api: ${error.message}\n`);
    process.exitCode = 1;
  });
}
