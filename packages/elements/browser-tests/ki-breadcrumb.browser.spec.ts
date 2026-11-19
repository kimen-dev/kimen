// @spec:096-ki-breadcrumb
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { defineCustomElement as defineBreadcrumbItem } from '../dist/components/ki-breadcrumb-item.js';
import { defineCustomElement as defineBreadcrumb } from '../dist/components/ki-breadcrumb.js';
import { expectAccessible, parkPointer } from './axe';

const SHORT_PATH = [
  ['Workspace', '#workspace'],
  ['Projects', '#projects'],
  ['Settings', '#settings'],
] as const;

const LONG_PATH = [
  ['Workspace', '#workspace'],
  ['Projects', '#projects'],
  ['Kimen', '#kimen'],
  ['Packages', '#packages'],
  ['Releases', '#releases'],
  ['Settings', '#settings'],
] as const;

const styles = document.createElement('style');
const initialUrl = location.href;
const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(() => {
  defineBreadcrumbItem();
  defineBreadcrumb();
  styles.textContent = tokensCss;
  document.head.append(styles);
});

afterEach(async () => {
  document.body.replaceChildren();
  if (location.href !== initialUrl) {
    history.replaceState(null, '', initialUrl);
  }
  await parkPointer();
});

afterAll(() => {
  styles.remove();
});

function item(text: string, href: string): HTMLElement {
  const element = document.createElement('ki-breadcrumb-item');
  element.textContent = text;
  element.setAttribute('href', href);
  return element;
}

function mount(
  entries: readonly (readonly [string, string])[] = SHORT_PATH,
  attrs: Record<string, string> = {},
): HTMLElement {
  const main = document.createElement('main');
  const trail = document.createElement('ki-breadcrumb');
  for (const [name, value] of Object.entries(attrs)) {
    trail.setAttribute(name, value);
  }
  trail.append(...entries.map(([text, href]) => item(text, href)));
  main.append(trail);
  document.body.append(main);
  return trail;
}

function link(name: string) {
  return page.getByRole('link', { name, exact: true });
}

function menuItem(name: string) {
  return page.getByRole('menuitem', { name, exact: true });
}

function more(name = 'Show 3 more levels') {
  return page.getByRole('button', { name, exact: true });
}

async function tabToMore(): Promise<void> {
  await expect.element(link('Workspace')).toBeVisible();
  await expect.element(more()).toBeVisible();
  (link('Workspace').element() as HTMLElement).focus();
  await userEvent.keyboard('{Tab}');
  await expectFocus(more().element() as HTMLElement);
}

async function expectFocus(element: HTMLElement): Promise<void> {
  const root = element.getRootNode() as Document | ShadowRoot;
  await expect.poll(() => root.activeElement).toBe(element);
}

