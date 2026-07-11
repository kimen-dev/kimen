import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: 'reports/cache/vite/mutation-node',
  test: {
    name: 'node-mutation',
    include: ['scripts/mutation-tests/**/*.spec.mjs'],
    environment: 'node',
  },
});
