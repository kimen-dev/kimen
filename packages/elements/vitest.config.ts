import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineVitestConfig } from '@stencil/vitest/config';
import { configDefaults } from 'vitest/config';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/elements-unit') : undefined;

// Spec tests run in the Stencil mock-doc environment against the built
// lazy-loader output (registered in vitest.setup.mjs), so `test` depends on
// `build` (see nx.json targetDefaults). mock-doc is a fast diagnostic only:
// the REAL component suite is vitest.browser.config.ts (Art. III).
export default defineVitestConfig({
  ...(cacheDir ? { cacheDir } : {}),
  stencilConfig: fileURLToPath(new URL('./stencil.config.ts', import.meta.url)),
  test: {
    name: 'elements-unit',
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '**/*.browser.spec.*'],
    environment: 'stencil',
    setupFiles: ['./vitest.setup.mjs'],
  },
});
