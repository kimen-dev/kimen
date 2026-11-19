// @spec:090-ki-feature-icon
import '../../../icons/shield-check.js';

import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineFeatureIcon } from '../../../dist/components/ki-feature-icon.js';
import { defineCustomElement as defineIcon } from '../../../dist/components/ki-icon.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const media = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineFeatureIcon();
  defineIcon();
  styles.textContent = `${tokensCss}\n:root { font-size: 16px; }`;
  fixture.id = 'feature-icon-fixture';
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('style');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function svgGlyph(attributes = 'focusable="false"'): string {
  return `<svg ${attributes} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg>`;
}

function iconMarkup(attributes = '', glyph = svgGlyph()): string {
  return `<ki-feature-icon ${attributes}>${glyph}</ki-feature-icon>`;
}

function element(root: ParentNode, selector: string): Element {
  const match = root.querySelector(selector);
  if (match === null) throw new Error(`Missing ${selector} in the feature icon fixture`);
  return match;
}

async function tileOf(host: Element): Promise<Element> {
  const selector = '[part~="tile"]';
  await expect.poll(() => host.shadowRoot?.querySelector(selector)).toBeInstanceOf(HTMLElement);
  if (host.shadowRoot === null) throw new Error('Feature icon has no shadow root');
  return element(host.shadowRoot, selector);
}

function radiusOf(tile: Element): number {
  return Number.parseFloat(getComputedStyle(tile).borderStartStartRadius);
}

function paintOf(tile: Element): string[] {
  const { backgroundColor, color } = getComputedStyle(tile);
  return [backgroundColor, color];
}

async function expectCenteredGlyph(tile: Element, glyph: Element, size: number): Promise<void> {
  await expect
    .poll(() => {
      const tileRect = tile.getBoundingClientRect();
      const glyphRect = glyph.getBoundingClientRect();
      return Math.max(
        Math.abs(tileRect.width - size),
        Math.abs(tileRect.height - size),
        Math.abs(glyphRect.width - size / 2),
        Math.abs(glyphRect.height - size / 2),
        Math.abs(tileRect.left + tileRect.width / 2 - glyphRect.left - glyphRect.width / 2),
        Math.abs(tileRect.top + tileRect.height / 2 - glyphRect.top - glyphRect.height / 2),
      );
    })
    .toBeLessThan(0.5);
}

it('S1 centers a 20px glyph on a neutral 40px rounded square by default', async () => {
  fixture.innerHTML = `${iconMarkup()}<h2>Security</h2>${iconMarkup('id="explicit-neutral" tone="neutral"')}`;
  const host = element(fixture, 'ki-feature-icon');
  const explicitNeutral = element(fixture, '#explicit-neutral');
  const tile = await tileOf(host);

  await expectCenteredGlyph(tile, element(host, 'svg'), 40);
  expect(paintOf(tile)).toEqual(paintOf(await tileOf(explicitNeutral)));
  expect(radiusOf(tile)).toBeGreaterThan(0);
  expect(radiusOf(tile)).toBeLessThan(20);
});

it.each([
  ['xs', 24],
  ['sm', 32],
  ['md', 40],
  ['lg', 48],
  ['xl', 64],
] as const)('S2 applies the %s dimensions when the size changes', async (size, pixels) => {
  fixture.innerHTML = iconMarkup(`size="${size === 'md' ? 'xs' : 'md'}"`);
  const host = element(fixture, 'ki-feature-icon');
  const tile = await tileOf(host);

  host.setAttribute('size', size);

  await expectCenteredGlyph(tile, element(host, 'svg'), pixels);
});

it('S2 centers the actual glyph of an imported ki-icon at half the tile size', async () => {
  fixture.innerHTML = iconMarkup('size="xl"', '<ki-icon name="shield-check"></ki-icon>');
  const host = element(fixture, 'ki-feature-icon');
  const icon = element(host, 'ki-icon');
  await expect.poll(() => icon.shadowRoot?.querySelector('svg')).toBeInstanceOf(SVGSVGElement);
  if (icon.shadowRoot === null) throw new Error('Icon has no shadow root');

  await expectCenteredGlyph(await tileOf(host), element(icon.shadowRoot, 'svg'), 64);
});

