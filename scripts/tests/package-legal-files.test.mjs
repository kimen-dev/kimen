import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  derivePackageNotice,
  noticeSections,
  PACKAGE_NOTICE_SECTIONS,
} from '../lib/package-notices.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFile(join(repositoryRoot, path), 'utf8');

const RULE = '='.repeat(80);
const fixtureNotice = [
  'Kimen',
  'Copyright 2026 Example',
  '',
  'This product includes software developed as part of the Kimen project.',
  '',
  RULE,
  'Third-party notices: Alpha (MIT)',
  RULE,
  '',
  'Alpha body.',
  '',
  RULE,
  'Third-party notices: Beta (Apache License 2.0)',
  RULE,
  '',
  'Beta body.',
  '',
].join('\n');

test('reads the header and every titled section of a notice file', () => {
  const { header, sections } = noticeSections(fixtureNotice);

  assert.equal(
    header,
    'Kimen\nCopyright 2026 Example\n\nThis product includes software developed as part of the Kimen project.\n',
  );
  assert.deepEqual([...sections.keys()], ['Alpha (MIT)', 'Beta (Apache License 2.0)']);
  assert.equal(
    sections.get('Alpha (MIT)'),
    `${RULE}\nThird-party notices: Alpha (MIT)\n${RULE}\n\nAlpha body.\n`,
  );
});

test('a package notice is the header plus the sections that pertain to it, in the order asked', () => {
  assert.equal(
    derivePackageNotice(fixtureNotice, ['Beta (Apache License 2.0)', 'Alpha (MIT)']),
    [
      'Kimen',
      'Copyright 2026 Example',
      '',
      'This product includes software developed as part of the Kimen project.',
      '',
      RULE,
      'Third-party notices: Beta (Apache License 2.0)',
      RULE,
      '',
      'Beta body.',
      '',
      RULE,
      'Third-party notices: Alpha (MIT)',
      RULE,
      '',
      'Alpha body.',
      '',
    ].join('\n'),
  );
});

test('a package with no third-party material carries the header alone', () => {
  assert.equal(
    derivePackageNotice(fixtureNotice, []),
    'Kimen\nCopyright 2026 Example\n\nThis product includes software developed as part of the Kimen project.\n',
  );
});

test('asking for a section the repository notice does not have is an error, not an omission', () => {
  assert.throws(() => derivePackageNotice(fixtureNotice, ['Gamma (MIT)']), /Gamma \(MIT\)/u);
});

test('a notice file with two sections of the same title is rejected', () => {
  const duplicated = `${fixtureNotice}\n${RULE}\nThird-party notices: Alpha (MIT)\n${RULE}\n\nAgain.\n`;

  assert.throws(() => noticeSections(duplicated), /Alpha \(MIT\).*twice/iu);
});

// What a tarball must carry is decided by what is inside it. The packed
// elements bundles contain two third-party works under MIT, whose terms ask
// for the copyright and permission notice in every copy: the QR encoder
// adapted from Project Nayuki, and the Stencil client runtime the
// lazy-loading builds embed.
test('the package notices include the third-party works shipped in each tarball', () => {
  assert.deepEqual(PACKAGE_NOTICE_SECTIONS['@kimen/elements'], [
    'QR Code generator library (MIT)',
    'Stencil client runtime (MIT)',
  ]);
  assert.deepEqual(PACKAGE_NOTICE_SECTIONS['@kimen/tokens'], ['onmars theme fonts (SIL OFL 1.1)']);
});

test('the Stencil notice reproduces the licence the installed runtime ships with', async () => {
  const [notice, stencilLicence] = await Promise.all([
    read('NOTICE'),
    read('packages/elements/node_modules/@stencil/core/LICENSE'),
  ]);
  const section = noticeSections(notice).sections.get('Stencil client runtime (MIT)');
  assert.ok(section, 'the repository NOTICE has no Stencil client runtime section');
  const flattened = section.replaceAll(/\s+/gu, ' ');
  const upstream = stencilLicence.split('-----')[0];

  for (const paragraph of upstream.split(/\n\s*\n/u)) {
    const expected = paragraph.replaceAll(/\s+/gu, ' ').trim();
    if (expected !== '') {
      assert.ok(flattened.includes(expected), `missing from the Stencil notice: ${expected}`);
    }
  }
});

for (const [name, directory] of [
  ['@kimen/elements', 'packages/elements'],
  ['@kimen/tokens', 'packages/tokens'],
]) {
  test(`${name} carries the repository licence byte for byte`, async () => {
    const [rootLicence, packageLicence] = await Promise.all([
      readFile(join(repositoryRoot, 'LICENSE')),
      readFile(join(repositoryRoot, directory, 'LICENSE')),
    ]);

    assert.equal(packageLicence.equals(rootLicence), true);
  });

  test(`${name} carries exactly the notices derived from the repository NOTICE`, async () => {
    const [rootNotice, packageNotice] = await Promise.all([
      read('NOTICE'),
      read(`${directory}/NOTICE`),
    ]);

    assert.equal(
      packageNotice,
      derivePackageNotice(rootNotice, PACKAGE_NOTICE_SECTIONS[name]),
      'run `node scripts/release/write-package-legal-files.mjs` after editing NOTICE',
    );
  });

  // npm always packs a LICENSE file; a NOTICE only travels when the manifest
  // lists it.
  test(`${name} lists its NOTICE among the files it packs`, async () => {
    const manifest = JSON.parse(await read(`${directory}/package.json`));

    assert.equal(manifest.files.includes('NOTICE'), true);
  });
}
