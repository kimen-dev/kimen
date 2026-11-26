// @spec:017-agent-surfaces
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildGenUiDocuments,
  buildLlmsDocuments,
  buildLlmsIndex,
  buildLlmsTxt,
  LLMS_INDEX_MAX_BYTES,
  normalizeDocs,
  serializeJson,
} from './agent-surfaces.mjs';
import { runBuildSurfaces } from './build-surfaces.mjs';

const packageRoot = new URL('..', import.meta.url);
const workspaceRoot = new URL('../../..', import.meta.url);
const siteOrigin = 'https://kimen.dev/';

interface DocsTag {
  name: string;
  text: string;
}

interface ComponentDocs {
  tag: string;
  docs: string;
  docsTags: DocsTag[];
  usage?: Record<string, string>;
  props?: Record<string, unknown>[];
  methods?: unknown[];
  events?: unknown[];
  slots?: { name: string; docs: string }[];
  parts?: { name: string; docs: string }[];
  styles?: unknown[];
}

interface Docs {
  components: ComponentDocs[];
}

interface PackageJson {
  name: string;
  description: string;
  customElements?: string;
  files?: string[];
}

interface IndexLink {
  section: string;
  name: string;
  url: string;
  note: string;
}

const readJson = async (url: URL): Promise<unknown> => JSON.parse(await readFile(url, 'utf8'));
const readDocs = async (): Promise<Docs> =>
  normalizeDocs(await readJson(new URL('./generated/docs.json', packageRoot))) as Docs;
const readPackage = async (): Promise<PackageJson> =>
  (await readJson(new URL('./package.json', packageRoot))) as PackageJson;
const readPreamble = (): Promise<string> =>
  readFile(new URL('./scripts/llms-preamble.txt', packageRoot), 'utf8');

const guidanceOf = (component: ComponentDocs, name: string): string => {
  const text = component.docsTags.find((tag) => tag.name === name)?.text;
  if (text === undefined) {
    throw new Error(`${component.tag} declares no @${name}`);
  }
  return text;
};
const oneLine = (text: string): string => text.replace(/\s*\n\s*/gu, ' ').trim();

// Lines outside fenced code: a `#` inside an example is content, not structure.
const proseLines = (text: string): string[] => {
  const lines: string[] = [];
  let fenced = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) {
      fenced = !fenced;
    } else if (!fenced) {
      lines.push(line);
    }
  }
  return lines;
};

const LINK_ENTRY = /^- \[([^\]]+)\]\(([^)\s]+)\)(?:: (.+))?$/u;

// Every "file list" entry of an llms.txt index, with the H2 it sits under.
const indexLinks = (index: string): IndexLink[] => {
  const links: IndexLink[] = [];
  let section = '';
  for (const line of proseLines(index)) {
    if (line.startsWith('## ')) {
      section = line.slice(3);
      continue;
    }
    const match = LINK_ENTRY.exec(line);
    if (section !== '' && match !== null) {
      links.push({ section, name: match[1] ?? '', url: match[2] ?? '', note: match[3] ?? '' });
    }
  }
  return links;
};

const documentNamed = (documents: [string, string][], file: string): string => {
  const found = documents.find(([name]) => name === file);
  if (found === undefined) {
    throw new Error(`no generated document named ${file}`);
  }
  return found[1];
};

const aComponent = (overrides: Partial<ComponentDocs> = {}): ComponentDocs => ({
  tag: 'ki-demo',
  docs: 'A demo element.',
  docsTags: [
    { name: 'whenToUse', text: 'show a demo.' },
    { name: 'whenNotToUse', text: 'production pages.' },
  ],
  props: [],
  methods: [],
  events: [],
  slots: [],
  parts: [],
  styles: [],
  ...overrides,
});

const fixturePackage: PackageJson = {
  name: '@kimen/elements',
  description: 'Fixture elements.',
  customElements: 'generated/custom-elements.json',
};

const fixturePreamble = [
  'Install with `pnpm add @kimen/elements @kimen/tokens`.',
  '',
  '```ts',
  '## not a heading: fenced code is content',
  '```',
  '',
  '## Theming',
  '',
  'Themes reassign custom properties. Load one stylesheet per theme.',
  '',
  '```html',
  '<html data-ki-theme="material3">',
  '```',
  '',
].join('\n');

