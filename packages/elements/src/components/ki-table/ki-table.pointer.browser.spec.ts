// @spec:097-ki-table
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineAllComponents } from '../../../browser-tests/all-components';

const browser = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};

const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineAllComponents();
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

it('S18: reserves coarse-pointer targets inside a compact table', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/')) {
      throw new Error('Chromium did not emulate a coarse pointer');
    }
    test.skip('The engine cannot emulate a coarse pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML = `<ki-table selectable density="compact"><table><caption>Services</caption>
    <thead><tr><th scope="col" data-sort="name">Name</th></tr></thead>
    <tbody><tr data-key="billing"><th scope="row">Billing API</th></tr></tbody>
  </table></ki-table>`;
  await expect.element(page.getByRole('button', { name: 'Name' })).toBeVisible();
  await expect.element(page.getByRole('checkbox', { name: 'Select Billing API' })).toBeVisible();
  const button = fixture.querySelector('button');
  const control = fixture.querySelector('tbody ki-checkbox')?.shadowRoot?.querySelector('input');
  for (const target of [button, control]) {
    expect(target?.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    expect(target?.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  }
});
