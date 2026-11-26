// @spec:018-project-integrity-hardening#S10
// @spec:041-token-deprecation
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  readCanonicalJson,
  readPublicApiCandidate,
  readPublicApiDeclarations,
} from '../gates/check-public-api.mjs';

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
    './icons/*': { types: './icons/_glyph.d.ts', import: './icons/*.js' },
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
    :where(:root) { color-scheme: light dark; }
    [data-ki-color-scheme='light'] { color-scheme: light; }
    [data-ki-color-scheme='dark'] { color-scheme: dark; }
    :root, :where([data-ki-theme]) { --ki-button-bg: light-dark(#ffffff, #111111); }
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
  assert.deepEqual(elements.modules['./icons/*'], {
    declaration: null,
    symbols: {},
    target: './icons/*.js',
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

test('S2 the public API snapshot records a token deprecation on its facet', () => {
  const deprecation = {
    reason: 'Nothing paints it.',
    since: '0.1.0',
    removal: '1.0.0',
    replacement: '--ki-button-fg',
  };
  const snapshot = build({
    tokenInventory: {
      ...tokenInventory,
      publicTokens: tokenInventory.publicTokens.map((token) => ({ ...token, deprecation })),
    },
  });

  assert.deepEqual(snapshot.surface.packages['@kimen/tokens'].tokens['--ki-button-bg'], {
    default: '#ffffff',
    deprecatedSince: '0.1.0',
    description: 'Button background color.',
    replacement: '--ki-button-fg',
    required: false,
    type: 'color',
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

function assertInventory(before, after, prefix, declaredPaths) {
  const oldNames = Object.keys(before);
  const newNames = Object.keys(after);
  const additions = newNames.filter((name) => !Object.hasOwn(before, name));
  const removals = oldNames.filter((name) => !Object.hasOwn(after, name));
  const delta = Object.fromEntries(
    [...additions, ...removals].map((name) => [
      `${prefix}/${name.replaceAll('~', '~0').replaceAll('/', '~1')}`,
      additions.includes(name) ? 1 : -1,
    ]),
  );
  for (const path of Object.keys(delta)) {
    assert.ok(declaredPaths.has(path), `Missing inventory declaration for ${path}`);
  }
  const declaredDelta = [...declaredPaths].reduce((total, path) => total + (delta[path] ?? 0), 0);
  assert.equal(newNames.length, oldNames.length + declaredDelta);
}

test('[S10] repository inventories agree with the protected baseline and active API declarations', async () => {
  const baseline = await readCanonicalJson(
    'baseline',
    fileURLToPath(new URL('../../changes/api/baselines/0.0.0.json', import.meta.url)),
  );
  const candidate = await readPublicApiCandidate(
    fileURLToPath(new URL('../../packages/elements/generated/public-api', import.meta.url)),
  );
  const declarations = await readPublicApiDeclarations(
    fileURLToPath(new URL('../../changes/api', import.meta.url)),
    { baseline },
  );
  const result = evaluatePublicApiChange({ baseline, candidate, declarations });

  assert.equal(result.decision, 'passed', result.reasons.join('\n'));
  assert.deepEqual(result.newRootSymbols, []);
  const declaredPaths = new Set(declarations.flatMap(({ deltas }) => Object.keys(deltas)));
  const before = baseline.surface.packages;
  const after = candidate.surface.packages;
  for (const field of ['components', 'rootSymbols']) {
    assertInventory(
      before['@kimen/elements'][field],
      after['@kimen/elements'][field],
      `/packages/@kimen~1elements/${field}`,
      declaredPaths,
    );
  }
  const tokenBaseline = before['@kimen/tokens'].tokens;
  const tokenPackage = after['@kimen/tokens'];
  const published = tokenPackage.tokens;
  for (const subpath of ['./css/onmars-fonts.css', './css/material3-fonts.css']) {
    assert.equal(tokenPackage.exports[subpath].target, subpath);
    assert.equal(Object.hasOwn(tokenPackage.stylesheets, subpath), false);
  }
  const tokenPath = '/packages/@kimen~1tokens/tokens';
  assertInventory(tokenBaseline, published, tokenPath, declaredPaths);
  for (const values of Object.values(tokenPackage.stylesheets['./css'].contexts)) {
    assert.deepEqual(Object.keys(values), Object.keys(published));
  }

  const deprecated = (inventory) =>
    Object.entries(inventory).filter(([, token]) => token.deprecatedSince);
  const beforeDeprecated = new Map(deprecated(tokenBaseline));
  const afterDeprecated = new Map(deprecated(published));
  let declaredDeprecationDelta = 0;
  for (const name of new Set([...beforeDeprecated.keys(), ...afterDeprecated.keys()])) {
    const added = afterDeprecated.has(name);
    if (added === beforeDeprecated.has(name)) continue;
    const path = `${tokenPath}/${name}`;
    assert.ok(
      declaredPaths.has(path) || declaredPaths.has(`${path}/deprecatedSince`),
      `Missing deprecation declaration for ${name}`,
    );
    declaredDeprecationDelta += added ? 1 : -1;
  }
  assert.equal(afterDeprecated.size, beforeDeprecated.size + declaredDeprecationDelta);
  for (const { deprecatedSince, replacement } of afterDeprecated.values()) {
    assert.match(deprecatedSince, /^\d+\.\d+\.\d+/u);
    assert.ok(
      Object.hasOwn(published, replacement),
      `Missing published replacement ${replacement}`,
    );
  }
});
