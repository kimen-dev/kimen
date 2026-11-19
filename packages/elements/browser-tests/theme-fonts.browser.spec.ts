// @spec:064-theme-fonts
import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import type { measureThemeFonts } from './theme-fonts-page';

const browserCommands = commands as unknown as {
  measureThemeFonts: (
    theme: 'onmars' | 'material3',
    withFonts: boolean,
  ) => ReturnType<typeof measureThemeFonts>;
};

it('S1 swaps both onmars v2 faces into the page with CLS below 0.01', async () => {
  const { before, after, requests, cls } = await browserCommands.measureThemeFonts('onmars', true);

  expect(requests.sort()).toEqual([
    '/fonts/InstrumentSansVariable.woff2',
    '/fonts/NewsreaderVariable.woff2',
  ]);
  for (const family of ['Instrument Sans', 'Newsreader']) {
    expect(before.faces).toContainEqual({ family, status: 'loading' });
    expect(after.faces).toContainEqual({ family, status: 'loaded' });
  }
  expect(before.widths.every((width) => width > 0)).toBe(true);
  expect(after.widths).not.toEqual(before.widths);
  if (cls === null) {
    // Firefox and WebKit do not expose LayoutShift entries.
    expect(after.markerTop).toBeCloseTo(before.markerTop ?? Number.NaN, 0);
  } else {
    expect(cls).toBeLessThan(0.01);
  }
});

it.each(['onmars', 'material3'] as const)(
  'S2 renders %s typography with zero font requests from tokens alone',
  async (theme) => {
    const { after, requests } = await browserCommands.measureThemeFonts(theme, false);

    expect(requests).toEqual([]);
    expect(after.faces).toEqual([]);
    expect(after.widths.every((width) => width > 0)).toBe(true);
  },
);
