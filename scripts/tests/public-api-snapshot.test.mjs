// @spec:018-project-integrity-hardening#S10
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { canonicalJsonSha256 } from '../lib/canonical-json.mjs';
import { evaluatePublicApiChange } from '../lib/public-api.mjs';
import {
  buildRepositoryPublicApiSnapshot,
  completeCemMethodSignatures,
  normalizePrintedSignature,
} from '../lib/public-api-snapshot.mjs';

const elementsPackage = {
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
};

const tokensPackage = {
  name: '@kimen/tokens',
  version: '0.0.0',
  exports: { './css': './dist/css/tokens.css' },
};

const componentSubpaths = [
  {
    publicSubpath: './ki-button',
    types: './dist/components/ki-button.d.ts',
    import: './dist/components/ki-button.js',
  },
];

const declarationSources = {
  '@kimen/elements': {
    packageRoot: '/virtual/kimen-elements',
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
          focusButton(target: HTMLElement, preventScroll?: boolean): Promise<void>;
        }
      `,
      './loader/index.d.ts': `
        export * from '../dist/types/components';
        export interface DefineOptions { exclude?: string[]; }
        export declare function defineCustomElements(
          win?: Window,
          options?: DefineOptions,
        ): void;
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
};

const rootContract = {
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
};

const docs = {
  components: [
    {
      tag: 'ki-button',
      props: [
        {
          name: 'variant',
          attr: 'variant',
          required: true,
        },
      ],
      methods: [
        {
          name: 'focusButton',
          parameters: [
            { name: 'target', type: 'HTMLElement', docs: 'Element to receive focus.' },
            {
              name: 'preventScroll',
              type: 'boolean',
              docs: 'Avoid scrolling the target into view.',
              optional: true,
              default: 'false',
            },
          ],
        },
      ],
    },
  ],
};

const manifest = {
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
                  name: 'target',
                  type: { text: 'HTMLElement' },
                  description: 'Element to receive focus.',
                },
                {
                  name: 'preventScroll',
                  type: { text: 'boolean' },
                  description: 'Avoid scrolling the target into view.',
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
};

const tokenInventory = {
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
};

const defaultTokenComposition = {
  id: 'onmars-light',
  records: [
    {
      path: 'ki.button.bg',
      cssName: '--ki-button-bg',
      public: true,
      resolvedValue: '#ffffff',
    },
  ],
};

const stylesheetSources = {
  './css': `
    :root { --ki-button-bg: #ffffff; }
    @media (prefers-color-scheme: dark) {
      :root:not([data-ki-color-scheme='light']) { --ki-button-bg: #111111; }
    }
    :root[data-ki-color-scheme='dark'] { --ki-button-bg: #111111; }
  `,
};

const build = (overrides = {}) =>
  buildRepositoryPublicApiSnapshot({
    elementsPackage,
    tokensPackage,
    componentSubpaths,
    rootContract,
    docs,
    manifest,
    tokenInventory,
    defaultTokenComposition,
    stylesheetSources,
    declarationSources,
    browserBaseline: ['webkit', 'chromium', 'firefox'],
    ...overrides,
  });

