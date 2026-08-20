import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/emitter') : undefined;

export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: 'emitter',
    // Pure data derivation (spec 033): no DOM anywhere in the kit — the
    // node environment keeps the suite honest about that constraint.
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
});
