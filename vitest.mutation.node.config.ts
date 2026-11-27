import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: 'reports/cache/vite/mutation-node',
  resolve: {
    // Stryker copies source but omits package dist output.
    alias: {
      '@kimen/catalog': fileURLToPath(new URL('./packages/catalog/src/index.ts', import.meta.url)),
      '../dist/theme-checker-data.mjs': fileURLToPath(
        new URL('./scripts/mutation-tests/fixtures/theme-checker-data.mjs', import.meta.url),
      ),
    },
  },
  test: {
    name: 'node-mutation',
    include: ['scripts/mutation-tests/**/*.spec.mjs'],
    environment: 'node',
  },
});
