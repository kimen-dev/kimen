// @spec:111-ki-toolbar
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineIconButton } from '../../../dist/components/ki-icon-button.js';
import { defineCustomElement } from '../../../dist/components/ki-toolbar.js';

const browser = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  defineIconButton();
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

it('S16: reserves separate 44px touch targets even for small icon buttons', async ({ skip }) => {
  const emulated = await browser.emulateHoverCapability('none');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  if (navigator.userAgent.includes('Chrome/')) {
    expect(emulated).toBe(true);
    await expect.poll(coarse).toBe(true);
  } else if (!coarse()) {
    skip('This browser cannot emulate a coarse primary pointer');
  }
  fixture.innerHTML = `
    <ki-toolbar label="Formatting" data-ki-density="touch">
      <ki-icon-button label="Bold" size="sm" variant="ghost"></ki-icon-button>
      <ki-icon-button label="Insert link" size="sm" variant="ghost"></ki-icon-button>
    </ki-toolbar>`;
  const action = page.getByRole('button', { name: 'Bold' });
  await expect.element(action).toBeVisible();
  const button = action.element() as HTMLButtonElement;
  const rect = button.getBoundingClientRect();
  const hit = getComputedStyle(button, '::before');
  expect(rect.width - 2 * Number.parseFloat(hit.insetInlineStart)).toBeGreaterThanOrEqual(44);
  expect(rect.height - 2 * Number.parseFloat(hit.insetBlockStart)).toBeGreaterThanOrEqual(44);

  const boldHost = fixture.querySelector('ki-icon-button[label="Bold"]');
  const linkHost = fixture.querySelector('ki-icon-button[label="Insert link"]');
  if (!boldHost || !linkHost) throw new Error('Expected two slotted icon buttons');
  const bold = boldHost.getBoundingClientRect();
  const link = linkHost.getBoundingClientRect();
  expect(bold.width).toBeGreaterThanOrEqual(44);
  expect(bold.height).toBeGreaterThanOrEqual(44);
  expect(link.left).toBeGreaterThanOrEqual(bold.right);
});
