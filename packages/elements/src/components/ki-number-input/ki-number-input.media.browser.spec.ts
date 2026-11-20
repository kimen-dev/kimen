// @spec:091-ki-number-input
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { settleFrames } from '../../../browser-tests/visual/fixtures';
import { defineCustomElement } from '../../../dist/components/ki-number-input.js';

const browser = commands as unknown as {
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
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
  await browser.emulateForcedColors(null);
  await browser.emulateReducedMotion(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

async function mount() {
  fixture.innerHTML = '<ki-number-input label="Seats" value="3" steppers></ki-number-input>';
  const input = page.getByRole('spinbutton', { name: 'Seats' });
  await expect.element(input).toBeVisible();
  const host = fixture.querySelector('ki-number-input');
  const field = host?.shadowRoot?.querySelector('[part="field"]');
  if (!host || !field) throw new Error('NumberInput did not expose its field part');
  return { input, host, field };
}

it('S13 retains a field border and keyboard focus indicator in forced colors', async (context) => {
  await browser.emulateForcedColors('active');
  const { input, field } = await mount();
  const canvas = document.createElement('span');
  const witnessColor = 'rgb(1, 2, 3)';
  canvas.style.backgroundColor = witnessColor;
  fixture.append(canvas);
  await settleFrames(2);
  const paletteApplied = () =>
    matchMedia('(forced-colors: active)').matches &&
    getComputedStyle(canvas).backgroundColor !== witnessColor;
  if (!paletteApplied() && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot apply a forced palette under emulation');
  }
  await expect.poll(paletteApplied).toBe(true);

  await input.click();
  await userEvent.keyboard('{ArrowUp}');

  const style = getComputedStyle(field);
  expect(style.borderBlockEndStyle).toBe('solid');
  expect(style.borderBlockEndColor).not.toBe(style.backgroundColor);
  expect(style.outlineStyle).toBe('solid');
  expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  expect(style.outlineColor).not.toBe(style.backgroundColor);
});

it('S14 keeps focused input and stepper feedback still under reduced motion', async () => {
  await browser.emulateReducedMotion('reduce');
  await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  const { input, field } = await mount();

  await input.click();
  await userEvent.keyboard('{ArrowUp}');

  expect(field.getAnimations({ subtree: true })).toHaveLength(0);
});