const genUiFixture = {
  intro: ['GenUI layer intro prose.'],
  packages: [
    {
      directory: 'packages/catalog',
      whenToUse: 'Guard agent-emitted UI at the GenUI boundary. Validate before rendering.',
      whenNotToUse: 'Hand-authored pages that never render agent output.',
      entryPoints: [
        {
          name: 'validateUiSpec',
          signature: 'validateUiSpec(input, options?) => ValidationReport',
          summary: 'Accepts or rejects an agent-emitted UI spec.',
        },
        { name: 'catalogData', summary: 'The generated catalog document.' },
      ],
    },
  ],
};

const genUiPackagesFixture = [
  {
    directory: 'packages/catalog',
    packageJson: { name: '@kimen/catalog', description: 'Neutral catalog fixture.' },
    indexSource: "export { validateUiSpec } from './validate.js';\n",
  },
];

const readWorkspaceGenUi = async () => {
  const genUi = (await readJson(
    new URL('docs/genui-surfaces.json', workspaceRoot),
  )) as typeof genUiFixture;
  const packages = await Promise.all(
    genUi.packages.map(async (entry) => ({
      directory: entry.directory,
      packageJson: (await readJson(new URL(`${entry.directory}/package.json`, workspaceRoot))) as {
        name: string;
        description: string;
      },
      indexSource: await readFile(
        new URL(`${entry.directory}/src/index.ts`, workspaceRoot),
        'utf8',
      ),
    })),
  );
  return { genUi, packages };
};

// Runs the real orchestrator with every output redirected into a scratch
// directory, the way the build runs it against the package.
const generateInto = async (directory: string, docs: Docs, preamble = fixturePreamble) => {
  const paths = {
    docsPath: join(directory, 'docs.json'),
    packageJsonPath: join(directory, 'package.json'),
    preamblePath: join(directory, 'preamble.txt'),
    manifestPath: join(directory, 'custom-elements.json'),
    publicApiPath: join(directory, 'public-api.json'),
    packageLlmsPath: join(directory, 'package/llms.txt'),
    rootLlmsPath: join(directory, 'root/llms.txt'),
  };
  await Promise.all([
    writeFile(paths.docsPath, serializeJson(docs)),
    writeFile(paths.packageJsonPath, serializeJson(fixturePackage)),
    writeFile(paths.preamblePath, preamble),
  ]);
  const result = await runBuildSurfaces({
    ...paths,
    packageRoot: directory,
    manifestInputs: {
      packageExports: { './ki-*': { import: './dist/components/ki-*.js' } },
      cssPropertiesByTag: {},
    },
    publicApi: { schemaVersion: 1, surface: {}, surfaceSha256: 'fixture' },
  });
  return { paths, result };
};

