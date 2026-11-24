import { join } from 'node:path';

import { defineBrowserCommand, playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_WORKTREE_CACHE_ROOT'] ?? process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/adapter-mcp-apps-browser') : undefined;

// The packaged surface document is only proven where it runs: inside a
// sandboxed frame of a real engine, driven by nothing but `postMessage`
// (spec 030 S16–S19). happy-dom cannot say whether a custom element is
// registered, whether its shadow tree is styled by the tokens, or whether the
// document's own content policy lets it work at all. Same Playwright channel
// selection as the elements, wrapper and catalog harnesses.
export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  optimizeDeps: {
    // The host double imports the adapter's public entry, which reaches the
    // catalog validator; the reference host (spec 040 S15) is the SDK's own
    // AppBridge. Pre-bundled up front so a cold cache never reloads a running
    // spec.
    include: ['@kimen/catalog > zod', '@modelcontextprotocol/ext-apps/app-bridge'],
  },
  test: {
    name: 'adapter-mcp-apps-browser',
    include: ['browser-tests/**/*.browser.spec.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: 'chromium' } }),
      screenshotFailures: false,
      instances: [{ browser: 'chromium', fileParallelism: false }],
      commands: {
        // `null` restores the suite baseline (no-preference), never the
        // machine's own Reduce Motion setting: the elements harness rule.
        emulateReducedMotion: defineBrowserCommand(
          async ({ page }, reducedMotion: 'reduce' | 'no-preference' | null) => {
            await page.emulateMedia({ reducedMotion: reducedMotion ?? 'no-preference' });
          },
        ),
      },
    },
  },
});
