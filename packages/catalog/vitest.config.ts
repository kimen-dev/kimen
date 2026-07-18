import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/catalog') : undefined;

export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: 'catalog',
    // happy-dom gives the guarded-renderer suite (spec 028) a real DOM; the
    // data-only suites (027 validation, catalog derivation) use only Node
    // built-ins and are unaffected by the ambient window.
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
  },
});
