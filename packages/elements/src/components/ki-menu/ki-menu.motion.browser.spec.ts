import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineItem } from '../../../dist/components/ki-menu-item.js';
import { defineCustomElement as defineMenu } from '../../../dist/components/ki-menu.js';

const browserCommands = commands as unknown as {
  emulateReducedMotion: (preference: 'reduce' | 'no-preference') => Promise<void>;
};

beforeAll(async () => {
  await browserCommands.emulateReducedMotion('reduce');
  defineItem();
  defineMenu();
});

afterEach(async () => {
  document.body.replaceChildren();
  await parkPointer();
});

afterAll(async () => {
  await browserCommands.emulateReducedMotion('no-preference');
});

it('opens with focus and without animation when reduced motion is requested', async () => {
  expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  const style = document.createElement('style');
  style.textContent = tokensCss;
  const fixture = document.createElement('main');
  fixture.innerHTML = `
    <button id="actions" type="button">Actions</button>
    <ki-menu anchor="actions"><ki-menu-item value="rename">Rename</ki-menu-item></ki-menu>
  `;
  document.body.append(style, fixture);
  const trigger = page.getByRole('button', { name: 'Actions' });
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  const action = page.getByRole('menuitem', { name: 'Rename' });
  await expect.poll(() => action.query()?.matches(':focus')).toBe(true);
  const popup = fixture.querySelector('ki-menu')?.shadowRoot?.querySelector('[part="popup"]');
  expect(popup?.getAnimations({ subtree: true })).toEqual([]);
});
