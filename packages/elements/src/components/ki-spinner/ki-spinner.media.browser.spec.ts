// @spec:071-ki-spinner
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { settleFrames } from '../../../browser-tests/visual/fixtures';
import { defineCustomElement } from '../../../dist/components/ki-spinner.js';

const browser = commands as unknown as {
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};
const fixture = document.createElement('main');
const styles = document.createElement('style');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await browser.emulateForcedColors(null);
  await browser.emulateReducedMotion(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

async function mountVariants() {
  fixture.innerHTML = `
    <ki-spinner label="Saving changes"></ki-spinner>
    <ki-spinner label="Assistant is thinking" variant="dots"></ki-spinner>
  `;
  await expect.element(page.getByRole('status', { name: 'Saving changes' })).toBeInTheDocument();
  await expect
    .element(page.getByRole('status', { name: 'Assistant is thinking' }))
    .toBeInTheDocument();
  const ring = fixture.firstElementChild?.shadowRoot?.querySelector('[part="ring"]');
  const dots = fixture.lastElementChild?.shadowRoot?.querySelector('[part="dots"]');
  if (!ring || !dots) {
    throw new Error('Expected the ring and typing dots to render');
  }
  return { dots, ring };
}

it('S8 slows the ring and holds all three dots still under reduced motion', async () => {
  await browser.emulateReducedMotion('no-preference');
  const { ring, dots } = await mountVariants();
  const period = Number.parseFloat(getComputedStyle(ring).animationDuration);
  expect(period).toBeGreaterThan(0);
  expect(dots.getAnimations({ subtree: true })).toHaveLength(3);

  await browser.emulateReducedMotion('reduce');

  await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  await expect
    .poll(() => Number.parseFloat(getComputedStyle(ring).animationDuration))
    .toBeGreaterThan(period);
  expect(getComputedStyle(ring).animationIterationCount).toBe('infinite');
  expect(dots.getAnimations({ subtree: true })).toHaveLength(0);
  expect([...dots.children].map((dot) => dot.getBoundingClientRect().width)).toEqual([6, 6, 6]);
});

it('S11 keeps the ring segment and all three dots visible in forced colors', async (context) => {
  const { ring, dots } = await mountVariants();
  await browser.emulateForcedColors('active');
  const canvas = document.createElement('span');
  const witnessColor = 'rgb(1, 2, 3)';
  canvas.style.backgroundColor = witnessColor;
  fixture.append(canvas);
  await settleFrames(2);
  const paletteApplied = () =>
    matchMedia('(forced-colors: active)').matches &&
    getComputedStyle(canvas).backgroundColor !== witnessColor;
  if (!paletteApplied() && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot apply a forced palette under emulation');
  }
  await expect.poll(paletteApplied).toBe(true);

  const canvasColor = getComputedStyle(canvas).backgroundColor;
  const style = getComputedStyle(ring);
  expect(style.borderBlockStartStyle).toBe('solid');
  expect(style.borderInlineStartStyle).toBe('dotted');
  expect(Number.parseFloat(style.borderInlineStartWidth)).toBeGreaterThan(0);
  expect(style.borderBlockStartColor).not.toBe(canvasColor);
  expect(style.borderInlineStartColor).not.toBe(canvasColor);
  for (const dot of dots.children) {
    const paint = getComputedStyle(dot).backgroundColor;
    expect(paint).not.toBe(canvasColor);
    expect(paint).not.toBe('rgba(0, 0, 0, 0)');
  }
});
