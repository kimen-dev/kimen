// @spec:106-ki-sidebar
import tokens from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { parkPointer } from '../../../browser-tests/axe';

const media = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};
const fixture = document.createElement('main');
const style = document.createElement('style');
beforeAll(() => {
  defineAllComponents();
  style.textContent = tokens;
  document.head.append(style);
  document.body.append(fixture);
});
afterEach(async () => {
  fixture.replaceChildren();
  await media.emulateHoverCapability(null);
  await parkPointer();
});
afterAll(() => {
  style.remove();
  fixture.remove();
});

it('S9 retains 44px touch-density targets inside the 64px rail', async ({ skip }) => {
  const emulated = await media.emulateHoverCapability('none');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  if (navigator.userAgent.includes('Chrome/')) {
    expect(emulated).toBe(true);
    await expect.poll(coarse).toBe(true);
  } else if (!coarse()) {
    skip('This engine cannot emulate a coarse primary pointer.');
  }
  fixture.innerHTML = `<div data-ki-density="touch">
    <ki-sidebar collapsible><ki-sidebar-item href="#inbox">Inbox</ki-sidebar-item></ki-sidebar>
  </div>`;
  await userEvent.click(page.getByRole('button', { name: 'Collapse sidebar' }));
  const expand = page.getByRole('button', { name: 'Expand sidebar' });
  const inbox = page.getByRole('link', { name: 'Inbox' });
  for (const control of [expand, inbox]) {
    await expect.element(control).toBeVisible();
    const target = control.element().getBoundingClientRect();
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
  expect(fixture.querySelector('ki-sidebar')?.getBoundingClientRect().width).toBeCloseTo(64);
});
