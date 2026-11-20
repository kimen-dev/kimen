// @spec:119-ki-mobile-nav
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineMobileNavItem } from '../../../dist/components/ki-mobile-nav-item.js';
import { defineCustomElement as defineMobileNav } from '../../../dist/components/ki-mobile-nav.js';
import '../../../icons/house.js';
import '../../../icons/inbox.js';
import '../../../icons/search.js';

const preferences = commands as unknown as {
  emulateForcedColors(mode: 'active' | null): Promise<void>;
  emulateReducedMotion(mode: 'reduce' | null): Promise<void>;
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
  fixture = undefined;
  await preferences.emulateForcedColors(null);
  await preferences.emulateReducedMotion(null);
  await parkPointer();
});

afterAll(() => {
  tokens.remove();
});

function mount(): HTMLElement {
  fixture = document.createElement('main');
  fixture.setAttribute('aria-label', 'App');
  fixture.innerHTML = `
    <ki-mobile-nav label="Main">
      <ki-mobile-nav-item href="/" icon-name="house" current>Home</ki-mobile-nav-item>
      <ki-mobile-nav-item href="/search" icon-name="search">Search</ki-mobile-nav-item>
      <ki-mobile-nav-item href="/inbox" icon-name="inbox" count="3">Inbox</ki-mobile-nav-item>
    </ki-mobile-nav>
  `;
  document.body.append(fixture);
  return fixture;
}

it('S5 exposes the named landmark, current page and full localizable unread count', async () => {
  const root = mount();
  const nav = page.getByRole('navigation', { name: 'Main', exact: true });
  const home = page.getByRole('link', { name: 'Home', exact: true });
  const inbox = page.getByRole('link', { name: /^Inbox\s*,\s*3 new$/u });
  await expect.element(nav).toBeVisible();
  await expect.element(home).toHaveAttribute('aria-current', 'page');
  await expect.element(inbox).toBeVisible();
  await expect.element(inbox).not.toHaveAttribute('aria-label');
  await expect.element(inbox).not.toHaveAttribute('aria-current');
  await expectAccessible(root);

  const item = root.querySelector('ki-mobile-nav-item[count]');
  const indicator = () =>
    item?.shadowRoot?.querySelector('ki-counter')?.shadowRoot?.querySelector('[part="indicator"]')
      ?.textContent;
  await expect.poll(indicator).toBe('3');
  item?.setAttribute('count', '125');
  item?.setAttribute('count-label', '{count} unread');
  const localized = page.getByRole('link', { name: /^Inbox\s*,\s*125 unread$/u });
  await expect.element(localized).toBeVisible();
  await expect.element(localized).not.toHaveAttribute('aria-label');

  await expect.poll(indicator).toBe('99+');

  if (item) item.textContent = 'Messages';
  await expect
    .element(page.getByRole('link', { name: /^Messages\s*,\s*125 unread$/u }))
    .toBeVisible();

  item?.setAttribute('count', '0');
  await expect.element(page.getByRole('link', { name: 'Messages', exact: true })).toBeVisible();
  await expect.poll(indicator).toBeUndefined();
});

it('S6 distinguishes the current icon with a theme override and under display preferences', async () => {
  const root = mount();
  const themedFill = 'rgb(220, 235, 250)';
  root.style.setProperty('--ki-mobile-nav-indicator-bg', themedFill);
  const bar = page.getByRole('navigation', { name: 'Main' });
  const home = page.getByRole('link', { name: 'Home' });
  const search = page.getByRole('link', { name: 'Search' });
  await expect.element(home).toBeVisible();
  await expect.element(search).toBeVisible();
  const current = home.element().querySelector('[part="indicator"]');
  const ordinary = search.element().querySelector('[part="indicator"]');
  if (!current || !ordinary) throw new Error('Missing icon indicators');

  expect(getComputedStyle(current).backgroundColor).toBe(themedFill);
  expect(getComputedStyle(current).outlineStyle).toBe('solid');
  expect(getComputedStyle(ordinary).outlineStyle).toBe('none');

  await preferences.emulateReducedMotion('reduce');
  await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  expect(getComputedStyle(current).getPropertyValue('animation-name')).toBe('none');
  expect(getComputedStyle(bar.element()).getPropertyValue('animation-name')).toBe('none');

  await preferences.emulateForcedColors('active');
  const forcedColors = matchMedia('(forced-colors: active)');
  if (navigator.userAgent.includes('Chrome/')) {
    await expect.poll(() => forcedColors.matches).toBe(true);
  }
  if (forcedColors.matches) {
    // WebKit can apply the media rule without exposing forced-color-adjust in CSSOM.
    await expect
      .poll(() => {
        const fill = getComputedStyle(current).backgroundColor;
        return {
          repainted: fill !== themedFill,
          distinguished:
            fill !== getComputedStyle(ordinary).backgroundColor &&
            fill !== getComputedStyle(bar.element()).backgroundColor,
        };
      })
      .toEqual({ repainted: true, distinguished: true });
  }
});
