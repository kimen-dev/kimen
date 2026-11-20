// @spec:107-interactive-list
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '../dist/components/ki-list-item.js';
import { defineCustomElement as defineKiSwitch } from '../dist/components/ki-switch.js';
import { expectAccessible, parkPointer } from './axe';

const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (mode: 'active' | 'none' | null) => Promise<boolean | undefined>;
  emulateReducedMotion: (mode: 'reduce' | 'no-preference' | null) => Promise<void>;
};

const options =
  '<ki-list-item value="ana" selected>Ana</ki-list-item>' +
  '<ki-list-item value="luis" disabled>Luis</ki-list-item>' +
  '<ki-list-item value="sara">Sara</ki-list-item>' +
  '<ki-list-item value="sol">Sol</ki-list-item>';

beforeAll(() => {
  defineKiList();
  defineKiListItem();
  defineKiSwitch();
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
});

afterEach(async () => {
  document.body.replaceChildren();
  await parkPointer();
});

async function mount(html: string): Promise<HTMLElement> {
  const main = document.createElement('main');
  main.innerHTML = html;
  document.body.replaceChildren(main);
  await expect
    .poll(() => main.querySelector('ki-list-item')?.shadowRoot?.querySelector('[part="item"]'))
    .toBeTruthy();
  return main;
}

function list(mode: 'single' | 'multiple', rows = options, extra = ''): string {
  return `<ki-list selection="${mode}" label="Reviewers" name="reviewers" ${extra}>${rows}</ki-list>`;
}

