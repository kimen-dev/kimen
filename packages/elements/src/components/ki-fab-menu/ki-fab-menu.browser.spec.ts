// @spec:128-ki-fab-menu
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineItem } from '../../../dist/components/ki-fab-menu-item.js';
import { defineCustomElement as defineMenu } from '../../../dist/components/ki-fab-menu.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
fixture.id = 'fab-menu-fixture';
const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (mode: 'active' | null) => Promise<void>;
  emulateReducedMotion: (mode: 'reduce' | null) => Promise<void>;
};
const create = page.getByRole('button', { name: 'Create', exact: true });
const close = page.getByRole('button', { name: 'Close menu', exact: true });
const menu = page.getByRole('menu', { name: 'Create', exact: true });
const message = page.getByRole('menuitem', { name: 'New message', exact: true });
const eventItem = page.getByRole('menuitem', { name: 'New event', exact: true });
const actions =
  '<ki-fab-menu-item value="message">New message</ki-fab-menu-item>' +
  '<ki-fab-menu-item href="#new-event">New event</ki-fab-menu-item>';

beforeAll(() => {
  defineItem();
  defineMenu();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('style');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function mount(attributes = '', items = actions): HTMLElement {
  fixture.innerHTML =
    '<button type="button" tabindex="0">First</button>' +
    `<ki-fab-menu label="Create" position="fixed" ${attributes}>${items}</ki-fab-menu>` +
    '<button type="button" tabindex="0">Last</button><span id="new-event"></span>';
  const host = fixture.querySelector<HTMLElement>('ki-fab-menu');
  if (!host) throw new Error('Missing FAB menu');
  return host;
}

function part(host: HTMLElement, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Missing part "${name}"`);
  return element;
}

function control(index: number): HTMLElement {
  const item = fixture.querySelectorAll<HTMLElement>('ki-fab-menu-item')[index];
  if (!item) throw new Error('Missing FAB menu item');
  return part(item, 'control');
}

async function expectClosedMenu(host: HTMLElement, itemIndex: number): Promise<void> {
  await expect.element(part(host, 'menu')).toHaveAttribute('hidden');
  // The slotted controls stay connected. Check layout and the real AX tree.
  await expect.poll(() => control(itemIndex).getClientRects().length).toBe(0);
  const snapshot = await browser.ariaSnapshot('ki-fab-menu');
  expect(snapshot).not.toMatch(/^\s*-\s+menu(?:item)?\b/m);
}

it('S1: stacks actions above the FAB and uses a close control while open', async () => {
  const host = mount();
  const opened = vi.fn();
  const closed = vi.fn();
  host.addEventListener('ki-open', opened);
  host.addEventListener('ki-close', closed);
  await expect.element(create).toHaveAttribute('aria-expanded', 'false');
  await expectClosedMenu(host, 0);

  await create.click();

  await expect.element(close).toBeVisible();
  await expect.element(message).toBeVisible();
  await expect.element(eventItem).toBeVisible();
  expect(control(0).getBoundingClientRect().bottom).toBeLessThan(
    control(1).getBoundingClientRect().top,
  );
  expect(control(1).getBoundingClientRect().bottom).toBeLessThan(
    part(host, 'trigger').getBoundingClientRect().top,
  );
  expect(control(0).matches(':focus')).toBe(true);
  expect(opened).toHaveBeenCalledTimes(1);

  await close.click();
  await expect.element(create).toHaveAttribute('aria-expanded', 'false');
  await expectClosedMenu(host, 0);
  expect(closed).toHaveBeenCalledTimes(1);
});

it('S2: selecting a command emits its value, closes and restores focus', async () => {
  const host = mount();
  const selected = vi.fn();
  const closed = vi.fn();
  fixture.addEventListener('ki-select', selected, { once: true });
  host.addEventListener('ki-close', closed);
  await create.click();
  await message.click();
  await expect.element(create).toBeVisible();

  expect(selected).toHaveBeenCalledTimes(1);
  expect(selected.mock.calls[0]?.[0]).toHaveProperty('detail', { value: 'message' });
  expect(closed).toHaveBeenCalledTimes(1);
  expect(part(host, 'trigger').matches(':focus')).toBe(true);
});

it('S2: a command can bind its own action while the parent reports one selection', async () => {
  const host = mount();
  const itemAction = vi.fn((event: Event) => {
    event.stopPropagation();
  });
  const menuAction = vi.fn();
  const item = host.querySelector('ki-fab-menu-item');
  item?.addEventListener('ki-select', itemAction);
  host.addEventListener('ki-select', menuAction);
  await create.click();

  await message.click();

  await expect.element(create).toBeVisible();
  expect(itemAction).toHaveBeenCalledTimes(1);
  expect(itemAction.mock.calls[0]?.[0]).toHaveProperty('detail', { value: 'message' });
  expect(menuAction).toHaveBeenCalledTimes(1);
  expect(menuAction.mock.calls[0]?.[0]).toHaveProperty('target', host);
});

it('S3: clicking the scrim dismisses the menu and restores focus', async () => {
  const host = mount();
  await create.click();
  await expect.element(menu).toBeVisible();
  await userEvent.click(part(host, 'scrim'));
  await expect.element(create).toBeVisible();
  expect(part(host, 'trigger').matches(':focus')).toBe(true);
});

it('S3: omitting the scrim keeps the open menu available', async () => {
  const host = mount('scrim="false"');
  await create.click();
  await expect.element(menu).toBeVisible();
  expect(host.shadowRoot?.querySelector('[part="scrim"]')).toBeNull();
});

it('S4: limits the stack and keyboard range to six visible direct items', async () => {
  const items = Array.from(
    { length: 7 },
    (_, index) => `<ki-fab-menu-item>Action ${String(index + 1)}</ki-fab-menu-item>`,
  ).join('');
  mount('', '<ki-fab-menu-item hidden>Hidden</ki-fab-menu-item>' + items);
  await create.click();

  await expect.element(page.getByRole('menuitem', { name: 'Action 6' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'Action 7' })).not.toBeInTheDocument();
  expect(page.getByRole('menuitem').all()).toHaveLength(6);
  await userEvent.keyboard('{End}');
  expect(control(6).matches(':focus')).toBe(true);
});

it('S5: enables the trigger when a second action becomes available', async () => {
  const host = mount('', '<ki-fab-menu-item>New message</ki-fab-menu-item>');
  await expect.element(create).toBeDisabled();
  await expectClosedMenu(host, 0);

  host.insertAdjacentHTML('beforeend', '<ki-fab-menu-item>New event</ki-fab-menu-item>');
  await expect.element(create).toBeEnabled();
  await create.click();
  await expect.element(eventItem).toBeVisible();

  host.querySelector('ki-fab-menu-item')?.setAttribute('hidden', '');
  await expect.element(create).toBeDisabled();
  await expectClosedMenu(host, 1);
});

it.each([
  ['Enter', '{Enter}', 0],
  ['Space', ' ', 0],
  ['ArrowDown', '{ArrowDown}', 0],
  ['ArrowUp', '{ArrowUp}', 1],
] as const)('S6: %s opens and focuses the expected action', async (_name, key, index) => {
  const host = mount();
  await expect.element(create).toBeVisible();
  part(host, 'trigger').focus();

  await userEvent.keyboard(key);

  await expect.element(menu).toBeVisible();
  await expect.poll(() => control(index).matches(':focus')).toBe(true);
});

it.each([
  [0, 'ArrowDown', 1],
  [1, 'ArrowDown', 0],
  [0, 'ArrowUp', 1],
  [1, 'Home', 0],
  [0, 'End', 1],
] as const)('S7: from action %d, %s focuses action %d', async (start, key, next) => {
  mount();
  await create.click();
  await expect.element(eventItem).toBeVisible();
  control(start).focus();

  await userEvent.keyboard(`{${key}}`);

  expect(control(next).matches(':focus')).toBe(true);
});

it('S8: Escape closes the menu and restores focus', async () => {
  const host = mount();
  await create.click();
  await expect.element(message).toBeVisible();
  await userEvent.keyboard('{Escape}');

  await expect.element(create).toBeVisible();
  expect(part(host, 'trigger').matches(':focus')).toBe(true);
});

it.each([
  ['{Tab}', 'Last'],
  ['{Shift>}{Tab}{/Shift}', 'First'],
] as const)('S9: %s closes the menu and moves focus to %s', async (key, name) => {
  mount();
  await create.click();
  await expect.element(message).toBeVisible();

  await userEvent.keyboard(key);

  await expect.element(create).toBeVisible();
  await expect.element(page.getByRole('button', { name })).toHaveFocus();
});

it.each(['{Enter}', ' '])(
  'S10: %s activates the native destination and reports its label',
  async (key) => {
    const host = mount();
    const selected = vi.fn();
    host.addEventListener('ki-select', selected);
    const initialUrl = location.href;
    await create.click();
    await expect.element(eventItem).toBeVisible();
    control(1).focus();

    try {
      await userEvent.keyboard(key);
      await expect.poll(() => location.hash).toBe('#new-event');
      await expect.element(create).toBeVisible();
      expect(selected).toHaveBeenCalledTimes(1);
      expect(selected.mock.calls[0]?.[0]).toHaveProperty('detail', { value: 'New event' });
    } finally {
      history.replaceState(history.state, '', initialUrl);
    }
  },
);

it('S11: exposes the trigger relationship and menu ownership in the accessibility tree', async () => {
  const host = mount();
  await expect.element(create).toHaveAttribute('aria-haspopup', 'menu');
  await expect.element(create).toHaveAttribute('aria-expanded', 'false');
  await expect.element(create).not.toHaveAttribute('aria-controls');
  await create.click();

  await expect.element(close).toHaveAttribute('aria-expanded', 'true');
  await expect.element(close).toHaveAttribute('aria-controls', part(host, 'menu').id);
  await expect.element(close).not.toHaveAttribute('aria-haspopup');
  await expect.element(message).toBeVisible();
  await expect.element(eventItem).toBeVisible();
  expect(control(0).tagName).toBe('BUTTON');
  expect(control(1).tagName).toBe('A');
  const snapshot = await browser.ariaSnapshot('ki-fab-menu');
  expect(snapshot).toMatch(
    /menu "Create":\s*\n\s*- menuitem "New message"[^\n]*\n\s*- menuitem "New event"/,
  );
  await expectAccessible(fixture);
});

it('S12: the close button uses the primary FAB colors and the item uses its own tokens', async () => {
  fixture.style.setProperty('--ki-fab-primary-bg', '#123456');
  fixture.style.setProperty('--ki-fab-primary-fg', '#ffffff');
  fixture.style.setProperty('--ki-fab-menu-item-bg', '#f2e4cf');
  fixture.style.setProperty('--ki-fab-menu-item-fg', '#342100');
  const host = mount('variant="surface"');
  await expect.element(create).toBeVisible();
  const trigger = part(host, 'trigger');

  expect(getComputedStyle(trigger).backgroundColor).not.toBe('rgb(18, 52, 86)');
  await create.click();
  await expect.element(message).toBeVisible();

  expect(getComputedStyle(trigger).backgroundColor).toBe('rgb(18, 52, 86)');
  expect(getComputedStyle(trigger).color).toBe('rgb(255, 255, 255)');
  expect(getComputedStyle(control(0)).backgroundColor).toBe('rgb(242, 228, 207)');
  expect(getComputedStyle(control(0)).color).toBe('rgb(52, 33, 0)');
});

/** A token's computed fill, read from a probe under the fixture. */
function resolvedFill(token: string): string {
  const probe = document.createElement('span');
  probe.style.backgroundColor = `var(${token})`;
  fixture.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

// Design-system review 2026-11-20, item 4: in onmars the accent is spent on
// selection, links and focus, so the menu's FAB is the primary ink and its
// actions a raised surface with a hairline, never the selection tint.
it('S12: the closed default trigger reads its own pair, the primary FAB ink in onmars', async () => {
  const host = mount();
  await expect.element(create).toBeVisible();
  const trigger = part(host, 'trigger');
  const selection = resolvedFill('--ki-surface-primary-low-em');

  expect(getComputedStyle(trigger).backgroundColor).toBe(resolvedFill('--ki-fab-primary-bg'));
  expect(getComputedStyle(trigger).backgroundColor).not.toBe(selection);
  await create.click();
  await expect.element(message).toBeVisible();
  expect(getComputedStyle(control(0)).backgroundColor).not.toBe(selection);
  expect(getComputedStyle(control(0)).borderTopWidth).toBe('1px');
});

it('S13: fixed placement aligns the actions and trigger at the left in RTL', async () => {
  fixture.dir = 'rtl';
  const host = mount();
  await create.click();
  await expect.element(message).toBeVisible();
  await expect
    .poll(() => {
      const fab = part(host, 'trigger').getBoundingClientRect();
      return Math.abs(control(0).getBoundingClientRect().left - fab.left);
    })
    .toBeLessThan(0.5);
  expect(part(host, 'trigger').getBoundingClientRect().left).toBeLessThan(56);
});

it('S14: forced colors preserve the control edges and keyboard focus', async (test) => {
  try {
    await browser.emulateForcedColors('active');
    if (!matchMedia('(forced-colors: active)').matches) {
      if (navigator.userAgent.includes('Chrome/'))
        throw new Error('Chromium did not emulate forced colors');
      test.skip('This browser cannot emulate forced colors');
    }
    const host = mount();
    await expect.element(create).toBeVisible();
    fixture.querySelector('button')?.focus();
    await userEvent.keyboard('{Tab}');
    const trigger = part(host, 'trigger');
    await expect.poll(() => trigger.matches(':focus-visible')).toBe(true);
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(message).toBeVisible();

    expect(parseFloat(getComputedStyle(trigger).borderInlineStartWidth)).toBeGreaterThan(0);
    expect(parseFloat(getComputedStyle(control(0)).borderInlineStartWidth)).toBeGreaterThan(0);
    await expect.poll(() => control(0).matches(':focus-visible')).toBe(true);
    expect(parseFloat(getComputedStyle(control(0)).outlineWidth)).toBeGreaterThan(0);
  } finally {
    await browser.emulateForcedColors(null);
  }
});

it('S15: reduced motion renders the open stack without animations', async () => {
  try {
    await browser.emulateReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const host = mount();
    await create.click();
    await expect.element(message).toBeVisible();
    expect(part(host, 'menu').getAnimations({ subtree: true })).toHaveLength(0);
    expect(control(0).getAnimations({ subtree: true })).toHaveLength(0);
  } finally {
    await browser.emulateReducedMotion(null);
  }
});