it('S1 shows ancestor destinations and exposes the final level as current text', async () => {
  const trail = mount();

  await expect.element(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  await expect.element(link('Workspace')).toHaveAttribute('href', '#workspace');
  await expect.element(link('Projects')).toHaveAttribute('href', '#projects');
  expect(
    page
      .getByRole('link')
      .elements()
      .map((anchor) => anchor.textContent),
  ).toEqual(['Workspace', 'Projects']);
  await expect.element(link('Settings')).not.toBeInTheDocument();
  await expect
    .poll(() => trail.shadowRoot?.querySelector('[aria-current="page"]')?.textContent)
    .toBe('Settings');
  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
});

it('S2 keeps the root and last two levels on the trail while the menu exposes the middle', async () => {
  const trail = mount(LONG_PATH, { 'max-items': '4' });

  await expect.element(link('Workspace')).toBeVisible();
  await expect.element(link('Releases')).toBeVisible();
  await expect
    .poll(() => trail.shadowRoot?.querySelector('[aria-current="page"]')?.textContent)
    .toBe('Settings');
  await expect.element(link('Projects')).not.toBeInTheDocument();
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();

  await more().click();

  await expect.element(page.getByRole('menu')).toBeVisible();
  await expect.element(menuItem('Projects')).toHaveAttribute('href', '#projects');
  await expect.element(menuItem('Kimen')).toHaveAttribute('href', '#kimen');
  await expect.element(menuItem('Packages')).toHaveAttribute('href', '#packages');
  expect(
    page
      .getByRole('menuitem')
      .elements()
      .map((anchor) => anchor.textContent),
  ).toEqual(['Projects', 'Kimen', 'Packages']);
});

it('S2 closes the menu when the overflow button is clicked again', async () => {
  mount(LONG_PATH, { 'max-items': '4' });
  const trigger = more();
  await trigger.click();
  await expect.element(menuItem('Projects')).toBeVisible();
  await expectFocus(menuItem('Projects').element() as HTMLElement);

  await trigger.click();

  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('S3 moves current to the appended page and links the former current page', async () => {
  const trail = mount();
  await expect
    .poll(() => trail.shadowRoot?.querySelector('[aria-current="page"]')?.textContent)
    .toBe('Settings');

  trail.append(item('Profile', '#profile'));

  await expect.element(link('Settings')).toHaveAttribute('href', '#settings');
  await expect
    .poll(() => trail.shadowRoot?.querySelector('[aria-current="page"]')?.textContent)
    .toBe('Profile');
});

it('S3 updates an existing ancestor when its text and destination change', async () => {
  const trail = mount();
  await expect.element(link('Projects')).toBeVisible();

  const projects = trail.children.item(1);
  if (!projects) {
    throw new Error('Fixture is missing Projects');
  }
  projects.textContent = 'Portfolio';
  projects.setAttribute('href', '#portfolio');
  await expect.element(link('Projects')).not.toBeInTheDocument();
  await expect.element(link('Portfolio')).toHaveAttribute('href', '#portfolio');
});

it('S4 supports Tab, Enter, arrow keys, Home and End and activates a native destination', async () => {
  mount(LONG_PATH, { 'max-items': '4' });
  await tabToMore();

  await userEvent.keyboard('{Enter}');
  await expect.element(menuItem('Projects')).toBeVisible();
  await expectFocus(menuItem('Projects').element() as HTMLElement);

  await userEvent.keyboard('{ArrowDown}');
  await expectFocus(menuItem('Kimen').element() as HTMLElement);
  await userEvent.keyboard('{End}');
  await expectFocus(menuItem('Packages').element() as HTMLElement);
  await userEvent.keyboard('{Home}');
  await expectFocus(menuItem('Projects').element() as HTMLElement);
  await userEvent.keyboard('k');
  await expectFocus(menuItem('Kimen').element() as HTMLElement);
  await userEvent.keyboard('{ArrowUp}');
  await expectFocus(menuItem('Projects').element() as HTMLElement);

  await userEvent.keyboard('{Enter}');
  await expect.poll(() => location.hash).toBe('#projects');
});

it('S4 supports Space on the overflow trigger and a menu destination', async () => {
  mount(LONG_PATH, { 'max-items': '4' });
  await tabToMore();

  await userEvent.keyboard(' ');
  await expect.element(menuItem('Projects')).toBeVisible();
  await expectFocus(menuItem('Projects').element() as HTMLElement);
  await userEvent.keyboard(' ');

  await expect.poll(() => location.hash).toBe('#projects');
});

it('S4 closes the menu when Tab continues along the trail', async () => {
  mount(LONG_PATH, { 'max-items': '4' });
  await tabToMore();
  await userEvent.keyboard('{Enter}');
  await expect.element(menuItem('Projects')).toBeVisible();
  await expectFocus(menuItem('Projects').element() as HTMLElement);

  await userEvent.keyboard('{Tab}');

  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  await expectFocus(link('Releases').element() as HTMLElement);
});

it('S5 closes with Escape and returns focus to the overflow trigger', async () => {
  mount(LONG_PATH, { 'max-items': '4' });
  await tabToMore();
  await userEvent.keyboard('{Enter}');
  await expect.element(menuItem('Projects')).toBeVisible();
  await expectFocus(menuItem('Projects').element() as HTMLElement);
  await userEvent.keyboard('{ArrowDown}');
  await expectFocus(menuItem('Kimen').element() as HTMLElement);

  await userEvent.keyboard('{Escape}');

  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  await expect.element(more()).toHaveAttribute('aria-expanded', 'false');
  await expectFocus(more().element() as HTMLElement);
});

it('S6 exposes ordered navigation, announces the count and expanded state, and passes axe', async () => {
  const trail = mount(LONG_PATH, {
    label: 'Project path',
    'max-items': '4',
  });
  const navigation = page.getByRole('navigation', { name: 'Project path' });
  const trigger = more();
  await expect.element(navigation).toBeVisible();
  await expect.element(page.getByRole('list')).toBeVisible();
  await expect.element(trigger).toHaveAttribute('aria-haspopup', 'menu');
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trail.shadowRoot?.querySelector('nav > ol')).toBeInstanceOf(HTMLOListElement);
  expect(trail.shadowRoot?.querySelectorAll('[aria-current="page"]')).toHaveLength(1);

  const snapshot = await browserCommands.ariaSnapshot('ki-breadcrumb');
  expect(snapshot).toContain('navigation "Project path"');
  expect(snapshot.match(/listitem/gu)).toHaveLength(4);
  expect(snapshot).toContain('link "Workspace"');
  expect(snapshot).toContain('link "Releases"');
  expect(snapshot).toContain('Settings');
  expect(snapshot).not.toMatch(/[›»…]/u);
  await expectAccessible();

  await trigger.click();

  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect.element(menuItem('Projects')).toBeVisible();
  await expectAccessible();
});

it('S6 localizes the accessible overflow label with its dynamic count', async () => {
  const trail = mount(LONG_PATH, {
    label: 'Release path',
    'max-items': '4',
    'more-label': 'Browse {n} earlier levels',
  });

  await expect.element(more('Browse 3 earlier levels')).toBeVisible();
  await expect.element(page.getByRole('navigation', { name: 'Release path' })).toBeVisible();

  trail.removeAttribute('more-label');
  trail.removeAttribute('label');

  await expect.element(more()).toBeVisible();
  await expect.element(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
});

it('S7 allows the consumer to change an ancestor foreground through its component token', async () => {
  const trail = mount();
  const ancestor = link('Workspace');
  await expect.element(ancestor).toBeVisible();
  const anchor = ancestor.element();
  const initialColor = getComputedStyle(anchor).color;

  trail.style.setProperty('--ki-breadcrumb-fg', 'rgb(19, 57, 99)');

  await expect.poll(() => getComputedStyle(anchor).color).not.toBe(initialColor);
  expect(getComputedStyle(anchor).color).toBe('rgb(19, 57, 99)');
});

it('S8 reverses the visual direction in RTL while keeping the path order', async () => {
  const trail = mount();
  await expect.element(link('Workspace')).toBeVisible();
  await expect.element(link('Projects')).toBeVisible();
  const first = link('Workspace').element();
  const second = link('Projects').element();
  const separatorStep = second.closest('li');
  if (!separatorStep) {
    throw new Error('Projects is missing its list item');
  }
  const ltrRotation = getComputedStyle(separatorStep, '::before').rotate;

  trail.dir = 'rtl';

  await expect
    .poll(() => first.getBoundingClientRect().left > second.getBoundingClientRect().right)
    .toBe(true);
  expect(getComputedStyle(separatorStep, '::before').rotate).not.toBe(ltrRotation);
  const snapshot = await browserCommands.ariaSnapshot('ki-breadcrumb');
  expect(snapshot.indexOf('Workspace')).toBeLessThan(snapshot.indexOf('Projects'));
});

it('S10 keeps the focused menu destination visible in forced colors with reduced motion', async (test) => {
  await browserCommands.emulateForcedColors('active');
  try {
    const witness = document.createElement('span');
    const authorColor = 'rgb(19, 57, 99)';
    witness.style.backgroundColor = authorColor;
    document.body.append(witness);
    const forcedColorsApply =
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(witness).backgroundColor !== authorColor;
    witness.remove();
    if (!forcedColorsApply && !navigator.userAgent.includes('Chrome/')) {
      test.skip('this engine does not apply a forced palette under emulation');
    }
    expect(forcedColorsApply).toBe(true);
    await browserCommands.emulateReducedMotion('reduce');
    const trail = mount(LONG_PATH, { 'max-items': '4' });
    await tabToMore();

    await userEvent.keyboard('{Enter}');

    await expect.element(menuItem('Projects')).toBeVisible();
    const destination = menuItem('Projects').element() as HTMLElement;
    await expectFocus(destination);
    const style = getComputedStyle(destination);
    expect(style.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    expect(trail.shadowRoot?.getAnimations()).toEqual([]);
  } finally {
    await browserCommands.emulateReducedMotion(null);
    await browserCommands.emulateForcedColors(null);
  }
});
