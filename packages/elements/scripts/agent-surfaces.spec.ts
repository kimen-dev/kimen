// @spec:017-agent-surfaces
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
    const module = manifest.modules[0];
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

  it('S5 gates-suite wires a surfaces-sync gate over every committed surface', async () => {
    const gates = await readFile(
      new URL('../../../scripts/gates/gates-suite.sh', import.meta.url),
      'utf8',
    );

    expect(gates).toContain('run_gate surfaces-sync git diff --exit-code --');
    expect(gates).toContain('packages/elements/generated');
    expect(gates).toContain('packages/elements/llms.txt');
    expect(gates).toContain('llms.txt');
  });
});
