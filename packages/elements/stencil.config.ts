import { resolve } from 'node:path';
import { angularOutputTarget, type ValueAccessorConfig } from '@stencil/angular-output-target';
import type { Config } from '@stencil/core';
import { reactOutputTarget } from '@stencil/react-output-target';
import { vueOutputTarget } from '@stencil/vue-output-target';

import { readComponentFormBindings } from './scripts/component-metadata.mjs';

// Form controls re-dispatch native input/change events across the shadow
// boundary. The component manifest selects the wrapper binding for its prop.
const formValueBindings = readComponentFormBindings(resolve(__dirname, 'src/components'));

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
  outputTargets: [
    { type: 'dist', esmLoaderPath: '../loader' },
    { type: 'dist-custom-elements', customElementsExportBehavior: 'single-export-module' },
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
