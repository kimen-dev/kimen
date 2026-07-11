import { describe, expect, it } from 'vitest';

import { canonicalJsonSha256 } from '../lib/canonical-json.mjs';
import {
  buildPublicModuleSurface,
  buildRepositoryPublicApiSnapshot,
  completeCemMethodSignatures,
  normalizePrintedSignature,
} from '../lib/public-api-snapshot.mjs';

// @spec:018-project-integrity-hardening#S10

const clone = (value) => JSON.parse(JSON.stringify(value));

const fixture = () => ({
  elementsPackage: {
    name: '@kimen/elements',
    version: '0.0.0',
    exports: {
      '.': { types: './dist/types/index.d.ts', import: './dist/index.js' },
      './loader': { types: './loader/index.d.ts', import: './loader/index.js' },
      './ki-*': {
        types: './dist/components/ki-*.d.ts',
        import: './dist/components/ki-*.js',
      },
    },
  },
  tokensPackage: {
    name: '@kimen/tokens',
    version: '0.0.0',
    exports: { './css': './dist/css/tokens.css' },
  },
  componentSubpaths: [
    {
      publicSubpath: './ki-button',
      types: './dist/components/ki-button.d.ts',
      import: './dist/components/ki-button.js',
    },
  ],
  declarationSources: {
    '@kimen/elements': {
      packageRoot: '/virtual/kimen-elements-mutation',
      files: {
        './package.json': '{"type":"module"}',
        './dist/types/index.d.ts': `
          export { KiButton } from './components/ki-button/ki-button.js';
          export type { KiButtonVariant } from './components/ki-button/ki-button.js';
        `,
        './dist/types/components/ki-button/ki-button.d.ts': `
          export type KiButtonVariant = 'primary' | 'secondary';
          export declare class KiButton {
            private internalState;
            variant: KiButtonVariant;
          }
        `,
        './loader/index.d.ts': `
          export * from '../dist/types/components';
          export interface DefineOptions { exclude?: string[]; }
          export declare function defineCustomElements(options?: DefineOptions): void;
        `,
        './dist/types/components.d.ts': `
          export type LoaderOnly = 'loader-public-type';
          export namespace Components { interface KiButton { disabled: boolean } }
        `,
        './dist/components/ki-button.d.ts': `
          export const KiButton: { prototype: HTMLElement; new (): HTMLElement };
          export const defineCustomElement: () => void;
          export type { KiButtonVariant } from '../types/components/ki-button/ki-button.js';
        `,
      },
    },
  },
  rootContract: {
    values: [
      {
        name: 'KiButton',
        from: './components/ki-button/ki-button.js',
        replacement: '@kimen/elements/ki-button',
      },
    ],
    namedTypes: [
      {
        name: 'KiButtonVariant',
        from: './components/ki-button/ki-button.js',
        replacement: '@kimen/elements/ki-button',
      },
    ],
    typeStars: [],
  },
  docs: {
    components: [
      {
        tag: 'ki-button',
        props: [{ name: 'variant', attr: 'variant', required: true }],
        methods: [
          {
            name: 'focusButton',
            parameters: [
              {
                name: 'preventScroll',
                type: 'boolean',
                docs: 'Avoid scrolling.',
                optional: true,
                default: 'false',
              },
            ],
          },
        ],
      },
    ],
  },
  manifest: {
    schemaVersion: '1.0.0',
    modules: [
      {
        kind: 'javascript-module',
        path: 'dist/components/ki-button.js',
        declarations: [
          {
            kind: 'class',
            name: 'KiButton',
            customElement: true,
            tagName: 'ki-button',
            description: 'A button.',
            attributes: [
              {
                name: 'variant',
                fieldName: 'variant',
                type: { text: "'primary' | 'secondary'" },
                default: "'secondary'",
                description: 'Visual hierarchy.',
              },
            ],
            members: [
              {
                kind: 'field',
                name: 'variant',
                privacy: 'public',
                type: { text: "'primary' | 'secondary'" },
                default: "'secondary'",
                description: 'Visual hierarchy.',
              },
              {
                kind: 'method',
                name: 'focusButton',
                privacy: 'public',
                return: { type: { text: 'Promise<void>' } },
                description: 'Focuses the native button.',
                parameters: [
                  {
                    name: 'preventScroll',
                    type: { text: 'boolean' },
                    description: 'Avoid scrolling.',
                    optional: true,
                    default: 'false',
                  },
                ],
              },
            ],
            events: [
              {
                name: 'ki-action',
                type: { text: 'CustomEvent<void>' },
                description: 'Reports activation.',
              },
            ],
            slots: [{ name: '', description: 'Accessible label.' }],
            cssParts: [{ name: 'button', description: 'Native button.' }],
            cssProperties: [{ name: '--ki-button-bg', description: 'Button background color.' }],
          },
        ],
      },
    ],
  },
  tokenInventory: {
    schemaVersion: 1,
    compositions: [{ id: 'onmars-light', theme: 'onmars', scheme: 'light' }],
    publicTokens: [
      {
        path: 'ki.button.bg',
        cssName: '--ki-button-bg',
        layer: 'component',
        component: 'ki-button',
        type: 'color',
        description: 'Button background color.',
      },
    ],
  },
  defaultTokenComposition: {
    id: 'onmars-light',
    records: [
      {
        path: 'ki.button.bg',
        cssName: '--ki-button-bg',
        public: true,
        resolvedValue: '#ffffff',
      },
    ],
  },
  stylesheetSources: {
    './css': `
      :root { --ki-button-bg: #ffffff; }
      @media (prefers-color-scheme: dark) {
        :root:not([data-ki-color-scheme='light']) { --ki-button-bg: #111111; }
      }
      :root[data-ki-color-scheme='dark'] { --ki-button-bg: #111111; }
    `,
  },
  browserBaseline: ['webkit', 'chromium', 'firefox'],
});

