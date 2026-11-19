// @spec:072-ki-counter
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineAvatar } from '../../../dist/components/ki-avatar.js';
import { defineCustomElement as defineCounter } from '../../../dist/components/ki-counter.js';
import { defineCustomElement as defineIconButton } from '../../../dist/components/ki-icon-button.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>';
const browserCommands = commands as unknown as {
  emulateReducedMotion: (motion: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineAvatar();
  defineCounter();
  defineIconButton();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});
afterAll(() => {
  fixture.remove();
  styles.remove();
});

function mount(html: string): void {
  fixture.innerHTML = html;
}

function host(selector: string): HTMLElement {
  const element = fixture.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing fixture element ${selector}`);
  return element;
}

function counterPart(element: HTMLElement): HTMLElement {
  const part = element.shadowRoot?.querySelector<HTMLElement>('[part="indicator"]');
  if (!part) throw new Error('The counter did not render its indicator part');
  return part;
}

function notificationButton(extra = ''): string {
  return `<ki-icon-button label="Notifications, 3 unread" ${extra}>${icon}
    <ki-counter slot="counter" value="3"></ki-counter>
  </ki-icon-button>`;
}

function notificationControl(): HTMLButtonElement {
  const control = host('ki-icon-button').shadowRoot?.querySelector('button');
  if (!control) throw new Error('The notification button did not render its control');
  return control;
}

it('S1: renders exact counts and caps overflow', async () => {
  mount(`<ki-counter value="3"></ki-counter>
    <ki-counter value="99"></ki-counter>
    <ki-counter value="120"></ki-counter>
    <ki-counter value="120" max="9"></ki-counter>`);
  await expect.element(page.getByText('3', { exact: true })).toBeVisible();
  await expect.element(page.getByText('99', { exact: true })).toBeVisible();
  await expect.element(page.getByText('99+', { exact: true })).toBeVisible();
  await expect.element(page.getByText('9+', { exact: true })).toBeVisible();
});

it('S2: removes the indicator from layout when the count becomes zero', async () => {
  mount('<ki-counter value="3" data-testid="counter"></ki-counter>');
  await expect.element(page.getByText('3', { exact: true })).toBeVisible();
  host('ki-counter').setAttribute('value', '0');
  await expect.element(page.getByTestId('counter')).not.toBeVisible();
  expect(host('ki-counter').getBoundingClientRect().width).toBe(0);
});

it('S3: puts a digit-free success dot on the avatar corner', async () => {
  mount(`<ki-avatar label="Ana García, online" initials="AG">
    <ki-counter slot="counter" tone="success" value="3"></ki-counter>
  </ki-avatar>`);
  await expect.element(page.getByText('3', { exact: true })).toBeVisible();
  const counter = host('ki-counter');
  counter.setAttribute('dot', '');
  await expect.poll(() => counterPart(counter).textContent).toBe('');
  const rect = counter.getBoundingClientRect();
  const avatar = host('ki-avatar').getBoundingClientRect();
  expect(rect.width).toBeGreaterThan(0);
  expect(rect.width).toBeCloseTo(rect.height);
  expect(rect.right).toBeCloseTo(avatar.right);
  expect(rect.bottom).toBeCloseTo(avatar.bottom);
});

it('S4: follows a named link through ancestor scroll and hides when it disappears', async () => {
  mount(`<section style="block-size: 120px; overflow: auto">
    <div style="padding-block: 48px 120px">
      <a id="inbox-link" href="#inbox">Inbox, 120 unread</a>
    </div>
  </section>
  <ki-counter for="inbox-link" value="120" data-testid="counter"></ki-counter>`);
  await expect.element(page.getByText('99+', { exact: true })).toBeVisible();
  const link = host('#inbox-link');
  const counter = host('ki-counter');
  const initial = counter.getBoundingClientRect();
  const linkStart = link.getBoundingClientRect().top;
  expect(initial.right - link.getBoundingClientRect().right).toBeCloseTo(2);
  expect(initial.top - linkStart).toBeCloseTo(-2);

  host('section').scrollTop = 24;
  await expect.poll(() => counter.getBoundingClientRect().top).toBeCloseTo(initial.top - 24);
  expect(counter.getBoundingClientRect().top - link.getBoundingClientRect().top).toBeCloseTo(-2);

  link.remove();
  await expect.element(page.getByTestId('counter')).not.toBeVisible();
});

it('S5: keeps activation and tab order on the native button', async () => {
  mount(`<button type="button">Before</button>${notificationButton()}
    <button type="button">After</button>`);
  const click = vi.fn();
  host('ki-icon-button').addEventListener('click', click);
  await page.getByRole('button', { name: 'Before' }).click();
  await userEvent.keyboard('{Tab}');
  const trigger = page.getByRole('button', { name: 'Notifications, 3 unread', exact: true });
  await expect.element(trigger).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(click).toHaveBeenCalledTimes(1);
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
});

it('S6: exposes the complete host names and keeps the counters presentational', async () => {
  mount(`${notificationButton()}
    <ki-avatar label="Ana García, online" initials="AG">
      <ki-counter slot="counter" tone="success" dot></ki-counter>
    </ki-avatar>`);
  await expect
    .element(page.getByRole('button', { name: 'Notifications, 3 unread', exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole('img', { name: 'Ana García, online', exact: true }))
    .toBeVisible();
  expect(
    [...fixture.querySelectorAll('ki-counter')].map((item) => item.getAttribute('aria-hidden')),
  ).toEqual(['true', 'true']);
  await expectAccessible(fixture);
});

it('S7: leaves count announcements to the page-owned polite region', async () => {
  mount(`${notificationButton()}<p role="status" aria-live="polite"></p>`);
  await expect.element(page.getByText('3', { exact: true })).toBeVisible();

  host('ki-counter').setAttribute('value', '4');
  host('ki-icon-button').setAttribute('label', 'Notifications, 4 unread');
  host('[role="status"]').textContent = '4 unread notifications';

  await expect
    .element(page.getByRole('button', { name: 'Notifications, 4 unread', exact: true }))
    .toBeVisible();
  await expect.element(page.getByRole('status')).toHaveTextContent('4 unread notifications');
  await expect.element(page.getByText('4', { exact: true })).toBeVisible();
  expect(fixture.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
  expect(host('ki-counter').shadowRoot?.querySelector('[role], [aria-live]')).toBeNull();
});

it('S8: repaints the surface and foreground when the counter tokens change', async () => {
  mount('<ki-counter value="3"></ki-counter>');
  await expect.element(page.getByText('3', { exact: true })).toBeVisible();
  const counter = host('ki-counter');

  counter.style.setProperty('--ki-counter-bg', 'rgb(16, 32, 48)');
  counter.style.setProperty('--ki-counter-fg', 'rgb(240, 248, 255)');

  const paint = getComputedStyle(counterPart(counter));
  expect(paint.backgroundColor).toBe('rgb(16, 32, 48)');
  expect(paint.color).toBe('rgb(240, 248, 255)');
});

it('S9: mirrors the count to the inline-end corner in RTL', async () => {
  mount(notificationButton('dir="rtl"'));
  await expect.element(page.getByText('3', { exact: true })).toBeVisible();
  const button = notificationControl().getBoundingClientRect();
  const counter = host('ki-counter').getBoundingClientRect();
  expect(counter.left).toBeLessThanOrEqual(button.left);
  expect(counter.right).toBeGreaterThan(button.left);
  expect(counter.top).toBeLessThanOrEqual(button.top);
  expect(counter.bottom).toBeGreaterThan(button.top);
});

it('updates its count without animations under reduced motion', async () => {
  await browserCommands.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    mount('<ki-counter value="3"></ki-counter>');
    await expect.element(page.getByText('3', { exact: true })).toBeVisible();

    const counter = host('ki-counter');
    counter.setAttribute('value', '4');

    await expect.element(page.getByText('4', { exact: true })).toBeVisible();
    const part = counterPart(counter);
    expect(getComputedStyle(part).animationName).toBe('none');
    expect(getComputedStyle(part).transitionDuration).toBe('0s');
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});
