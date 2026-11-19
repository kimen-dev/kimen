// @spec:097-ki-table
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineAllComponents } from '../../../browser-tests/all-components';

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
  const listener = vi.fn<(event: CustomEvent) => void>();
  fixture.addEventListener(type, listener as EventListener, { once: true });
  return listener;
}

beforeAll(() => {
  defineAllComponents();
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
  const listener = vi.fn<(event: CustomEvent) => void>();
  const frame = find('ki-table');
  frame.addEventListener('ki-sort', listener as EventListener);
  await sortButton(header).click();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0][0].detail).toEqual({ key, direction });
  expect(find('[data-sort="name"]').getAttribute('aria-sort')).toBe('ascending');
  expect((find('tbody') as HTMLTableSectionElement).rows[0].getAttribute('data-key')).toBe(
    'billing',
  );
  expect(find('[data-sort="requests"]').querySelectorAll('button')).toHaveLength(1);
});

it('S3: reports one selected row and exposes mixed bulk selection', async () => {
  fixture.innerHTML = services('selectable');
  const change = spyOn('ki-selection-change');
  await checkbox('Select Billing API').click();
  expect(change.mock.calls[0][0].detail).toEqual({ keys: ['billing'] });
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
  expect(selected.mock.calls[0][0].detail).toEqual({ keys: ['billing', 'search'] });
  await expect.element(checkbox('Select Search index')).toBeChecked();
  expect(find('tbody tr:last-child').querySelector('ki-checkbox')).toBeNull();

  const cleared = spyOn('ki-selection-change');
  await bulk.click();
  expect(cleared.mock.calls[0][0].detail).toEqual({ keys: [] });
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
  const originalRows = Array.from(table.tBodies[0].rows);
  frame.setAttribute('loading', '');
  await expect.poll(() => table.getAttribute('aria-busy')).toBe('true');
  await expect.poll(() => table.rows.length).toBe(4);
  const placeholder = table.rows[3];
  expect(placeholder.getAttribute('aria-hidden')).toBe('true');
  expect(placeholder.querySelector('span')?.getBoundingClientRect().height).toBeGreaterThan(0);
  expect(Array.from(table.tBodies[0].rows)).toEqual(originalRows);
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
  expect(sort.mock.calls[0][0].detail).toEqual({ key: 'name', direction: 'ascending' });
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
  expect(change.mock.calls[0][0].detail).toEqual({ keys: ['search'] });
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
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => frame.scrollLeft).toBeGreaterThan(0);
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
  const [regular, compact] = fixture.querySelectorAll('tbody');
  await expect.poll(() => regular.rows[0].getBoundingClientRect().height).toBeCloseTo(48);
  await expect.poll(() => compact.rows[0].getBoundingClientRect().height).toBeCloseTo(40);
  const numeric = getComputedStyle(regular.rows[0].cells[1]);
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
    expect(getComputedStyle(find('[data-sort="name"] button')).outlineStyle).toBe('solid');
    expect(getComputedStyle(find('[data-key="billing"]')).outlineStyle).toBe('solid');
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
