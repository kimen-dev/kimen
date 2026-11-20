// @spec:119-ki-mobile-nav
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineMobileNavItem } from '../../../dist/components/ki-mobile-nav-item.js';
import { defineCustomElement as defineMobileNav } from '../../../dist/components/ki-mobile-nav.js';

const pointer = commands as unknown as {
  emulateHoverCapability(capability: 'none' | null): Promise<boolean>;
};
const tokens = document.createElement('style');
let fixture: HTMLElement | undefined;

beforeAll(() => {
  defineMobileNav();
  defineMobileNavItem();
  tokens.textContent = tokensCss;
  document.head.append(tokens);
});

afterEach(async () => {
  fixture?.remove();
  await pointer.emulateHoverCapability(null);
  await page.viewport(414, 896);
  await parkPointer();
});

afterAll(() => { tokens.remove(); });

it('S7 follows RTL reading order and preserves full targets on a coarse pointer', async (context) => {
  const emulated = await pointer.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    context.skip('This engine does not emulate a coarse primary pointer');
  }
  expect(emulated).toBe(true);
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  await page.viewport(320, 640);

  fixture = document.createElement('main');
  fixture.innerHTML = `
    <ki-mobile-nav variant="floating" dir="rtl" data-ki-density="touch" label="Main">
      <ki-mobile-nav-item href="/home" icon-name="house" current>Home</ki-mobile-nav-item>
      <ki-mobile-nav-item href="/search" icon-name="search">Search</ki-mobile-nav-item>
      <ki-mobile-nav-item href="/inbox" icon-name="inbox">Inbox</ki-mobile-nav-item>
      <ki-mobile-nav-item href="/saved" icon-name="bookmark">Saved</ki-mobile-nav-item>
      <ki-mobile-nav-item href="/profile" icon-name="circle-user">Profile</ki-mobile-nav-item>
    </ki-mobile-nav>
  `;
  document.body.append(fixture);

  const nav = page.getByRole('navigation', { name: 'Main' });
  const links = nav.getByRole('link');
  await expect.poll(() => links.elements().length).toBe(5);

  const rects = links.elements().map((link) => link.getBoundingClientRect());
  expect(rects.map((rect) => rect.left)).toEqual(
    rects.map((rect) => rect.left).sort((a, b) => b - a),
  );
  expect(Math.min(...rects.map((rect) => rect.width))).toBeGreaterThanOrEqual(48);
  expect(Math.min(...rects.map((rect) => rect.height))).toBeGreaterThanOrEqual(48);
});
