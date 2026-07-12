import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/elements-node') : undefined;

export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: 'elements-node',
    environment: 'node',
    include: ['scripts/**/*.spec.ts'],
  },
});
