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
import { builtPackageOutputs } from '../release/stage-package.mjs';

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
// elements package ships the QR encoder, the embedded Stencil client runtime,
// and the Lucide icon modules, including assets derived from Feather.
test('the package notices include the third-party works shipped in each tarball', () => {
  const elementNotices = [
    'QR Code generator library (MIT)',
    '@stencil/core (MIT)',
    'Lucide 1.63.0 and Feather icons (ISC and MIT)',
  ];
  for (const name of ['@kimen/elements', '@kimen/adapter-mcp-apps']) {
    assert.deepEqual(PACKAGE_NOTICE_SECTIONS[name], elementNotices);
  }
  assert.deepEqual(PACKAGE_NOTICE_SECTIONS['@kimen/mcp-server'], [
    ...elementNotices,
    '@modelcontextprotocol/core (Apache-2.0)',
    '@modelcontextprotocol/server (Apache-2.0)',
    'zod (MIT)',
  ]);
  assert.deepEqual(PACKAGE_NOTICE_SECTIONS['@kimen/tokens'], ['onmars theme fonts (SIL OFL 1.1)']);
  // Compiled Kimen sources only: their dependencies are installed, not bundled.
  for (const name of ['@kimen/catalog', '@kimen/emitter', '@kimen/adapter-a2ui', '@kimen/vue']) {
    assert.deepEqual(PACKAGE_NOTICE_SECTIONS[name], []);
  }
  // React ships the output target's generated wrappers and compatible declarations.
  assert.deepEqual(PACKAGE_NOTICE_SECTIONS['@kimen/react'], ['@stencil/react-output-target (MIT)']);
  // The Angular bundle carries the helpers the Angular output target copies.
  assert.deepEqual(PACKAGE_NOTICE_SECTIONS['@kimen/angular'], [
    '@stencil/angular-output-target (MIT)',
  ]);
});

test('the wrapper builds use the runtime corresponding to their notices', async () => {
  const [reactSource, reactModule, reactDeclaration, vue, angular] = await Promise.all([
    read('packages/react/src/ki-button.ts'),
    read('packages/react/dist/ki-button.js'),
    read('packages/react/dist/ki-button.d.ts'),
    read('packages/vue/src/ki-button.ts'),
    read('packages/angular/src/directives/angular-component-lib/utils.ts'),
  ]);
  for (const wrapper of [reactSource, reactModule, reactDeclaration]) {
    assert.match(wrapper, /from '\.\/runtime\.js'/u);
  }
  assert.match(vue, /from '@stencil\/vue-output-target\/runtime'/u);
  const target = join(
    repositoryRoot,
    'packages/elements/node_modules/@stencil/angular-output-target/angular-component-lib/utils.ts',
  );
  assert.equal(angular, await readFile(target, 'utf8'), 'the Angular helpers are a verbatim copy');
});

for (const [title, licencePath] of [
  [
    '@stencil/angular-output-target (MIT)',
    'packages/elements/node_modules/@stencil/angular-output-target/LICENSE.md',
  ],
  [
    '@stencil/react-output-target (MIT)',
    'packages/elements/node_modules/@stencil/react-output-target/LICENSE.md',
  ],
]) {
  test(`the ${title} notice reproduces the licence the installed target ships with`, async () => {
    const [notice, licence] = await Promise.all([read('NOTICE'), read(licencePath)]);
    const section = noticeSections(notice).sections.get(title);
    assert.ok(section, `the repository NOTICE has no ${title} section`);
    const flattened = section.replaceAll(/\s+/gu, ' ');
    for (const paragraph of licence.split(/\n\s*\n/u)) {
      const expected = paragraph.replaceAll(/\s+/gu, ' ').trim();
      if (expected !== '') {
        assert.ok(flattened.includes(expected), `missing from the notice: ${expected}`);
      }
    }
  });
}

test('the Stencil notice reproduces the licence the installed runtime ships with', async () => {
  const [notice, stencilLicence] = await Promise.all([
    read('NOTICE'),
    read('packages/elements/node_modules/@stencil/core/LICENSE'),
  ]);
  const section = noticeSections(notice).sections.get('@stencil/core (MIT)');
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
  ['@kimen/catalog', 'packages/catalog'],
  ['@kimen/emitter', 'packages/emitter'],
  ['@kimen/adapter-a2ui', 'packages/adapter-a2ui'],
  ['@kimen/adapter-mcp-apps', 'packages/adapter-mcp-apps'],
  ['@kimen/mcp-server', 'packages/mcp-server'],
  ['@kimen/react', 'packages/react'],
  ['@kimen/vue', 'packages/vue'],
  ['@kimen/angular', 'packages/angular'],
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
  // lists it. A package published from its build output lists no files: the
  // candidate builder adds both to that output (scripts/release/stage-package.mjs).
  test(`${name} lists its NOTICE among the files it packs`, async () => {
    const manifest = JSON.parse(await read(`${directory}/package.json`));

    if (Object.hasOwn(builtPackageOutputs, name)) {
      assert.equal(manifest.files, undefined);
    } else {
      assert.equal(manifest.files.includes('NOTICE'), true);
    }
  });
}
