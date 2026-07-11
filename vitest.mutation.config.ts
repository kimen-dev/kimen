import { defineVitestConfig } from '@stencil/vitest/config';

export default defineVitestConfig({
  stencilConfig: './packages/elements/stencil.config.ts',
  test: {
    projects: [
      {
        test: {
          name: 'node-mutation',
          include: ['scripts/mutation-tests/**/*.spec.mjs'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'elements-mutation',
          include: ['packages/elements/src/**/*.spec.{ts,tsx}'],
          environment: 'stencil',
          setupFiles: ['./packages/elements/vitest.setup.mjs'],
        },
      },
    ],
  },
});