function part(host: Element, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Missing part ${name}`);
  return element;
}

function mountedForm(main: HTMLElement): HTMLFormElement {
  const form = main.querySelector('form');
  if (!form) throw new Error('Missing form');
  return form;
}

function details(target: Element): unknown[] {
  const values: unknown[] = [];
  target.addEventListener('ki-change', (event) => values.push((event as CustomEvent).detail));
  return values;
}

it('S1 uses native list and link semantics and navigates from the entire row', async () => {
  await mount(
    '<ki-list label="Settings"><ki-list-item href="#account">Account</ki-list-item></ki-list><div id="account">Account settings</div>',
  );
  const initialUrl = location.href;
  try {
    await expect.element(page.getByRole('list', { name: 'Settings' })).toBeInTheDocument();
    const link = page.getByRole('link', { name: 'Account' });
    await expect.element(link).toHaveAttribute('href', '#account');
    await link.click();
    expect(location.hash).toBe('#account');
  } finally {
    history.replaceState(null, '', initialUrl);
  }
});

it('S2 replaces the single selection and emits the new value once', async () => {
  const main = await mount(list('single', options.replace(' disabled', '')));
  const events = details(main);
  await page.getByRole('option', { name: 'Luis' }).click();
  await expect
    .element(page.getByRole('option', { name: 'Luis' }))
    .toHaveAttribute('aria-selected', 'true');
  await expect
    .element(page.getByRole('option', { name: 'Ana' }))
    .toHaveAttribute('aria-selected', 'false');
  expect(events).toEqual([{ value: 'luis' }]);
});

it('S3 preserves the trailing control and warns in development when it conflicts with a link', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const development =
    (import.meta as ImportMeta & { env: { VITE_KIMEN_DEV_BUILD?: string } }).env
      .VITE_KIMEN_DEV_BUILD === '1';
  try {
    await mount(
      '<ki-list label="Settings"><ki-list-item href="#account">Account<input slot="end" type="checkbox"></ki-list-item></ki-list>',
    );
    await expect.element(page.getByRole('checkbox', { name: 'Account' })).toBeInTheDocument();
    await expect.element(page.getByRole('link')).not.toBeInTheDocument();
    const messages = warn.mock.calls.filter(
      ([message]) => typeof message === 'string' && message.includes('one interactive element'),
    );
    expect(messages).toHaveLength(development ? 1 : 0);
  } finally {
    warn.mockRestore();
  }
});

it('S4 ignores a disabled option click', async () => {
  const main = await mount(list('single'));
  const events = details(main);
  const disabled = page.getByRole('option', { name: 'Luis' }).element() as HTMLElement;
  await userEvent.click(disabled, { force: true });
  expect(document.activeElement).not.toBe(disabled);
  expect(disabled.getAttribute('aria-selected')).toBe('false');
  expect(events).toEqual([]);
});

it('S5 roves through enabled options and leaves selection on Ana', async () => {
  await mount(
    `<button tabindex="0">Before</button>${list('single')}<button tabindex="0">After</button>`,
  );
  (page.getByRole('button', { name: 'Before' }).element() as HTMLElement).focus();
  await userEvent.tab();
  await expect.element(page.getByRole('option', { name: 'Ana' })).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}');
  const sara = page.getByRole('option', { name: 'Sara' });
  await expect.element(sara).toHaveFocus();
  await expect.element(sara).toHaveAttribute('tabindex', '0');
  await expect.element(sara).toHaveAttribute('aria-selected', 'false');
  await expect.element(page.getByRole('option', { name: 'Ana' })).toHaveAttribute('tabindex', '-1');
  await userEvent.keyboard('{End}');
  await expect.element(page.getByRole('option', { name: 'Sol' })).toHaveFocus();
  await userEvent.keyboard('{Home}');
  await expect.element(page.getByRole('option', { name: 'Ana' })).toHaveFocus();
  await userEvent.tab();
  await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
});

it('S6 Space toggles the focused option without clearing another choice', async () => {
  const main = await mount(list('multiple', options.replace(' disabled', '')));
  const events = details(main);
  (page.getByRole('option', { name: 'Luis' }).element() as HTMLElement).focus();
  await userEvent.keyboard(' ');
  await expect
    .element(page.getByRole('option', { name: 'Ana' }))
    .toHaveAttribute('aria-selected', 'true');
  await expect
    .element(page.getByRole('option', { name: 'Luis' }))
    .toHaveAttribute('aria-selected', 'true');
  expect(events).toEqual([{ value: ['ana', 'luis'] }]);
});

it('S7 refined type-ahead focuses Sol without selecting it', async () => {
  const main = await mount(list('multiple'));
  const events = details(main);
  (page.getByRole('option', { name: 'Ana' }).element() as HTMLElement).focus();
  await userEvent.keyboard('xso');
  await expect.element(page.getByRole('option', { name: 'Sol' })).toHaveFocus();
  await expect
    .element(page.getByRole('option', { name: 'Sol' }))
    .toHaveAttribute('aria-selected', 'false');
  expect(events).toEqual([]);
});

it('S8 exposes a named multiselect listbox, selected and disabled options, and passes axe', async () => {
  const main = await mount(list('multiple'));
  await expect
    .element(page.getByRole('listbox', { name: 'Reviewers' }))
    .toHaveAttribute('aria-multiselectable', 'true');
  const snapshot = await browserCommands.ariaSnapshot('ki-list');
  expect(snapshot).toMatch(/listbox "Reviewers"/u);
  expect(snapshot).toMatch(/option "Ana" \[selected\]/u);
  expect(snapshot).toMatch(/option "Luis" \[disabled\]/u);
  await expectAccessible(main);
});

it('S9 tabs into the native switch named by the primary row text', async () => {
  const main = await mount(
    '<button tabindex="0">Before</button><ki-list label="Notifications"><ki-list-item><span>Email digest</span><span slot="secondary">Every Monday</span><ki-switch slot="end"></ki-switch></ki-list-item></ki-list>',
  );
  main.querySelector('button')?.focus();
  await userEvent.tab();
  const control = page.getByRole('switch', { name: 'Email digest' });
  await expect.element(control).toBeInTheDocument();
  const switchHost = main.querySelector('ki-switch');
  expect(switchHost?.shadowRoot?.activeElement).toBe(control.element());
  await userEvent.keyboard(' ');
  await expect.element(control).toBeChecked();
  const primary = main.querySelector('ki-list-item > span');
  if (primary) primary.textContent = 'Weekly digest';
  const renamed = page.getByRole('switch', { name: 'Weekly digest' });
  await expect.element(renamed).toBeInTheDocument();
  expect(switchHost?.shadowRoot?.activeElement).toBe(renamed.element());
  await expectAccessible(main);
});

it('S10 submits the ordered values under one name', async () => {
  const main = await mount(
    `<form>${list('multiple', options.replace('value="sara"', 'value="sara" selected'))}</form>`,
  );
  const form = mountedForm(main);
  await expect
    .element(page.getByRole('option', { name: 'Sara' }))
    .toHaveAttribute('aria-selected', 'true');
  const submissions: string[][] = [];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submissions.push(new FormData(form).getAll('reviewers').map(String));
  });
  form.requestSubmit();
  expect(submissions).toEqual([['ana', 'sara']]);
});

it('S11 blocks submission when a required list has no selection', async () => {
  const main = await mount(
    `<form>${list('single', options.replace(' selected', ''), 'required')}</form>`,
  );
  const form = mountedForm(main);
  await expect
    .element(page.getByRole('listbox', { name: 'Reviewers' }))
    .toHaveAttribute('aria-required', 'true');
  const invalid = vi.fn();
  const submit = vi.fn((event: Event) => {
    event.preventDefault();
  });
  form.addEventListener('invalid', invalid, { capture: true });
  form.addEventListener('submit', submit);
  form.requestSubmit();
  expect(invalid).toHaveBeenCalledTimes(1);
  expect(submit).not.toHaveBeenCalled();
});

it('S12 restores initial selection and form data without a change event', async () => {
  const main = await mount(`<form>${list('single')}</form>`);
  const form = mountedForm(main);
  await page.getByRole('option', { name: 'Sara' }).click();
  const events = details(main);
  form.reset();
  await expect
    .element(page.getByRole('option', { name: 'Ana' }))
    .toHaveAttribute('aria-selected', 'true');
  expect(new FormData(form).get('reviewers')).toBe('ana');
  expect(events).toEqual([]);
});

it('S13 applies selected foreground and background tokens and keeps the mark', async () => {
  const main = await mount(list('multiple'));
  main.style.setProperty('--ki-list-item-selected-bg', 'rgb(220, 230, 240)');
  main.style.setProperty('--ki-list-item-selected-fg', 'rgb(10, 20, 30)');
  const row = page.getByRole('option', { name: 'Ana' }).element();
  expect(getComputedStyle(part(row, 'item')).backgroundColor).toBe('rgb(220, 230, 240)');
  expect(getComputedStyle(part(row, 'content')).color).toBe('rgb(10, 20, 30)');
  expect(part(row, 'indicator').querySelector('ki-icon')).toBeTruthy();
});

it('S14 retains the selection mark and focus ring in forced colors', async (test) => {
  if ((await browserCommands.emulateForcedColors('active')) === false) {
    test.skip('this engine cannot emulate forced colors');
  }
  try {
    await mount(`<button tabindex="0">Before</button>${list('multiple')}`);
    (page.getByRole('button', { name: 'Before' }).element() as HTMLElement).focus();
    await userEvent.tab();
    await expect.poll(() => matchMedia('(forced-colors: active)').matches).toBe(true);
    const row = page.getByRole('option', { name: 'Ana' }).element();
    expect(getComputedStyle(part(row, 'item')).outlineStyle).toBe('solid');
    expect(getComputedStyle(part(row, 'indicator')).borderBlockStartStyle).toBe('solid');
    expect(part(row, 'indicator').querySelector('ki-icon')).toBeTruthy();
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it('S15 moves and mirrors the trailing chevron under RTL', async () => {
  const main = await mount(
    '<ki-list dir="rtl" label="Settings"><ki-list-item href="#account">Account</ki-list-item></ki-list>',
  );
  const row = main.querySelector('ki-list-item');
  if (!row) throw new Error('Missing navigation row');
  const indicator = part(row, 'indicator');
  expect(indicator.getBoundingClientRect().right).toBeLessThanOrEqual(
    part(row, 'content').getBoundingClientRect().left,
  );
  expect(getComputedStyle(indicator).scale).toBe('-1 1');
});

it('S16 applies selection with no transitions under reduced motion', async () => {
  await browserCommands.emulateReducedMotion('reduce');
  try {
    await mount(list('multiple'));
    const option = page.getByRole('option', { name: 'Sara' });
    await option.click();
    await expect.element(option).toHaveAttribute('aria-selected', 'true');
    expect(getComputedStyle(part(option.element(), 'item')).transitionDuration).toBe('0s');
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});
