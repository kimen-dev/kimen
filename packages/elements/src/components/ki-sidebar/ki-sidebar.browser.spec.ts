// @spec:106-ki-sidebar
import tokens from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';

const fixture = document.createElement('main');
const style = document.createElement('style');
const preferences = ['ki-test-sidebar:first', 'ki-test-sidebar:second'] as const;
const motion = commands as unknown as {
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineAllComponents();
  style.textContent = tokens;
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  for (const key of preferences) {
    localStorage.removeItem(key);
    localStorage.removeItem(`kimen.sidebar:${key}`);
  }
  await parkPointer();
});
afterAll(() => {
  style.remove();
  fixture.remove();
});

function mount(storageKey?: string): HTMLElement {
  const sidebar = document.createElement('ki-sidebar');
  sidebar.setAttribute('collapsible', '');
  if (storageKey) Object.assign(sidebar, { preference: { storageKey } });
  sidebar.innerHTML = `
    <span slot="brand">Kimen</span>
    <ki-sidebar-item href="#home" current>Home</ki-sidebar-item>
    <ki-sidebar-item href="#inbox" count="12">Inbox</ki-sidebar-item>
    <button slot="footer" type="button" tabindex="0">Ana Garcia</button>`;
  fixture.replaceChildren(sidebar);
  return sidebar;
}

it('S1 shows brand, expanded count and footer in layout order', async () => {
  const sidebar = mount();
  sidebar.style.blockSize = '300px';
  await expect.element(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect.element(page.getByText('Kimen')).toBeVisible();
  await expect.element(page.getByText('12', { exact: true })).toBeVisible();
  const inbox = page.getByRole('link', { name: 'Inbox, 12 new' });
  const footer = page.getByRole('button', { name: 'Ana Garcia' });
  await expect.element(inbox).toBeVisible();
  await expect.element(footer).toBeVisible();
  const footerBottom = footer.element().getBoundingClientRect().bottom;
  expect(footerBottom - inbox.element().getBoundingClientRect().bottom).toBeGreaterThan(24);
  expect(sidebar.getBoundingClientRect().bottom - footerBottom).toBeLessThan(24);
  await expectAccessible(fixture);
});

it('S2 restores the user toggle under its profile storage key only', async () => {
  localStorage.setItem(preferences[0], 'application data');
  mount(preferences[0]);
  await userEvent.click(page.getByRole('button', { name: 'Collapse sidebar' }));
  await expect.element(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  mount(preferences[0]);
  await expect.element(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  mount(preferences[1]);
  await expect.element(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
  expect(localStorage.getItem(preferences[0])).toBe('application data');
});

it('S4 retains focus on the same toggle and reports a single user change', async () => {
  const sidebar = mount();
  const change = vi.fn<(event: Event) => void>();
  sidebar.addEventListener('ki-sidebar-change', change);
  const control = page.getByRole('button', { name: 'Collapse sidebar' });
  await expect.element(control).toHaveAttribute('aria-expanded', 'true');
  const button = control.element() as HTMLButtonElement;
  button.focus();
  await userEvent.keyboard(' ');
  const expand = page.getByRole('button', { name: 'Expand sidebar' });
  await expect.element(expand).toHaveAttribute('aria-expanded', 'false');
  expect(sidebar.shadowRoot?.activeElement).toBe(button);
  expect(expand.element()).toBe(button);
  expect(change).toHaveBeenCalledTimes(1);
  expect(change.mock.calls[0]?.[0]).toMatchObject({ detail: { collapsed: true } });
});

it('S12 changes to rail width without animations under reduced motion', async () => {
  await motion.emulateReducedMotion('reduce');
  try {
    const sidebar = mount();
    await expect.element(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
    expect(sidebar.getBoundingClientRect().width).toBeCloseTo(240);
    await userEvent.click(page.getByRole('button', { name: 'Collapse sidebar' }));
    await expect.poll(() => Math.abs(sidebar.getBoundingClientRect().width - 64) < 0.5).toBe(true);
    expect(sidebar.shadowRoot?.querySelector('nav')?.getAnimations({ subtree: true })).toEqual([]);
  } finally {
    await motion.emulateReducedMotion(null);
  }
});
