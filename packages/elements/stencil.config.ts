import type { Config } from '@stencil/core';
import { angularOutputTarget } from '@stencil/angular-output-target';
import { reactOutputTarget } from '@stencil/react-output-target';
import { vueOutputTarget } from '@stencil/vue-output-target';

// The form components declare NO custom events by design: they re-dispatch
// the native `input`/`change` events composed across the shadow boundary and
// sync their mutable value/checked props (spec 034 research D3). The
// framework form idioms therefore bind those native events — Vue-native
// semantics: text entry on `input`, checked/select on `change`.
const formValueBindings = [
  { elements: ['ki-input', 'ki-textarea'], event: 'input', targetAttr: 'value' },
  { elements: ['ki-checkbox', 'ki-switch'], event: 'change', targetAttr: 'checked' },
  { elements: ['ki-select', 'ki-radio-group'], event: 'change', targetAttr: 'value' },
];

// Kimen elements build (constitution Art. I, IV).
// docs-json output feeds the Art. I pipeline: docs-json → CEM → catalog → llms.txt.
// The three framework output targets generate the wrapper packages (spec 034):
// committed sources, drift-gated, client-side only (no hydrate options — the
// SSR/DSD bet stays deferred).
export const config: Config = {
  namespace: 'kimen',
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
      componentModels: formValueBindings,
    }),
    angularOutputTarget({
      componentCorePackage: '@kimen/elements',
      outputType: 'standalone',
      directivesProxyFile: '../angular/src/directives/proxies.ts',
      directivesArrayFile: '../angular/src/directives/index.ts',
      customElementsDir: 'components',
      valueAccessorConfigs: [
        {
          elementSelectors: ['ki-input', 'ki-textarea'],
          event: 'input',
          targetAttr: 'value',
          type: 'text',
        },
        {
          elementSelectors: ['ki-checkbox', 'ki-switch'],
          event: 'change',
          targetAttr: 'checked',
          type: 'boolean',
        },
        {
          elementSelectors: ['ki-select', 'ki-radio-group'],
          event: 'change',
          targetAttr: 'value',
          type: 'select',
        },
      ],
    }),
  ],
  sourceMap: true,
  validatePrimaryPackageOutputTarget: true,
};
