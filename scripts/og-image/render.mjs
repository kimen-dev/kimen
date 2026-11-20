// Render the kimen.dev social card (og:image) to site/og-image.png: 1200×630,
// paper ground, the brand and the landing headline, drawn by Chromium from the
// built onmars token stylesheet and the site's own fonts.
//
// Prerequisite: `pnpm exec nx run @kimen/tokens:build` (tokens.css).
// Usage: node scripts/og-image/render.mjs
import { readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
// Playwright is a dev dependency of @kimen/elements, which owns the browser suite.
const { chromium } = createRequire(new URL('packages/elements/package.json', pathToFileURL(root)))(
  'playwright',
);

const template = await readFile(new URL('./og-image.html', import.meta.url), 'utf8');
const page = new URL('./og-image.rendered.html', import.meta.url);
await writeFile(
  page,
  template.replace('<!-- base -->', `<base href="${pathToFileURL(root).href}" />`),
);

const browser = await chromium.launch();
try {
  const tab = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await tab.goto(page.href);
  await tab.evaluate(() => globalThis.document.fonts.ready);
  const missing = await tab.evaluate(() =>
    ["34px 'Instrument Sans'", '92px Newsreader'].filter(
      (font) => !globalThis.document.fonts.check(font),
    ),
  );
  if (missing.length > 0) throw new Error(`fonts did not load: ${missing.join(', ')}`);
  await tab.screenshot({ path: fileURLToPath(new URL('site/og-image.png', pathToFileURL(root))) });
} finally {
  await browser.close();
  await rm(page, { force: true });
}
console.log('og-image: wrote site/og-image.png (1200×630)');
