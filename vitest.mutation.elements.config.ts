import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import browserConfig from './packages/elements/vitest.browser.config.ts';
import unitConfig from './packages/elements/vitest.config.ts';

// Keep both suites: mock-doc covers pure helpers and cheap rendering checks;
// Chromium exercises slot assignment, focus, timers and native form/dialog APIs.
// Both outputs are rebuilt from Stryker's instrumented source in each sandbox.
const root = fileURLToPath(new URL('./packages/elements/', import.meta.url));
const browserTest = browserConfig.test;
if (!browserTest?.browser) throw new Error('Elements mutation requires the browser test config');

export default defineConfig(async () => ({
  cacheDir: 'reports/cache/vite/mutation-elements',
  test: {
    projects: [
      {
        ...(await unitConfig),
        root,
        cacheDir: '../../reports/cache/vite/mutation-elements-unit',
      },
      {
        ...browserConfig,
        root,
        cacheDir: '../../reports/cache/vite/mutation-elements-browser',
        test: {
          ...browserTest,
          // Include the base component behavior contracts. This glob leaves out
          // screenshot galleries (.visual/.dark), *.motion behavior contracts,
          // pointer-capability, flows, axe-settle and tokens-theming.
          // Adding those suites to mutation is a follow-up.
          include: ['browser-tests/ki-+([a-z-]).browser.spec.ts'],
          browser: {
            ...browserTest.browser,
            instances: [{ browser: 'chromium' as const, fileParallelism: false }],
          },
        },
      },
    ],
  },
}));
