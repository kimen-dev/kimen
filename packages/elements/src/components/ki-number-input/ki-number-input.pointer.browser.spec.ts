// @spec:091-ki-number-input
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-number-input.js';

const browser = commands as unknown as {
  emulateHoverCapability: (value: 'hover' | 'none' | null) => Promise<boolean>;
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

it('S12 gives both stepper buttons a 44px target under coarse touch density', async (context) => {
  const emulated = await browser.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);

  fixture.setAttribute('data-ki-density', 'touch');
  fixture.innerHTML = '<ki-number-input label="Seats" value="3" steppers></ki-number-input>';
  const increase = page.getByRole('button', { name: 'Increase Seats' });
  const decrease = page.getByRole('button', { name: 'Decrease Seats' });
  await expect.element(increase).toBeVisible();
  await expect.element(decrease).toBeVisible();
  const smallestSide = () => {
    const a = increase.element().getBoundingClientRect();
    const b = decrease.element().getBoundingClientRect();
    return Math.min(a.width, a.height, b.width, b.height);
  };
  await expect.poll(smallestSide).toBeGreaterThanOrEqual(44);
});
