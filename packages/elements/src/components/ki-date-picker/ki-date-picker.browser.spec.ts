// @spec:124-ki-date-picker
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-date-picker.js';

const browser = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<boolean | undefined>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference') => Promise<void>;
};

const fixture = document.createElement('main');
const style = document.createElement('style');
const trigger = () => page.getByRole('button', { name: /^(Choose date|Change date,)/ });
const dialog = () => page.getByRole('dialog', { name: 'Choose date' });
const field = () => page.getByRole('textbox', { name: 'Departure' });
const day = (date: string) => page.getByRole('button', { name: date });
const savedDate = 'value="2026-11-12"';

beforeAll(() => {
  defineCustomElement();
  style.textContent = tokensCss;
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('style');
  fixture.removeAttribute('dir');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

function mount(attributes = savedDate, label = 'Departure') {
  fixture.lang = 'en-GB';
  fixture.innerHTML = `
    <form>
      <ki-date-picker name="${label.toLowerCase()}" label="${label}" ${attributes}></ki-date-picker>
      <button type="submit" tabindex="0">Book</button>
    </form>`;
  const picker = fixture.querySelector<HTMLElement & { value: string }>('ki-date-picker');
  const form = fixture.querySelector('form');
  if (!picker || !form) throw new Error('Missing date picker form');
  const events: unknown[] = [];
  picker.addEventListener('ki-change', (event) =>
    events.push((event as CustomEvent<unknown>).detail),
  );
  return { picker, form, events };
}

async function openCalendar() {
  await trigger().click();
  await expect.element(dialog()).toBeVisible();
}

async function expectFocused(date: string) {
  await expect.poll(() => day(date).query()?.matches(':focus')).toBe(true);
}

async function expectClosed() {
  await expect.element(trigger()).toHaveAttribute('aria-expanded', 'false');
  await expect.element(dialog()).not.toBeInTheDocument();
}

it('S1 commits a single ISO date once', async () => {
  const { picker, events } = mount();
  await openCalendar();
  await day('20 November 2026').click();
  await expectClosed();
  expect(picker.value).toBe('2026-11-20');
  expect(events).toEqual([{ value: '2026-11-20' }]);
});

it('S2 waits for the second endpoint before reporting a range', async () => {
  const { events } = mount('mode="range" min="2026-11-01" max="2026-11-30"', 'Stay');
  await openCalendar();
  await day('12 November 2026').click();
  expect(events).toEqual([]);
  await day('16 November 2026').click();
  await expectClosed();
  expect(events).toEqual([{ value: '2026-11-12/2026-11-16' }]);
});

it('S3 applies the draft range and keeps the previous saved value until then', async () => {
  const { picker, events } = mount('mode="range" confirm value="2026-11-08/2026-11-10"', 'Stay');
  await openCalendar();
  await day('16 November 2026').click();
  await expect.element(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
  await day('12 November 2026').click();
  expect(events).toEqual([]);
  expect(picker.value).toBe('2026-11-08/2026-11-10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expectClosed();
  expect(events).toEqual([{ value: '2026-11-12/2026-11-16' }]);
});

it('S4 discards a draft when the user cancels', async () => {
  const { picker, events } = mount(`${savedDate} confirm`);
  await openCalendar();
  await day('20 November 2026').click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expectClosed();
  expect(picker.value).toBe('2026-11-12');
  expect(events).toEqual([]);
});

it('S5 commits a localized typed date', async () => {
  const { picker, events } = mount('');
  await field().fill('20/11/2026');
  await userEvent.keyboard('{Enter}');
  expect(picker.value).toBe('2026-11-20');
  expect(events).toEqual([{ value: '2026-11-20' }]);
});

it.each([
  ['{ArrowLeft}', '11 November 2026'],
  ['{ArrowRight}', '13 November 2026'],
  ['{ArrowUp}', '5 November 2026'],
  ['{ArrowDown}', '19 November 2026'],
  ['{Home}', '9 November 2026'],
  ['{End}', '15 November 2026'],
  ['{PageUp}', '12 October 2026'],
  ['{PageDown}', '12 December 2026'],
  ['{Shift>}{PageUp}{/Shift}', '12 November 2025'],
  ['{Shift>}{PageDown}{/Shift}', '12 November 2027'],
])('S6 moves focus with %s', async (key, date) => {
  mount(`${savedDate} first-day-of-week="1"`);
  await openCalendar();
  await expectFocused('12 November 2026');
  await userEvent.keyboard(key);
  await expectFocused(date);
});

it('S7 exposes and skips days outside the bounds', async () => {
  mount(`${savedDate} first-day-of-week="1" min="2026-11-12" max="2026-11-22"`);
  await openCalendar();
  await expectFocused('12 November 2026');
  await userEvent.keyboard('{Home}');
  await expectFocused('12 November 2026');
  await expect.element(day('11 November 2026')).toHaveAttribute('aria-disabled', 'true');
  await expect.element(day('23 November 2026')).toHaveAttribute('aria-disabled', 'true');
});

it.each(['{Enter}', ' '])('S8 commits the focused day with %s', async (key) => {
  const { events } = mount('min="2026-11-20" max="2026-11-20"');
  await openCalendar();
  await expectFocused('20 November 2026');
  await userEvent.keyboard(key);
  await expectClosed();
  expect(events).toEqual([{ value: '2026-11-20' }]);
});

it('S9 closes on Escape and restores text field focus', async () => {
  mount();
  await openCalendar();
  await expectFocused('12 November 2026');
  await userEvent.keyboard('{Escape}');
  await expectClosed();
  await expect.poll(() => field().query()?.matches(':focus')).toBe(true);
});

it('S10 names the controls, announces the month and exposes one tab stop', async () => {
  const { picker } = mount();
  await expect.element(trigger()).toHaveAccessibleName('Change date, 12 Nov 2026');
  await openCalendar();
  const grid = page.getByRole('grid', { name: 'November 2026' });
  await expect.element(grid).toBeVisible();
  await expect.element(dialog()).toHaveAttribute('aria-modal', 'false');
  await expect.element(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
  await expect.element(trigger()).toHaveAttribute('aria-expanded', 'true');
  expect(trigger().element().getAttribute('aria-controls')).toBe(dialog().element().id);
  await expect
    .element(page.getByRole('heading', { name: 'November 2026' }))
    .toHaveAttribute('aria-live', 'polite');
  const chosen = day('12 November 2026').element();
  expect(page.getByRole('gridcell', { selected: true }).element()).toBe(chosen.closest('td'));
  expect([...grid.element().querySelectorAll('button[tabindex="0"]')]).toEqual([chosen]);
  await expectAccessible(picker);
});

it('S11 uses full weekday names in the requested weekday order', async () => {
  mount(`${savedDate} first-day-of-week="0"`);
  await openCalendar();
  await expect.element(page.getByRole('columnheader').first()).toHaveAccessibleName('Sunday');
});

it('S12 contributes a single named ISO range to submitted form data', async () => {
  const { form } = mount('mode="range" value="2026-11-12/2026-11-16"', 'Stay');
  const submissions: FormData[] = [];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submissions.push(new FormData(form));
  });
  await page.getByRole('button', { name: 'Book' }).click();
  expect(submissions.map((data) => data.getAll('stay'))).toEqual([['2026-11-12/2026-11-16']]);
});

it('S13 blocks a submission with impossible input and exposes its error', async () => {
  const { form } = mount('required error-text="Enter a real date"');
  const submitted = vi.fn();
  form.addEventListener('submit', submitted);
  await field().fill('31/02/2026');
  await page.getByRole('button', { name: 'Book' }).click();
  await expect.element(field()).toHaveAttribute('aria-invalid', 'true');
  await expect.element(field()).toHaveAccessibleDescription('Enter a real date');
  expect(submitted).not.toHaveBeenCalled();
});

it('S14 resets the live value to its authored default', async () => {
  const { picker, form } = mount();
  await field().fill('20/11/2026');
  await userEvent.keyboard('{Enter}');
  expect(picker.value).toBe('2026-11-20');
  form.reset();
  await expect.element(field()).toHaveValue('12/11/2026');
  expect(picker.value).toBe('2026-11-12');
});

it('S15 gets its popup surface from the raised semantic color', async () => {
  fixture.style.setProperty('--ki-surface-raised', 'rgb(249, 247, 243)');
  mount();
  await openCalendar();
  expect(getComputedStyle(dialog().element()).backgroundColor).toBe('rgb(249, 247, 243)');
});

it('S16 moves left visually in an RTL grid', async () => {
  fixture.dir = 'rtl';
  mount();
  await openCalendar();
  await expectFocused('12 November 2026');
  await userEvent.keyboard('{ArrowLeft}');
  await expectFocused('13 November 2026');
});

it('S17 preserves a visible today outline in forced colors', async (context) => {
  try {
    if ((await browser.emulateForcedColors('active')) === false) {
      context.skip('This engine cannot emulate forced colors');
    }
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    const { picker } = mount('');
    await openCalendar();
    const today = picker.shadowRoot?.querySelector<HTMLButtonElement>('[aria-current="date"]');
    if (!today) throw new Error('Missing today indicator');
    expect(getComputedStyle(today).borderBlockStartStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(today).borderBlockStartWidth)).toBeGreaterThan(0);
    const ordinary = picker.shadowRoot?.querySelector('[part="day"]:not([aria-current])');
    if (!ordinary) throw new Error('Missing comparison day');
    expect(parseFloat(getComputedStyle(ordinary).borderBlockStartWidth)).toBe(0);
  } finally {
    await browser.emulateForcedColors(null);
  }
});

it('S18 opens and focuses without animation under reduced motion', async () => {
  try {
    await browser.emulateReducedMotion('reduce');
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    mount();
    await openCalendar();
    await expectFocused('12 November 2026');
    expect(dialog().element().getAnimations({ subtree: true })).toEqual([]);
  } finally {
    await browser.emulateReducedMotion('no-preference');
  }
});

it('dismisses when the user clicks outside', async () => {
  const { form } = mount();
  await openCalendar();
  const book = page.getByRole('button', { name: 'Book' });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });
  await book.click();
  await expectClosed();
});