test('[S10] repository snapshot expands exports and inventories every public surface', () => {
  const snapshot = build();
  const elements = snapshot.surface.packages['@kimen/elements'];
  const tokens = snapshot.surface.packages['@kimen/tokens'];
  const button = elements.components['ki-button'];

  assert.deepEqual(snapshot.surface.browserBaseline, ['chromium', 'firefox', 'webkit']);
  assert.equal(snapshot.surfaceSha256, canonicalJsonSha256(snapshot.surface));
  assert.deepEqual(snapshot, build());
  const relocatedSources = JSON.parse(JSON.stringify(declarationSources));
  relocatedSources['@kimen/elements'].packageRoot = '/another/checkout/kimen-elements';
  assert.deepEqual(snapshot, build({ declarationSources: relocatedSources }));
  assert.equal(Object.hasOwn(elements.exports, './ki-*'), false);
  assert.deepEqual(elements.exports['./ki-button'], {
    deprecatedSince: null,
    replacement: null,
    target: './dist/components/ki-button.js',
  });
  assert.deepEqual(elements.rootSymbols.KiButtonVariant, {
    deprecatedSince: '0.0.0',
    replacement: '@kimen/elements/ki-button',
    target: './dist/components/ki-button.js',
  });
  assert.equal(button.properties.variant.required, true);
  assert.equal(button.attributes.variant.required, true);
  assert.equal(button.methods.focusButton.type, 'Promise<void>');
  assert.equal(
    button.methods.focusButton.signature,
    'focusButton(target: HTMLElement, preventScroll?: boolean = false) => Promise<void>',
  );
  assert.deepEqual(button.methods.focusButton.parameters, [
    { default: null, name: 'target', optional: false, rest: false, type: 'HTMLElement' },
    {
      default: 'false',
      name: 'preventScroll',
      optional: true,
      rest: false,
      type: 'boolean',
    },
  ]);
  assert.equal(button.cssProperties['--ki-button-bg'].description, 'Button background color.');
  assert.deepEqual(elements.modules['./ki-button'], {
    declaration: './dist/components/ki-button.d.ts',
    symbols: {
      KiButton: {
        kinds: ['value'],
        signature:
          'export const KiButton: {\n    prototype: HTMLElement;\n    new (): HTMLElement;\n};',
      },
      KiButtonVariant: {
        kinds: ['type'],
        signature: "export type KiButtonVariant = 'primary' | 'secondary';",
      },
      defineCustomElement: {
        kinds: ['value'],
        signature: 'export const defineCustomElement: () => void;',
      },
    },
    target: './dist/components/ki-button.js',
  });
  assert.deepEqual(elements.modules['.'].symbols.KiButton.kinds, ['type', 'value']);
  assert.match(elements.modules['.'].symbols.KiButton.signature, /variant: KiButtonVariant/u);
  assert.doesNotMatch(elements.modules['.'].symbols.KiButton.signature, /internalState/u);
  assert.equal(
    elements.modules['./loader'].symbols.defineCustomElements.signature,
    'export declare function defineCustomElements(win?: Window, options?: DefineOptions): void;',
  );
  assert.deepEqual(elements.modules['./loader'].symbols.LoaderOnly, {
    kinds: ['type'],
    signature: "export type LoaderOnly = 'loader-public-type';",
  });
  assert.deepEqual(elements.modules['./loader'].symbols.Components.kinds, ['namespace']);
  assert.deepEqual(tokens.tokens['--ki-button-bg'], {
    default: '#ffffff',
    deprecatedSince: null,
    description: 'Button background color.',
    replacement: null,
    required: false,
    type: 'color',
  });
  assert.deepEqual(tokens.modules['./css'], {
    declaration: null,
    symbols: {},
    target: './dist/css/tokens.css',
  });
  assert.deepEqual(tokens.stylesheets, {
    './css': {
      contexts: {
        dark: { '--ki-button-bg': '#111111' },
        light: { '--ki-button-bg': '#ffffff' },
      },
      target: './dist/css/tokens.css',
    },
  });
});

test('[S10] module signatures normalize an explicitly exported merged interface', () => {
  assert.equal(
    normalizePrintedSignature('export interface KiButton extends HTMLElement {\n}'),
    normalizePrintedSignature('interface KiButton extends HTMLElement {\n}'),
  );
});

test('[S10] shipped CEM method signatures preserve parameter optionality and defaults', () => {
  const completed = completeCemMethodSignatures({ manifest, docs });
  const method = completed.modules[0].declarations[0].members[1];

  assert.equal(
    method.signature,
    'focusButton(target: HTMLElement, preventScroll?: boolean = false) => Promise<void>',
  );
  assert.deepEqual(method.parameters, [
    {
      description: 'Element to receive focus.',
      name: 'target',
      optional: false,
      rest: false,
      type: { text: 'HTMLElement' },
    },
    {
      default: 'false',
      description: 'Avoid scrolling the target into view.',
      name: 'preventScroll',
      optional: true,
      rest: false,
      type: { text: 'boolean' },
    },
  ]);
  assert.equal(Object.hasOwn(manifest.modules[0].declarations[0].members[1], 'signature'), false);
});

