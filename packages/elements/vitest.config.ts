import { join } from 'node:path';

import { configDefaults, defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_WORKTREE_CACHE_ROOT'] ?? process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/elements-unit') : undefined;

// Pure-logic unit suite. It runs the helper modules that sit beside each
// component (`*.form.ts`, `*.keyboard.ts`, `*.math.ts`, `*.position.ts`, ...)
// and `src/utils` in plain node, straight from their TypeScript source: no
// Stencil build, no simulated DOM. Nothing renders here. Every component
// behavior is asserted in a real browser by vitest.browser.config.ts
// (Art. III), which is also the only suite that measures coverage.
export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: 'elements-unit',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: [...configDefaults.exclude, '**/*.browser.spec.ts'],
  },
});
