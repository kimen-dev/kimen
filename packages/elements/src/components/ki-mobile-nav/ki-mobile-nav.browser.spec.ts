// @spec:119-ki-mobile-nav
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineMobileNavItem } from '../../../dist/components/ki-mobile-nav-item.js';
import { defineCustomElement as defineMobileNav } from '../../../dist/components/ki-mobile-nav.js';

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
  await page.viewport(414, 896);
  await parkPointer();
});

afterAll(() => { tokens.remove(); });

function mount(content = '', attributes = '', extraItems = ''): HTMLElement {
  fixture = document.createElement('main');
  fixture.innerHTML = `
    ${content}
    <ki-mobile-nav ${attributes}>
      <ki-mobile-nav-item href="#mobile-home" icon-name="house" current>Home</ki-mobile-nav-item>
      <ki-mobile-nav-item href="#mobile-search" icon-name="search">Search</ki-mobile-nav-item>
      <ki-mobile-nav-item href="#mobile-inbox" icon-name="inbox">Inbox</ki-mobile-nav-item>
      ${extraItems}
    </ki-mobile-nav>
  `;
  document.body.append(fixture);
  return fixture;
}

it('S1 shows all five labels and full-size links in a bar at the viewport edge', async () => {
  await page.viewport(320, 640);
  mount(
    '',
    '',
    `
    <ki-mobile-nav-item href="#mobile-settings" icon-name="settings">Settings</ki-mobile-nav-item>
    <ki-mobile-nav-item href="#mobile-profile" icon-name="circle-user">Profile</ki-mobile-nav-item>
  `,
  );

  const bar = page.getByRole('navigation', { name: 'Main' });
  await expect.element(bar).toBeVisible();
  const links = bar.getByRole('link');
  await expect.poll(() => links.elements().length).toBe(5);

  const rect = bar.element().getBoundingClientRect();
  expect(Math.abs(rect.left)).toBeLessThan(0.5);
  expect(Math.abs(rect.right - document.documentElement.clientWidth)).toBeLessThan(0.5);
  expect(Math.abs(rect.bottom - window.innerHeight)).toBeLessThan(0.5);

  for (const name of ['Home', 'Search', 'Inbox', 'Settings', 'Profile']) {
    const link = bar.getByRole('link', { name, exact: true });
    await expect.element(link.getByText(name, { exact: true })).toBeVisible();
    const target = link.element().getBoundingClientRect();
    expect(target.width).toBeGreaterThanOrEqual(48);
    expect(target.height).toBeGreaterThanOrEqual(48);
  }
});

it('S2 insets the floating bar and lets the final content scroll above it', async () => {
  await page.viewport(320, 640);
  const root = mount(
    '<div style="block-size:140vh"></div><p id="mobile-last">Last content</p>',
    'variant="floating"',
  );
  const bar = page.getByRole('navigation');
  await expect.element(bar).toBeVisible();
  const rect = bar.element().getBoundingClientRect();
  expect(rect.left).toBeGreaterThan(0);
  expect(rect.right).toBeLessThan(document.documentElement.clientWidth);
  expect(rect.bottom).toBeLessThan(window.innerHeight);

  const last = root.querySelector('#mobile-last');
  expect(last).toBeInstanceOf(HTMLElement);
  await expect
    .poll(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return (
        (last?.getBoundingClientRect().bottom ?? Infinity) <=
        bar.element().getBoundingClientRect().top + 0.5
      );
    })
    .toBe(true);
});

it('S3 hides the bar during keyboard occlusion and restores it when the viewport recovers', async () => {
  const root = mount('<input aria-label="Search destinations">');
  const bar = page.getByRole('navigation');
  await expect.element(bar).toBeVisible();
  const input = root.querySelector('input');
  const viewport = window.visualViewport;
  if (!input || !viewport) throw new Error('Missing editable field or VisualViewport');

  const height = viewport.height;
  const before = Object.getOwnPropertyDescriptor(viewport, 'height');
  const resize = (value: number) => {
    Object.defineProperty(viewport, 'height', { configurable: true, get: () => value });
    viewport.dispatchEvent(new Event('resize'));
  };

  try {
    input.focus();
    await expect.element(bar).toBeVisible();
    resize(height - 300);
    await expect.element(bar).not.toBeInTheDocument();
    resize(height);
    await expect.element(bar).toBeVisible();
  } finally {
    if (before) Object.defineProperty(viewport, 'height', before);
    else Reflect.deleteProperty(viewport, 'height');
  }
});

it('S4 tabs through native links, reverses direction, and follows the Inbox link with Enter', async () => {
  mount(
    '<button type="button" tabindex="0">Before</button><p id="mobile-inbox">Inbox destination</p>',
  );
  const home = page.getByRole('link', { name: 'Home' });
  const search = page.getByRole('link', { name: 'Search' });
  const inbox = page.getByRole('link', { name: 'Inbox' });
  await expect.element(inbox).toBeVisible();
  const expectFocus = async (link: Element) => {
    await expect
      .poll(() => {
        const host = document.activeElement;
        return host?.shadowRoot?.activeElement === link;
      })
      .toBe(true);
  };

  const url = location.href;
  try {
    await page.getByRole('button', { name: 'Before' }).click();
    await userEvent.keyboard('{Tab}');
    await expectFocus(home.element());
    await userEvent.keyboard('{Tab}');
    await expectFocus(search.element());
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expectFocus(home.element());
    await userEvent.keyboard('{Tab}{Tab}');
    await expectFocus(inbox.element());
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => location.hash).toBe('#mobile-inbox');
  } finally {
    history.replaceState(history.state, '', url);
  }
});
