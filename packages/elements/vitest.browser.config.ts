import { defineBrowserCommand, playwright } from '@vitest/browser-playwright';
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
    include: ['browser-tests/**/*.browser.spec.{ts,tsx}'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      screenshotFailures: false,
      commands: {
        emulateColorScheme: defineBrowserCommand(
          async ({ page }, scheme: 'dark' | 'light' | null) => {
            await page.emulateMedia({ colorScheme: scheme });
          },
        ),
        emulateReducedMotion: defineBrowserCommand(
          async ({ page }, reducedMotion: 'reduce' | 'no-preference' | null) => {
            await page.emulateMedia({ reducedMotion });
          },
        ),
        installClock: defineBrowserCommand(async ({ page }) => {
          await page.clock.install();
        }),
        fastForwardClock: defineBrowserCommand(async ({ page }, milliseconds: number) => {
          await page.clock.fastForward(milliseconds);
        }),
        resumeClock: defineBrowserCommand(async ({ page }) => {
          await page.clock.resume();
        }),
      },
      instances: [
        ...browsers.map((browser) => ({
          browser,
          name: `${browser}-light`,
          exclude: [
            'browser-tests/**/*.dark.browser.spec.{ts,tsx}',
            'browser-tests/**/*.motion.browser.spec.{ts,tsx}',
          ],
        })),
        ...browsers.map((browser) => ({
          browser,
          name: `${browser}-dark`,
          include: ['browser-tests/**/*.dark.browser.spec.{ts,tsx}'],
        })),
        ...browsers.map((browser) => ({
          browser,
          name: `${browser}-reduced-motion`,
          include: ['browser-tests/**/*.motion.browser.spec.{ts,tsx}'],
        })),
      ],
    },
  },
});
