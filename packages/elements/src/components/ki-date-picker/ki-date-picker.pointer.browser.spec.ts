// @spec:124-ki-date-picker
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-date-picker.js';

const browser = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => { defineCustomElement(); });

afterEach(async () => {
  await browser.emulateHoverCapability(null);
  document.body.replaceChildren();
  await parkPointer();
});

it('S19 gives coarse-pointer days at least 44 CSS pixels in both dimensions', async (context) => {
  const emulated = await browser.emulateHoverCapability('none');
  if (
    !emulated &&
    !navigator.userAgent.includes('Chrome/') &&
    !matchMedia('(pointer: coarse)').matches
  ) {
    context.skip('This engine cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  const style = document.createElement('style');
  style.textContent = tokensCss;
  const fixture = document.createElement('main');
  fixture.innerHTML =
    '<ki-date-picker label="Departure" locale="en-GB" value="2026-11-12"></ki-date-picker>';
  fixture.dataset.kiDensity = 'touch';
  document.body.append(style, fixture);
  await page.getByRole('button', { name: 'Change date, 12 Nov 2026' }).click();
  const target = page.getByRole('button', { name: '12 November 2026' });
  await expect.element(target).toBeVisible();
  await expect
    .poll(() => {
      const { width, height } = target.element().getBoundingClientRect();
      return Math.min(width, height);
    })
    .toBeGreaterThanOrEqual(44);
});
