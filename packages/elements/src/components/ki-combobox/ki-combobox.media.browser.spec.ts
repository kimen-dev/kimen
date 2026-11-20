// @spec:095-ki-combobox
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { settleFrames } from '../../../browser-tests/visual/fixtures';
import { defineCustomElement } from '../../../dist/components/ki-combobox.js';

const browser = commands as unknown as {
  emulateForcedColors(value: 'active' | 'none' | null): Promise<void>;
  emulateReducedMotion(value: 'reduce' | 'no-preference' | null): Promise<void>;
};
const fixture = document.createElement('main');
const styles = document.createElement('style');

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

async function open(attributes = '') {
  fixture.innerHTML = `<ki-combobox label="People" ${attributes}><ki-option>Ana</ki-option></ki-combobox>`;
  await expect.element(page.getByRole('combobox')).toBeVisible();
  (page.getByRole('combobox').element() as HTMLInputElement).focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByRole('listbox')).toBeVisible();
}

it('S14 outlines the active choice in forced colors', async (context) => {
  await browser.emulateForcedColors('active');
  await open();
  await settleFrames(2);
  if (!matchMedia('(forced-colors: active)').matches && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot apply a forced palette under emulation');
  }
  expect(matchMedia('(forced-colors: active)').matches).toBe(true);
  const style = getComputedStyle(page.getByRole('option', { name: 'Ana' }).element());
  expect(style.outlineStyle).toBe('solid');
  expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
});

it('S15 presents the loading text and slows its spinner under reduced motion', async () => {
  await browser.emulateReducedMotion('no-preference');
  await open('loading');
  await expect.element(page.getByRole('option', { name: 'Loading results' })).toBeVisible();
  const spinner = fixture.firstElementChild?.shadowRoot?.querySelector('ki-spinner');
  await expect.poll(() => Boolean(spinner?.shadowRoot?.querySelector('[part="ring"]'))).toBe(true);
  const ring = spinner?.shadowRoot?.querySelector('[part="ring"]');
  if (!ring) throw new Error('Missing spinner ring');
  const regular = Number.parseFloat(getComputedStyle(ring).animationDuration);
  await browser.emulateReducedMotion('reduce');
  await expect
    .poll(() => Number.parseFloat(getComputedStyle(ring).animationDuration))
    .toBeGreaterThan(regular);
});
