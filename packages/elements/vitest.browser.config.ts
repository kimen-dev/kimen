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
        // The real computed accessibility tree (Playwright's ariaSnapshot,
        // returned as a YAML role/name outline). Needed for roles set via
        // ElementInternals.role, which dom-accessibility-api (getByRole) and
        // axe-core cannot read — the only way to verify list OWNERSHIP rather
        // than reading back the value the component set.
        ariaSnapshot: defineBrowserCommand(async ({ page }, selector: string) => {
          // The test DOM lives in vitest's tester iframe, not the top page —
          // resolve the selector inside whichever frame actually contains it.
          for (const frame of page.frames()) {
            const locator = frame.locator(selector);
            if ((await locator.count()) > 0) {
              return locator.first().ariaSnapshot();
            }
          }
          throw new Error(`ariaSnapshot: no frame contains ${selector}`);
        }),
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
