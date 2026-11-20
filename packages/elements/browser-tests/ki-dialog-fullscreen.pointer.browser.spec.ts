// @spec:126-fullscreen-dialog
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
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
      const element = button.element();
      const hitArea = getComputedStyle(element, '::before');
      await expect
        .poll(() => {
          const { width, height } = element.getBoundingClientRect();

          const targetWidth = width - 2 * Math.min(0, Number.parseFloat(hitArea.insetInlineStart));
          const targetHeight = height - 2 * Math.min(0, Number.parseFloat(hitArea.insetBlockStart));
          return targetWidth >= 44 && targetHeight >= 44;
        })
        .toBe(true);
    }
  } finally {
    await browserCommands.emulateHoverCapability(null);
  }
});
