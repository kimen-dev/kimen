import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/adapter-a2ui') : undefined;

export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: 'adapter-a2ui',
    // happy-dom gives the guarded renderer (spec 028) a real DOM for the
    // end-to-end scenarios; the pure translation and coverage suites use only
    // Node built-ins and are unaffected by the ambient window.
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
  },
});
