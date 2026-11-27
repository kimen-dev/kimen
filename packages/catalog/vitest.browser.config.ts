import { join } from 'node:path';

import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_WORKTREE_CACHE_ROOT'] ?? process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/catalog-browser') : undefined;
const engine = process.env['KIMEN_BROWSER_ENGINE'] ?? 'chromium';
if (engine !== 'chromium' && engine !== 'firefox' && engine !== 'webkit') {
  throw new Error(`Unknown catalog browser engine: ${engine}`);
}

// The guarded renderer's interaction contract (spec 028 S17) depends on real
// native-control activation behavior — a cancelled click reverting a
// checkbox toggle — which happy-dom does not model. These specs run in REAL
// browsers (frontend-qa), with the same Playwright channel selection as the
// elements and wrapper harnesses. They stay dependency-free of
// @kimen/elements (module boundaries: scope:catalog depends on tokens
// only): each spec defines the minimal native-backed element it needs.
export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  optimizeDeps: {
    // Pre-bundled up front so a cold cache never reloads a running spec.
    include: ['zod/mini', 'zod/v4/locales/en.js'],
  },
  test: {
    name: 'catalog-browser',
    include: ['browser-tests/**/*.browser.spec.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(engine === 'chromium' ? { launchOptions: { channel: engine } } : {}),
      screenshotFailures: false,
      instances: [{ browser: engine, fileParallelism: false }],
    },
  },
});