it('S3 fully rounds the tile without changing its size', async () => {
  fixture.innerHTML = iconMarkup();
  const host = element(fixture, 'ki-feature-icon');
  const tile = await tileOf(host);
  expect(radiusOf(tile)).toBeLessThan(20);

  host.setAttribute('shape', 'circle');

  await expect.poll(() => radiusOf(tile)).toBeGreaterThanOrEqual(20);
  await expectCenteredGlyph(tile, element(host, 'svg'), 40);
});

it('S4 paints unknown values like the default tile', async () => {
  fixture.innerHTML = `${iconMarkup()}${iconMarkup('id="unknown-values" tone="odd" size="odd" shape="odd"')}`;
  const standard = await tileOf(element(fixture, 'ki-feature-icon'));
  const unknown = await tileOf(element(fixture, '#unknown-values'));

  const appearance = (tile: Element) => {
    const { width, height } = tile.getBoundingClientRect();
    return { width, height, radius: radiusOf(tile), paint: paintOf(tile) };
  };
  expect(appearance(unknown)).toEqual(appearance(standard));
});

it('S5 tabs directly between nearby controls even when the slotted SVG has tabindex', async () => {
  fixture.innerHTML = `<button type="button" tabindex="0">Previous</button>${iconMarkup(
    '',
    svgGlyph('tabindex="0"'),
  )}<button type="button" tabindex="0">Next</button>`;
  await tileOf(element(fixture, 'ki-feature-icon'));
  fixture.querySelector('button')?.focus();

  await userEvent.keyboard('{Tab}');

  await expect.element(page.getByRole('button', { name: 'Next' })).toHaveFocus();
});

it('S6 exposes the heading and hides the labelled glyph from assistive technology', async () => {
  fixture.innerHTML = `${iconMarkup(
    '',
    svgGlyph('role="img" aria-label="Shield" focusable="false"'),
  )}<h2>Security</h2>`;
  const tile = await tileOf(element(fixture, 'ki-feature-icon'));

  expect(tile.getAttribute('aria-hidden')).toBe('true');
  const tree = await media.ariaSnapshot('#feature-icon-fixture');
  expect(tree).toContain('heading "Security"');
  expect(tree).not.toContain('Shield');
  expect(tree).not.toContain('img');
  await expectAccessible(fixture);
});

it.each(['neutral', 'primary', 'primary-light', 'info', 'success', 'warning', 'danger'])(
  'S7 routes the %s theme pair to the painted tile and glyph',
  async (tone) => {
    const prefix = tone === 'neutral' ? '--ki-feature-icon' : `--ki-feature-icon-${tone}`;
    const background = 'rgb(220, 240, 250)';
    const foreground = 'rgb(20, 40, 50)';
    fixture.style.setProperty(`${prefix}-bg`, background);
    fixture.style.setProperty(`${prefix}-fg`, foreground);
    fixture.innerHTML = iconMarkup(`tone="${tone}"`);
    const host = element(fixture, 'ki-feature-icon');
    const tile = await tileOf(host);

    expect(paintOf(tile)).toEqual([background, foreground]);
    expect(getComputedStyle(element(host, 'svg')).stroke).toBe(foreground);
  },
);

it('S8 uses inherited surface and geometry overrides and keeps the glyph centered', async () => {
  const background = 'rgb(225, 235, 245)';
  const foreground = 'rgb(15, 30, 60)';
  const image = 'linear-gradient(rgb(210, 220, 230), rgb(240, 245, 250))';
  fixture.style.setProperty('--ki-feature-icon-size', '56px');
  fixture.style.setProperty('--ki-feature-icon-radius', '13px');
  fixture.style.setProperty('--ki-feature-icon-bg', background);
  fixture.style.setProperty('--ki-feature-icon-fg', foreground);
  fixture.style.setProperty('--ki-feature-icon-bg-image', image);
  fixture.style.setProperty('--ki-feature-icon-backdrop-filter', 'blur(2px)');
  fixture.innerHTML = iconMarkup();
  const host = element(fixture, 'ki-feature-icon');
  const tile = await tileOf(host);
  const glyph = element(host, 'svg');

  await expectCenteredGlyph(tile, glyph, 56);
  expect(radiusOf(tile)).toBe(13);
  expect(paintOf(tile)).toEqual([background, foreground]);
  expect(getComputedStyle(tile).backgroundImage).toBe(image);
  expect(getComputedStyle(tile).backdropFilter).toBe('blur(2px)');
  expect(getComputedStyle(glyph).stroke).toBe(foreground);
});

