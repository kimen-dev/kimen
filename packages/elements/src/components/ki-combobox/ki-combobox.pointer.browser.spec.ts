// @spec:095-ki-combobox
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-combobox.js';

const browser = commands as unknown as {
  emulateHoverCapability(value: 'hover' | 'none' | null): Promise<boolean>;
};
const fixture = document.createElement('main');
const styles = document.createElement('style');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  fixture.setAttribute('data-ki-density', 'touch');
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await browser.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S17 keeps coarse-pointer field, choice and removal targets at least 24 pixels high', async (context) => {
  const emulated = await browser.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML =
    '<ki-combobox label="Labels" multiple value="bug"><ki-option>search</ki-option></ki-combobox>';
  const combo = page.getByRole('combobox');
  await expect.element(combo).toBeVisible();
  (combo.element() as HTMLInputElement).focus();
  await userEvent.keyboard('{ArrowDown}');
  const option = page.getByRole('option', { name: 'search' });
  const remove = page.getByRole('button', { name: 'Remove bug' });
  await expect.element(option).toBeVisible();
  await expect.element(remove).toBeVisible();
  for (const element of [combo.element(), option.element(), remove.element()]) {
    expect(element.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  }
  expect(remove.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
});
