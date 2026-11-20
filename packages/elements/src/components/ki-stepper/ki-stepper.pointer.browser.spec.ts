// @spec:092-ki-stepper
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineStep } from '../../../dist/components/ki-step.js';
import { defineCustomElement } from '../../../dist/components/ki-stepper.js';

const browser = commands as unknown as {
  emulateHoverCapability: (value: 'hover' | 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineStep();
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

it('S9 gives the completed link a 44-by-44 CSS pixel target at touch density', async (context) => {
  const emulated = await browser.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.setAttribute('data-ki-density', 'touch');
  fixture.innerHTML = `
    <ki-stepper label="Setup progress" orientation="vertical">
      <ki-step state="done" href="#account">Account</ki-step>
    </ki-stepper>
  `;

  const link = page.getByRole('link', { name: /Account/ });
  await expect.element(link).toBeVisible();
  const { width, height } = link.element().getBoundingClientRect();
  expect(width).toBeGreaterThanOrEqual(44);
  expect(height).toBeGreaterThanOrEqual(44);
});
