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
  emulateForcedColors: (mode: 'active' | 'none' | null) => Promise<void>;
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

async function namedOption(name: string): Promise<HTMLElement> {
  const option = page.getByRole('option', { name });
  await expect.element(option).toBeVisible();
  const row = option.element();
  if (!(row instanceof HTMLElement)) throw new Error('Missing option host');
  await expect.poll(() => row.shadowRoot?.querySelector('[part="indicator"]')).toBeTruthy();
  return row;
}

function part(host: Element, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Missing part ${name}`);
  return element;
}

async function renderedCheck(indicator: HTMLElement): Promise<SVGSVGElement> {
  const svg = () => indicator.querySelector('ki-icon')?.shadowRoot?.querySelector('svg');
  await expect.poll(() => svg()?.querySelector('path, polyline')).toBeTruthy();
  const glyph = svg();
  if (!glyph) throw new Error('Missing selected check glyph');
  return glyph;
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
  const disabled = await namedOption('Luis');
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
  (await namedOption('Luis')).focus();
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
  (await namedOption('Ana')).focus();
  await userEvent.keyboard('xso');
  await expect.element(page.getByRole('option', { name: 'Sol' })).toHaveFocus();
  await expect
    .element(page.getByRole('option', { name: 'Sol' }))
    .toHaveAttribute('aria-selected', 'false');
  expect(events).toEqual([]);
});

it('S8 names options from visible row content and exposes listbox states', async () => {
  const rows = options.replace(
    '>Ana</ki-list-item>',
    '>Ana<span slot="secondary">Design</span></ki-list-item>',
  );
  const main = await mount(list('multiple', rows));
  await expect
    .element(page.getByRole('listbox', { name: 'Reviewers' }))
    .toHaveAttribute('aria-multiselectable', 'true');
  const ana = await namedOption('Ana Design');
  await namedOption('Luis');
  expect(ana.hasAttribute('aria-label')).toBe(false);
  const snapshot = await browserCommands.ariaSnapshot('ki-list');
  expect(snapshot).toMatch(/listbox "Reviewers"/u);
  expect(snapshot).toMatch(/option "Ana Design" \[selected\]/u);
  expect(snapshot).toMatch(/option "Luis" \[disabled\]/u);
  await expectAccessible(main);

  const primaryText = ana.firstChild;
  if (!(primaryText instanceof Text)) throw new Error('Missing primary option text');
  primaryText.data = 'Anita';
  await expect
    .element(page.getByRole('option', { name: 'Anita Design', exact: true }))
    .toHaveAttribute('aria-selected', 'true');
});

it('S9 tabs into the native switch named by the primary row text', async () => {
  const main = await mount(
    '<button tabindex="0">Before</button><ki-list label="Notifications"><ki-list-item><span>Email digest</span><span slot="secondary">Every Monday</span><ki-switch slot="end"></ki-switch></ki-list-item></ki-list>',
  );
  const control = page.getByRole('switch', { name: 'Email digest' });
  await expect.element(control).toHaveAttribute('tabindex', '0');
  // The transparent native input still needs a rendered focus target.
  await expect.poll(() => control.element().getBoundingClientRect().width).toBeGreaterThan(0);
  const switchHost = main.querySelector('ki-switch');
  if (!switchHost) throw new Error('Missing settings switch');
  expect(switchHost.parentElement?.hasAttribute('tabindex')).toBe(false);
  expect(switchHost.hasAttribute('tabindex')).toBe(false);

  main.querySelector('button')?.focus();
  await userEvent.tab();
  await expect.poll(() => switchHost.shadowRoot?.activeElement === control.element()).toBe(true);
  await userEvent.keyboard(' ');
  await expect.element(control).toBeChecked();
  const primary = main.querySelector('ki-list-item > span');
  if (primary) primary.textContent = 'Weekly digest';
  const renamed = page.getByRole('switch', { name: 'Weekly digest' });
  await expect.element(renamed).toBeInTheDocument();
  expect(switchHost.shadowRoot?.activeElement).toBe(renamed.element());
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

it('S13 applies selected row and indicator tokens with a centered check', async () => {
  const main = await mount(list('multiple'));
  main.style.setProperty('--ki-list-item-selected-bg', 'rgb(220, 230, 240)');
  main.style.setProperty('--ki-list-item-selected-fg', 'rgb(10, 20, 30)');
  main.style.setProperty('--ki-list-item-checkbox-selected-bg', 'rgb(30, 50, 70)');
  main.style.setProperty('--ki-list-item-checkbox-selected-fg', 'rgb(250, 250, 250)');
  const row = await namedOption('Ana');
  const indicator = part(row, 'indicator');
  const glyph = await renderedCheck(indicator);
  expect(getComputedStyle(part(row, 'item')).backgroundColor).toBe('rgb(220, 230, 240)');
  expect(getComputedStyle(part(row, 'content')).color).toBe('rgb(10, 20, 30)');
  expect(getComputedStyle(indicator).backgroundColor).toBe('rgb(30, 50, 70)');
  expect(getComputedStyle(glyph).stroke).toBe('rgb(250, 250, 250)');

  const box = indicator.getBoundingClientRect();
  const mark = glyph.getBoundingClientRect();
  expect(mark.width).toBeGreaterThan(0);
  expect(mark.height).toBeGreaterThan(0);
  expect(mark.width).toBeLessThanOrEqual(indicator.clientWidth + 0.5);
  expect(mark.height).toBeLessThanOrEqual(indicator.clientHeight + 0.5);
  expect(Math.abs(mark.left + mark.width / 2 - (box.left + box.width / 2))).toBeLessThanOrEqual(
    0.5,
  );
  expect(Math.abs(mark.top + mark.height / 2 - (box.top + box.height / 2))).toBeLessThanOrEqual(
    0.5,
  );

  const unselected = part(await namedOption('Sara'), 'indicator');
  expect(getComputedStyle(unselected).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(unselected.querySelector('ki-icon')).toBeNull();
});

it('S14 retains the selection mark and focus ring in forced colors', async ({ skip }) => {
  const main = await mount(`<button tabindex="0">Before</button>${list('multiple')}`);
  const row = await namedOption('Ana');
  const indicator = part(row, 'indicator');
  const glyph = await renderedCheck(indicator);
  const witness = document.createElement('div');
  const authorColor = 'rgb(1, 2, 3)';
  witness.style.backgroundColor = authorColor;
  main.append(witness);

  try {
    await browserCommands.emulateForcedColors('active');
    const repaints = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(witness).backgroundColor !== authorColor;
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(repaints).toBe(true);
    } else if (!repaints()) {
      skip('This engine does not repaint author colors with a forced palette.');
    }

    main.querySelector('button')?.focus();
    await userEvent.tab();
    await expect.element(page.getByRole('option', { name: 'Ana' })).toHaveFocus();
    expect(getComputedStyle(part(row, 'item')).outlineStyle).toBe('solid');
    const paint = getComputedStyle(indicator);
    const canvas = getComputedStyle(witness).backgroundColor;
    expect(paint.borderBlockStartStyle).toBe('solid');
    expect(paint.borderBlockStartColor).not.toBe(canvas);
    expect(paint.backgroundColor).not.toBe(canvas);
    expect(getComputedStyle(glyph).stroke).toBe(paint.color);
    expect(getComputedStyle(glyph).stroke).not.toBe(paint.backgroundColor);
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
  await expect.element(page.getByRole('link', { name: 'Account' })).toBeVisible();
  const indicator = part(row, 'indicator');
  const content = part(row, 'content');
  expect(getComputedStyle(part(row, 'item')).direction).toBe('rtl');
  await expect
    .poll(() => {
      const indicatorRect = indicator.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      return (
        indicatorRect.width > 0 &&
        contentRect.width > 0 &&
        indicatorRect.right <= contentRect.left + 0.5
      );
    })
    .toBe(true);
  expect(getComputedStyle(indicator).scale).toBe('-1 1');
});

it('S16 applies selection with no transitions under reduced motion', async () => {
  await mount(list('multiple'));
  const option = page.getByRole('option', { name: 'Sara' });
  const row = await namedOption('Sara');
  const surface = part(row, 'item');
  const indicator = part(row, 'indicator');
  // WebKit reapplies media emulation to shadow roots present at the change.
  await browserCommands.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    await expect.poll(() => getComputedStyle(surface).transitionDuration).toBe('0s');
    await option.click();
    await expect.element(option).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => indicator.querySelector('ki-icon')).toBeTruthy();
    expect(getComputedStyle(surface).transitionDuration).toBe('0s');
    expect(getComputedStyle(surface, '::after').transitionDuration).toBe('0s');
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});
