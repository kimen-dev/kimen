// @spec:064-theme-fonts
import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';

interface FontSample {
  widths: number[];
  markerTop: number | undefined;
  faces: { family: string; status: FontFaceLoadStatus }[];
}

export interface ThemeFontMeasurement {
  before: FontSample;
  after: FontSample;
  requests: string[];
  cls: number | null;
}

const browserCommands = commands as unknown as {
  measureThemeFonts: (
    theme: 'onmars' | 'material3',
    withFonts: boolean,
  ) => Promise<ThemeFontMeasurement>;
};

it('S1 swaps both onmars v2 faces into the page with CLS below 0.01', async () => {
  const { before, after, requests, cls } = await browserCommands.measureThemeFonts('onmars', true);

  expect(requests.sort()).toEqual([
    '/fonts/InstrumentSansVariable.woff2',
    '/fonts/NewsreaderOnmars.woff2',
  ]);
  for (const family of ['Instrument Sans', 'Newsreader']) {
    expect(before.faces.find((face) => face.family === family)?.status).not.toBe('loaded');
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
