// @spec:081-ki-menu
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineButton } from '../../../dist/components/ki-button.js';
import { defineCustomElement as defineDivider } from '../../../dist/components/ki-divider.js';
import { defineCustomElement as defineGroup } from '../../../dist/components/ki-menu-group.js';
import { defineCustomElement as defineItem } from '../../../dist/components/ki-menu-item.js';
import { defineCustomElement as defineMenu } from '../../../dist/components/ki-menu.js';

const style = document.createElement('style');
const fixture = document.createElement('main');
const trigger = () => page.getByRole('button', { name: 'Actions' });
const popup = () => page.getByRole('menu', { name: 'Actions' });
const action = (name: string) => page.getByRole('menuitem', { name });
const checkbox = () => page.getByRole('menuitemcheckbox', { name: 'Pin to sidebar' });
const filter = () => page.getByRole('searchbox', { name: 'Filter actions' });
const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
};

beforeAll(() => {
  defineButton();
  defineDivider();
  defineGroup();
  defineItem();
  defineMenu();
  style.textContent = tokensCss;
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('style');
  document.documentElement.style.removeProperty('--ki-surface-raised');
  await parkPointer();
});
afterAll(() => {
  fixture.remove();
  style.remove();
});

function mount(
  attributes = '',
  button = '<ki-button id="actions" type="button">Actions</ki-button>',
) {
  fixture.innerHTML = `
    <input aria-label="Before">
    ${button}
    <input aria-label="After">
    <ki-menu id="actions-menu" anchor="actions" ${attributes}>
      <span slot="header">Editing a row</span>
      <ki-menu-group label="Edit">
        <ki-menu-item value="rename" shortcut="F2">Rename</ki-menu-item>
        <ki-menu-item value="move" disabled>Move to…</ki-menu-item>
        <ki-menu-item value="pin" type="checkbox" checked>Pin to sidebar</ki-menu-item>
      </ki-menu-group>
      <ki-menu-group label="View">
        <ki-menu-item value="compact" type="radio" checked>Compact</ki-menu-item>
        <ki-menu-item value="comfortable" type="radio">Comfortable</ki-menu-item>
      </ki-menu-group>
      <ki-divider></ki-divider>
      <ki-menu-item value="delete" tone="danger">Delete</ki-menu-item>
    </ki-menu>
  `;
  const menu = fixture.querySelector('ki-menu');
  if (!menu) throw new Error('Missing menu');
  const events: unknown[] = [];
  menu.addEventListener('ki-select', (event) =>
    events.push((event as CustomEvent<unknown>).detail),
  );
  return { menu, events };
}

async function openMenu() {
  await expect.element(trigger()).toHaveAttribute('aria-expanded', 'false');
  await trigger().click();
  await expect.element(popup()).toBeVisible();
}

async function expectClosed(menu: HTMLElement) {
  await expect.element(trigger()).toHaveAttribute('aria-expanded', 'false');
  await expect.element(menu).not.toHaveAttribute('open');
  await expect.element(popup()).not.toBeInTheDocument();
}

it('S1 selects the action once, closes and returns focus', async () => {
  const { menu, events } = mount();
  await openMenu();
  await action('Rename').click();
  await expectClosed(menu);
  await expect.poll(() => trigger().query()?.matches(':focus')).toBe(true);
  expect(events).toEqual([{ value: 'rename' }]);
});

it('S2 toggles a checkbox without dismissing the menu', async () => {
  const { events } = mount();
  await openMenu();
  await checkbox().click();
  await expect.element(checkbox()).toHaveAttribute('aria-checked', 'false');
  await expect.element(popup()).toBeVisible();
  expect(events).toEqual([{ value: 'pin', checked: false }]);
});

it('S3 selects one radio in its group and closes', async () => {
  const { menu, events } = mount();
  await openMenu();
  await page.getByRole('menuitemradio', { name: 'Comfortable' }).click();
  await expectClosed(menu);
  expect(events).toEqual([{ value: 'comfortable', checked: true }]);
  await openMenu();
  await expect
    .element(page.getByRole('menuitemradio', { name: 'Compact' }))
    .toHaveAttribute('aria-checked', 'false');
  await expect
    .element(page.getByRole('menuitemradio', { name: 'Comfortable' }))
    .toHaveAttribute('aria-checked', 'true');
});

