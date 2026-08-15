import { join } from 'node:path';

import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/react-wrapper') : undefined;

// Wrapper behavioral scenarios run in REAL Chromium (frontend-qa: happy-dom
// lies about shadow DOM and custom elements); structural scenarios run in
// node. Same Playwright channel selection as the elements harness.
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
            provider: playwright({ launchOptions: { channel: 'chromium' } }),
            screenshotFailures: false,
            instances: [{ browser: 'chromium', fileParallelism: false }],
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
