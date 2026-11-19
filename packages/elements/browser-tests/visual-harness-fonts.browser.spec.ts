import { afterEach, beforeAll, expect, it } from 'vitest';
import { defineCustomElement as defineKiDialog } from '../dist/components/ki-dialog.js';
import { visualGalleries } from './visual/galleries';
import { mountGallery } from './visual/harness';

beforeAll(defineKiDialog);

afterEach(() => {
  document.body.replaceChildren();
  document.body.style.removeProperty('margin');
  document.documentElement.removeAttribute('data-ki-theme');
});

it.each([
  { theme: 'onmars', body: ['Instrument Sans', '400 700'], heading: ['Newsreader', '200 800'] },
  { theme: 'material3', body: ['Roboto', '100 900'], heading: ['Roboto', '100 900'] },
] as const)('mounts the $theme dialog gallery with its fixture faces loaded', async (families) => {
  const gallery = await mountGallery(visualGalleries['ki-dialog'], families.theme);
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
