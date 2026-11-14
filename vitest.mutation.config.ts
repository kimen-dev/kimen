import { defineConfig } from 'vitest/config';

export default defineConfig({
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
          include: ['packages/elements/src/**/*.spec.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
