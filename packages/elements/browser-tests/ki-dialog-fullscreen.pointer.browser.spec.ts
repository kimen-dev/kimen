// @spec:126-fullscreen-dialog
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-dialog.js';
import { parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineCustomElement();
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
});

afterEach(async () => {
  document.body.replaceChildren();
  document.body.removeAttribute('data-ki-density');
  await page.viewport(414, 896);
  await parkPointer();
});

it('S14 gives both fullscreen header actions at least a 44px touch target', async (test) => {
  await page.viewport(360, 650);
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    test.skip('this engine cannot emulate a touch screen');
  }
  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    document.body.setAttribute('data-ki-density', 'touch');
    document.body.innerHTML =
      '<ki-dialog open heading="New event" fullscreen="compact" confirm-label="Save"></ki-dialog>';

    for (const name of ['Close', 'Save']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect.element(button).toBeVisible();
      await expect
        .poll(() => {
          const { width, height } = button.element().getBoundingClientRect();
          return width >= 44 && height >= 44;
        })
        .toBe(true);
    }
  } finally {
    await browserCommands.emulateHoverCapability(null);
  }
});

it('S10 a direct dialog registration keeps confirmation operable', async () => {
  document.body.innerHTML =
    '<ki-dialog open heading="New event" fullscreen="always" confirm-label="Save"></ki-dialog>';
  const dialog = document.querySelector('ki-dialog');
  const confirmed = vi.fn();
  dialog?.addEventListener('ki-confirm', confirmed);

  const save = page.getByRole('button', { name: 'Save', exact: true });
  await expect.element(save).toBeVisible();
  expect(save.element().getRootNode()).toBe(dialog?.shadowRoot);
  await save.click();

  expect(confirmed).toHaveBeenCalledTimes(1);
  await expect.element(page.getByRole('dialog', { name: 'New event' })).toBeVisible();
});
