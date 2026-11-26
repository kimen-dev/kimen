import { afterEach, beforeAll, expect, it } from 'vitest';
// eslint-disable-next-line @nx/enforce-module-boundaries -- use the site's full-range face as the rendering reference
import newsreaderReferenceUrl from '../../../site/assets/fonts/NewsreaderVariable.woff2?url';
import { defineCustomElement as defineKiDialog } from '../dist/components/ki-dialog.js';
import { fixtureFor } from './visual/galleries';
import { mountGallery } from './visual/harness';

beforeAll(defineKiDialog);

afterEach(() => {
  document.body.replaceChildren();
  document.body.style.removeProperty('margin');
  document.documentElement.removeAttribute('data-ki-theme');
});

it.each([
  { theme: 'onmars', body: ['Instrument Sans', '400 700'], heading: ['Newsreader', '500'] },
  { theme: 'material3', body: ['Roboto', '100 900'], heading: ['Roboto', '100 900'] },
] as const)('mounts the $theme dialog gallery with its fixture faces loaded', async (families) => {
  const gallery = await mountGallery(fixtureFor('ki-dialog').gallery, families.theme);
  const loadedWeights = new Map(
    [...document.fonts]
      .filter((face) => face.status === 'loaded')
      .map((face) => [face.family, face.weight]),
  );

  const dialog = gallery.querySelector('ki-dialog');
  const heading = dialog?.shadowRoot?.querySelector('[part="heading"]');
  const body = dialog?.querySelector('p');
  if (!heading || !body) throw new Error('The dialog gallery must render a heading and body');

  for (const [element, [family, weight]] of [
    [body, families.body],
    [heading, families.heading],
  ] as const) {
    expect(loadedWeights.get(family), `${family} is preloaded`).toBe(weight);
    const firstFamily = getComputedStyle(element).fontFamily.split(',')[0];
    expect(firstFamily?.replace(/["']/gu, '')).toBe(family);
  }
  if (families.theme === 'onmars') {
    expect(getComputedStyle(heading).fontOpticalSizing).toBe('auto');
  }
});

it('matches the full Newsreader face for dialog headings at different text sizes', async () => {
  const gallery = await mountGallery(fixtureFor('ki-dialog').gallery, 'onmars');
  const dialog = gallery.querySelector('ki-dialog')?.shadowRoot?.querySelector('dialog');
  const heading = dialog?.querySelector<HTMLElement>('[part="heading"]');
  if (!dialog || !heading) throw new Error('The dialog gallery must render a heading');

  // The opening transition scales the dialog and its text rectangles.
  await Promise.all(dialog.getAnimations().map((animation) => animation.finished));

  const reference = new FontFace('Newsreader Reference', `url(${newsreaderReferenceUrl})`, {
    weight: '200 800',
  });
  await reference.load();
  document.fonts.add(reference);
  const root = document.documentElement;
  const previousSize = root.style.fontSize;
  const text = new Range();
  text.selectNodeContents(heading);
  const box = ({ x, y, width, height }: DOMRect) => ({ x, y, width, height });
  const lineMetrics = () =>
    [...text.getClientRects()].map(({ width, height }) => ({ width, height }));

  try {
    for (const size of [12, 16, 22, 32]) {
      const label = `root font size ${String(size)}px`;
      root.style.fontSize = `${String(size)}px`;
      heading.style.removeProperty('font-family');
      const bundledHeadingBox = box(heading.getBoundingClientRect());
      const bundledDialogBox = box(dialog.getBoundingClientRect());
      const bundled = lineMetrics();
      expect(bundled[0]?.width).toBeGreaterThan(0);

      heading.style.fontFamily = reference.family;
      expect(box(heading.getBoundingClientRect()), `heading box at ${label}`).toEqual(
        bundledHeadingBox,
      );
      expect(box(dialog.getBoundingClientRect()), `dialog box at ${label}`).toEqual(
        bundledDialogBox,
      );
      const referenceLines = lineMetrics();
      expect(
        referenceLines.map(({ height }) => height),
        label,
      ).toEqual(bundled.map(({ height }) => height));
      // Pinning the TrueType weight rounds glyph outlines, shifting text widths by a fraction of a CSS pixel.
      for (const [index, { width }] of bundled.entries()) {
        const referenceWidth = referenceLines[index]?.width ?? Number.NaN;
        expect(Math.abs(width - referenceWidth), label).toBeLessThanOrEqual(0.1);
      }
    }
  } finally {
    root.style.fontSize = previousSize;
    heading.style.removeProperty('font-family');
    document.fonts.delete(reference);
  }
});
