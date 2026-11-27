import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { it, onTestFinished } from 'vitest';

import {
  derivePackageNotice,
  noticeSections,
  PACKAGE_NOTICE_SECTIONS,
} from '../lib/package-notices.mjs';
import {
  PACKAGE_DIRECTORIES,
  writePackageLegalFiles,
} from '../release/write-package-legal-files.mjs';

// The daily mutation run executes this directory only, so the cases of
// scripts/tests/package-legal-files.test.mjs that exercise the derivation are
// repeated here on the runner it uses, followed by the ones that pin details
// a mutant can change without breaking those.

const RULE = '='.repeat(80);
const bundleNotices = [
  'QR Code generator library (MIT)',
  '@stencil/core (MIT)',
  'Lucide 1.63.0 and Feather icons (ISC and MIT)',
];
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

it('reads the header and every titled section of a notice file', () => {
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

it('a package notice is the header plus the sections that pertain to it, in the order asked', () => {
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

it('a package with no third-party material carries the header alone', () => {
  assert.equal(
    derivePackageNotice(fixtureNotice, []),
    'Kimen\nCopyright 2026 Example\n\nThis product includes software developed as part of the Kimen project.\n',
  );
});

it('asking for a section the repository notice does not have is an error, not an omission', () => {
  assert.throws(() => derivePackageNotice(fixtureNotice, ['Gamma (MIT)']), /Gamma \(MIT\)/u);
});

it('a notice file with two sections of the same title is rejected', () => {
  const duplicated = `${fixtureNotice}\n${RULE}\nThird-party notices: Alpha (MIT)\n${RULE}\n\nAgain.\n`;

  assert.throws(() => noticeSections(duplicated), /Alpha \(MIT\).*twice/iu);
});

const mcpNotices = [
  '@csstools/css-tokenizer (MIT)',
  '@modelcontextprotocol/core (Apache-2.0)',
  '@modelcontextprotocol/server (Apache-2.0)',
  'zod (MIT)',
];

it('names exactly the sections each published package answers for', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(PACKAGE_NOTICE_SECTIONS).map(([name, titles]) => [name, [...titles]]),
    ),
    {
      '@kimen/elements': bundleNotices,
      '@kimen/tokens': ['onmars theme fonts (SIL OFL 1.1)'],
      '@kimen/catalog': [],
      '@kimen/emitter': [],
      '@kimen/adapter-a2ui': [],
      '@kimen/adapter-mcp-apps': bundleNotices,
      '@kimen/mcp-server': [...bundleNotices, ...mcpNotices],
      '@kimen/react': ['@stencil/react-output-target (MIT)'],
      '@kimen/vue': [],
      '@kimen/angular': ['@stencil/angular-output-target (MIT)'],
    },
  );
  assert.equal(Object.isFrozen(PACKAGE_NOTICE_SECTIONS), true);
  for (const titles of Object.values(PACKAGE_NOTICE_SECTIONS)) {
    assert.equal(Object.isFrozen(titles), true);
  }
});

it('a notice with no titled section is all header', () => {
  const { header, sections } = noticeSections('Kimen\nCopyright 2026 Example\n\n\n');

  assert.equal(header, 'Kimen\nCopyright 2026 Example\n');
  assert.equal(sections.size, 0);
  assert.equal(derivePackageNotice('Kimen\n', []), 'Kimen\n');
});

it('a section starts only at a full rule, a title line and a full rule', () => {
  const short = '='.repeat(79);
  const text = [
    'Header',
    '',
    short,
    'Third-party notices: Too short a rule',
    short,
    '',
    RULE,
    'Notices: wrong label',
    RULE,
    '',
    `  ${RULE}`,
    'Third-party notices: Indented rule',
    RULE,
    '',
    RULE,
    'Third-party notices: Real (MIT)',
    RULE,
    '',
    'Real body.',
    '',
  ].join('\n');

  const { header, sections } = noticeSections(text);

  assert.deepEqual([...sections.keys()], ['Real (MIT)']);
  assert.equal(header.endsWith('Third-party notices: Indented rule\n' + RULE + '\n'), true);
  assert.equal(
    sections.get('Real (MIT)'),
    `${RULE}\nThird-party notices: Real (MIT)\n${RULE}\n\nReal body.\n`,
  );
});

it('each part ends with one newline and parts are separated by one blank line', () => {
  const padded = `Header\n\n\n\n${RULE}\nThird-party notices: Alpha (MIT)\n${RULE}\n\nAlpha body.\n\n\n\n${RULE}\nThird-party notices: Beta (MIT)\n${RULE}\n\nBeta body.`;

  assert.equal(
    derivePackageNotice(padded, ['Alpha (MIT)', 'Beta (MIT)']),
    `Header\n\n${RULE}\nThird-party notices: Alpha (MIT)\n${RULE}\n\nAlpha body.\n\n${RULE}\nThird-party notices: Beta (MIT)\n${RULE}\n\nBeta body.\n`,
  );
});

it('says which section is missing and which one is declared twice', () => {
  assert.throws(
    () => derivePackageNotice(fixtureNotice, ['Gamma (MIT)']),
    (error) =>
      error instanceof Error &&
      error.message === 'NOTICE has no "Third-party notices: Gamma (MIT)" section to derive from',
  );
  assert.throws(
    () =>
      noticeSections(
        `${fixtureNotice}\n${RULE}\nThird-party notices: Alpha (MIT)\n${RULE}\n\nAgain.\n`,
      ),
    (error) =>
      error instanceof Error && error.message === 'NOTICE declares the section "Alpha (MIT)" twice',
  );
});

const repositoryNotice = [
  'Kimen',
  'Copyright 2026 Example',
  '',
  RULE,
  'Third-party notices: Unrelated tooling (MIT)',
  RULE,
  '',
  'Not shipped in any package.',
  '',
  RULE,
  'Third-party notices: QR Code generator library (MIT)',
  RULE,
  '',
  'QR body.',
  '',
  RULE,
  'Third-party notices: @stencil/core (MIT)',
  RULE,
  '',
  'Stencil body.',
  '',
  RULE,
  'Third-party notices: Lucide 1.63.0 and Feather icons (ISC and MIT)',
  RULE,
  '',
  'Icon body.',
  '',
  RULE,
  'Third-party notices: onmars theme fonts (SIL OFL 1.1)',
  RULE,
  '',
  'Fonts body.',
  '',
  ...mcpNotices.flatMap((title) => [RULE, `Third-party notices: ${title}`, RULE, '', title, '']),
  RULE,
  'Third-party notices: @stencil/angular-output-target (MIT)',
  RULE,
  '',
  'Angular helpers body.',
  '',
  RULE,
  'Third-party notices: @stencil/react-output-target (MIT)',
  RULE,
  '',
  'React runtime body.',
  '',
].join('\n');

async function repositoryFixture(notice) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-package-legal-files-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  await Promise.all(
    Object.values(PACKAGE_DIRECTORIES).map((directory) =>
      mkdir(join(root, directory), { recursive: true }),
    ),
  );
  await writeFile(join(root, 'LICENSE'), 'Apache License\nVersion 2.0 (fixture)\n', 'utf8');
  await writeFile(join(root, 'NOTICE'), notice, 'utf8');
  return root;
}

