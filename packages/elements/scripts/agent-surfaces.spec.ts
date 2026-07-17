// @spec:017-agent-surfaces
// @spec:018-project-integrity-hardening
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildLlmsTxt,
  buildManifest,
  normalizeDocs,
  serializeJson,
  validateDocs,
} from './agent-surfaces.mjs';
import { runBuildSurfaces } from './build-surfaces.mjs';

const packageRoot = new URL('..', import.meta.url);
const docsUrl = new URL('./generated/docs.json', packageRoot);
const pkgUrl = new URL('./package.json', packageRoot);
const preamble = [
  'Install with `pnpm add @kimen/elements`.',
  '',
  'Register components with `defineCustomElement` before use.',
].join('\n');

const readJson = async (url: URL): Promise<unknown> => JSON.parse(await readFile(url, 'utf8'));
const readFixture = (name: string): Promise<unknown> =>
  readJson(new URL(`./fixtures/${name}`, import.meta.url));

interface PackageFixture {
  description: string;
}

interface ManifestMember {
  name: string;
}

interface ManifestCssPropertyFixture {
  name: string;
  description: string;
  layer: 'semantic' | 'component';
}

interface ManifestBuildFixture {
  packageExports: Record<string, { types: string; import: string }>;
  cssPropertiesByTag: Record<string, ManifestCssPropertyFixture[]>;
}

const s9CssProperties: ManifestCssPropertyFixture[] = [
  {
    name: '--ki-dialog-backdrop-bg',
    description: 'Background color behind the modal dialog.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-bg',
    description: 'Background color of the dialog surface.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-border',
    description: 'Border drawn around the dialog surface.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-fg',
    description: 'Foreground color inherited by dialog content.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-focus-ring-color',
    description: 'Color of the visible dialog focus ring.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-focus-ring-offset',
    description: 'Offset between the dialog and its focus ring.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-focus-ring-width',
    description: 'Width of the visible dialog focus ring.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-gap',
    description: 'Gap between the dialog heading, body and footer.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-heading-font-size',
    description: 'Font size of the visible dialog heading.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-heading-font-weight',
    description: 'Font weight of the visible dialog heading.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-heading-line-height',
    description: 'Line height of the visible dialog heading.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-max-width',
    description: 'Maximum inline size of the dialog surface.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-min-width',
    description: 'Minimum inline size of the dialog surface.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-motion-duration',
    description: 'Duration of dialog and backdrop entry transitions.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-motion-easing',
    description: 'Easing curve of dialog and backdrop entry transitions.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-padding',
    description: 'Internal padding of the dialog surface.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-radius',
    description: 'Corner radius of the dialog surface.',
    layer: 'component',
  },
  {
    name: '--ki-dialog-shadow',
    description: 'Elevation shadow of the dialog surface.',
    layer: 'component',
  },
  {
    name: '--ki-typography-family-body',
    description: 'Body font family inherited by dialog content.',
    layer: 'semantic',
  },
];

const s9ManifestInputs: ManifestBuildFixture = {
  packageExports: {
    './ki-dialog': {
      types: './dist/components/ki-dialog.d.ts',
      import: './dist/components/ki-dialog.js',
    },
  },
  cssPropertiesByTag: {
    'ki-dialog': s9CssProperties,
  },
};

const buildPublishedManifest = buildManifest as unknown as (
  docs: unknown,
  inputs: ManifestBuildFixture,
) => ReturnType<typeof buildManifest>;

const readKiDialogDocs = async () => {
  const docs = normalizeDocs(await readJson(docsUrl));
  return {
    ...docs,
    components: docs.components.filter(
      (component: { tag?: string }) => component.tag === 'ki-dialog',
    ),
  };
};

const guidance = (component: { docsTags?: { name: string; text: string }[] }, name: string) =>
  component.docsTags?.find((tag) => tag.name === name)?.text;

