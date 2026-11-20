import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineItem } from '../../../dist/components/ki-menu-item.js';
import { defineCustomElement as defineMenu } from '../../../dist/components/ki-menu.js';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineItem();
  defineMenu();
});

afterEach(async () => {
  await browserCommands.emulateHoverCapability(null);
  document.body.replaceChildren();
  await parkPointer();
});

it('increases menu row touch targets for a coarse primary pointer', async (context) => {
  const style = document.createElement('style');
  style.textContent = tokensCss;
  const fixture = document.createElement('main');
  fixture.innerHTML = `
    <button id="actions" type="button">Actions</button>
    <ki-menu open anchor="actions"><ki-menu-item value="rename">Rename</ki-menu-item></ki-menu>
  `;
  document.body.append(style, fixture);
  const item = page.getByRole('menuitem', { name: 'Rename' });
  await expect.element(item).toBeVisible();
  const emulated = await browserCommands.emulateHoverCapability('none');
  if (
    !emulated &&
    !navigator.userAgent.includes('Chrome/') &&
    !matchMedia('(pointer: coarse)').matches
  ) {
    context.skip('This engine cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  await expect.poll(() => item.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
});
