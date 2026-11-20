// @spec:108-ki-time-input
// Touch emulation is page-wide. Keep this in the isolated pointer project.
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-time-input.js';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = `${tokensCss}\n${material3Css}`;
  document.head.append(styles);
  document.body.append(fixture);
  fixture.dataset.kiTheme = 'material3';
  fixture.dataset.kiDensity = 'touch';
});

afterEach(async () => {
  fixture.replaceChildren();
  await browserCommands.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('keeps field text and list targets at touch sizes under a coarse pointer', async (test) => {
  const emulated = await browserCommands.emulateHoverCapability('none');
  if (!navigator.userAgent.includes('Chrome/') && !emulated) {
    test.skip('this engine cannot emulate a coarse pointer');
  }
  expect(emulated).toBe(true);
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML =
    '<ki-time-input label="Start time" lang="en-GB" min="09:00" max="10:00"></ki-time-input>';
  const field = page.getByRole('combobox', { name: 'Start time' });
  const trigger = page.getByRole('button', { name: 'Choose time' });
  await expect.element(field).toBeVisible();
  const control = field.element();

  control.focus();
  await userEvent.keyboard('{ArrowDown}');
  const slot = page.getByRole('option', { name: /^0?9:00$/u });
  await expect.element(slot).toBeVisible();

  expect(Number.parseFloat(getComputedStyle(control).fontSize)).toBeGreaterThanOrEqual(16);
  expect(trigger.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(slot.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
});
