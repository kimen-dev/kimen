// @spec:121-ki-code-input
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-code-input.js';

const browserCommands = commands as unknown as {
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
  await browserCommands.emulateHoverCapability(null);
  fixture.removeAttribute('data-ki-density');
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S14: applies touch density and preserves the coarse-pointer text floor', async (test) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/')) {
      throw new Error('Chromium did not emulate a coarse primary pointer');
    }
    test.skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);

  fixture.innerHTML = `<ki-code-input label="Verification code" size="sm"
    style="--ki-code-input-font-size: var(--ki-typography-size-caption-2)"></ki-code-input>`;
  const textbox = page.getByRole('textbox', { name: 'Verification code' });
  await expect.element(textbox).toBeVisible();
  const input = fixture.querySelector('ki-code-input')?.shadowRoot?.querySelector('input');
  if (!input) throw new Error('Missing native code input');
  const standardHeight = input.getBoundingClientRect().height;

  fixture.setAttribute('data-ki-density', 'touch');
  await textbox.click();

  await expect.element(textbox).toHaveFocus();
  expect(input.getBoundingClientRect().height).toBeGreaterThan(standardHeight);
  expect(input.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(Number.parseFloat(getComputedStyle(input).fontSize)).toBeGreaterThanOrEqual(16);
});
