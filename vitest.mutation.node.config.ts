import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'node-mutation',
    include: ['scripts/mutation-tests/**/*.spec.mjs'],
    environment: 'node',
  },
});