it('S4 dismisses outside without taking focus from the clicked control', async () => {
  const { menu } = mount();
  await openMenu();
  const after = page.getByRole('textbox', { name: 'After' });
  await after.click();
  await expectClosed(menu);
  await expect.poll(() => after.query()?.matches(':focus')).toBe(true);
});

it.each([
  ['{Enter}', 'Rename'],
  [' ', 'Rename'],
  ['{ArrowDown}', 'Rename'],
  ['{ArrowUp}', 'Delete'],
])('S5 %s opens at %s', async (key, label) => {
  const { menu } = mount();
  await expect.element(trigger()).toHaveAttribute('aria-expanded', 'false');
  (trigger().element() as HTMLElement).focus();
  await userEvent.keyboard(key);
  await expect.poll(() => action(label).query()?.matches(':focus')).toBe(true);
  await expect.element(menu).toHaveAttribute('open');
});

it.each([
  ['{End}', '{ArrowDown}', 'Rename'],
  ['', '{ArrowUp}', 'Delete'],
  ['', '{ArrowDown}', 'Move to…'],
  ['{End}', '{Home}', 'Rename'],
  ['', '{End}', 'Delete'],
])('S6 navigation from %s with %s focuses %s', async (setup, key, label) => {
  mount();
  await openMenu();
  if (setup) await userEvent.keyboard(setup);
  await userEvent.keyboard(key);
  await expect.poll(() => action(label).query()?.matches(':focus')).toBe(true);
});

it('S6 type-ahead finds the next label by initial', async () => {
  mount();
  await openMenu();
  await userEvent.keyboard('p');
  await expect.poll(() => checkbox().query()?.matches(':focus')).toBe(true);
});

it.each(['{Enter}', ' '])('S7 %s activates the focused action', async (key) => {
  const { menu, events } = mount();
  await openMenu();
  await userEvent.keyboard(key);
  await expectClosed(menu);
  expect(events).toEqual([{ value: 'rename' }]);
});

it('S8 Escape closes and focuses the trigger', async () => {
  const { menu } = mount();
  await openMenu();
  await userEvent.keyboard('{End}{Escape}');
  await expectClosed(menu);
  await expect.poll(() => trigger().query()?.matches(':focus')).toBe(true);
});

it.each([
  [false, 'After'],
  [true, 'Before'],
])('S9 Tab (shift=%s) exits to %s relative to the trigger', async (shift, label) => {
  const { menu } = mount();
  await openMenu();
  await userEvent.tab({ shift });
  await expectClosed(menu);
  await expect
    .poll(() => page.getByRole('textbox', { name: label }).query()?.matches(':focus'))
    .toBe(true);
});

it('S10 starts in the filter when present', async () => {
  mount('filter-label="Filter actions"');
  await openMenu();
  await expect.poll(() => filter().query()?.matches(':focus')).toBe(true);
});

it('S11 filters by label and updates the polite status, including zero results', async () => {
  mount('filter-label="Filter actions"');
  await openMenu();
  await filter().fill('PIN');
  await expect.element(checkbox()).toBeVisible();
  await expect.element(action('Rename')).not.toBeInTheDocument();
  await expect.element(page.getByRole('group', { name: 'View' })).not.toBeInTheDocument();
  await expect.element(page.getByRole('separator')).not.toBeInTheDocument();
  const status = page.getByRole('status').filter({ hasText: 'Matching actions:' });
  await expect.element(status).toHaveAttribute('aria-live', 'polite');
  await expect.element(status).toHaveTextContent('Matching actions: 1');
  await filter().fill('unknown');
  await expect.element(checkbox()).not.toBeInTheDocument();
  await expect.element(status).toHaveTextContent('Matching actions: 0');
  await userEvent.keyboard('{Escape}');
  await openMenu();
  await expect.element(filter()).toHaveValue('');
});

it('S12 Down moves from the filter into the results', async () => {
  mount('filter-label="Filter actions"');
  await openMenu();
  await filter().fill('PIN');
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => checkbox().query()?.matches(':focus')).toBe(true);
});

