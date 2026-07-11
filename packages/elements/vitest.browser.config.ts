import { join } from 'node:path';

import { defineBrowserCommand, playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Real-browser suite (constitution Art. III: component suites never run in
// jsdom/mock-doc alone; Art. IV: engine baseline is verified, not declared).
// Every invocation runs exactly one validated engine. The local suite supplies
// Chromium; prerelease supplies one explicit matrix value per independent job.
const supportedBrowsers = ['chromium', 'firefox', 'webkit'] as const;
type SupportedBrowser = (typeof supportedBrowsers)[number];
const configuredBrowser = process.env['KIMEN_BROWSER_ENGINE'] ?? 'chromium';

if (!supportedBrowsers.some((browser) => browser === configuredBrowser)) {
  throw new Error(
    `KIMEN_BROWSER_ENGINE must be one of ${supportedBrowsers.join(', ')}; received ${configuredBrowser}`,
  );
}

const browser = configuredBrowser as SupportedBrowser;
const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, `vite/elements-browser-${browser}`) : undefined;
// Playwright's default headless Chromium selects a separate headless-shell
// binary. Selecting the installed `chromium` channel makes the executable that
// gates-browser verifies via the public executablePath() API the one launched.
const provider = playwright(
  browser === 'chromium' ? { launchOptions: { channel: 'chromium' } } : undefined,
);

export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: `elements-browser-${browser}`,
    include: ['browser-tests/**/*.browser.spec.{ts,tsx}'],
    browser: {
      enabled: true,
      headless: true,
      provider,
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
        ariaSnapshotByRole: defineBrowserCommand(
          async ({ page }, role: Parameters<typeof page.getByRole>[0], name?: string) =>
            page
              .locator('[data-vitest="true"]')
              .contentFrame()
              .getByRole(role, name === undefined ? undefined : { name })
              .ariaSnapshot({ timeout: 1000 }),
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
        {
          browser,
          name: `${browser}-light`,
          exclude: [
            'browser-tests/**/*.dark.browser.spec.{ts,tsx}',
            'browser-tests/**/*.motion.browser.spec.{ts,tsx}',
          ],
        },
        {
          browser,
          name: `${browser}-dark`,
          include: ['browser-tests/**/*.dark.browser.spec.{ts,tsx}'],
        },
        {
          browser,
          name: `${browser}-reduced-motion`,
          include: ['browser-tests/**/*.motion.browser.spec.{ts,tsx}'],
        },
      ],
    },
  },
});
