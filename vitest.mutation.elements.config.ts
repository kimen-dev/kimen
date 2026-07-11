import { defineVitestConfig } from '@stencil/vitest/config';

export default defineVitestConfig({
  cacheDir: 'reports/cache/vite/mutation-elements',
  stencilConfig: './packages/elements/stencil.config.ts',
  test: {
    name: 'elements-mutation',
    include: ['packages/elements/src/**/*.spec.{ts,tsx}'],
    environment: 'stencil',
    setupFiles: ['./packages/elements/vitest.setup.mjs'],
  },
});
