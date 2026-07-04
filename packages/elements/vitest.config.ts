import { defineVitestConfig } from '@stencil/vitest/config';

// Spec tests run in the Stencil mock-doc environment against the built
// lazy-loader output (registered in vitest.setup.mjs), so `test` depends on
// `build` (see nx.json targetDefaults). Browser/e2e projects land in Fase 1+.
export default defineVitestConfig({
  stencilConfig: './stencil.config.ts',
  test: {
    include: ['src/**/*.spec.{ts,tsx}'],
    environment: 'stencil',
    setupFiles: ['./vitest.setup.mjs'],
  },
});
