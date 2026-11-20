// @spec:105-ki-top-nav
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-top-nav.js';

const media = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
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
  fixture.replaceChildren();
  await media.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S19: sizes the collapsed navigation trigger for a coarse pointer', async (test) => {
  if (!(await media.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/'))
      throw new Error('Chromium could not emulate a coarse pointer');
    test.skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML =
    '<ki-top-nav style="inline-size: 21rem"><a href="#overview">Overview</a></ki-top-nav>';
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await expect.element(trigger).toBeVisible();
  const { width, height } = trigger.element().getBoundingClientRect();
  expect(Math.min(width, height)).toBeGreaterThanOrEqual(44);
});
