// @spec:071-ki-spinner
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-spinner.js';

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
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S10 preserves small ring dimensions under a coarse pointer', async (context) => {
  const emulated = await browser.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);

  fixture.setAttribute('data-ki-density', 'touch');
  fixture.innerHTML = '<ki-spinner label="Saving changes" size="sm"></ki-spinner>';
  await expect.element(page.getByRole('status', { name: 'Saving changes' })).toBeInTheDocument();
  const ring = fixture.firstElementChild?.shadowRoot?.querySelector('[part="ring"]');
  if (!ring) {
    throw new Error('The spinner did not render its ring');
  }
  expect(getComputedStyle(ring).inlineSize).toBe('16px');
  expect(getComputedStyle(ring).blockSize).toBe('16px');
});