describe('language-model index and documents', () => {
  it('S8 the index follows the llms.txt layout: one H1, a summary, heading-free guidance, then H2 link lists', async () => {
    const [docs, pkg, preamble] = await Promise.all([readDocs(), readPackage(), readPreamble()]);
    const index = buildLlmsIndex(docs, pkg, preamble, { manifestHref: pkg.customElements });
    const lines = proseLines(index);
    const firstSection = lines.findIndex((line) => line.startsWith('## '));

    expect(lines[0]).toBe(`# ${pkg.name} — Kimen web components`);
    expect(lines[2]).toBe(`> ${pkg.description}`);
    // llmstxt.org: the body between the summary and the first H2 holds
    // "markdown sections … of any type except headings".
    expect(lines.slice(1, firstSection).filter((line) => line.startsWith('#'))).toEqual([]);
    expect(lines.filter((line) => /^#{3,} /u.test(line))).toEqual([]);
    // …and every H2 section is a "file list": nothing but link entries.
    expect(
      lines.slice(firstSection).filter((line) => line !== '' && !line.startsWith('## ')),
    ).toSatisfy((entries: string[]) => entries.every((entry) => LINK_ENTRY.test(entry)));
    expect(lines.filter((line) => line.startsWith('## '))).toEqual([
      '## Components',
      '## Guides',
      '## Optional',
    ]);
    expect(index.endsWith('\n')).toBe(true);
    expect(index.endsWith('\n\n')).toBe(false);
  });

  it('S8 the index tells how to install and load the library and leaves the contracts to the documents', async () => {
    const [docs, pkg, preamble] = await Promise.all([readDocs(), readPackage(), readPreamble()]);
    const index = buildLlmsIndex(docs, pkg, preamble, { manifestHref: pkg.customElements });

    expect(index).toContain('Install with `pnpm add @kimen/elements @kimen/tokens`.');
    expect(index).toContain(
      "import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';",
    );
    expect(index).toContain("import '@kimen/tokens/css';");
    expect(index).not.toContain('Attributes:');
    expect(index).not.toContain('--ki-button-');
    expect(index).not.toContain('When NOT to use');
    expect(index).not.toContain(guidanceOf(docs.components[0] as ComponentDocs, 'whenNotToUse'));
  });

  it('S8 the index links every published component beside the first sentence of its when-to-use guidance', async () => {
    const [docs, pkg, preamble] = await Promise.all([readDocs(), readPackage(), readPreamble()]);
    const index = buildLlmsIndex(docs, pkg, preamble, { manifestHref: pkg.customElements });
    const components = indexLinks(index).filter((link) => link.section === 'Components');

    expect(components.map((link) => link.name)).toEqual(docs.components.map(({ tag }) => tag));
    expect(components.map((link) => link.url)).toEqual(
      docs.components.map(({ tag }) => `llms/${tag}.md`),
    );
    for (const [position, component] of docs.components.entries()) {
      const note = components[position]?.note ?? '';
      const whenToUse = oneLine(guidanceOf(component, 'whenToUse'));
      // A verbatim prefix that stops at a sentence end: never a rewrite.
      expect(whenToUse.startsWith(note)).toBe(true);
      expect(note.endsWith('.')).toBe(true);
      expect(whenToUse.slice(note.length)).toMatch(/^$|^\s+[A-Z]/u);
    }
    expect(components.find((link) => link.name === 'ki-button')?.note).toBe(
      'trigger the single main action of a view, supporting actions in descending hierarchy, confirming/destructive actions through tone, persistent actions such as Bold with `toggle`, or with `href` a call to action that navigates.',
    );
  });

  it('S8 an index note ends at the first sentence and never inside an abbreviation', () => {
    const docs: Docs = {
      components: [
        aComponent({
          tag: 'ki-abbreviated',
          docsTags: [
            { name: 'whenToUse', text: 'group items, e.g. Contacts\nor files. Never alone.' },
            { name: 'whenNotToUse', text: 'tables.' },
          ],
        }),
        aComponent({
          tag: 'ki-terse',
          docsTags: [
            { name: 'whenToUse', text: 'one sentence without a final period' },
            { name: 'whenNotToUse', text: 'anything else.' },
          ],
        }),
      ],
    };

    expect(
      indexLinks(buildLlmsIndex(docs, fixturePackage, fixturePreamble)).filter(
        (link) => link.section === 'Components',
      ),
    ).toEqual([
      {
        section: 'Components',
        name: 'ki-abbreviated',
        url: 'llms/ki-abbreviated.md',
        note: 'group items, e.g. Contacts or files.',
      },
      {
        section: 'Components',
        name: 'ki-terse',
        url: 'llms/ki-terse.md',
        note: 'one sentence without a final period',
      },
    ]);
  });

  it('S8 both committed indexes stay within the declared size budget', async () => {
    const indexes = await Promise.all(
      [new URL('./llms.txt', packageRoot), new URL('llms.txt', workspaceRoot)].map((url) =>
        readFile(url),
      ),
    );

    // About six thousand tokens at four bytes each: an agent can always
    // afford to read the index before it has chosen anything.
    expect(LLMS_INDEX_MAX_BYTES).toBe(24_576);
    for (const index of indexes) {
      expect(index.byteLength).toBeLessThanOrEqual(LLMS_INDEX_MAX_BYTES);
      expect(indexLinks(index.toString('utf8')).length).toBeGreaterThan(0);
    }
  });

  it('S9 the ki-indicator document carries its guidance verbatim with every facet and its examples', async () => {
    const docs = await readDocs();
    const indicator = docs.components.find(({ tag }) => tag === 'ki-indicator');
    if (indicator === undefined) throw new Error('docs.json must describe ki-indicator');
    const document = documentNamed(buildLlmsDocuments(docs, ''), 'ki-indicator.md');

    expect(document.startsWith(`# ki-indicator\n\n> ${oneLine(indicator.docs)}\n`)).toBe(true);
    expect(document).toContain(`## When to use\n\n${guidanceOf(indicator, 'whenToUse')}\n`);
    expect(document).toContain(`## When not to use\n\n${guidanceOf(indicator, 'whenNotToUse')}\n`);
    expect(document).toContain(`## Examples\n\n${(indicator.usage?.['examples'] ?? '').trim()}\n`);
    expect(proseLines(document).filter((line) => line.startsWith('#'))).toEqual([
      '# ki-indicator',
      '## When to use',
      '## When not to use',
      '## Examples',
      '## Token stylesheets',
      '## Attributes',
      '## Slots',
      '## Parts',
      '## Events',
      '## Methods',
      '## CSS custom properties',
    ]);
    expect(document).toContain('## Parts\n\n- `');
    expect(document.endsWith('\n')).toBe(true);
    expect(document.endsWith('\n\n')).toBe(false);
  });

  it('S9 the document marks each attribute the contract declares required, numerically bounded or a URL', async () => {
    const docs = await readDocs();
    const documents = buildLlmsDocuments(docs, '');
    const indicator = documentNamed(documents, 'ki-indicator.md');

    expect(indicator).toContain('- `label` (string, required): ');
    expect(indicator).toContain('- `count` (number | undefined, minimum 0, maximum 20): ');
    expect(indicator).toContain('- `current` (number | undefined, minimum 1, maximum 20): ');
    expect(documentNamed(documents, 'ki-avatar.md')).toContain(
      '- `src` (string | undefined, URL): ',
    );
    expect(documentNamed(documents, 'ki-button.md')).toContain(
      '- `href` (string | undefined, URL): ',
    );
    // Nothing is marked that the contract does not declare.
    expect(documentNamed(documents, 'ki-switch.md')).not.toMatch(
      /^- `[^`]+` \([^)]*(?:required|minimum|maximum|URL)[^)]*\): /mu,
    );
    // The complete summary renders attributes through the same lines.
    const full = buildLlmsTxt(docs, await readPackage(), '');
    expect(full).toContain('- `count` (number | undefined, minimum 0, maximum 20): ');
    expect(full).toContain('- `label` (string, required): ');
  });

  it('S9 a document states a facet with no entries instead of omitting it, and lists the styling tokens it is given', () => {
    const docs: Docs = { components: [aComponent()] };
    const document = documentNamed(
      buildLlmsDocuments(docs, '', {
        cssPropertiesByTag: {
          'ki-demo': [{ name: '--ki-demo-color', description: 'Demo color.' }],
        },
      }),
      'ki-demo.md',
    );

    expect(document).toBe(
      [
        '# ki-demo',
        '',
        '> A demo element.',
        '',
        '## When to use',
        '',
        'show a demo.',
        '',
        '## When not to use',
        '',
        'production pages.',
        '',
        '## Token stylesheets',
        '',
        '- `@kimen/tokens/css`: every token, once per page. The default.',
        '- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-demo`: the light option, only the tokens ki-demo needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.',
        '',
        '## Attributes',
        '',
        'None.',
        '',
        '## Slots',
        '',
        'None.',
        '',
        '## Parts',
        '',
        'None.',
        '',
        '## Events',
        '',
        'None.',
        '',
        '## Methods',
        '',
        'None.',
        '',
        '## CSS custom properties',
        '',
        '- `--ki-demo-color`: Demo color.',
        '',
      ].join('\n'),
    );
  });

  it('S9 generation writes one document per published component and removes the document of a component that no longer exists', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kimen-llms-documents-'));
    try {
      const docs: Docs = {
        components: [aComponent({ tag: 'ki-first' }), aComponent({ tag: 'ki-second' })],
      };
      await mkdir(join(directory, 'package/llms'), { recursive: true });
      await writeFile(join(directory, 'package/llms/ki-removed.md'), '# ki-removed\n');

      const { result } = await generateInto(directory, docs);

      expect(result.ok).toBe(true);
      expect((await readdir(join(directory, 'package/llms'))).sort()).toEqual([
        'ki-first.md',
        'ki-second.md',
        'theming.md',
      ]);
      expect(await readFile(join(directory, 'package/llms/ki-second.md'), 'utf8')).toMatch(
        /^# ki-second\n/u,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('S10 llms-full.txt carries the installation guidance and the complete entry of every component in one file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kimen-llms-full-'));
    try {
      const docs: Docs = {
        components: [aComponent({ tag: 'ki-first' }), aComponent({ tag: 'ki-second' })],
      };
      const { result } = await generateInto(directory, docs);
      const elementsFull = buildLlmsTxt(docs, fixturePackage, fixturePreamble, {});
      const rootFull = await readFile(join(directory, 'root/llms-full.txt'), 'utf8');

      expect(result.ok).toBe(true);
      expect(rootFull).toContain('Install with `pnpm add @kimen/elements @kimen/tokens`.');
      expect(rootFull).toContain('## Theming');
      expect(rootFull).toContain('### ki-first\n\nA demo element.\n\nWhen to use: show a demo.');
      expect(rootFull).toContain('### ki-second');
      // The elements summary, then the GenUI layer.
      expect(rootFull.startsWith(elementsFull)).toBe(true);
      expect(rootFull).toContain('## GenUI layer');
      expect(elementsFull).not.toContain('## GenUI layer');
      // The package ships the documents its index links, not this summary.
      await expect(readFile(join(directory, 'package/llms-full.txt'), 'utf8')).rejects.toThrow(
        /ENOENT/u,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('S10 the complete summary covers every published component', async () => {
    const [docs, rootFull] = await Promise.all([
      readDocs(),
      readFile(new URL('llms-full.txt', workspaceRoot), 'utf8'),
    ]);

    for (const { tag } of docs.components) {
      expect(rootFull).toContain(`\n### ${tag}\n`);
    }
  });

  it('S11 every link of the packaged index is a relative path to a file the generation writes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kimen-llms-links-'));
    try {
      const docs: Docs = { components: [aComponent({ tag: 'ki-first' })] };
      const { paths, result } = await generateInto(directory, docs);
      const index = await readFile(paths.packageLlmsPath, 'utf8');
      const written = new Set(result.outputs?.keys());
      const links = indexLinks(index);

      expect(links.map((link) => link.url)).toEqual([
        'llms/ki-first.md',
        'llms/theming.md',
        'generated/custom-elements.json',
      ]);
      for (const { url } of links.filter((link) => link.name !== 'custom-elements.json')) {
        expect(written.has(join(directory, 'package', url))).toBe(true);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('S11 the committed packaged index links only files the package manifest ships', async () => {
    const [pkg, index] = await Promise.all([
      readPackage(),
      readFile(new URL('./llms.txt', packageRoot), 'utf8'),
    ]);
    const shipped = pkg.files ?? [];
    const links = indexLinks(index);

    expect(links.map((link) => link.url)).toContain('llms/ki-button.md');
    for (const { url } of links) {
      expect(url).not.toMatch(/^[a-z][a-z0-9+.-]*:|^\/|(?:^|\/)\.\.(?:\/|$)/iu);
      expect(shipped.some((entry) => url === entry || url.startsWith(`${entry}/`))).toBe(true);
      await expect(readFile(new URL(`./${url}`, packageRoot), 'utf8')).resolves.not.toBe('');
    }
  });

  it('S12 the repository index links every document at the address the site publishes it', async () => {
    const [docs, pkg, preamble, genUi] = await Promise.all([
      readDocs(),
      readPackage(),
      readPreamble(),
      readWorkspaceGenUi(),
    ]);
    const index = buildLlmsIndex(docs, pkg, preamble, {
      base: siteOrigin,
      fullSummary: true,
      manifestHref: `${siteOrigin}assets/elements/custom-elements.json`,
      genUi,
    });
    const links = indexLinks(index);

    expect(links.every((link) => link.url.startsWith(siteOrigin))).toBe(true);
    expect(links.find((link) => link.name === 'ki-button')?.url).toBe(
      'https://kimen.dev/llms/ki-button.md',
    );
    expect(links.filter((link) => link.section === 'Optional').map((link) => link.url)).toEqual([
      'https://kimen.dev/llms-full.txt',
      'https://kimen.dev/assets/elements/custom-elements.json',
    ]);
    // What the build committed at the repository root is exactly this index.
    expect(await readFile(new URL('llms.txt', workspaceRoot), 'utf8')).toBe(index);
  });

  it('S12 generation refuses two documents that the site would publish under one address', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kimen-llms-collision-'));
    try {
      // The site serves the package documents and the GenUI guides from one
      // /llms/ directory, and the repository already has a guide named catalog.
      const docs: Docs = { components: [aComponent()] };
      const preamble = 'Install it.\n\n## Catalog\n\nA second catalog guide.\n';

      await expect(generateInto(directory, docs, preamble)).rejects.toThrow(
        'build-surfaces: llms/catalog.md would be generated more than once',
      );
      await expect(readdir(join(directory, 'package'))).rejects.toThrow(/ENOENT/u);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('S13 every index links a theming guide generated from the preamble', () => {
    const docs: Docs = { components: [aComponent()] };
    const guide = documentNamed(buildLlmsDocuments(docs, fixturePreamble), 'theming.md');
    const packaged = buildLlmsIndex(docs, fixturePackage, fixturePreamble);
    const repository = buildLlmsIndex(docs, fixturePackage, fixturePreamble, {
      base: siteOrigin,
      genUi: { genUi: genUiFixture, packages: genUiPackagesFixture },
    });

    expect(guide).toBe(
      [
        '# Theming',
        '',
        'Themes reassign custom properties. Load one stylesheet per theme.',
        '',
        '```html',
        '<html data-ki-theme="material3">',
        '```',
        '',
      ].join('\n'),
    );
    expect(indexLinks(packaged).filter((link) => link.section === 'Guides')).toEqual([
      {
        section: 'Guides',
        name: 'Theming',
        url: 'llms/theming.md',
        note: 'Themes reassign custom properties.',
      },
    ]);
    expect(indexLinks(repository).filter((link) => link.section === 'Guides')).toEqual([
      {
        section: 'Guides',
        name: 'Theming',
        url: 'https://kimen.dev/llms/theming.md',
        note: 'Themes reassign custom properties.',
      },
    ]);
    // The guide leaves the index body: only what precedes the first heading stays.
    expect(packaged).toContain('## not a heading: fenced code is content');
    expect(packaged).not.toContain('## Theming');
    expect(packaged).not.toContain('Load one stylesheet per theme.');
  });

  it('S13 the repository index links one generated guide per GenUI package carrying its guidance and entry points', () => {
    const docs: Docs = { components: [aComponent()] };
    const repository = buildLlmsIndex(docs, fixturePackage, fixturePreamble, {
      base: siteOrigin,
      genUi: { genUi: genUiFixture, packages: genUiPackagesFixture },
    });
    const packaged = buildLlmsIndex(docs, fixturePackage, fixturePreamble);

    expect(indexLinks(repository).filter((link) => link.section === 'Generative UI')).toEqual([
      {
        section: 'Generative UI',
        name: '@kimen/catalog',
        url: 'https://kimen.dev/llms/catalog.md',
        note: 'Guard agent-emitted UI at the GenUI boundary.',
      },
    ]);
    expect(repository).toContain('GenUI layer intro prose.');
    expect(buildGenUiDocuments(genUiFixture, genUiPackagesFixture)).toEqual([
      [
        'catalog.md',
        [
          '# @kimen/catalog',
          '',
          '> Neutral catalog fixture.',
          '',
          '## When to use',
          '',
          'Guard agent-emitted UI at the GenUI boundary. Validate before rendering.',
          '',
          '## When not to use',
          '',
          'Hand-authored pages that never render agent output.',
          '',
          '## Entry points',
          '',
          '- `validateUiSpec(input, options?) => ValidationReport`: Accepts or rejects an agent-emitted UI spec.',
          '- `catalogData`: The generated catalog document.',
          '',
        ].join('\n'),
      ],
    ]);
    // The packaged index stays elements-only: the GenUI packages are not in
    // the tarball, so neither are their guides nor their links.
    expect(packaged).not.toContain('Generative UI');
    expect(packaged).not.toContain('GenUI layer intro prose.');
    expect(packaged).not.toContain('@kimen/catalog');
  });

  it('S13 the committed repository index links the catalog, the emitter and both adapters', async () => {
    const [index, genUi] = await Promise.all([
      readFile(new URL('llms.txt', workspaceRoot), 'utf8'),
      readWorkspaceGenUi(),
    ]);
    const guides = indexLinks(index).filter((link) => link.section === 'Generative UI');

    expect(guides.map((link) => link.name)).toEqual([
      '@kimen/catalog',
      '@kimen/emitter',
      '@kimen/adapter-a2ui',
      '@kimen/adapter-mcp-apps',
    ]);
    expect(guides.map((link) => link.url)).toEqual(
      ['catalog', 'emitter', 'adapter-a2ui', 'adapter-mcp-apps'].map(
        (name) => `https://kimen.dev/llms/${name}.md`,
      ),
    );
    for (const [file, content] of buildGenUiDocuments(genUi.genUi, genUi.packages)) {
      expect(await readFile(new URL(`llms/${file}`, workspaceRoot), 'utf8')).toBe(content);
    }
  });
});
