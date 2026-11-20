// @spec:087-ki-empty-state
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineButton } from '../../../dist/components/ki-button.js';
import { defineCustomElement } from '../../../dist/components/ki-empty-state.js';

const browser = commands as unknown as {
  emulateHoverCapability: (value: 'hover' | 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  defineButton();
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

it('S11 preserves a touch-sized action inside a small empty state', async (context) => {
  const emulated = await browser.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.setAttribute('data-ki-density', 'touch');
  fixture.innerHTML = `
    <ki-empty-state size="sm" heading="No results">
      <ki-button slot="actions" variant="primary">Clear filters</ki-button>
    </ki-empty-state>
  `;
  const action = page.getByRole('button', { name: 'Clear filters' });
  await expect.element(action).toBeVisible();
  await expect
    .poll(() => action.element().getBoundingClientRect().height)
    .toBeGreaterThanOrEqual(44);
  expect(action.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  const activated = { count: 0 };
  action.element().addEventListener('click', () => activated.count++);
  await action.click();

  expect(activated.count).toBe(1);
});
