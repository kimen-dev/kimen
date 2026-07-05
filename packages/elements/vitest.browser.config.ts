import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Real-browser suite (constitution Art. III: component suites never run in
// jsdom/mock-doc alone; Art. IV: engine baseline is verified, not declared).
// PR gates run Chromium; the pre-release gate runs the full engine matrix:
//   KIMEN_BROWSER_MATRIX=1 pnpm run test-browser
const browsers = process.env['KIMEN_BROWSER_MATRIX']
  ? (['chromium', 'firefox', 'webkit'] as const)
  : (['chromium'] as const);

export default defineConfig({
  test: {
    include: ['src/**/*.browser.spec.{ts,tsx}'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      screenshotFailures: false,
      instances: browsers.map((browser) => ({ browser })),
    },
  },
});
