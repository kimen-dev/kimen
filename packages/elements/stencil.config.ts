import { resolve } from 'node:path';
import { angularOutputTarget, type ValueAccessorConfig } from '@stencil/angular-output-target';
import type { Config } from '@stencil/core';
import { parseFlags } from '@stencil/core/cli';
import { reactOutputTarget } from '@stencil/react-output-target';
import { vueOutputTarget } from '@stencil/vue-output-target';

import { booleanAttributes } from './scripts/boolean-attributes.mjs';
import { compactButtonPalette } from './scripts/compact-button-palette';
import { componentChunkNames } from './scripts/component-chunk-names.mjs';
import { readComponentFormBindings } from './scripts/component-metadata.mjs';
import { glyphChunks } from './scripts/glyph-chunks';
import { shareShadowStyles } from './scripts/share-shadow-styles';
import { shortVdomKeys } from './scripts/short-vdom-keys.mjs';

// Form controls re-dispatch native input/change events across the shadow
// boundary. The component manifest selects the wrapper binding for its prop.
const formValueBindings = readComponentFormBindings(resolve(__dirname, 'src/components'));

// Stencil's CLI defaults to production and gives --prod precedence over --dev.
// HMR can diff against the previous build's VNodes, where the same ordinal
// short key may have belonged to another element.
const { dev, prod, watch } = parseFlags(process.argv.slice(2));

// Kimen elements build (constitution Art. I, IV).
// docs-json output feeds the Art. I pipeline: docs-json → CEM → catalog → llms.txt.
// The three framework output targets generate the wrapper packages (spec 034):
// committed sources, drift-gated, client-side only (no hydrate options — the
// SSR/DSD bet stays deferred).
export const config: Config = {
  namespace: 'kimen',
  // Component-local browser specs consume dist, which does not exist on a
  // cold build. The regular TypeScript gate still checks those specs and the
  // gallery fixtures after the build has produced the public types.
  tsconfig: 'tsconfig.stencil.json',
  // Glyph chunks get the prefix package.json `sideEffects` declares. The
  // plugin resolves the glyph modules' registry import, so it runs before
  // Stencil's node resolution. After Stencil's transforms, the button
  // palette is compacted and 40-character vDOM keys are shortened in
  // both production builds.
  rollupPlugins: {
    before: [
      // Stencil's runtime reads `attr="false"` as false on every component,
      // form-associated or not, and the per-component build keeps readable
      // chunk names, its runtime's among them, for the glyph prefix to wrap.
      booleanAttributes,
      componentChunkNames,
      ...(watch || (dev && !prod) ? [] : [shareShadowStyles(resolve(__dirname, 'src'))]),
      glyphChunks(resolve(__dirname, 'icons'), resolve(__dirname, 'src/utils/icon-registry.mjs')),
    ],
    after: dev && !prod ? [compactButtonPalette] : [compactButtonPalette, shortVdomKeys],
  },
  outputTargets: [
    // Retain the browseable site build (dist/kimen) and declarations, including
    // the loader's types. The post-build pass writes the published ESM loader
    // over dist/components and the deprecated root facade.
    { type: 'dist', esmLoaderPath: '../loader', collectionDir: null },
    // The per-component modules bundle Stencil's client runtime, compiled with
    // the build flags Kimen's components use, instead of importing the generic
    // one from @stencil/core: a page that registers one ki-button downloads
    // a runtime of a third the size, and the package has no runtime dependency.
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'single-export-module',
      externalRuntime: false,
    },
    { type: 'docs-json', file: 'generated/docs.json' },
    reactOutputTarget({
      outDir: '../react/src',
      stencilPackageName: '@kimen/elements',
      customElementsDir: 'components',
      esModules: true,
    }),
    vueOutputTarget({
      componentCorePackage: '@kimen/elements',
      proxiesFile: '../vue/src/index.ts',
      includeImportCustomElements: true,
      customElementsDir: 'components',
      esModules: true,
      componentModels: formValueBindings.map(({ tags, event, prop }) => ({
        elements: tags,
        event,
        targetAttr: prop,
      })),
    }),
    angularOutputTarget({
      componentCorePackage: '@kimen/elements',
      outputType: 'standalone',
      directivesProxyFile: '../angular/src/directives/proxies.ts',
      directivesArrayFile: '../angular/src/directives/index.ts',
      customElementsDir: 'components',
      valueAccessorConfigs: formValueBindings.map(({ tags, event, prop, type }) => ({
        elementSelectors: tags,
        event,
        targetAttr: prop,
        type: type as ValueAccessorConfig['type'],
      })),
    }),
  ],
  sourceMap: true,
  validatePrimaryPackageOutputTarget: true,
};
