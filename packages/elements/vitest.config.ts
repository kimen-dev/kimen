import { configDefaults } from 'vitest/config';
import { defineVitestConfig } from '@stencil/vitest/config';

// Spec tests run in the Stencil mock-doc environment against the built
// lazy-loader output (registered in vitest.setup.mjs), so `test` depends on
// `build` (see nx.json targetDefaults). mock-doc is a fast diagnostic only:
// the REAL component suite is vitest.browser.config.ts (Art. III).
export default defineVitestConfig({
  stencilConfig: './stencil.config.ts',
  test: {
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '**/*.browser.spec.*'],
    environment: 'stencil',
    setupFiles: ['./vitest.setup.mjs'],
  },
});