it('writes a byte copy of the licence and the derived notice into each published package', async () => {
  assert.deepEqual(
    { ...PACKAGE_DIRECTORIES },
    {
      '@kimen/elements': 'packages/elements',
      '@kimen/tokens': 'packages/tokens',
      '@kimen/catalog': 'packages/catalog',
      '@kimen/emitter': 'packages/emitter',
      '@kimen/adapter-a2ui': 'packages/adapter-a2ui',
      '@kimen/adapter-mcp-apps': 'packages/adapter-mcp-apps',
      '@kimen/mcp-server': 'packages/mcp-server',
      '@kimen/react': 'packages/react',
      '@kimen/vue': 'packages/vue',
      '@kimen/angular': 'packages/angular',
    },
  );
  assert.equal(Object.isFrozen(PACKAGE_DIRECTORIES), true);
  const root = await repositoryFixture(repositoryNotice);

  const written = await writePackageLegalFiles({ repositoryRoot: root });

  assert.deepEqual(written, [
    { name: '@kimen/elements', directory: 'packages/elements' },
    { name: '@kimen/tokens', directory: 'packages/tokens' },
    { name: '@kimen/catalog', directory: 'packages/catalog' },
    { name: '@kimen/emitter', directory: 'packages/emitter' },
    { name: '@kimen/adapter-a2ui', directory: 'packages/adapter-a2ui' },
    { name: '@kimen/adapter-mcp-apps', directory: 'packages/adapter-mcp-apps' },
    { name: '@kimen/mcp-server', directory: 'packages/mcp-server' },
    { name: '@kimen/react', directory: 'packages/react' },
    { name: '@kimen/vue', directory: 'packages/vue' },
    { name: '@kimen/angular', directory: 'packages/angular' },
  ]);
  for (const directory of Object.values(PACKAGE_DIRECTORIES)) {
    assert.equal(
      await readFile(join(root, directory, 'LICENSE'), 'utf8'),
      'Apache License\nVersion 2.0 (fixture)\n',
    );
  }
  const elementNotice = `Kimen\nCopyright 2026 Example\n\n${RULE}\nThird-party notices: QR Code generator library (MIT)\n${RULE}\n\nQR body.\n\n${RULE}\nThird-party notices: @stencil/core (MIT)\n${RULE}\n\nStencil body.\n\n${RULE}\nThird-party notices: Lucide 1.63.0 and Feather icons (ISC and MIT)\n${RULE}\n\nIcon body.\n`;
  for (const directory of ['packages/elements', 'packages/adapter-mcp-apps']) {
    assert.equal(await readFile(join(root, directory, 'NOTICE'), 'utf8'), elementNotice);
  }
  assert.equal(
    await readFile(join(root, 'packages/mcp-server/NOTICE'), 'utf8'),
    elementNotice +
      mcpNotices
        .map((title) => `\n${RULE}\nThird-party notices: ${title}\n${RULE}\n\n${title}\n`)
        .join(''),
  );
  assert.equal(
    await readFile(join(root, 'packages/tokens/NOTICE'), 'utf8'),
    `Kimen\nCopyright 2026 Example\n\n${RULE}\nThird-party notices: onmars theme fonts (SIL OFL 1.1)\n${RULE}\n\nFonts body.\n`,
  );
  for (const directory of [
    'packages/catalog',
    'packages/emitter',
    'packages/adapter-a2ui',
    'packages/vue',
  ]) {
    assert.equal(
      await readFile(join(root, directory, 'NOTICE'), 'utf8'),
      'Kimen\nCopyright 2026 Example\n',
    );
  }
  assert.equal(
    await readFile(join(root, 'packages/angular/NOTICE'), 'utf8'),
    `Kimen\nCopyright 2026 Example\n\n${RULE}\nThird-party notices: @stencil/angular-output-target (MIT)\n${RULE}\n\nAngular helpers body.\n`,
  );
  assert.equal(
    await readFile(join(root, 'packages/react/NOTICE'), 'utf8'),
    `Kimen\nCopyright 2026 Example\n\n${RULE}\nThird-party notices: @stencil/react-output-target (MIT)\n${RULE}\n\nReact runtime body.\n`,
  );
});

it('leaves a package untouched when its notice cannot be derived', async () => {
  const root = await repositoryFixture('Kimen\n');

  await assert.rejects(
    writePackageLegalFiles({ repositoryRoot: root }),
    /QR Code generator library \(MIT\)/u,
  );
  await assert.rejects(readFile(join(root, 'packages/elements/LICENSE'), 'utf8'), /ENOENT/u);
  await assert.rejects(readFile(join(root, 'packages/elements/NOTICE'), 'utf8'), /ENOENT/u);
});
