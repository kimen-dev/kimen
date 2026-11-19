// @spec:076-ki-image
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { defineAllComponents } from '../../../browser-tests/all-components';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { paintContrast } from '../../../browser-tests/contracts';

const fixture = document.createElement('main');
const styles = document.createElement('style');
const hills = new URL('./fixtures/hills.svg?no-inline', import.meta.url).href;
const missing = '/__ki-image/does-not-exist.svg';
const alt = 'Low green hills under a pale sky';

beforeAll(() => {
  defineAllComponents();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  styles.remove();
  fixture.remove();
});

function makeImage(attributes: Record<string, string> = {}) {
  const element = document.createElement('ki-image');
  element.style.inlineSize = '320px';
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

async function part<T extends Element = HTMLElement>(element: HTMLElement, name: string) {
  const lookup = () => element.shadowRoot?.querySelector<T>(`[part="${name}"]`);
  await expect.poll(lookup).toBeTruthy();
  const node = lookup();
  if (!node) throw new Error(`Image part "${name}" is missing`);
  return node;
}

function size(node: Element): [number, number] {
  const { width, height } = node.getBoundingClientRect();
  return [width, height];
}

it('S1: a 16:9 frame retains its dimensions when a lazy image loads', async () => {
  const image = makeImage({ alt, ratio: '16:9' });
  fixture.append(image);
  const frame = await part(image, 'frame');
  expect(size(frame)).toEqual([320, 180]);

  image.setAttribute('src', hills);
  const native = await part<HTMLImageElement>(image, 'image');
  await expect.poll(() => native.naturalWidth).toBeGreaterThan(0);
  expect(native.loading).toBe('lazy');
  expect(native.decoding).toBe('async');
  expect(native.referrerPolicy).toBe('no-referrer');
  expect(getComputedStyle(native).objectFit).toBe('cover');
  expect(size(native)).toEqual(size(frame));
  expect(size(frame)).toEqual([320, 180]);
});

it.each([
  ['auto', 180],
  ['1:1', 320],
  ['4:3', 240],
  ['3:2', 320 * (2 / 3)],
  ['16:9', 180],
])('reserves %s before the native dimensions are available', async (ratio, height) => {
  const image = makeImage({ alt, ratio });
  fixture.append(image);
  const frame = await part(image, 'frame');
  expect(size(frame)[1]).toBeCloseTo(height, 1);
});

it('uses the native ratio for auto after loading a panoramic image', async () => {
  const panoramic = new URL(
    '../../../../catalog/browser-tests/fixtures/wide.svg?no-inline',
    import.meta.url,
  ).href;
  const image = makeImage({ alt, loading: 'eager' });
  fixture.append(image);
  const frame = await part(image, 'frame');
  expect(size(frame)).toEqual([320, 180]);

  image.setAttribute('src', panoramic);
  await expect.poll(() => size(frame)).toEqual([320, 80]);
});

it('S2: a caption is a figcaption after the media frame and collapses when removed', async () => {
  const image = makeImage({ src: hills, alt });
  const text = document.createElement('span');
  text.slot = 'caption';
  text.textContent = 'View from the ridge';
  image.append(text);
  fixture.append(image);

  const caption = await part(image, 'caption');
  const frame = await part(image, 'frame');
  expect(caption.tagName).toBe('FIGCAPTION');
  expect(caption.parentElement?.tagName).toBe('FIGURE');
  expect(caption.previousElementSibling).toBe(frame);
  await expect.element(page.getByText('View from the ridge')).toBeVisible();
  text.remove();
  await expect.poll(() => size(caption)[1]).toBe(0);
});

it('S3, S8: a failed request emits one error and retains the frame and accessible description', async () => {
  const image = makeImage({
    src: missing,
    alt: 'Office floor plan',
    ratio: '4:3',
    loading: 'eager',
  });
  const error = vi.fn();
  fixture.addEventListener('ki-error', error);
  try {
    fixture.append(image);
    const fallback = page.getByRole('img', { name: 'Image unavailable: Office floor plan' });
    await expect.element(fallback).toBeVisible();
    expect(size(await part(image, 'frame'))).toEqual([320, 240]);
    expect(error).toHaveBeenCalledTimes(1);
    expect(image.shadowRoot?.querySelector('img')).toBeNull();
    await expectAccessible(fixture);
    expect(error).toHaveBeenCalledTimes(1);
  } finally {
    fixture.removeEventListener('ki-error', error);
  }
});

it.each(['data:image/png;base64,AA==', 'blob:refused-image'])(
  'S4: refuses %s without handing it to a native image',
  async (src) => {
    const image = makeImage({ src, alt });
    const error = vi.fn();
    image.addEventListener('ki-error', error);
    fixture.append(image);
    await expect
      .element(page.getByRole('img', { name: `Image unavailable: ${alt}` }))
      .toBeVisible();
    expect(error).toHaveBeenCalledTimes(1);
    expect(image.shadowRoot?.querySelector('img')).toBeNull();
  },
);

it('S5: a working source recovers from fallback, including after a second failure', async () => {
  const image = makeImage({ src: missing, alt, loading: 'eager' });
  const error = vi.fn();
  image.addEventListener('ki-error', error);
  fixture.append(image);
  await part(image, 'fallback');

  image.setAttribute('src', hills);
  const native = await part<HTMLImageElement>(image, 'image');
  await expect.poll(() => native.naturalWidth).toBeGreaterThan(0);
  expect(error).toHaveBeenCalledTimes(1);

  image.setAttribute('src', missing);
  await part(image, 'fallback');
  expect(error).toHaveBeenCalledTimes(2);
});

it('S6: keyboard traversal skips the frame', async () => {
  const image = makeImage({ src: hills, alt });
  const before = document.createElement('button');
  const after = document.createElement('button');
  // WebKit on macOS skips native buttons without an explicit tab stop.
  before.tabIndex = 0;
  after.tabIndex = 0;
  before.textContent = 'Before';
  after.textContent = 'After';
  fixture.append(before, image, after);
  await part(image, 'image');

  before.focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(after);
});

it('S7: informative image exposes its native alt text', async () => {
  fixture.append(makeImage({ src: hills, alt }));
  await expect.element(page.getByRole('img', { name: alt, exact: true })).toBeVisible();
  await expectAccessible(fixture);
});

it('S9: both decorative media states are absent from the accessibility tree', async () => {
  const loaded = makeImage({ src: hills, alt, decorative: '' });
  const refused = makeImage({ src: 'data:image/png;base64,AA==', alt, decorative: '' });
  fixture.append(loaded, refused);

  const native = await part<HTMLImageElement>(loaded, 'image');
  await expect.poll(() => native.naturalWidth).toBeGreaterThan(0);
  expect(native.alt).toBe('');
  await part(refused, 'fallback');
  await expect.element(page.getByRole('img')).not.toBeInTheDocument();
  await expect.element(page.getByRole('figure')).not.toBeInTheDocument();
  await expectAccessible(fixture);
});

it('S10: blank alt leaves the source unloaded and uses the generic fallback name', async () => {
  const image = makeImage({ src: hills, alt: '  ', 'fallback-label': 'Imagen no disponible' });
  const error = vi.fn();
  image.addEventListener('ki-error', error);
  fixture.append(image);

  await expect.element(page.getByRole('img', { name: 'Imagen no disponible' })).toBeVisible();
  expect(image.shadowRoot?.querySelector('img')).toBeNull();
  expect(error).not.toHaveBeenCalled();

  image.setAttribute('alt', 'Colinas verdes');
  await expect.element(page.getByRole('img', { name: 'Colinas verdes' })).toBeVisible();
});

it('S11: fallback surface and glyph paint with consumer token values', async () => {
  const image = makeImage({ src: missing, alt, loading: 'eager' });
  image.style.setProperty('--ki-image-fallback-bg', 'rgb(240, 242, 245)');
  image.style.setProperty('--ki-image-fallback-fg', 'rgb(30, 40, 50)');
  fixture.append(image);

  const frame = await part(image, 'frame');
  const glyph = (await part(image, 'fallback')).querySelector('svg');
  if (!glyph) throw new Error('Image fallback did not render a symbol');
  expect(getComputedStyle(frame).backgroundColor).toBe('rgb(240, 242, 245)');
  expect(getComputedStyle(glyph).stroke).toBe('rgb(30, 40, 50)');
});

it('S12: the fallback symbol remains legible in a forced palette', async ({ skip }) => {
  const browserCommands = commands as unknown as {
    emulateForcedColors: (mode: 'active' | null) => Promise<void>;
  };
  const image = makeImage({ src: 'data:image/png;base64,AA==', alt });
  image.style.setProperty('--ki-image-fallback-bg', 'rgb(1, 2, 3)');
  image.style.setProperty('--ki-image-fallback-fg', 'rgb(1, 2, 3)');
  fixture.append(image);

  await browserCommands.emulateForcedColors('active');
  try {
    const frame = await part(image, 'frame');
    const glyph = (await part(image, 'fallback')).querySelector('svg');
    if (!glyph) throw new Error('Image fallback did not render a symbol');
    const background = getComputedStyle(frame).backgroundColor;
    if (!navigator.userAgent.includes('Chrome/') && background === 'rgb(1, 2, 3)') {
      skip('This browser does not apply the emulated forced palette');
    }
    expect(background).not.toBe('rgb(1, 2, 3)');
    expect(paintContrast(getComputedStyle(glyph).stroke, background)).toBeGreaterThanOrEqual(3);
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it('S13: a contained image uses native eager loading and stays within the square', async () => {
  const image = makeImage({
    src: hills,
    alt,
    ratio: '1:1',
    fit: 'contain',
    loading: 'eager',
    radius: 'none',
  });
  fixture.append(image);
  const native = await part<HTMLImageElement>(image, 'image');
  const frame = await part(image, 'frame');

  await expect.poll(() => native.naturalWidth).toBeGreaterThan(0);
  expect(getComputedStyle(native).objectFit).toBe('contain');
  expect(native.loading).toBe('eager');
  expect(size(native)).toEqual([320, 320]);
  expect(getComputedStyle(frame).borderStartStartRadius).toBe('0px');
});

it('is static with reduced motion and retains the frame in RTL touch density', async () => {
  const browserCommands = commands as unknown as {
    emulateReducedMotion: (mode: 'reduce' | null) => Promise<void>;
    emulateHoverCapability: (mode: 'none' | null) => Promise<boolean>;
  };
  const region = document.createElement('div');
  region.setAttribute('dir', 'rtl');
  region.setAttribute('data-ki-density', 'touch');
  const image = makeImage({ src: 'data:image/png;base64,AA==', alt, ratio: '3:2' });
  region.append(image);
  fixture.append(region);
  const frame = await part(image, 'frame');
  const baseline = size(frame);
  await browserCommands.emulateReducedMotion('reduce');
  try {
    if (await browserCommands.emulateHoverCapability('none')) {
      expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    }
    const glyph = await part(image, 'fallback');
    expect(getComputedStyle(frame).direction).toBe('rtl');
    expect(size(frame)).toEqual(baseline);
    expect(glyph.getAnimations({ subtree: true })).toHaveLength(0);
  } finally {
    await browserCommands.emulateHoverCapability(null);
    await browserCommands.emulateReducedMotion(null);
  }
});