it('S9 uses system colours for the tile, glyph and visible edge', async (test) => {
  const witness = document.createElement('span');
  witness.style.backgroundColor = 'rgb(1, 2, 3)';
  fixture.innerHTML = iconMarkup('tone="primary"');
  fixture.append(witness);
  const host = element(fixture, 'ki-feature-icon');
  const tile = await tileOf(host);
  const authorPaint = getComputedStyle(witness).backgroundColor;

  try {
    await media.emulateForcedColors('active');
    const paletteApplies = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(witness).backgroundColor !== authorPaint;
    const repainted = await expect
      .poll(paletteApplies, { timeout: 1000 })
      .toBe(true)
      .then(
        () => true,
        () => false,
      );
    if (!repainted && !navigator.userAgent.includes('Chrome/')) {
      test.skip('This browser does not apply a forced palette under emulation');
    }
    expect(repainted, 'The forced palette should repaint the witness').toBe(true);

    witness.style.backgroundColor = 'Canvas';
    witness.style.color = 'CanvasText';
    const system = getComputedStyle(witness);
    const painted = getComputedStyle(tile);
    const glyph = getComputedStyle(element(host, 'svg'));

    expect(painted.backgroundColor).toBe(system.backgroundColor);
    expect(glyph.stroke).toBe(system.color);
    expect(glyph.stroke).not.toBe(painted.backgroundColor);
    const visibleOutline =
      painted.outlineStyle !== 'none' &&
      Number.parseFloat(painted.outlineWidth) > 0 &&
      painted.outlineColor === system.color;
    const visibleBorder =
      painted.borderBlockStartStyle !== 'none' &&
      Number.parseFloat(painted.borderBlockStartWidth) > 0 &&
      painted.borderBlockStartColor === system.color;
    expect(visibleOutline || visibleBorder).toBe(true);
  } finally {
    await media.emulateForcedColors(null);
  }
});

it('S10 repaints a changed tone without motion under reduced motion', async () => {
  try {
    await media.emulateReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    fixture.innerHTML = iconMarkup();
    const host = element(fixture, 'ki-feature-icon');
    const tile = await tileOf(host);
    const originalBackground = getComputedStyle(tile).backgroundColor;

    host.setAttribute('tone', 'primary');

    await expect.poll(() => getComputedStyle(tile).backgroundColor).not.toBe(originalBackground);
    const durations = getComputedStyle(tile).transitionDuration.split(',');
    expect(durations.every((duration) => Number.parseFloat(duration) === 0)).toBe(true);
    expect(host.getAnimations({ subtree: true })).toEqual([]);
  } finally {
    await media.emulateReducedMotion(null);
  }
});

it('S11 follows inline start in RTL while the glyph stays centered', async () => {
  fixture.innerHTML = `<section dir="ltr" style="display:flex;align-items:center;gap:8px">${iconMarkup()}<h2>Security</h2></section>`;
  const row = element(fixture, 'section');
  const host = element(row, 'ki-feature-icon');
  const heading = element(row, 'h2');
  const tile = await tileOf(host);
  const glyph = element(host, 'svg');

  expect(tile.getBoundingClientRect().right).toBeLessThan(heading.getBoundingClientRect().left);
  await expectCenteredGlyph(tile, glyph, 40);

  row.setAttribute('dir', 'rtl');

  await expect
    .poll(() => tile.getBoundingClientRect().left > heading.getBoundingClientRect().right)
    .toBe(true);
  await expectCenteredGlyph(tile, glyph, 40);
});

it('S12 uses the explicit small tile and half-size glyph on the ordinary page', async () => {
  fixture.innerHTML = iconMarkup('size="sm"');
  const host = element(fixture, 'ki-feature-icon');

  await expectCenteredGlyph(await tileOf(host), element(host, 'svg'), 32);
});
