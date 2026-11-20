// @spec:108-ki-time-input
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-time-input.js';

type TimeInput = HTMLElement & { value: string };

const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};

const styles = document.createElement('style');
const fixture = document.createElement('main');
const field = () => page.getByRole('combobox', { name: 'Start time' });
const trigger = () => page.getByRole('button', { name: 'Choose time' });
const suggestions = () => page.getByRole('listbox', { name: 'Suggested times' });
const option = (name: string | RegExp) => page.getByRole('option', { exact: true, name });
const timeText = (value: string) => value.replace(/[\s\u200e]+/gu, '').replace(/^0/u, '');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = `${tokensCss}\n${material3Css}`;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('data-ki-theme');
  fixture.style.removeProperty('inline-size');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

async function mount(attributes = '', wrap = (markup: string) => markup): Promise<TimeInput> {
  fixture.innerHTML = wrap(`<ki-time-input label="Start time" ${attributes}></ki-time-input>`);
  await expect.element(field()).toBeVisible();
  const host = fixture.querySelector<TimeInput>('ki-time-input');
  if (!host) {
    throw new Error('missing TimeInput');
  }
  return host;
}

function input(): HTMLInputElement {
  const control = field().element();
  if (!(control instanceof HTMLInputElement)) {
    throw new Error('the editable combobox has no native text control');
  }
  return control;
}

function form(): HTMLFormElement {
  const element = fixture.querySelector('form');
  if (!element) {
    throw new Error('missing form');
  }
  return element;
}

function displayedTime(): string {
  return timeText(input().value);
}

async function openWithArrow(): Promise<void> {
  input().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(suggestions()).toBeVisible();
}

it('S1 commits the exact minute typed in the locale and keeps the suggestions closed', async () => {
  const host = await mount(
    'lang="en-US" step="30"',
    (markup) => `${markup}<button tabindex="0">Next</button>`,
  );
  const changes: string[] = [];
  host.addEventListener('ki-change', (event) =>
    changes.push((event as CustomEvent<{ value: string }>).detail.value),
  );

  await field().fill('9:17 AM');
  await expect.element(field()).toHaveAttribute('aria-expanded', 'false');
  await userEvent.tab();

  await expect.poll(() => host.value).toBe('09:17');
  expect(displayedTime()).toBe('9:17AM');
  expect(changes).toEqual(['09:17']);
  await expect.element(suggestions()).not.toBeInTheDocument();
});

it('S2 replaces zone help with the configured error after out-of-range input loses focus', async () => {
  await mount(
    'lang="en-GB" min="08:00" max="18:00" time-zone="Europe/Madrid" help-text="Local office time" error-text="Enter a time between 08:00 and 18:00"',
    (markup) => `<form>${markup}<button type="submit" tabindex="0">Save</button></form>`,
  );
  const error = page.getByText('Enter a time between 08:00 and 18:00');
  const zone = page.getByText(/Europe\/Madrid/u);

  await field().fill('20:00');
  await expect.element(zone).toBeVisible();
  await expect.element(error).not.toBeVisible();
  await userEvent.tab();
  // The clock button may be the next focus stop. Leaving the text control
  // still commits its draft and gives invalid input an accessible description.
  await expect.element(field()).toHaveAttribute('aria-invalid', 'true');
  await expect.element(error).toBeVisible();
  await expect.element(zone).not.toBeVisible();
  expect(form().checkValidity()).toBe(false);
});

it('S3 Arrow Down opens and moves through slots and Enter commits the active slot', async () => {
  const host = await mount('lang="en-GB" min="09:00" max="10:00"');

  await openWithArrow();
  await userEvent.keyboard('{ArrowDown}');
  const nineThirty = option(/^0?9:30$/u).element();
  await expect.element(field()).toHaveAttribute('aria-activedescendant', nineThirty.id);
  await userEvent.keyboard('{Enter}');

  await expect.element(field()).toHaveAttribute('aria-expanded', 'false');
  expect(host.value).toBe('09:30');
  expect(displayedTime()).toBe('9:30');
  expect(host.shadowRoot?.activeElement).toBe(input());
});

it('S4 Escape closes the suggestions without replacing typed text or moving focus', async () => {
  const host = await mount('lang="en-GB" min="09:00" max="10:00"');
  await field().fill('09:17');
  await openWithArrow();

  await userEvent.keyboard('{Escape}');

  await expect.element(field()).toHaveAttribute('aria-expanded', 'false');
  expect(input().value).toBe('09:17');
  expect(host.shadowRoot?.activeElement).toBe(input());
});

it('S5 exposes a named combobox, controlled listbox, and selected active time', async () => {
  const host = await mount('lang="en-GB" value="09:00" min="08:30" max="10:00"');

  await openWithArrow();

  const popup = suggestions().element();
  const selected = option(/^0?9:00$/u).element();
  expect(popup.id).not.toBe('');
  expect(selected.id).not.toBe('');
  await expect.element(field()).toHaveAttribute('aria-expanded', 'true');
  expect(host.shadowRoot?.getElementById(input().getAttribute('aria-controls') ?? '')).toBe(popup);
  expect(popup.contains(selected)).toBe(true);
  await expect.element(field()).toHaveAttribute('aria-activedescendant', selected.id);
  await expect.element(selected).toHaveAttribute('aria-selected', 'true');
  const tree = await browserCommands.ariaSnapshot('ki-time-input');
  expect(tree).toContain('combobox "Start time"');
  expect(tree).toContain('listbox "Suggested times"');
  expect(tree).toMatch(/option "0?9:00" \[selected\]/u);
});

