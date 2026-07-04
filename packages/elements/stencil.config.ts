import type { Config } from '@stencil/core';

// Kimen elements build (constitution Art. I, IV).
// docs-json output feeds the Art. I pipeline: docs-json → CEM → catalog → llms.txt.
export const config: Config = {
  namespace: 'kimen',
  outputTargets: [
    { type: 'dist', esmLoaderPath: '../loader' },
    { type: 'dist-custom-elements', customElementsExportBehavior: 'single-export-module' },
    { type: 'docs-json', file: 'generated/docs.json' },
  ],
  sourceMap: true,
  validatePrimaryPackageOutputTarget: true,
};
