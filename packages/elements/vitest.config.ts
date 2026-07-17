import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineVitestConfig } from '@stencil/vitest/config';
import { configDefaults } from 'vitest/config';

// The explicit .ts extension keeps this config importable by plain Node type
// stripping (scripts/tests/browser-gates.test.mjs loads it without a bundler).
import { coverageOptions, distSourceCoveragePlugin } from './vitest.coverage.config.ts';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/elements-unit') : undefined;

// Spec tests run in the Stencil mock-doc environment against the built
// lazy-loader output (registered in vitest.setup.mjs), so `test` depends on
// `build` (see nx.json targetDefaults). mock-doc is a fast diagnostic only:
// the REAL component suite is vitest.browser.config.ts (Art. III).
export default defineVitestConfig({
  ...(cacheDir ? { cacheDir } : {}),
  plugins: [distSourceCoveragePlugin],
  stencilConfig: fileURLToPath(new URL('./stencil.config.ts', import.meta.url)),
  test: {
    name: 'elements-unit',
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '**/*.browser.spec.*'],
    environment: 'stencil',
    setupFiles: ['./vitest.setup.mjs'],
    // The unit suite executes components through the built lazy loader
    // (vitest.setup.mjs). Component code lives in dist/kimen p-* chunks —
    // both the *.entry.js chunks AND shared non-entry chunks (e.g. the
    // ki-select/ki-radio-group form controllers), so the pattern must match
    // all of them. Pure runtime chunks remap onto @stencil/* sources, which
    // excludeAfterRemap already drops from the report.
    coverage: coverageOptions('elements-unit', ['dist/kimen/p-*.js']),
  },
});