it('S6 submits the canonical time from a localized display', async () => {
  await mount(
    'lang="en-US" name="start" value="09:30"',
    (markup) => `<form>${markup}<button type="submit" tabindex="0">Save</button></form>`,
  );
  const submitted: (FormDataEntryValue | null)[] = [];
  const timeForm = form();
  timeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted.push(new FormData(timeForm).get('start'));
  });
  expect(displayedTime()).toBe('9:30AM');

  await page.getByRole('button', { name: 'Save' }).click();

  expect(submitted).toEqual(['09:30']);
});

it('S7 reset restores the declared time after a user selection', async () => {
  const host = await mount(
    'lang="en-GB" name="start" value="09:30" min="09:30" max="10:00"',
    (markup) => `<form>${markup}</form>`,
  );
  await openWithArrow();
  await userEvent.keyboard('{ArrowDown}{Enter}');
  await expect.poll(() => host.value).toBe('10:00');

  form().reset();

  await expect.poll(displayedTime).toBe('9:30');
  expect(host.value).toBe('09:30');
  expect(new FormData(form()).get('start')).toBe('09:30');
});

it('excludes the disabled fieldset from form data and closes its open suggestions', async () => {
  await mount(
    'lang="en-GB" name="start" value="09:30" min="09:30" max="10:00"',
    (markup) => `<form><fieldset>${markup}</fieldset></form>`,
  );
  await openWithArrow();
  const fieldset = fixture.querySelector('fieldset');
  if (!fieldset) {
    throw new Error('missing fieldset');
  }

  fieldset.disabled = true;

  await expect.element(field()).toBeDisabled();
  await expect.element(suggestions()).not.toBeInTheDocument();
  expect(new FormData(form()).has('start')).toBe(false);
});

it('S8 repaints the selected slot with the theme’s selected foreground and background', async () => {
  const host = await mount('lang="en-GB" value="09:30" min="09:00" max="10:00"');
  host.style.setProperty('--ki-time-input-selected-bg', 'rgb(12, 35, 60)');
  host.style.setProperty('--ki-time-input-selected-fg', 'rgb(245, 248, 252)');

  await openWithArrow();

  const selected = option(/^0?9:30$/u).element();
  const unselected = option('10:00').element();
  await expect.poll(() => getComputedStyle(selected).backgroundColor).toBe('rgb(12, 35, 60)');
  expect(getComputedStyle(selected).color).toBe('rgb(245, 248, 252)');
  expect(getComputedStyle(unselected).backgroundColor).not.toBe('rgb(12, 35, 60)');
});

it('S13 opens suggestions from Choose time and commits the option clicked with a pointer', async () => {
  const host = await mount('lang="en-GB" min="09:00" max="10:00"');

  await trigger().click();
  await expect.element(suggestions()).toBeVisible();
  await option(/^0?9:30$/u).click();

  await expect.element(suggestions()).not.toBeInTheDocument();
  expect(host.value).toBe('09:30');
  await expect.poll(displayedTime).toBe('9:30');
  expect(host.shadowRoot?.activeElement).toBe(input());
});

it('passes axe with the suggestion list closed and open', async () => {
  await mount('lang="en-GB" value="09:30" min="09:00" max="10:00" help-text="Local office time"');
  await expectAccessible(fixture);

  await openWithArrow();

  await expectAccessible(fixture);
});

it('aligns the popup and moves the clock trigger to the inline end in a narrow RTL column', async () => {
  fixture.style.inlineSize = '144px';
  const host = await mount('dir="rtl" lang="en-GB" min="09:00" max="10:00"');
  await openWithArrow();
  const fieldBox = () => host.shadowRoot?.querySelector('[part~="field"]')?.getBoundingClientRect();
  const popup = suggestions().element();
  const button = trigger().element();

  expect(host.getBoundingClientRect().width).toBeLessThanOrEqual(144);
  expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(
    input().getBoundingClientRect().left + 1,
  );
  await expect
    .poll(() => Math.abs(popup.getBoundingClientRect().right - (fieldBox()?.right ?? 0)))
    .toBeLessThan(1);
});

it('keeps selected, active and plain options visibly distinct in forced colours', async (test) => {
  await browserCommands.emulateForcedColors('active');
  try {
    if (
      !navigator.userAgent.includes('Chrome/') &&
      !matchMedia('(forced-colors: active)').matches
    ) {
      test.skip('this engine cannot emulate forced colours');
    }
    await expect.poll(() => matchMedia('(forced-colors: active)').matches).toBe(true);
    await mount('lang="en-GB" value="09:30" min="09:00" max="10:00"');
    await openWithArrow();
    await userEvent.keyboard('{ArrowDown}');
    const plain = option(/^0?9:00$/u).element();
    const selected = option(/^0?9:30$/u).element();
    const active = option('10:00').element();
    await expect.element(field()).toHaveAttribute('aria-activedescendant', active.id);

    const paint = (element: Element) => {
      const css = getComputedStyle(element);
      return [
        css.backgroundColor,
        css.color,
        css.outlineStyle,
        css.outlineWidth,
        css.outlineColor,
      ].join('|');
    };
    await expect.poll(() => new Set([paint(plain), paint(selected), paint(active)]).size).toBe(3);
    expect(getComputedStyle(active).color).not.toBe(getComputedStyle(active).backgroundColor);
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it('opens the material3 suggestions without running motion when reduced motion is requested', async () => {
  await browserCommands.emulateReducedMotion('reduce');
  try {
    fixture.dataset.kiTheme = 'material3';
    const host = await mount('lang="en-GB" min="09:00" max="10:00"');
    const enclosure = host.shadowRoot?.querySelector('[part~="field"]');
    if (!enclosure) {
      throw new Error('missing field enclosure');
    }
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);

    await openWithArrow();

    expect(getComputedStyle(enclosure).transitionDuration).toBe('0s');
    expect(suggestions().element().getAnimations({ subtree: true })).toHaveLength(0);
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});
