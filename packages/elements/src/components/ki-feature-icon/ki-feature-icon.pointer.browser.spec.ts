// @spec:090-ki-feature-icon
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-feature-icon.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const media = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = `${tokensCss}\n:root { font-size: 16px; }`;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await media.emulateHoverCapability(null);
  await page.viewport(414, 896);
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S12 keeps a small tile and half-size glyph with a coarse pointer on a wide page', async (test) => {
  await page.viewport(900, 700);
  fixture.innerHTML =
    '<ki-feature-icon size="sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" focusable="false"><path d="M4 12h16"/></svg></ki-feature-icon>';
  const host = fixture.querySelector('ki-feature-icon');
  const glyph = host?.querySelector('svg');
  const findTile = () => host?.shadowRoot?.querySelector('[part~="tile"]');
  await expect.poll(findTile).toBeInstanceOf(HTMLElement);
  const tile = findTile();
  if (!tile || !glyph) throw new Error('Feature icon fixture did not render');

  const dimensions = () => {
    const box = tile.getBoundingClientRect();
    const icon = glyph.getBoundingClientRect();
    return [box.width, box.height, icon.width, icon.height].map(Math.round);
  };
  const expected = [32, 32, 16, 16];
  await expect.poll(dimensions).toEqual(expected);

  const coarse = await media.emulateHoverCapability('none');
  if (!coarse && !navigator.userAgent.includes('Chrome/')) {
    test.skip('This browser cannot emulate a coarse pointer');
  }

  expect(coarse).toBe(true);
  await expect.poll(() => matchMedia('(pointer: coarse) and (hover: none)').matches).toBe(true);
  expect(dimensions()).toEqual(expected);
});
