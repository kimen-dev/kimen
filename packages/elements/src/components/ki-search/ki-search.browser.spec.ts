// @spec:099-ki-search
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineAllComponents } from 'virtual:kimen-component-registrations';

interface SearchElement extends HTMLElement {
  open: boolean;
  value: string;
  loading: boolean;
}

const browser = commands as unknown as {
  installClock: () => Promise<void>;
  pauseClock: () => Promise<void>;
  fastForwardClock: (ms: number) => Promise<void>;
  resumeClock: () => Promise<void>;
  emulateForcedColors: (value: 'active' | null) => Promise<boolean | undefined>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};
const fixture = document.createElement('main');
const styles = document.createElement('style');
const suggestions = `
  <ki-search-suggestion value="ki-dialog" description="Component">Dialog</ki-search-suggestion>
  <ki-search-suggestion value="ki-drawer">Drawer</ki-search-suggestion>
  <ki-search-suggestion recent>button tokens</ki-search-suggestion>
`;
const combobox = () => page.getByRole('combobox', { name: 'Search Kimen' });
const searchbox = () => page.getByRole('searchbox', { name: 'Search Kimen' });

beforeAll(() => {
  defineAllComponents();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await page.viewport(414, 896);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

async function mount(
  attributes = 'mode="docked"',
  content = suggestions,
  container: HTMLElement | ShadowRoot = fixture,
): Promise<SearchElement> {
  const search = document.createElement('ki-search') as SearchElement;
  search.setAttribute('label', 'Search Kimen');
  // The fixtures below use static markup so attribute and child wiring pass
  // through the same entry point as author-written HTML.
  const markup = document.createElement('template');
  markup.innerHTML = `<ki-search ${attributes}>${content}</ki-search>`;
  const source = markup.content.firstElementChild;
  if (!source) throw new Error('Search fixture is missing');
  for (const attribute of source.attributes) {
    search.setAttribute(attribute.name, attribute.value);
  }
  search.append(...source.childNodes);
  container.append(search);
  await expect.poll(() => search.shadowRoot?.querySelector('[part=bar]')?.isConnected).toBe(true);
  return search;
}

function part(search: SearchElement, name: string): HTMLElement {
  const element = search.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Search part ${name} is missing`);
  return element;
}

function record(host: HTMLElement, name: string) {
  const listener = vi.fn<(detail: unknown) => void>();
  host.addEventListener(name, (event) => {
    const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
    listener(detail);
  });
  return listener;
}

function query(search: SearchElement): HTMLInputElement {
  const input = part(search, 'bar').querySelector('input');
  if (!input) throw new Error('Search input is missing');
  return input;
}

function edit(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
}

it('S1 debounces edits and reports the latest query', async () => {
  const search = await mount();
  const listener = record(search, 'ki-input');
  try {
    await browser.installClock();
  } catch {
    // Another spec in this page may already have installed the page clock.
  }
  await browser.pauseClock();
  try {
    edit(query(search), 'dia');
    await browser.fastForwardClock(100);
    edit(query(search), 'dialog');
    await browser.fastForwardClock(100);
    expect(listener).not.toHaveBeenCalled();
    await browser.fastForwardClock(100);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toEqual({ value: 'dialog' });
    expect(search.open).toBe(true);
  } finally {
    await browser.resumeClock();
  }
});

it('S2 runs a clicked suggestion and retains host results', async () => {
  const search = await mount('mode="docked"', `${suggestions}<p slot="results">Dialog guide</p>`);
  const listener = record(search, 'ki-search');
  await searchbox().click();
  await page.getByRole('option', { name: /^Dialog/ }).click();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0]?.[0]).toEqual({ value: 'ki-dialog' });
  await expect.element(combobox()).toHaveValue('ki-dialog');
  await expect.element(page.getByText('Dialog guide')).toBeVisible();
});

it('S3 shows a named spinner above host results while loading', async () => {
  const search = await mount('mode="docked" open', '<p slot="results">Dialog guide</p>');
  search.loading = true;
  await expect.element(page.getByRole('status', { name: 'Loading suggestions' })).toBeVisible();
  await expect.element(page.getByText('Dialog guide')).toBeVisible();
});

it.each([599, 600])('S4 honors the auto breakpoint at %dpx', async (width) => {
  await page.viewport(width, 800);
  const search = await mount('mode="auto"');
  await searchbox().click();
  await expect.element(combobox()).toHaveFocus();
  if (width < 600) {
    await expect.element(page.getByRole('dialog', { name: 'Search Kimen' })).toBeVisible();
    expect(search.shadowRoot?.querySelector('dialog')?.matches(':modal')).toBe(true);
  } else {
    await expect
      .poll(() => {
        const bar = part(search, 'bar').getBoundingClientRect();
        const list = page.getByRole('listbox').element().getBoundingClientRect();
        return Math.abs(bar.bottom - list.top) < 12 && Math.abs(bar.left - list.left) < 2;
      })
      .toBe(true);
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  }
});

it('S5 emphasizes a case-insensitive literal match and honors highlight=false', async () => {
  const search = await mount('mode="docked" value="dia" open');
  await expect.element(page.getByRole('option', { name: /^Dialog/ })).toBeVisible();
  expect(search.shadowRoot?.querySelector('mark')?.textContent).toBe('Dia');
  search.setAttribute('highlight', 'false');
  await expect.poll(() => search.shadowRoot?.querySelector('mark')).toBeNull();
});

it('S6 moves the active descendant with both arrows and retains input focus', async () => {
  const search = await mount();
  await searchbox().click();
  await userEvent.keyboard('{ArrowDown}');
  await expect
    .poll(() => {
      const id = query(search).getAttribute('aria-activedescendant');
      return id && search.shadowRoot?.getElementById(id)?.textContent;
    })
    .toContain('Dialog');
  await userEvent.keyboard('{ArrowDown}{ArrowUp}');
  await expect.element(combobox()).toHaveFocus();
  await expect
    .element(page.getByRole('option', { name: /^Dialog/ }))
    .toHaveAttribute('aria-selected', 'true');
});

it('S7 uses the active suggestion for Enter', async () => {
  const search = await mount();
  const listener = record(search, 'ki-search');
  await searchbox().click();
  await userEvent.keyboard('{ArrowDown}{Enter}');
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0]?.[0]).toEqual({ value: 'ki-dialog' });
});

it('S8 submits the typed query with Enter when no suggestion is active', async () => {
  const search = await mount('mode="docked" value="overlay"');
  const listener = record(search, 'ki-search');
  await searchbox().click();
  await userEvent.keyboard('{Enter}');
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0]?.[0]).toEqual({ value: 'overlay' });
});

it('S9 clears before closing on Escape', async () => {
  const search = await mount('mode="fullscreen" value="dialog"');
  const listener = record(search, 'ki-clear');
  await searchbox().click();
  await expect.element(combobox()).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  await expect.element(combobox()).toHaveValue('');
  expect(search.open).toBe(true);
  expect(listener).toHaveBeenCalledTimes(1);
});

it('S10 closes an empty modal and allows a click on the restored input to reopen it', async () => {
  await mount('mode="fullscreen"');
  await searchbox().click();
  await expect.element(combobox()).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  await expect.element(searchbox()).toHaveFocus();
  await searchbox().click();
  await expect.element(page.getByRole('dialog')).toBeVisible();
});

it('S11 includes a keyboard-operable removal control in the Recent group', async () => {
  await mount('mode="docked"');
  await searchbox().click();
  const recent = page.getByRole('group', { name: 'Recent searches' });
  const run = recent.getByRole('button', { name: 'button tokens', exact: true });
  const remove = recent.getByRole('button', { name: 'Remove button tokens' });
  await userEvent.tab();
  await expect.element(run).toHaveFocus();
  await userEvent.tab();
  await expect.element(remove).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect.element(recent).not.toBeInTheDocument();
  await expect.element(combobox()).toHaveFocus();
});

it('S11 displays a new recent query when the page reuses a removed child', async () => {
  const search = await mount('mode="docked" open');
  const child = search.querySelector('ki-search-suggestion[recent]');
  if (!child) throw new Error('Recent query fixture is missing');
  await page.getByRole('button', { name: 'Remove button tokens' }).click();
  child.textContent = 'color tokens';
  await expect.element(page.getByRole('button', { name: 'Remove color tokens' })).toBeVisible();
});

it('S2 keeps a docked view open during an internal pointer event across a closed shadow root', async () => {
  const parent = document.createElement('div');
  fixture.append(parent);
  const root = parent.attachShadow({ mode: 'closed' });
  const search = await mount('mode="docked" open', suggestions, root);
  const listener = record(search, 'ki-search');
  await expect.poll(() => part(search, 'view').matches(':popover-open')).toBe(true);
  const option = part(search, 'option');
  option.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
  expect(search.open).toBe(true);
  option.click();
  expect(listener.mock.calls[0]?.[0]).toEqual({ value: 'ki-dialog' });
});

it('S12 names the collapsed search landmark and searchbox', async () => {
  await mount();
  const landmark = page.getByRole('search', { name: 'Search Kimen' });
  await expect.element(landmark.getByRole('searchbox', { name: 'Search Kimen' })).toBeVisible();
});

it('S13 exposes expanded autocomplete, separately announces the current count, and passes axe', async () => {
  const search = await mount('mode="docked" open');
  const entry = document.createElement('ki-search-suggestion');
  entry.textContent = 'Tabs';
  search.append(entry);
  await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
  await expect.element(combobox()).toHaveAttribute('aria-autocomplete', 'list');
  const listId = page.getByRole('listbox').element().id;
  await expect.element(combobox()).toHaveAttribute('aria-controls', listId);
  const count = page.getByRole('status');
  await expect.element(count).toHaveAttribute('aria-live', 'polite');
  await expect.element(count).toHaveTextContent('3 suggestions');
  await expect.element(page.getByRole('group', { name: 'Recent searches' })).toBeVisible();
  await expectAccessible(fixture);
});

it('S14 makes background controls inert and returns focus from Back', async () => {
  const search = await mount('mode="fullscreen"');
  const outside = document.createElement('button');
  outside.textContent = 'Outside';
  fixture.append(outside);
  await searchbox().click();
  await expect.element(combobox()).toHaveFocus();
  outside.focus();
  expect(search.shadowRoot?.activeElement).toBe(combobox().element());
  await expectAccessible(fixture);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect.element(searchbox()).toHaveFocus();
});

it('S15 includes the query in submitted form data and honors disabled fieldsets', async () => {
  const form = document.createElement('form');
  const fieldset = document.createElement('fieldset');
  form.append(fieldset);
  fixture.append(form);
  await mount('mode="docked" name="q" value="dialog"', '', fieldset);
  const onSubmit = vi.fn((event: SubmitEvent) => {
    event.preventDefault();
    return new FormData(form).get('q');
  });
  form.addEventListener('submit', onSubmit);
  form.requestSubmit();
  expect(onSubmit.mock.results[0]?.value).toBe('dialog');
  fieldset.disabled = true;
  await expect.element(searchbox()).toBeDisabled();
  expect(new FormData(form).has('q')).toBe(false);
});

it('S16 restores the initial field and form value', async () => {
  const form = document.createElement('form');
  fixture.append(form);
  const search = await mount('mode="docked" name="q" value="tokens"', '', form);
  edit(query(search), 'dialog');
  expect(new FormData(form).get('q')).toBe('dialog');
  form.reset();
  await expect.element(searchbox()).toHaveValue('tokens');
  expect(new FormData(form).get('q')).toBe('tokens');
});

it('S17 applies independent background token overrides to the bar and view', async () => {
  const search = await mount('mode="docked" open');
  search.style.setProperty('--ki-search-bar-bg', 'rgb(245, 230, 210)');
  search.style.setProperty('--ki-search-view-bg', 'rgb(220, 235, 245)');
  await expect.element(page.getByRole('listbox')).toBeVisible();
  expect(getComputedStyle(part(search, 'bar')).backgroundColor).toBe('rgb(245, 230, 210)');
  expect(getComputedStyle(part(search, 'view')).backgroundColor).toBe('rgb(220, 235, 245)');
});

it('S18 puts the modal Back button at inline start in RTL', async () => {
  await mount('mode="fullscreen" dir="rtl" open');
  const back = page.getByRole('button', { name: 'Back' });
  await expect.element(back).toBeVisible();
  expect(back.element().getBoundingClientRect().left).toBeGreaterThan(
    combobox().element().getBoundingClientRect().right,
  );
});

it('S19 shows a visible keyboard outline in forced colors', async (context) => {
  const active = await browser.emulateForcedColors('active');
  if (!active && !matchMedia('(forced-colors: active)').matches) {
    context.skip('Forced-colors emulation is unavailable in this engine');
  }
  try {
    const search = await mount();
    await userEvent.tab();
    await expect.element(combobox()).toHaveFocus();
    const style = getComputedStyle(part(search, 'bar'));
    expect(style.outlineStyle).toBe('solid');
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  } finally {
    await browser.emulateForcedColors(null);
  }
});

it('S20 shows the open view without motion when reduced motion is requested', async () => {
  await browser.emulateReducedMotion('reduce');
  try {
    const search = await mount('mode="docked" open');
    await expect.element(page.getByRole('listbox')).toBeVisible();
    expect(part(search, 'view').getAnimations({ subtree: true })).toHaveLength(0);
  } finally {
    await browser.emulateReducedMotion(null);
  }
});