it('S13 disabled actions remain focusable and inert under keyboard and click', async () => {
  const { events } = mount();
  await openMenu();
  await userEvent.keyboard('{ArrowDown}');
  const disabled = action('Move to…');
  await expect.poll(() => disabled.query()?.matches(':focus')).toBe(true);
  await expect.element(disabled).toHaveAttribute('aria-disabled', 'true');
  await userEvent.keyboard('{Enter} ');
  const disabledHost = fixture.querySelector<HTMLElement>('ki-menu-item[disabled]');
  if (!disabledHost) throw new Error('Missing disabled item');
  let observedClicks = 0;
  disabledHost.addEventListener('click', () => {
    observedClicks += 1;
  });
  (disabled.element() as HTMLButtonElement).click();
  disabledHost.click();
  expect(observedClicks).toBe(0);
  expect(events).toEqual([]);
  await expect.element(popup()).toBeVisible();
});

it('S14 exposes a named menu, groups and check states and passes axe', async () => {
  const { menu } = mount(
    '',
    '<ki-button id="actions" type="button" aria-haspopup="menu">Actions</ki-button>',
  );
  await openMenu();
  await expect.poll(() => menu.matches('ki-menu[open]')).toBe(true);
  await expect.poll(() => action('Rename').query()?.matches(':focus')).toBe(true);
  const button = trigger().element();
  if (!(button instanceof HTMLButtonElement)) throw new Error('Missing native trigger');
  const host = fixture.querySelector('#actions');
  expect(host?.getAttribute('aria-controls')).toBe(menu.id);
  expect(host?.hasAttribute('aria-expanded')).toBe(false);
  await expect.element(button).toHaveAttribute('aria-haspopup', 'menu');
  await expect.element(button).toHaveAttribute('aria-expanded', 'true');
  expect(button.ariaControlsElements).toEqual([menu]);
  const snapshot = await browserCommands.ariaSnapshot('main');
  expect(snapshot).toContain('menu "Actions"');
  expect(snapshot).toContain('group "Edit"');
  expect(snapshot).toContain('menuitemcheckbox "Pin to sidebar" [checked]');
  expect(snapshot).toContain('menuitemradio "Compact" [checked]');
  expect(snapshot).toContain('separator');
  await expectAccessible(fixture);
});

it('S15 the popup uses the raised surface semantic token', async () => {
  mount();
  document.documentElement.style.setProperty('--ki-surface-raised', 'rgb(220, 230, 240)');
  await openMenu();
  const surface = fixture
    .querySelector('ki-menu')
    ?.shadowRoot?.querySelector<HTMLElement>('[part="popup"]');
  if (!surface) throw new Error('Missing popup');
  expect(getComputedStyle(surface).backgroundColor).toBe('rgb(220, 230, 240)');
});

it('S16 flips above a trigger near the bottom of the viewport', async () => {
  mount();
  const anchor = fixture.querySelector<HTMLElement>('#actions');
  if (!anchor) throw new Error('Missing trigger');
  anchor.style.cssText = 'position:fixed;inset-block-end:0;inset-inline-start:0';
  await openMenu();
  const menuRect = popup().element().getBoundingClientRect();
  expect(menuRect.bottom).toBeLessThan(anchor.getBoundingClientRect().top);
  expect(menuRect.top).toBeGreaterThanOrEqual(0);
});

it('S17 bottom-start aligns to the right edge in RTL', async () => {
  fixture.dir = 'rtl';
  mount(
    '',
    '<button id="actions" type="button" style="position:fixed;inset-inline-start:2rem;inset-block-start:2rem">Actions</button>',
  );
  await openMenu();
  const menuRect = fixture
    .querySelector('ki-menu')
    ?.shadowRoot?.querySelector('[part="popup"]')
    ?.getBoundingClientRect();
  expect(menuRect?.right).toBeCloseTo(trigger().element().getBoundingClientRect().right, 0);
});

it('binds a trigger in the same containing shadow root', async () => {
  const outer = document.createElement('section');
  fixture.append(outer);
  const root = outer.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <button id="actions" type="button" aria-label="More actions">⋯</button>
    <ki-menu anchor="actions"><ki-menu-item value="rename">Rename</ki-menu-item></ki-menu>
  `;
  const button = page.getByRole('button', { name: 'More actions' });
  await expect.element(button).toHaveAttribute('aria-expanded', 'false');
  await button.click();
  await expect.element(page.getByRole('menu', { name: 'More actions' })).toBeVisible();
  await expect.poll(() => action('Rename').query()?.matches(':focus')).toBe(true);
});