test('[S10] a CEM method parameter signature change is classified conservatively', () => {
  const candidateManifest = JSON.parse(JSON.stringify(manifest));
  candidateManifest.modules[0].declarations[0].members[1].parameters[1].optional = false;
  const baseline = build();
  const candidate = build({ manifest: candidateManifest });

  const result = evaluatePublicApiChange({ baseline, candidate, declaration: null });

  assert.notEqual(candidate.surfaceSha256, baseline.surfaceSha256);
  assert.equal(result.release, 'major');
  assert.equal(result.decision, 'blocked');
});

for (const [label, mutate] of [
  [
    'removed symbol',
    (input) => {
      input.declarationSources['@kimen/elements'].files['./dist/components/ki-button.d.ts'] =
        input.declarationSources['@kimen/elements'].files[
          './dist/components/ki-button.d.ts'
        ].replace('export const defineCustomElement: () => void;', '');
    },
  ],
  [
    'renamed symbol',
    (input) => {
      input.declarationSources['@kimen/elements'].files['./loader/index.d.ts'] =
        input.declarationSources['@kimen/elements'].files['./loader/index.d.ts'].replace(
          'defineCustomElements',
          'registerCustomElements',
        );
    },
  ],
  [
    'changed signature',
    (input) => {
      input.declarationSources['@kimen/elements'].files['./loader/index.d.ts'] =
        input.declarationSources['@kimen/elements'].files['./loader/index.d.ts'].replace(
          'options?: DefineOptions',
          'options: DefineOptions',
        );
    },
  ],
]) {
  test(`[S10] a ${label} changes the digest and is classified conservatively`, () => {
    const baselineInput = {
      elementsPackage,
      tokensPackage,
      componentSubpaths,
      rootContract,
      docs,
      manifest,
      tokenInventory,
      defaultTokenComposition,
      declarationSources,
      browserBaseline: ['chromium', 'firefox', 'webkit'],
    };
    const candidateInput = JSON.parse(JSON.stringify(baselineInput));
    mutate(candidateInput);

    const baseline = buildRepositoryPublicApiSnapshot(baselineInput);
    const candidate = buildRepositoryPublicApiSnapshot(candidateInput);
    const result = evaluatePublicApiChange({ baseline, candidate, declaration: null });

    assert.notEqual(candidate.surfaceSha256, baseline.surfaceSha256);
    assert.equal(result.release, 'major');
    assert.equal(result.decision, 'blocked');
  });
}

test('[S10] repository snapshot rejects a manifest module that is not the public export target', () => {
  const invalidManifest = JSON.parse(JSON.stringify(manifest));
  invalidManifest.modules[0].path = 'src/components/ki-button/ki-button.tsx';

  assert.throws(
    () => build({ manifest: invalidManifest }),
    /ki-button manifest path must equal its published module target/u,
  );
});

test('[S10] repository snapshot rejects a public token without an onmars-light default', () => {
  assert.throws(
    () => build({ defaultTokenComposition: { id: 'onmars-light', records: [] } }),
    /--ki-button-bg.*onmars-light resolved default/u,
  );
});

test('[S10] sealed repository candidate is digest-bound without removals or root growth', async () => {
  const [baseline, candidate, declaration] = await Promise.all(
    [
      '../../changes/api/baselines/0.0.0.json',
      '../../packages/elements/generated/public-api.json',
      '../../changes/api/001-tokens-theming-material3.json',
    ].map(async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))),
  );

  const result = evaluatePublicApiChange({ baseline, candidate, declaration });

  assert.equal(candidate.surfaceSha256, declaration.candidateSha256);
  // Fase T declares deliberate effective-value changes (dialog/tooltip/listbox
  // sizes, tooltip shadow, list dividers) — a digest-bound MAJOR declaration.
  assert.equal(result.release, 'major');
  assert.equal(result.decision, 'passed');
  assert.deepEqual(result.removals, []);
  assert.deepEqual(result.newRootSymbols, []);
  assert.equal(Object.keys(candidate.surface.packages['@kimen/elements'].components).length, 20);
  assert.equal(Object.keys(candidate.surface.packages['@kimen/elements'].rootSymbols).length, 32);
  assert.equal(Object.keys(candidate.surface.packages['@kimen/tokens'].tokens).length, 986);
  assert.equal(
    Object.keys(candidate.surface.packages['@kimen/tokens'].stylesheets['./css'].contexts.light)
      .length,
    986,
  );
});
