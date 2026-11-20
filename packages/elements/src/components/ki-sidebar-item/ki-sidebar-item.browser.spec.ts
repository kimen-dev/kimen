// @spec:106-ki-sidebar
import tokens from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';

const fixture = document.createElement('main');
const style = document.createElement('style');
const countedInboxName = /^Inbox\s*,\s*12 new$/u;
const media = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
};

beforeAll(() => {
  defineAllComponents();
  style.textContent = tokens;
  document.head.append(style);
  document.body.append(fixture);
});
afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});
afterAll(() => {
  style.remove();
  fixture.remove();
});

function mount(extra = ''): HTMLElement {
  fixture.innerHTML = `<button type="button" tabindex="0">Before</button>
    <ki-sidebar style="--ki-tooltip-show-delay: 0ms" ${extra}>
      <ki-sidebar-item href="#inbox" count="12" current>
        <svg slot="start" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>
        Inbox
      </ki-sidebar-item>
      <ki-sidebar-item href="#members">Members</ki-sidebar-item>
    </ki-sidebar>`;
  const item = fixture.querySelector('ki-sidebar-item');
  if (!item) throw new Error('Missing sidebar item fixture');
  return item;
}

function part(item: HTMLElement, name: string): HTMLElement {
  const element = item.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!element) throw new Error(`Missing sidebar item part ${name}`);
  return element;
}

it('S5 exposes the counted link name and its keyboard tooltip in the rail', async () => {
  const item = mount('collapsed');
  const inbox = page.getByRole('link', { name: countedInboxName });
  const members = page.getByRole('link', { name: 'Members', exact: true });
  await expect.element(inbox).toBeVisible();
  await expect.element(inbox).not.toHaveAttribute('aria-label');
  await expect.element(members).not.toHaveAttribute('aria-label');
  (page.getByRole('button', { name: 'Before' }).element() as HTMLButtonElement).focus();
  await userEvent.keyboard('{Tab}');
  expect(item.shadowRoot?.activeElement).toBe(inbox.element());
  await expect.element(page.getByRole('tooltip', { name: 'Inbox, 12 new' })).toBeVisible();
  expect(part(item, 'count').getBoundingClientRect().width).toBeGreaterThan(0);
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('tooltip')).not.toBeInTheDocument();
  await expectAccessible(fixture);
});

it('keeps the full count and slotted name in a count-first translation', async () => {
  const item = mount();
  item.setAttribute('count', '120');
  item.setAttribute('count-label', '{count} unread in {label}');

  const inbox = page.getByRole('link', { name: '120 unread in Inbox', exact: true });
  await expect.element(inbox).toBeVisible();
  await expect.element(inbox).not.toHaveAttribute('aria-label');
  await expect.element(page.getByText('99+', { exact: true })).toBeVisible();
});

it('S6 shows the destination tooltip on hover', async () => {
  mount('collapsed');
  const members = page.getByRole('link', { name: 'Members', exact: true });
  await expect.element(members).toBeVisible();
  await userEvent.hover(members);
  await expect.element(page.getByRole('tooltip', { name: 'Members' })).toBeVisible();
});

it('S7 repaints the current item and foreground using theme tokens', async () => {
  const item = mount();
  await expect.element(page.getByRole('link', { name: countedInboxName })).toBeVisible();
  item.style.setProperty('--ki-sidebar-item-current-bg', 'rgb(223, 238, 235)');
  item.style.setProperty('--ki-sidebar-item-current-fg', 'rgb(11, 39, 39)');
  const link = part(item, 'item');
  expect(getComputedStyle(link).backgroundColor).toBe('rgb(223, 238, 235)');
  expect(getComputedStyle(link).color).toBe('rgb(11, 39, 39)');
});

it('S8 mirrors the rail dot and keeps the icon centered in RTL', async () => {
  const item = mount('collapsed');
  await expect.element(page.getByRole('link', { name: countedInboxName })).toBeVisible();
  const link = part(item, 'item');
  const dot = part(item, 'count');
  const icon = part(item, 'start');
  const center = (el: Element) => {
    const rect = el.getBoundingClientRect();
    return rect.left + rect.width / 2;
  };
  expect(center(dot)).toBeGreaterThan(center(link));
  fixture.dir = 'rtl';
  try {
    expect(center(dot)).toBeLessThan(center(link));
    expect(center(icon)).toBeCloseTo(center(link), 0);
  } finally {
    fixture.removeAttribute('dir');
  }
});

it('S10 updates the count in the accessible name and removes the empty dot', async () => {
  const item = mount('collapsed');
  await expect.element(page.getByRole('link', { name: countedInboxName })).toBeVisible();
  item.setAttribute('count', '0');
  await expect.element(page.getByRole('link', { name: 'Inbox', exact: true })).toBeVisible();
  expect(item.shadowRoot?.querySelector('[part="count"]')).toBeNull();
  if (item.lastChild) item.lastChild.textContent = 'Messages';
  await expect.element(page.getByRole('link', { name: 'Messages', exact: true })).toBeVisible();
});

it('S11 preserves a current marker and the unread dot in forced colors', async ({ skip }) => {
  await media.emulateForcedColors('active');
  try {
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(() => matchMedia('(forced-colors: active)').matches).toBe(true);
    } else if (!matchMedia('(forced-colors: active)').matches) {
      skip('This engine does not expose forced colors in Playwright.');
    }
    const item = mount('collapsed');
    await expect.element(page.getByRole('link', { name: countedInboxName })).toBeVisible();
    const link = part(item, 'item');
    const counter = part(item, 'count').querySelector('ki-counter');
    const indicator = () => counter?.shadowRoot?.querySelector('[part="indicator"]');
    await expect.poll(() => Boolean(indicator())).toBe(true);
    const dot = indicator();
    if (!dot) throw new Error('Missing count marker');
    expect(dot.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(getComputedStyle(link).textDecorationLine).toBe('underline');
    expect(getComputedStyle(dot).backgroundColor).not.toBe(getComputedStyle(link).backgroundColor);
  } finally {
    await media.emulateForcedColors(null);
  }
});

it('keeps the focused link when collapsed is assigned by the application', async () => {
  const item = mount();
  const inbox = page.getByRole('link', { name: countedInboxName });
  await expect.element(inbox).toBeVisible();
  const link = inbox.element() as HTMLAnchorElement;
  link.focus();
  const sidebar = fixture.querySelector<HTMLElement & { collapsed: boolean }>('ki-sidebar');
  if (!sidebar) throw new Error('Missing sidebar fixture');
  sidebar.collapsed = true;
  await expect
    .poll(() => part(item, 'count').querySelector('ki-counter')?.hasAttribute('dot'))
    .toBe(true);
  expect(item.shadowRoot?.activeElement).toBe(link);
});
