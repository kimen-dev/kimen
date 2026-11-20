import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement as defineGrid } from '../dist/components/ki-grid.js';
import { defineCustomElement as defineStack } from '../dist/components/ki-stack.js';
import { parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};
const style = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineGrid();
  defineStack();
  style.textContent = tokensCss;
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  await browserCommands.emulateHoverCapability(null);
  await parkPointer();
  fixture.replaceChildren();
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

it('keeps the authored spacing steps with a coarse primary pointer', async (test) => {
  const emulated = await browserCommands.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    test.skip('This browser cannot emulate a coarse pointer');
  }
  expect(emulated).toBe(true);
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);

  const children = '<div>First</div><div>Second</div>';
  fixture.innerHTML = `<ki-stack gap="sm">${children}</ki-stack><ki-grid columns="1" gap="sm">${children}</ki-grid>`;

  const gaps = () =>
    [...fixture.children].map((layout) => {
      const first = layout.firstElementChild as HTMLElement;
      const last = layout.lastElementChild as HTMLElement;
      return last.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
    });
  await expect.poll(gaps).toEqual([6, 6]);
});
