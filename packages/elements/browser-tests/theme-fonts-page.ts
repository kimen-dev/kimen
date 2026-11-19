import { fileURLToPath } from 'node:url';

import type { Page } from 'playwright';

const origin = 'http://kimen-fonts.test';
const tokenSheet = import.meta.resolve('@kimen/tokens/css');
const packageRoot = new URL('../../', tokenSheet);

function publicPath(url: string) {
  return '/' + url.slice(packageRoot.href.length);
}

function fontPage(theme: 'onmars' | 'material3', withFonts: boolean) {
  const themeSheet =
    theme === 'material3'
      ? `<link rel="stylesheet" href="${publicPath(import.meta.resolve('@kimen/tokens/css/material3'))}">`
      : '';
  const fontSheet = withFonts
    ? `<link rel="stylesheet" href="${publicPath(import.meta.resolve('@kimen/tokens/css/onmars-fonts.css'))}">`
    : '';
  // Preview the #341 family values with the adjusted aliases. This is a
  // consumer override; the published onmars defaults still use Inter.
  const onmarsPreview =
    theme === 'onmars'
      ? `--ki-typography-family-body: 'Instrument Sans', 'Instrument Sans Fallback', system-ui, sans-serif;
         --ki-typography-family-display: 'Newsreader', 'Newsreader Fallback', Georgia, serif;`
      : '';
  return `<!doctype html>
<html lang="en" data-ki-theme="${theme}">
<meta charset="utf-8">
<title>Theme font swap</title>
<link rel="stylesheet" href="${publicPath(tokenSheet)}">
${themeSheet}
${fontSheet}
<style>
  main { ${onmarsPreview} max-inline-size: 32rem; }
  p { font-family: var(--ki-typography-family-body); }
  h1 { font-family: var(--ki-typography-family-display); }
</style>
<main>
  <h1><span>Make room for good ideas</span></h1>
  <p><span>Pick a theme and build with it. Both fonts are tested on a page built from the tokens.</span></p>
  <hr>
</main>`;
}

async function measure(page: Page) {
  return page.evaluate(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => { resolve(); })),
    );
    const widths = [...document.querySelectorAll('main span')].map(
      (sample) => sample.getBoundingClientRect().width,
    );
    return {
      widths,
      markerTop: document.querySelector('hr')?.getBoundingClientRect().top,
      faces: [...document.fonts].map(({ family, status }) => ({ family, status })),
    };
  });
}

interface ThemeFontMeasurement {
  before: Awaited<ReturnType<typeof measure>>;
  after: Awaited<ReturnType<typeof measure>>;
  requests: string[];
  cls: number | null;
}

export async function measureThemeFonts(
  page: Page,
  theme: 'onmars' | 'material3',
  withFonts: boolean,
): Promise<ThemeFontMeasurement> {
  const markup = fontPage(theme, withFonts);
  const sample = await page.context().newPage();
  const requests: string[] = [];
  let releaseFonts: () => void = () => undefined;
  const pendingFonts = new Promise<void>((resolve) => {
    releaseFonts = resolve;
  });
  try {
    await sample.setViewportSize({ width: 640, height: 480 });
    await sample.route(origin + '/**', async (route) => {
      const request = route.request();
      const { pathname } = new URL(request.url());
      if (pathname === '/') {
        await route.fulfill({ contentType: 'text/html', body: markup });
        return;
      }
      if (request.resourceType() === 'font') {
        requests.push(pathname);
        await pendingFonts;
      }
      await route.fulfill({ path: fileURLToPath(new URL(pathname.slice(1), packageRoot)) });
    });
    await sample.goto(origin, { waitUntil: 'domcontentloaded' });

    // Retain the observer on the page until the delayed requests finish.
    const shift = await sample.evaluateHandle(() => {
      if (!PerformanceObserver.supportedEntryTypes.includes('layout-shift')) return null;
      const state = {
        value: 0,
        observer: new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) state.value += entry.value;
          }
        }),
      };
      state.observer.observe({ type: 'layout-shift' });
      return state;
    });
    const before = await measure(sample);
    releaseFonts();
    await sample.evaluate(async () => {
      await document.fonts.ready;
    });
    const after = await measure(sample);
    const cls = await shift.evaluate((state) => state?.value ?? null);
    return { before, after, requests, cls };
  } finally {
    releaseFonts();
    await sample.close();
  }
}
