// @spec:105-ki-top-nav
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineCounter } from '../../../dist/components/ki-counter.js';
import { defineCustomElement as defineIconButton } from '../../../dist/components/ki-icon-button.js';
import { defineCustomElement } from '../../../dist/components/ki-top-nav.js';

const media = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};
const styles = document.createElement('style');
const fixture = document.createElement('div');
const links = `
  <a href="#overview" tabindex="0">Overview</a>
  <a href="#projects" tabindex="0" aria-current="page">Projects</a>
  <a href="#reports" tabindex="0">Reports</a>
  <a href="#teams" tabindex="0">Teams</a>
  <a href="#settings" tabindex="0">Settings</a>`;
const brand = '<a slot="brand" href="#home" tabindex="0">Kimen</a>';
const notifications = `<ki-icon-button slot="actions" variant="ghost" label="Notifications, 3 unread">
  <ki-counter slot="counter" value="3"></ki-counter>
</ki-icon-button>`;
const actions = ['Share', 'Edit', 'Pin', 'Archive', 'Export']
  .map((name) => `<button type="button" slot="actions" tabindex="0">${name}</button>`)
  .join('');

beforeAll(() => {
  defineCustomElement();
  defineCounter();
  defineIconButton();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

beforeEach(async () => {
  await page.viewport(912, 700);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  await page.viewport(414, 896);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function mountHeader(attributes = '', content = brand + links + notifications): HTMLElement {
  fixture.innerHTML = `<ki-top-nav ${attributes}>${content}</ki-top-nav>`;
  return required(fixture.querySelector<HTMLElement>('ki-top-nav'));
}

function wideHeader(): HTMLElement {
  return mountHeader('collapse-at="1px" style="inline-size: 44rem"');
}

function narrowHeader(attributes = ''): HTMLElement {
  return mountHeader(`style="inline-size: 21rem" ${attributes}`);
}

function screen(attributes = '', slotted = ''): string {
  return `<ki-top-nav variant="app-bar" title="Release notes" subtitle="Version 2.4" ${attributes}>
    <button type="button" slot="leading" tabindex="0">Back</button>${slotted}
  </ki-top-nav>`;
}

function mountScrollBar(attributes: string): { scroller: HTMLElement; bar: HTMLElement } {
  fixture.innerHTML = `<div style="block-size: 20rem; overflow-y: auto">
    ${screen(`sticky ${attributes}`)}<main style="block-size: 70rem">Release notes content</main>
  </div>`;
  return {
    scroller: fixture.firstElementChild as HTMLElement,
    bar: required(fixture.querySelector<HTMLElement>('ki-top-nav')),
  };
}

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Missing TopNav fixture');
  return value;
}

function part(host: HTMLElement, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Missing TopNav part ${name}`);
  return element;
}

function nativeButton(host: HTMLElement, label: string): HTMLButtonElement {
  const control = host.shadowRoot?.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
  if (!control) throw new Error(`Missing TopNav button ${label}`);
  return control;
}

const navigation = () => page.getByRole('button', { name: 'Open navigation' });
const overflow = () => page.getByRole('button', { name: 'More actions' });
const heading = () => page.getByRole('heading', { name: 'Release notes' });

it('S1: shows five primary links and a current-page indicator on a wide bar', async () => {
  const host = wideHeader();
  await expect.element(page.getByRole('link', { name: 'Kimen' })).toBeVisible();
  await expect.element(page.getByRole('navigation').getByRole('link')).toHaveLength(5);
  await expect.element(page.getByRole('button', { name: 'Notifications, 3 unread' })).toBeVisible();
  const current = required(host.querySelector('[aria-current="page"]'));
  expect(Number.parseFloat(getComputedStyle(current).borderBlockEndWidth)).toBeGreaterThanOrEqual(
    2,
  );
});

it('S2: responds to the authored CSS breakpoint and preserves the actual links', async () => {
  const host = mountHeader('collapse-at="30em" style="inline-size: 40rem"');
  await expect.element(page.getByRole('link', { name: 'Overview' })).toBeVisible();
  host.style.inlineSize = '21rem';
  await expect.element(navigation()).toBeVisible();
  await expect.element(page.getByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
  await navigation().click();
  const items = page.getByRole('menu').getByRole('menuitem');
  await expect.element(items).toHaveLength(5);
  expect(items.elements()).toEqual([...host.querySelectorAll('a:not([slot])')]);
  await expect.element(page.getByRole('link', { name: 'Kimen' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Notifications, 3 unread' })).toBeVisible();

  host.style.inlineSize = '40rem';
  await expect.element(page.getByRole('link', { name: 'Overview' })).toBeVisible();
  expect(host.querySelector('a[href="#overview"]')?.getAttribute('tabindex')).toBe('0');
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
});

it('S3: keeps three direct actions and exposes the remaining two in order', async () => {
  fixture.innerHTML = screen('', actions);
  await overflow().click();
  for (const name of ['Share', 'Edit', 'Pin']) {
    await expect.element(page.getByRole('button', { name })).toBeVisible();
  }
  const items = page.getByRole('menu').getByRole('menuitem');
  await expect.element(items).toHaveLength(2);
  expect(items.elements().map((item) => item.textContent)).toEqual(['Archive', 'Export']);
});

it('S4: collapses XL to the medium bar while sticking to a nested scroller', async () => {
  const { scroller, bar } = mountScrollBar('size="xl" scroll-behavior="collapse"');
  await expect.element(heading()).toBeVisible();
  const surface = part(bar, 'bar');
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  expect(surface.getBoundingClientRect().height).toBeCloseTo(9.5 * rem);
  expect((heading().element() as HTMLElement).getBoundingClientRect().top).toBeGreaterThan(
    page.getByRole('button', { name: 'Back' }).element().getBoundingClientRect().bottom,
  );
  scroller.scrollTop = 160;
  await expect
    .poll(() => Math.abs(surface.getBoundingClientRect().height - 4 * rem) <= 0.5)
    .toBe(true);
  expect((heading().element() as HTMLElement).getBoundingClientRect().top).toBeLessThan(
    page.getByRole('button', { name: 'Back' }).element().getBoundingClientRect().bottom,
  );
  expect(surface.getBoundingClientRect().top).toBeCloseTo(scroller.getBoundingClientRect().top);
  scroller.scrollTop = 0;
  await expect
    .poll(() => Math.abs(surface.getBoundingClientRect().height - 9.5 * rem) <= 0.5)
    .toBe(true);
});

it('S5: tints on nested scrolling at the same height, with a none opt-out', async () => {
  const { scroller, bar } = mountScrollBar('');
  await expect.element(heading()).toBeVisible();
  const surface = part(bar, 'bar');
  const fill = getComputedStyle(surface).backgroundColor;
  const height = surface.getBoundingClientRect().height;
  scroller.scrollTop = 120;
  await expect.poll(() => getComputedStyle(surface).backgroundColor).not.toBe(fill);
  expect(surface.getBoundingClientRect().height).toBeCloseTo(height);
  bar.setAttribute('scroll-behavior', 'none');
  await expect.poll(() => getComputedStyle(surface).backgroundColor).toBe(fill);
});

it('S6: centers the single-action title across the whole bar and keeps wider or busier bars start-aligned', async () => {
  fixture.innerHTML = screen(
    'title-align="center" collapse-at="30rem" style="inline-size: 23rem"',
    '<button type="button" slot="actions" tabindex="0">Edit title</button>',
  );
  await expect.element(heading()).toBeVisible();
  const bar = required(fixture.querySelector<HTMLElement>('ki-top-nav'));
  const center = (element: Element): number => {
    const box = element.getBoundingClientRect();
    return box.left + box.width / 2;
  };
  await expect.poll(() => Math.abs(center(heading().element()) - center(bar)) <= 0.5).toBe(true);
  const secondAction = document.createElement('button');
  secondAction.type = 'button';
  secondAction.slot = 'actions';
  secondAction.textContent = 'Share';
  bar.append(secondAction);
  await expect.poll(() => getComputedStyle(heading().element()).textAlign).toBe('start');
  secondAction.remove();
  bar.style.inlineSize = '42rem';
  await expect.poll(() => getComputedStyle(heading().element()).textAlign).toBe('start');
});

it('S7: shows a usable search control and exposes the screen heading', async () => {
  fixture.innerHTML = screen('', '<input type="search" slot="search" aria-label="Find releases">');
  const search = page.getByRole('searchbox', { name: 'Find releases' });
  await search.fill('2.4');
  await expect.element(search).toHaveValue('2.4');
  await expect.element(heading()).toBeInTheDocument();
  expect(heading().elements()).toHaveLength(1);
});

it('S8: opens with Space and Escape returns focus to the collapsed menu button', async () => {
  const host = narrowHeader();
  await expect.element(navigation()).toBeVisible();
  const trigger = nativeButton(host, 'Open navigation');
  trigger.focus();
  await userEvent.keyboard('[Space]');
  const overview = page.getByRole('menuitem', { name: 'Overview' });
  await expect.element(overview).toBeVisible();
  expect(document.activeElement).toBe(overview.element());
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  expect(host.shadowRoot?.activeElement).toBe(trigger);
});

it('S9: wraps, reaches the ends and finds a link by its first letter', async () => {
  narrowHeader();
  await navigation().click();
  const focused = () => document.activeElement?.textContent;
  expect(focused()).toBe('Overview');
  await userEvent.keyboard('{ArrowUp}');
  expect(focused()).toBe('Settings');
  await userEvent.keyboard('{ArrowDown}');
  expect(focused()).toBe('Overview');
  await userEvent.keyboard('{End}');
  expect(focused()).toBe('Settings');
  await userEvent.keyboard('{Home}');
  expect(focused()).toBe('Overview');
  await userEvent.keyboard('r');
  expect(focused()).toBe('Reports');
  await userEvent.tab();
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  expect(document.activeElement?.getAttribute('label')).toBe('Notifications, 3 unread');
});

it('S10: activates the original overflow control once and restores trigger focus', async () => {
  fixture.innerHTML = screen('', actions);
  const host = required(fixture.querySelector<HTMLElement>('ki-top-nav'));
  const archive = required(
    [...host.querySelectorAll('button')].find((button) => button.textContent === 'Archive'),
  );
  const activate = vi.fn();
  archive.addEventListener('click', activate);
  await overflow().click();
  await expect.element(page.getByRole('menuitem', { name: 'Archive' })).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(activate).toHaveBeenCalledTimes(1);
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  expect(host.shadowRoot?.activeElement).toBe(nativeButton(host, 'More actions'));
});

it('S11: lets a page-owned first skip link bypass the header', async () => {
  fixture.innerHTML = `<a href="#top-nav-content" tabindex="0">Skip to content</a>
    <ki-top-nav collapse-at="1px">${brand}${links}</ki-top-nav>
    <main id="top-nav-content" tabindex="-1">Content</main>`;
  const skip = page.getByRole('link', { name: 'Skip to content' });
  expect(fixture.querySelector('a, button')).toBe(skip.element());
  (skip.element() as HTMLAnchorElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByRole('main')).toHaveFocus();
});

it('S12: exposes the named landmark, current page and notification count and passes axe', async () => {
  wideHeader();
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect.element(nav).toHaveLength(1);
  await expect
    .element(nav.getByRole('link', { name: 'Projects' }))
    .toHaveAttribute('aria-current', 'page');
  await expect.element(page.getByRole('button', { name: 'Notifications, 3 unread' })).toBeVisible();
  await expectAccessible(fixture);
});

it('S13: connects the localized trigger to its menu and keeps aria-current', async () => {
  const host = narrowHeader('navigation-label="Abrir navegación"');
  const trigger = page.getByRole('button', { name: 'Abrir navegación' });
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Abrir navegación' });
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect
    .element(menu)
    .toHaveAttribute('id', required(trigger.element().getAttribute('aria-controls')));
  await expect
    .element(menu.getByRole('menuitem', { name: 'Projects' }))
    .toHaveAttribute('aria-current', 'page');
  expect(
    host.shadowRoot?.getElementById(required(trigger.element().getAttribute('aria-controls'))),
  ).toBe(menu.element());
  await expectAccessible(fixture);
});

it('S14: exposes one heading of the requested level and a named leading button across collapse', async () => {
  const { scroller } = mountScrollBar('size="lg" scroll-behavior="collapse" heading-level="3"');
  await expect.element(heading()).toBeVisible();
  const title = heading().element();
  scroller.scrollTop = 120;
  await expect
    .poll(
      () => Math.abs(title.getBoundingClientRect().top - scroller.getBoundingClientRect().top) < 56,
    )
    .toBe(true);
  expect(heading().elements()).toEqual([title]);
  expect(title.localName).toBe('h3');
  await expect.element(page.getByRole('button', { name: 'Back' })).toBeVisible();
});

it('S15: paints the themed app-bar fill, image, backdrop and heading family', async () => {
  fixture.innerHTML = screen();
  const host = required(fixture.querySelector<HTMLElement>('ki-top-nav'));
  host.style.setProperty('--ki-app-bar-bg', 'rgb(245, 241, 236)');
  host.style.setProperty('--ki-app-bar-bg-image', 'linear-gradient(transparent, white)');
  host.style.setProperty('--ki-app-bar-backdrop-filter', 'blur(3px)');
  host.style.setProperty('--ki-typography-family-heading', 'serif');
  await expect.element(heading()).toBeVisible();
  const surface = getComputedStyle(part(host, 'bar'));
  expect(surface.backgroundColor).toBe('rgb(245, 241, 236)');
  expect(surface.backgroundImage).toContain('linear-gradient');
  expect(surface.backdropFilter).toBe('blur(3px)');
  expect(getComputedStyle(heading().element()).fontFamily).toBe('serif');
});

it('S16: lays out the brand and trailing actions in RTL', async () => {
  fixture.dir = 'rtl';
  wideHeader();
  const brandLink = page.getByRole('link', { name: 'Kimen' });
  await expect.element(brandLink).toBeVisible();
  expect(brandLink.element().getBoundingClientRect().left).toBeGreaterThan(
    page.getByRole('link', { name: 'Overview' }).element().getBoundingClientRect().left,
  );
  expect(
    page.getByRole('button', { name: 'Notifications, 3 unread' }).element().getBoundingClientRect()
      .right,
  ).toBeLessThan(
    page.getByRole('link', { name: 'Settings' }).element().getBoundingClientRect().left,
  );
});

it('S17: keeps a drawn current-page indicator in forced colors', async () => {
  await media.emulateForcedColors('active');
  try {
    await expect.poll(() => matchMedia('(forced-colors: active)').matches).toBe(true);
    const host = wideHeader();
    await expect.element(page.getByRole('link', { name: 'Projects' })).toBeVisible();
    const indicator = getComputedStyle(required(host.querySelector('[aria-current="page"]')));
    expect(indicator.borderBlockEndStyle).toBe('solid');
    expect(indicator.borderBlockEndColor).not.toBe(
      getComputedStyle(part(host, 'bar')).backgroundColor,
    );
    expect(Number.parseFloat(indicator.borderBlockEndWidth)).toBeGreaterThanOrEqual(2);
  } finally {
    await media.emulateForcedColors(null);
  }
});

it('S18: changes to the compact height with no transition under reduced motion', async () => {
  await media.emulateReducedMotion('reduce');
  try {
    const { scroller, bar } = mountScrollBar('size="lg" scroll-behavior="collapse"');
    await expect.element(heading()).toBeVisible();
    const surface = part(bar, 'bar');
    scroller.scrollTop = 160;
    const target = 4 * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    await expect
      .poll(() => Math.abs(surface.getBoundingClientRect().height - target) <= 0.5)
      .toBe(true);
    expect(surface.getAnimations()).toHaveLength(0);
    expect(getComputedStyle(surface).transitionDuration).toBe('0s');
  } finally {
    await media.emulateReducedMotion(null);
  }
});
