// @spec:097-ki-table
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, type Mock, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { whileKeyHeld } from '../../../browser-tests/keyboard';
import { defineCustomElement as defineCheckbox } from '../../../dist/components/ki-checkbox.js';
import { defineCustomElement as defineTable } from '../../../dist/components/ki-table.js';

const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

const styles = document.createElement('style');
const fixture = document.createElement('main');
const billing =
  '<tr data-key="billing"><th scope="row">Billing API</th><td data-numeric>64</td></tr>';
const search =
  '<tr data-key="search"><th scope="row">Search index</th><td data-numeric>18</td></tr>';
const web = '<tr data-key="web"><th scope="row">Web app</th><td data-numeric>12</td></tr>';

function services(attrs = '', rows = billing + search, sort = ''): string {
  return `<ki-table ${attrs}><table><caption>Services</caption>
    <thead><tr><th scope="col" data-sort="name" ${sort}>Name</th>
    <th scope="col" data-sort="requests" data-numeric><button type="button">Requests</button></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></ki-table>`;
}

function find(selector: string): HTMLElement {
  const element = fixture.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing table fixture element: ${selector}`);
  return element;
}

function checkbox(name: string) {
  return page.getByRole('checkbox', { name, exact: true });
}

function sortButton(name = 'Name') {
  return page.getByRole('button', { name, exact: true });
}

function spyOn(type: string) {
  const listener = vi.fn<(event: Event) => void>();
  fixture.addEventListener(type, listener, { once: true });
  return listener;
}

function eventDetail(listener: Mock<(event: Event) => void>): unknown {
  return (listener.mock.lastCall?.[0] as CustomEvent<unknown> | undefined)?.detail;
}

beforeAll(() => {
  styles.textContent = tokensCss;
  document.head.append(styles);
  fixture.innerHTML = services(
    'selectable',
    billing.replace('<tr ', '<tr aria-selected="true" ') + search,
    'aria-sort="ascending"',
  );
  document.body.append(fixture);
  defineTable();
  defineCheckbox();
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S3, S12: pre-existing table markup upgrades when the direct entries are registered', async () => {
  await expect.element(checkbox('Select Billing API')).toBeChecked();
  await expect
    .poll(() => find('thead ki-checkbox').shadowRoot?.querySelector('input')?.indeterminate)
    .toBe(true);
  const glyph = find('[data-sort="name"] ki-icon');
  expect(glyph.getAttribute('name')).toBe('arrow-up');
  await expect.poll(() => !!glyph.shadowRoot?.querySelector('svg')).toBe(true);
});

it('S1: scrolls the narrow frame without dropping columns or widening the page', async () => {
  fixture.innerHTML = services('style="inline-size: 10rem"');
  const frame = find('ki-table');
  find('table').style.minInlineSize = '20rem';
  await expect.element(sortButton('Requests')).toBeVisible();
  await expect.poll(() => frame.scrollWidth > frame.clientWidth).toBe(true);
  expect((find('tr') as HTMLTableRowElement).cells).toHaveLength(2);
  expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
  frame.scrollLeft = frame.scrollWidth;
  expect(frame.scrollLeft).toBeGreaterThan(0);
});

it.each([
  ['Name', 'name', 'descending'],
  ['Requests', 'requests', 'ascending'],
])('S2: asks the application to sort by %s', async (header, key, direction) => {
  fixture.innerHTML = services('', billing + search, 'aria-sort="ascending"');
  const listener = vi.fn<(event: Event) => void>();
  const frame = find('ki-table');
  frame.addEventListener('ki-sort', listener);
  await expect.element(sortButton()).toBeVisible();
  await sortButton(header).click();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(eventDetail(listener)).toEqual({ key, direction });
  expect(find('[data-sort="name"]').getAttribute('aria-sort')).toBe('ascending');
  expect(find('tbody tr').getAttribute('data-key')).toBe('billing');
  expect(find('[data-sort="requests"]').querySelectorAll('button')).toHaveLength(1);
});

it('S2: uses the application’s updated active column for the next request', async () => {
  fixture.innerHTML = services('', billing + search, 'aria-sort="ascending"');
  const frame = find('ki-table');
  const name = find('[data-sort="name"]');
  const requests = find('[data-sort="requests"]');
  const received: string[] = [];
  frame.addEventListener('ki-sort', (event) => {
    const { key, direction } = (event as CustomEvent<{ key: string; direction: string }>).detail;
    received.push(direction);
    if (key === 'requests') {
      name.removeAttribute('aria-sort');
      requests.setAttribute('aria-sort', direction);
    }
  });

  await expect.element(sortButton()).toBeVisible();
  await sortButton('Requests').click();
  expect(name.hasAttribute('aria-sort')).toBe(false);
  expect(requests.getAttribute('aria-sort')).toBe('ascending');
  await sortButton('Requests').click();
  expect(received).toEqual(['ascending', 'descending']);
  expect(requests.getAttribute('aria-sort')).toBe('descending');
});

it('S3: reports one selected row and exposes mixed bulk selection', async () => {
  fixture.innerHTML = services('selectable');
  const change = spyOn('ki-selection-change');
  await checkbox('Select Billing API').click();
  expect(eventDetail(change)).toEqual({ keys: ['billing'] });
  expect(find('[data-key="billing"]').getAttribute('aria-selected')).toBe('true');
  await expect
    .poll(() => find('thead ki-checkbox').shadowRoot?.querySelector('input')?.indeterminate)
    .toBe(true);
});

it('S4: a mixed bulk checkbox selects keyed rows in order and a checked one clears them', async () => {
  fixture.innerHTML = services(
    'selectable',
    billing.replace('<tr ', '<tr aria-selected="true" ') +
      search +
      '<tr><th scope="row">Totals</th><td data-numeric>82</td></tr>',
  );
  const bulk = checkbox('Select all rows');
  const selected = spyOn('ki-selection-change');
  await bulk.click();
  expect(eventDetail(selected)).toEqual({ keys: ['billing', 'search'] });
  await expect.element(checkbox('Select Search index')).toBeChecked();
  expect(find('tbody tr:last-child').querySelector('ki-checkbox')).toBeNull();

  const cleared = spyOn('ki-selection-change');
  await bulk.click();
  expect(eventDetail(cleared)).toEqual({ keys: [] });
  await expect.element(checkbox('Select Billing API')).not.toBeChecked();
  await expect.element(checkbox('Select Search index')).not.toBeChecked();
});

it('S5: retains only keys still present after replacing records', async () => {
  fixture.innerHTML = services('selectable');
  await checkbox('Select all rows').click();
  find('tbody').innerHTML = web + search;
  await expect.element(checkbox('Select Search index')).toBeChecked();
  await expect.element(checkbox('Select Web app')).not.toBeChecked();
  await expect
    .poll(() => find('thead ki-checkbox').shadowRoot?.querySelector('input')?.indeterminate)
    .toBe(true);
});

it('S6: appends and removes a decorative loading row', async () => {
  fixture.innerHTML = services('selectable');
  const frame = find('ki-table');
  const table = find('table') as HTMLTableElement;
  const body = find('tbody') as HTMLTableSectionElement;
  const originalRows = Array.from(body.rows);
  frame.setAttribute('loading', '');
  await expect.poll(() => table.getAttribute('aria-busy')).toBe('true');
  await expect.poll(() => table.rows.length).toBe(4);
  const placeholder = find('tbody > tr[aria-hidden="true"]');
  expect(placeholder.getAttribute('aria-hidden')).toBe('true');
  expect(placeholder.querySelector('span')?.getBoundingClientRect().height).toBeGreaterThan(0);
  expect(Array.from(body.rows)).toEqual(originalRows);
  frame.removeAttribute('loading');
  await expect.poll(() => table.rows.length).toBe(3);
  expect(table.getAttribute('aria-busy')).toBeNull();
});

it('S7: sticks the column headers to the frame during vertical scroll', async () => {
  fixture.innerHTML = services(
    'sticky-header style="max-block-size: 8rem"',
    billing + search + web,
  );
  const frame = find('ki-table');
  const header = find('thead');
  await expect.element(sortButton()).toBeVisible();
  const firstRow = find('tbody tr');
  const previousTop = firstRow.getBoundingClientRect().top;
  frame.scrollTop = frame.scrollHeight;
  expect(firstRow.getBoundingClientRect().top).toBeLessThan(previousTop);
  await expect
    .poll(() => {
      const edge = frame.getBoundingClientRect().top + frame.clientTop;
      return Math.abs(header.getBoundingClientRect().top - edge) < 0.5;
    })
    .toBe(true);
});

it('S8: removes the selection cells and owned row state when selection is turned off', async () => {
  fixture.innerHTML = services('selectable');
  await checkbox('Select Billing API').click();
  find('ki-table').removeAttribute('selectable');
  await expect
    .poll(() => (find('[data-key="billing"]') as HTMLTableRowElement).cells.length)
    .toBe(2);
  expect(find('[data-key="billing"]').getAttribute('aria-selected')).toBeNull();
  await expect.element(sortButton()).toBeVisible();
});

it('S9: Enter requests an ascending sort and leaves a visible focus ring', async () => {
  fixture.innerHTML = '<button type="button" tabindex="0" id="before">Before</button>' + services();
  const sort = spyOn('ki-sort');
  await expect.element(sortButton()).toBeVisible();
  find('#before').focus();
  await userEvent.keyboard('{Tab}');
  await expect.element(sortButton()).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect.element(sortButton()).toHaveFocus();
  expect(eventDetail(sort)).toEqual({ key: 'name', direction: 'ascending' });
  expect(getComputedStyle(find('[data-sort="name"] button')).outlineStyle).toBe('solid');
});

it('S10: Space changes a row checkbox focused through the Tab sequence', async () => {
  fixture.innerHTML = services('selectable');
  const button = sortButton('Requests');
  await expect.element(button).toBeVisible();
  const row = checkbox('Select Billing API');
  await expect.element(row).toBeVisible();
  find('[data-sort="requests"] button').focus();
  await userEvent.keyboard('{Tab}{Tab}');
  const searchCheckbox = find('[data-key="search"] ki-checkbox');
  const control = searchCheckbox.shadowRoot?.querySelector('input');
  expect(control).not.toBeNull();
  expect(searchCheckbox.shadowRoot?.activeElement).toBe(control);
  const change = spyOn('ki-selection-change');
  await userEvent.keyboard(' ');
  expect(eventDetail(change)).toEqual({ keys: ['search'] });
  expect(find('[data-key="search"]').getAttribute('aria-selected')).toBe('true');
});

it('S11: Tab reaches a scrollable static table and ArrowRight pans it', async () => {
  fixture.innerHTML = `<button type="button" tabindex="0" id="before">Before</button>
    <ki-table style="inline-size: 10rem"><table style="min-inline-size: 20rem">
    <caption>Services</caption><thead><tr><th scope="col">Name</th><th scope="col">Requests</th></tr></thead>
    <tbody>${billing}</tbody></table></ki-table>`;
  const frame = find('ki-table');
  await expect.poll(() => frame.tabIndex).toBe(0);
  find('#before').focus();
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(frame);
  // Held, not tapped: in macOS WebKit a tap scrolls no focused scroller,
  // a plain overflow:auto div in this harness included (whileKeyHeld).
  await whileKeyHeld('ArrowRight', () => expect.poll(() => frame.scrollLeft).toBeGreaterThan(0));
});

it('S12: exposes native table headers and only the application’s active sort', async () => {
  fixture.innerHTML = services('selectable', billing + search, 'aria-sort="ascending"');
  await expect.element(sortButton()).toBeVisible();
  await expect.element(checkbox('Select Billing API')).toBeVisible();
  const snapshot = await browser.ariaSnapshot('ki-table');
  expect(snapshot).toContain('table "Services"');
  expect(snapshot).toContain('columnheader "Name"');
  expect(snapshot).toContain('rowheader "Billing API"');
  expect(find('thead').querySelectorAll('[aria-sort]')).toHaveLength(1);
  expect(find('[data-sort="name"]').getAttribute('aria-sort')).toBe('ascending');
  await expectAccessible(fixture);
});

it('S13: localizes the checkbox names from the supplied labels', async () => {
  fixture.innerHTML = services(
    'selectable select-all-label="Toutes les lignes" row-selection-label="Choisir {row}"',
  );
  await expect.element(checkbox('Toutes les lignes')).toBeVisible();
  await expect.element(checkbox('Choisir Billing API')).toBeVisible();
  await expect.element(checkbox('Choisir Search index')).toBeVisible();
});

it('keeps selection and sort independent of the ancestor form', async () => {
  fixture.innerHTML = `<form>${services('selectable')}</form>`;
  const form = find('form') as HTMLFormElement;
  const submit = vi.fn((event: SubmitEvent) => {
    event.preventDefault();
  });
  form.addEventListener('submit', submit);
  await checkbox('Select Billing API').click();
  await sortButton().click();
  expect(submit).not.toHaveBeenCalled();
  expect([...new FormData(form)]).toEqual([]);
  form.reset();
  await expect.element(checkbox('Select Billing API')).toBeChecked();
});

it('S14: uses default and compact row heights and logical numeric alignment in RTL', async () => {
  fixture.innerHTML = services('dir="rtl"') + services('dir="rtl" density="compact"');
  const regular = find('ki-table:not([density="compact"]) tbody tr');
  const compact = find('ki-table[density="compact"] tbody tr');
  await expect.poll(() => regular.getBoundingClientRect().height).toBeCloseTo(48, 0);
  await expect.poll(() => compact.getBoundingClientRect().height).toBeCloseTo(40, 0);
  const numeric = getComputedStyle(find('tbody td[data-numeric]'));
  expect(numeric.direction).toBe('rtl');
  expect(['end', 'left']).toContain(numeric.textAlign);
  expect(numeric.fontVariantNumeric).toContain('tabular-nums');
});

it('S15: paints the frame color, image and whole backdrop filter from tokens', async () => {
  fixture.innerHTML = services('sticky-header');
  await expect.element(sortButton()).toBeVisible();
  const frame = find('ki-table');
  frame.style.setProperty('--ki-table-bg', 'rgb(19, 29, 39)');
  frame.style.setProperty('--ki-table-bg-image', 'linear-gradient(transparent, transparent)');
  frame.style.setProperty('--ki-table-backdrop-filter', 'blur(2px)');
  const painted = getComputedStyle(frame);
  expect(painted.backgroundColor).toBe('rgb(19, 29, 39)');
  expect(painted.backgroundImage).toContain('linear-gradient');
  expect(painted.backdropFilter).toBe('blur(2px)');
});

it('S16: keeps a visible row selection and keyboard focus in forced colors', async (test) => {
  await browser.emulateForcedColors('active');
  try {
    if (
      !matchMedia('(forced-colors: active)').matches &&
      !navigator.userAgent.includes('Chrome/')
    ) {
      test.skip('The engine does not expose forced colors');
    }
    await expect.poll(() => matchMedia('(forced-colors: active)').matches).toBe(true);
    fixture.innerHTML =
      '<button type="button" tabindex="0" id="before">Before</button>' +
      services('selectable', billing.replace('<tr ', '<tr aria-selected="true" ') + search);
    await expect.element(sortButton()).toBeVisible();
    await expect.element(checkbox('Select Billing API')).toBeChecked();
    find('#before').focus();
    await userEvent.keyboard('{Tab}{Tab}');
    await expect.element(sortButton()).toHaveFocus();
    const systemInk = document.createElement('span');
    systemInk.style.color = 'Highlight';
    fixture.append(systemInk);
    const focus = getComputedStyle(find('[data-sort="name"] button'));
    const selected = getComputedStyle(find('[data-key="billing"]'));
    expect(focus.outlineStyle).toBe('solid');
    expect(focus.outlineColor).toBe(getComputedStyle(systemInk).color);
    expect(selected.outlineStyle).toBe('solid');
    expect(selected.outlineColor).toBe(focus.outlineColor);
    expect(getComputedStyle(find('[data-key="search"]')).outlineStyle).toBe('none');
  } finally {
    await browser.emulateForcedColors(null);
  }
});

it('S17: paints a static loading row with reduced motion', async () => {
  await browser.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    fixture.innerHTML = services('loading');
    await expect
      .poll(
        () => fixture.querySelector('tr[aria-hidden="true"] span')?.getBoundingClientRect().height,
      )
      .toBeGreaterThan(0);
    const bar = find('tr[aria-hidden="true"] span');
    expect(getComputedStyle(bar).animationName).toBe('none');
  } finally {
    await browser.emulateReducedMotion(null);
  }
});