describe('repository public API snapshot mutation boundary', () => {
  it('S10 maps every source and hashes the normalized surface', () => {
    const snapshot = buildRepositoryPublicApiSnapshot(fixture());
    const elements = snapshot.surface.packages['@kimen/elements'];
    const tokens = snapshot.surface.packages['@kimen/tokens'];
    const component = elements.components['ki-button'];

    expect(snapshot.surface.browserBaseline).toEqual(['chromium', 'firefox', 'webkit']);
    expect(snapshot.surfaceSha256).toBe(canonicalJsonSha256(snapshot.surface));
    expect(snapshot).toEqual(buildRepositoryPublicApiSnapshot(fixture()));
    expect(elements.exports).toEqual({
      '.': {
        target: './dist/index.js',
        deprecatedSince: null,
        replacement: null,
      },
      './ki-button': {
        target: './dist/components/ki-button.js',
        deprecatedSince: null,
        replacement: null,
      },
      './loader': {
        target: './loader/index.js',
        deprecatedSince: null,
        replacement: null,
      },
    });
    expect(elements.rootSymbols).toEqual({
      KiButton: {
        target: './dist/components/ki-button.js',
        deprecatedSince: '0.0.0',
        replacement: '@kimen/elements/ki-button',
      },
      KiButtonVariant: {
        target: './dist/components/ki-button.js',
        deprecatedSince: '0.0.0',
        replacement: '@kimen/elements/ki-button',
      },
    });
    expect(elements.modules['.'].symbols.KiButton).toMatchObject({
      kinds: ['type', 'value'],
    });
    expect(elements.modules['.'].symbols.KiButton.signature).not.toContain('internalState');
    expect(elements.modules['./loader'].symbols.defineCustomElements.signature).toContain(
      'options?: DefineOptions',
    );
    expect(elements.modules['./loader'].symbols.LoaderOnly).toEqual({
      kinds: ['type'],
      signature: "export type LoaderOnly = 'loader-public-type';",
    });
    expect(elements.modules['./loader'].symbols.Components.kinds).toEqual(['namespace']);
    expect(elements.modules['./ki-button'].symbols).toHaveProperty('defineCustomElement');
    expect(component).toMatchObject({
      description: 'A button.',
      properties: {
        variant: {
          type: "'primary' | 'secondary'",
          default: "'secondary'",
          required: true,
          description: 'Visual hierarchy.',
        },
      },
      attributes: { variant: { required: true } },
      events: { 'ki-action': { type: 'CustomEvent<void>' } },
      methods: {
        focusButton: {
          type: 'Promise<void>',
          signature: 'focusButton(preventScroll?: boolean = false) => Promise<void>',
          parameters: [
            {
              name: 'preventScroll',
              type: 'boolean',
              optional: true,
              default: 'false',
              rest: false,
            },
          ],
        },
      },
      slots: { '': { description: 'Accessible label.' } },
      parts: { button: { description: 'Native button.' } },
      cssProperties: {
        '--ki-button-bg': { description: 'Button background color.' },
      },
    });
    expect(tokens).toEqual({
      version: '0.0.0',
      exports: {
        './css': {
          target: './dist/css/tokens.css',
          deprecatedSince: null,
          replacement: null,
        },
      },
      modules: {
        './css': {
          target: './dist/css/tokens.css',
          declaration: null,
          symbols: {},
        },
      },
      rootSymbols: {},
      stylesheets: {
        './css': {
          target: './dist/css/tokens.css',
          contexts: {
            light: { '--ki-button-bg': '#ffffff' },
            dark: { '--ki-button-bg': '#111111' },
          },
        },
      },
      tokens: {
        '--ki-button-bg': {
          type: 'color',
          default: '#ffffff',
          required: false,
          description: 'Button background color.',
          deprecatedSince: null,
          replacement: null,
        },
      },
    });
  });

  it('S10 normalizes merged interfaces and exposes module-only generation', () => {
    expect(normalizePrintedSignature('export interface KiButton extends HTMLElement {\n}')).toBe(
      normalizePrintedSignature('interface KiButton extends HTMLElement {\n}'),
    );

    const input = fixture();
    expect(
      buildPublicModuleSurface({
        packageName: '@kimen/elements',
        packageJson: input.elementsPackage,
        componentSubpaths: input.componentSubpaths,
        declarationSources: input.declarationSources['@kimen/elements'],
      }),
    ).toEqual(buildRepositoryPublicApiSnapshot(input).surface.packages['@kimen/elements'].modules);
  });

  it('S10 completes CEM method contracts without mutating the source manifest', () => {
    const input = fixture();

    const completed = completeCemMethodSignatures({
      manifest: input.manifest,
      docs: {
        components: [
          {
            tag: 'ki-button',
            methods: [
              {
                name: 'focusButton',
                parameters: [
                  {
                    name: 'preventScroll',
                    type: 'boolean',
                    docs: 'Avoid scrolling.',
                    optional: true,
                    default: 'false',
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(completed.modules[0].declarations[0].members[1]).toMatchObject({
      signature: 'focusButton(preventScroll?: boolean = false) => Promise<void>',
      parameters: [
        {
          name: 'preventScroll',
          optional: true,
          default: 'false',
          rest: false,
        },
      ],
    });
    expect(input.manifest.modules[0].declarations[0].members[1]).not.toHaveProperty('signature');
  });

  it.each([
    [
      'wrong elements package',
      (input) => (input.elementsPackage.name = '@wrong/elements'),
      /Expected package/u,
    ],
    ['empty browser set', (input) => (input.browserBaseline = []), /browserBaseline/u],
    ['missing components', (input) => (input.componentSubpaths = []), /componentSubpaths/u],
    [
      'unsafe component target',
      (input) => (input.componentSubpaths[0].import = './dist/index.js'),
      /does not target its direct component module/u,
    ],
    [
      'unexpanded root star',
      (input) => input.rootContract.typeStars.push('./components.js'),
      /expand every type-star/u,
    ],
    [
      'unknown root replacement',
      (input) => (input.rootContract.values[0].replacement = '@kimen/elements/ki-dialog'),
      /is not a component export/u,
    ],
    [
      'source-only CEM path',
      (input) => (input.manifest.modules[0].path = 'src/components/ki-button/ki-button.tsx'),
      /manifest path must equal/u,
    ],
    [
      'missing Stencil component',
      (input) => (input.docs.components = []),
      /absent from Stencil docs/u,
    ],
    [
      'unknown attribute field',
      (input) => (input.manifest.modules[0].declarations[0].attributes[0].fieldName = 'tone'),
      /references unknown field/u,
    ],
    [
      'missing facet description',
      (input) => (input.manifest.modules[0].declarations[0].cssProperties[0].description = ''),
      /CSS property.*description/u,
    ],
    [
      'wrong default composition',
      (input) => (input.defaultTokenComposition.id = 'onmars-dark'),
      /onmars-light composition/u,
    ],
    [
      'missing token default',
      (input) => (input.defaultTokenComposition.records = []),
      /onmars-light resolved default/u,
    ],
    [
      'mismatched token path',
      (input) => (input.defaultTokenComposition.records[0].path = 'ki.button.fg'),
      /onmars-light resolved default/u,
    ],
    [
      'missing declaration source',
      (input) => delete input.declarationSources['@kimen/elements'].files['./loader/index.d.ts'],
      /declaration.*does not exist/u,
    ],
    [
      'non-string CEM parameter default',
      (input) =>
        (input.manifest.modules[0].declarations[0].members[1].parameters[0].default = false),
      /parameter preventScroll default must be a string/u,
    ],
  ])('S10 rejects %s', (_label, mutate, expected) => {
    const input = clone(fixture());
    mutate(input);

    expect(() => buildRepositoryPublicApiSnapshot(input)).toThrow(expected);
  });
});
