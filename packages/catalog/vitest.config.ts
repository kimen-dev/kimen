import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/catalog') : undefined;

export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: 'catalog',
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
});
