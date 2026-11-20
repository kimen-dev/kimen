// @spec:103-ki-drawer
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-drawer.js';

const browser = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await browser.emulateHoverCapability(null);
  fixture.replaceChildren();
  fixture.removeAttribute('data-ki-density');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S13 gives the Close button a 44 by 44 CSS pixel target in touch density for coarse pointers', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/'))
      throw new Error('Chromium did not emulate coarse input');
    test.skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML =
    '<ki-drawer heading="Share" placement="bottom" open>Share incident</ki-drawer>';

  const close = page.getByRole('button', { name: 'Close' });
  await expect.element(close).toBeVisible();
  expect(close.element().getBoundingClientRect().width).toBeLessThan(44);
  fixture.setAttribute('data-ki-density', 'touch');
  await expect
    .poll(() => {
      const { height, width } = close.element().getBoundingClientRect();
      return Math.min(height, width);
    })
    .toBeGreaterThanOrEqual(44);
});