describe('agent surfaces', () => {
  it('S6 normalizeDocs removes timestamps, absolute reference paths, and serializes stable bytes', async () => {
    const docs = await readFixture('path-a-docs.json');
    const normalized = normalizeDocs(docs, {
      packageRoot: '/Users/alice/work/kimen/packages/elements',
    });
    const bytesA = serializeJson(normalized);
    const bytesB = serializeJson(
      normalizeDocs(docs, { packageRoot: '/Users/alice/work/kimen/packages/elements' }),
    );

    expect(normalized).not.toHaveProperty('timestamp');
    expect(bytesA).toBe(bytesB);
    expect(bytesA.endsWith('\n')).toBe(true);
    expect(bytesA.endsWith('\n\n')).toBe(false);
    expect(bytesA).not.toContain('/Users/');
    expect(bytesA).toContain('"path": "src/components/ki-button/ki-button.tsx"');
  });

  it('S1 buildManifest describes ki-button facets with stable custom-elements fields', async () => {
    const docs = normalizeDocs(await readJson(docsUrl));
    const manifest = buildManifest(docs);
    // Locate ki-button by path: manifest modules follow the docs' alphabetical
    // order, so a component sorting before "button" (e.g. ki-badge) would take
    // index 0 and break this button-specific assertion.
    const module = manifest.modules.find(
      (candidate: { path: string }) => candidate.path === 'src/components/ki-button/ki-button.tsx',
    );
    if (!module) {
      throw new Error('ki-button module missing from manifest');
    }
    const declaration = module.declarations[0];

    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(module.path).toBe('src/components/ki-button/ki-button.tsx');
    expect(declaration.name).toBe('KiButton');
    expect(declaration.tagName).toBe('ki-button');
    expect(module.exports).toEqual([
      {
        kind: 'js',
        name: 'KiButton',
        declaration: { name: 'KiButton', module: 'src/components/ki-button/ki-button.tsx' },
      },
      {
        kind: 'custom-element-definition',
        name: 'ki-button',
        declaration: { name: 'KiButton', module: 'src/components/ki-button/ki-button.tsx' },
      },
    ]);
    expect(declaration.members).toHaveLength(7);
    expect(declaration.attributes).toHaveLength(7);
    expect(declaration.slots).toHaveLength(3);
    expect(declaration.cssParts).toHaveLength(2);
    expect(declaration.events).toEqual([]);
    expect(declaration.cssProperties).toEqual([]);
    expect(declaration.members.map((member: ManifestMember) => member.name)).toContain('variant');
    expect(
      declaration.members.find((member: ManifestMember) => member.name === 'variant'),
    ).toMatchObject({
      kind: 'field',
      type: { text: '"ghost" | "primary" | "quaternary" | "secondary" | "tertiary"' },
      default: "'secondary'",
      attribute: 'variant',
      reflects: true,
    });
  });

  it('S9 buildManifest resolves every ki-dialog module reference through its published export', async () => {
    const docs = await readKiDialogDocs();
    const module = buildPublishedManifest(docs, s9ManifestInputs).modules[0];

    expect(module).toMatchObject({
      path: 'dist/components/ki-dialog.js',
      exports: [
        {
          kind: 'js',
          declaration: { module: 'dist/components/ki-dialog.js' },
        },
        {
          kind: 'custom-element-definition',
          declaration: { module: 'dist/components/ki-dialog.js' },
        },
      ],
    });
  });

  it('S9 buildManifest resolves a direct-subpath export pattern without falling back to source', async () => {
    const docs = await readKiDialogDocs();
    const module = buildPublishedManifest(docs, {
      ...s9ManifestInputs,
      packageExports: {
        './ki-*': {
          types: './dist/components/ki-*.d.ts',
          import: './dist/components/ki-*.js',
        },
      },
    }).modules[0];

    expect(module.path).toBe('dist/components/ki-dialog.js');
    expect(
      module.exports.every(
        (entry: { declaration: { module: string } }) => entry.declaration.module === module.path,
      ),
    ).toBe(true);
  });

  it('S9 buildManifest copies every ki-dialog property description to its attribute', async () => {
    const docs = await readKiDialogDocs();
    const component = docs.components[0];
    const declaration = buildPublishedManifest(docs, s9ManifestInputs).modules[0].declarations[0];

    expect(
      Object.fromEntries(
        declaration.attributes.map((attribute: { name: string; description?: string }) => [
          attribute.name,
          attribute.description,
        ]),
      ),
    ).toEqual(
      Object.fromEntries(
        component.props.map((property: { attr: string; docs: string }) => [
          property.attr,
          property.docs,
        ]),
      ),
    );
  });

  it('S9 buildManifest describes every public semantic and component CSS property consumed by ki-dialog', async () => {
    const docs = await readKiDialogDocs();
    const declaration = buildPublishedManifest(docs, s9ManifestInputs).modules[0].declarations[0];

    expect(declaration.cssProperties).toEqual(
      s9CssProperties.map(({ name, description }) => ({ name, description })),
    );
  });

  it('S9 buildLlmsTxt renders the same derived public CSS-property contract', async () => {
    const docs = await readKiDialogDocs();
    const summary = buildLlmsTxt(
      docs,
      (await readJson(pkgUrl)) as PackageFixture,
      preamble,
      s9ManifestInputs,
    );

    expect(summary).toContain(
      'CSS custom properties:\n- `--ki-dialog-backdrop-bg`: Background color behind the modal dialog.',
    );
    expect(summary).toContain(
      '- `--ki-typography-family-body`: Body font family inherited by dialog content.',
    );
  });

  it('S3 buildManifest carries when-to-use guidance verbatim from docsTags', async () => {
    const docs = normalizeDocs(await readJson(docsUrl));
    const component = docs.components[0];
    const declaration = buildManifest(docs).modules[0].declarations[0];

    expect(declaration.whenToUse).toBe(guidance(component, 'whenToUse'));
    expect(declaration.whenNotToUse).toBe(guidance(component, 'whenNotToUse'));
  });

  it('S2 buildLlmsTxt renders package metadata, preamble, facets, and none-lines', async () => {
    const docs = normalizeDocs(await readJson(docsUrl));
    const pkg = (await readJson(pkgUrl)) as PackageFixture;
    const summary = buildLlmsTxt(docs, pkg, preamble);

    expect(summary.startsWith('# @kimen/elements')).toBe(true);
    expect(summary).toContain(`> ${pkg.description}`);
    expect(summary).toContain(preamble);
    expect(summary).toContain('### ki-button');
    expect(summary).toContain('Attributes:\n- `disabled` (boolean, default false):');
    expect(summary).toContain(
      'Slots:\n- (default): Label content. This is the accessible name source.',
    );
    expect(summary).toContain('Parts:\n- `button`: Internal native button.');
    expect(summary).toContain('Events: none');
    expect(summary).toContain('Methods: none');
  });

  it('S2 shipped installation guidance uses only public package exports', async () => {
    const shippedPreamble = await readFile(
      new URL('./scripts/llms-preamble.txt', packageRoot),
      'utf8',
    );

    expect(shippedPreamble).toContain('pnpm add @kimen/elements @kimen/tokens');
    expect(shippedPreamble).toContain(
      "import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';",
    );
    expect(shippedPreamble).toContain("import '@kimen/tokens/css';");
    expect(shippedPreamble).not.toContain('/dist/');
  });

  it('S1 S2 render a documented public method in the manifest and llms.txt', async () => {
    const docs = normalizeDocs(await readFixture('path-a-docs.json'));
    const component = docs.components[0];
    component.methods = [
      {
        name: 'show',
        docs: 'Opens the dialog modally.',
        docsTags: [],
        signature: 'show(force: boolean) => Promise<void>',
        returns: { type: 'Promise<void>', docs: '' },
        parameters: [{ name: 'force', type: 'boolean', docs: 'Force open even if busy.' }],
        complexType: {
          signature: 'show(force: boolean) => Promise<void>',
          parameters: [{ name: 'force', type: 'boolean', docs: 'Force open even if busy.' }],
          references: {},
          return: 'Promise<void>',
        },
      },
    ];

    // Manifest method member reads parameters from `parameters`, never `.map`
    // on the `signature` string (would throw). Return comes from complexType.
    const member = buildManifest(docs).modules[0].declarations[0].members.find(
      (entry: ManifestMember & { kind?: string }) => entry.kind === 'method',
    );
    expect(member).toMatchObject({
      kind: 'method',
      name: 'show',
      privacy: 'public',
      return: { type: { text: 'Promise<void>' } },
      parameters: [
        { name: 'force', type: { text: 'boolean' }, description: 'Force open even if busy.' },
      ],
    });

    // llms.txt lists the method as a one-line facet in the Methods section.
    const summary = buildLlmsTxt(docs, (await readJson(pkgUrl)) as PackageFixture, preamble);
    expect(summary).toContain(
      'Methods:\n- `show(force)` (Promise<void>): Opens the dialog modally.',
    );
  });

  it('S2 buildLlmsTxt renders usage examples between guidance and attributes, sorted by file name', async () => {
    const docs = normalizeDocs(await readJson(docsUrl));
    const component = docs.components[0];
    component.usage = {
      'b-form': 'Inside a form:\n\n```html\n<form><ki-button>Save</ki-button></form>\n```\n',
      'a-basic':
        'A primary action:\n\n```html\n<ki-button variant="primary">Save</ki-button>\n```\n',
    };
    const summary = buildLlmsTxt(docs, (await readJson(pkgUrl)) as PackageFixture, preamble);

    expect(summary).toContain(
      [
        `When NOT to use: ${guidance(component, 'whenNotToUse') ?? ''}`,
        '',
        'Examples:',
        '',
        'A primary action:',
        '',
        '```html',
        '<ki-button variant="primary">Save</ki-button>',
        '```',
        '',
        'Inside a form:',
        '',
        '```html',
        '<form><ki-button>Save</ki-button></form>',
        '```',
        '',
        'Attributes:',
      ].join('\n'),
    );
  });

  it('S2 buildLlmsTxt renders no Examples section for components without usage files', async () => {
    const docs = normalizeDocs(await readJson(docsUrl));
    for (const component of docs.components) {
      component.usage = {};
    }
    const summary = buildLlmsTxt(docs, (await readJson(pkgUrl)) as PackageFixture, preamble);

    expect(summary).not.toContain('Examples:');
    expect(summary).toContain('When NOT to use:');
  });

  it('S3 buildLlmsTxt carries when-to-use guidance verbatim from docsTags', async () => {
    const docs = normalizeDocs(await readJson(docsUrl));
    const component = docs.components[0];
    const summary = buildLlmsTxt(docs, await readJson(pkgUrl), preamble);

    expect(summary).toContain(`When to use: ${guidance(component, 'whenToUse')}`);
    expect(summary).toContain(`When NOT to use: ${guidance(component, 'whenNotToUse')}`);
  });

  it('S4 validateDocs reports undocumented public members and missing guidance', async () => {
    const valid = normalizeDocs(await readFixture('path-a-docs.json'));
    const invalid = structuredClone(valid);
    const component = invalid.components[0];
    component.docsTags = [
      { name: 'whenToUse', text: '' },
      { name: 'part', text: 'button - Internal native button.' },
    ];
    component.props[0].docs = '';
    component.events = [{ event: 'kiAction', docs: '', complexType: { original: 'void' } }];
    component.methods = [{ name: 'focusButton', docs: '', complexType: { return: 'void' } }];
    component.slots = [{ name: 'start', docs: '' }];
    component.parts = [{ name: 'button', docs: '' }];

    expect(validateDocs(valid)).toEqual([]);
    expect(validateDocs(invalid)).toEqual(
      expect.arrayContaining([
        'ki-button.variant: property has no documentation',
        'ki-button: missing @whenNotToUse guidance tag',
        'ki-button.@whenToUse: documentation tag has empty text',
        'ki-button.kiAction: event has no documentation',
        'ki-button.focusButton: method has no documentation',
        'ki-button.slot[start]: slot has no documentation',
        'ki-button.part[button]: part has no documentation',
      ]),
    );
  });

  it('S4 runBuildSurfaces exits non-zero and prints every validation violation', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'kimen-surfaces-'));
    const docs = normalizeDocs(await readFixture('path-a-docs.json'));
    docs.components[0].props[0].docs = '';
    docs.components[0].docsTags = [{ name: 'whenToUse', text: '' }];
    await writeFile(join(tmp, 'docs.json'), serializeJson(docs));

    const result = await runBuildSurfaces({
      docsPath: join(tmp, 'docs.json'),
      packageJsonPath: new URL('../package.json', packageRoot),
      preamblePath: new URL('./fixtures/path-a-docs.json', import.meta.url),
      manifestPath: join(tmp, 'custom-elements.json'),
      packageLlmsPath: join(tmp, 'llms.txt'),
      rootLlmsPath: join(tmp, 'root-llms.txt'),
      packageRoot: tmp,
    });

    await rm(tmp, { recursive: true, force: true });
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain('agent-surfaces: documentation incomplete (Art. I):');
    expect(result.stderr).toContain('ki-button.variant: property has no documentation');
    expect(result.stderr).toContain('ki-button: missing @whenNotToUse guidance tag');
    expect(result.stderr).toContain('ki-button.@whenToUse: documentation tag has empty text');
  });

  it('S6 full pipeline is byte-identical across checkout paths and real artifacts contain no machine noise', async () => {
    const docsA = normalizeDocs(await readFixture('path-a-docs.json'), {
      packageRoot: '/Users/alice/work/kimen/packages/elements',
    });
    const docsB = normalizeDocs(await readFixture('path-b-docs.json'), {
      packageRoot: '/home/ci/work/kimen/packages/elements',
    });
    const pkg = await readJson(pkgUrl);
    const outputsA = [
      serializeJson(docsA),
      serializeJson(buildManifest(docsA)),
      buildLlmsTxt(docsA, pkg, preamble),
    ];
    const outputsB = [
      serializeJson(docsB),
      serializeJson(buildManifest(docsB)),
      buildLlmsTxt(docsB, pkg, preamble),
    ];

    expect(outputsA).toEqual(outputsB);
    for (const artifact of [
      await readFile(docsUrl, 'utf8'),
      await readFile(new URL('./generated/custom-elements.json', packageRoot), 'utf8').catch(
        () => '',
      ),
      await readFile(new URL('./llms.txt', packageRoot), 'utf8'),
    ]) {
      expect(artifact).not.toContain('"timestamp"');
      expect(artifact).not.toMatch(/\/Users\/|\/home\/|[A-Z]:\\/);
    }
  });

  it('S5 reusable core wires a surfaces-sync gate over every committed surface', async () => {
    const [gates, sync] = await Promise.all([
      readFile(new URL('../../../scripts/gates/gates-core.sh', import.meta.url), 'utf8'),
      readFile(new URL('../../../scripts/gates/check-generated-sync.mjs', import.meta.url), 'utf8'),
    ]);

    expect(gates).toContain(
      'run_core_gate surfaces-sync node scripts/gates/check-generated-sync.mjs surfaces',
    );
    for (const path of [
      'llms.txt',
      'packages/elements/generated/custom-elements.json',
      'packages/elements/generated/docs.d.ts',
      'packages/elements/generated/docs.json',
      'packages/elements/generated/public-api.json',
      'packages/elements/llms.txt',
    ]) {
      expect(sync).toContain(`'${path}'`);
    }
  });
});
