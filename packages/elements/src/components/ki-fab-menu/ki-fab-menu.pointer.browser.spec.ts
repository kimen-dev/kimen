// @spec:128-ki-fab-menu
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineItem } from '../../../dist/components/ki-fab-menu-item.js';
import { defineCustomElement as defineMenu } from '../../../dist/components/ki-fab-menu.js';

const browser = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');
fixture.dataset.kiDensity = 'compact';

beforeAll(() => {
  defineItem();
  defineMenu();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await browser.emulateHoverCapability(null);
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S16: compact density preserves the 56px trigger and action targets on coarse pointers', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/')) {
      throw new Error('Chromium did not emulate a coarse primary pointer');
    }
    test.skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML =
    '<ki-fab-menu label="Create" position="fixed">' +
    '<ki-fab-menu-item>Message</ki-fab-menu-item>' +
    '<ki-fab-menu-item>Event</ki-fab-menu-item></ki-fab-menu>';

  await page.getByRole('button', { name: 'Create' }).click();
  await expect.element(page.getByRole('menuitem', { name: 'Message' })).toBeVisible();
  const trigger = fixture.querySelector('ki-fab-menu')?.shadowRoot?.querySelector('button');
  const items = [...fixture.querySelectorAll('ki-fab-menu-item')].map((item) =>
    item.shadowRoot?.querySelector('[role="menuitem"]'),
  );
  for (const control of [trigger, ...items]) {
    if (!control) throw new Error('Missing a visible control');
    const rect = control.getBoundingClientRect();
    expect(rect.width).toBeGreaterThanOrEqual(56);
    expect(rect.height).toBeGreaterThanOrEqual(56);
  }
});
