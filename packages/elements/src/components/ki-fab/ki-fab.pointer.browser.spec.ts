// @spec:104-ki-fab
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineFab } from '../../../dist/components/ki-fab.js';

const browser = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');
fixture.dataset.kiDensity = 'compact';

beforeAll(() => {
  defineFab();
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

it('S14: the compact FAB keeps its 56px target under a coarse primary pointer', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/')) {
      throw new Error('Chromium did not emulate a coarse primary pointer');
    }
    test.skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML = '<ki-fab label="Compose"></ki-fab>';
  await expect.element(page.getByRole('button', { name: 'Compose' })).toBeVisible();

  const control = fixture.querySelector('ki-fab')?.shadowRoot?.querySelector('[part="control"]');
  if (!control) throw new Error('Missing FAB control');
  const rect = control.getBoundingClientRect();
  expect(rect.width).toBeGreaterThanOrEqual(56);
  expect(rect.height).toBeGreaterThanOrEqual(56);
});
