#!/usr/bin/env node
// Writes the LICENSE and NOTICE each published package carries from the
// repository's own. Run it after editing the root LICENSE or NOTICE;
// scripts/tests/package-legal-files.test.mjs fails until the result is
// committed, so the copies cannot drift from their source.
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { derivePackageNotice, PACKAGE_NOTICE_SECTIONS } from '../lib/package-notices.mjs';

export const PACKAGE_DIRECTORIES = Object.freeze({
  '@kimen/elements': 'packages/elements',
  '@kimen/tokens': 'packages/tokens',
});

export async function writePackageLegalFiles({ repositoryRoot }) {
  const root = resolve(repositoryRoot);
  const repositoryNotice = await readFile(join(root, 'NOTICE'), 'utf8');
  const written = [];
  for (const [name, directory] of Object.entries(PACKAGE_DIRECTORIES)) {
    // Derive first: a notice that cannot be derived must leave the package
    // untouched instead of half-written.
    const notice = derivePackageNotice(repositoryNotice, PACKAGE_NOTICE_SECTIONS[name]);
    await copyFile(join(root, 'LICENSE'), join(root, directory, 'LICENSE'));
    await writeFile(join(root, directory, 'NOTICE'), notice, 'utf8');
    written.push({ name, directory });
  }
  return written;
}

async function main() {
  const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
  for (const { name, directory } of await writePackageLegalFiles({ repositoryRoot })) {
    process.stdout.write(`${name}: wrote ${directory}/LICENSE and ${directory}/NOTICE\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`package legal files: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
