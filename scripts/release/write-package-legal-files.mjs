#!/usr/bin/env node
// Writes the LICENSE and NOTICE each published package carries from the
// repository's own. Run it after editing the root LICENSE or NOTICE;
// scripts/tests/package-legal-files.test.mjs fails until the result is
// committed, so the copies cannot drift from their source.
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { derivePackageNotice, PACKAGE_NOTICE_SECTIONS } from '../lib/package-notices.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const PACKAGE_DIRECTORIES = Object.freeze({
  '@kimen/elements': 'packages/elements',
  '@kimen/tokens': 'packages/tokens',
});

const repositoryNotice = await readFile(join(repositoryRoot, 'NOTICE'), 'utf8');
for (const [name, directory] of Object.entries(PACKAGE_DIRECTORIES)) {
  await copyFile(join(repositoryRoot, 'LICENSE'), join(repositoryRoot, directory, 'LICENSE'));
  await writeFile(
    join(repositoryRoot, directory, 'NOTICE'),
    derivePackageNotice(repositoryNotice, PACKAGE_NOTICE_SECTIONS[name]),
    'utf8',
  );
  process.stdout.write(`${name}: wrote ${directory}/LICENSE and ${directory}/NOTICE\n`);
}
