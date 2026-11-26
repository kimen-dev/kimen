import { join } from 'node:path';

import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_WORKTREE_CACHE_ROOT'] ?? process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/react-wrapper') : undefined;
const engine = process.env['KIMEN_BROWSER_ENGINE'] ?? 'chromium';
if (engine !== 'chromium' && engine !== 'firefox' && engine !== 'webkit') {
  throw new Error(`Unsupported React wrapper browser: ${engine}`);
}

// Run one real browser per invocation and run structural scenarios in Node.
export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  optimizeDeps: {
    include: ['@stencil/core/internal/client', 'react', 'react-dom/client'],
  },
  test: {
    projects: [
      {
        test: {
          name: 'react-wrapper-browser',
          include: ['tests/**/*.browser.spec.{ts,tsx}'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(
              engine === 'chromium' ? { launchOptions: { channel: engine } } : {},
            ),
            screenshotFailures: false,
            instances: [{ browser: engine, fileParallelism: false }],
          },
        },
      },
      {
        test: {
          name: 'react-wrapper-node',
          environment: 'node',
          include: ['tests/**/*.spec.ts'],
          exclude: ['tests/**/*.browser.spec.{ts,tsx}', '**/node_modules/**'],
        },
      },
    ],
  },
});
