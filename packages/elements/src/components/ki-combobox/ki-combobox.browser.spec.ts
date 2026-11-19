// @spec:095-ki-combobox
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { settleFrames } from '../../../browser-tests/visual/fixtures';
import { defineCustomElement } from '../../../dist/components/ki-combobox.js';
import { defineCustomElement as defineOption } from '../../../dist/components/ki-option.js';

type Combobox = HTMLElement & {
  value: string | string[];
  loading: boolean;
  checkValidity(): boolean;
  validity: ValidityState;
};

const styles = document.createElement('style');
const fixture = document.createElement('main');
const options = `
  <ki-option value="ana" description="ana@example.com"><span slot="start">AR</span>Ana Ruiz</ki-option>
  <ki-option value="anabel">Anabel Soto</ki-option>
  <ki-option value="juan">Juan Antón</ki-option>`;

beforeAll(() => {
  defineCustomElement();
  defineOption();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

async function mount(attributes = '', children = options) {
  fixture.innerHTML = `<form><ki-combobox label="Assignee" ${attributes}>${children}</ki-combobox></form>`;
  await expect.element(page.getByRole('combobox', { name: 'Assignee' })).toBeVisible();
  await settleFrames(2);
  const form = fixture.querySelector('form');
  if (!form) throw new Error('Missing form fixture');
  const host = form.firstElementChild as Combobox;
  const input = host.shadowRoot?.querySelector<HTMLInputElement>('input[role="combobox"]');
  if (!input) throw new Error('Missing combo input');
  return { form, host, input, combo: page.getByRole('combobox', { name: 'Assignee' }) };
}

it.each([
  ['contains', 'AN', 3],
  ['starts-with', 'AN', 2],
  ['none', 'AN', 3],
  ['contains', 'juan', 1],
  ['none', 'juan', 3],
])('S1 filters with %s and sends the raw query', async (filter, query, count) => {
  const { host, combo } = await mount(`filter="${filter}"`);
  const queries: string[] = [];
  host.addEventListener('ki-input', (event) => {
    queries.push((event as CustomEvent<{ value: string }>).detail.value);
  });
  await combo.fill(query);
  await expect.element(page.getByRole('listbox')).toBeVisible();
  await expect.poll(() => page.getByRole('option').all().length).toBe(count);
  expect(queries.at(-1)).toBe(query);
  if (filter === 'contains') {
    expect(host.shadowRoot?.querySelector('mark')?.textContent.toLowerCase()).toBe(
      query.toLowerCase(),
    );
  }
});

it('S2 commits an option with its description and decorative start content', async () => {
  const { host, input, combo } = await mount();
  const changes: unknown[] = [];
  host.addEventListener('ki-change', (event) => changes.push((event as CustomEvent).detail));
  await combo.fill('Ana Ruiz');
  const option = page.getByRole('option', { name: 'Ana Ruiz', exact: true });
  await expect.element(option).toHaveAccessibleDescription('ana@example.com');
  await expect.element(option.getByText('AR', { exact: true })).toBeVisible();
  await option.click();
  expect(host.value).toBe('ana');
  expect(changes).toEqual([{ value: 'ana' }]);
  expect(input.value).toBe('Ana Ruiz');
  await expect.element(combo).toHaveAttribute('aria-expanded', 'false');
});

it('S3 creates a trimmed custom value and clears the query', async () => {
  const { host, input, combo } = await mount('multiple allow-custom', '');
  await combo.fill(' search ');
  await page.getByRole('option', { name: 'Add “search”' }).click();
  await expect.element(page.getByRole('button', { name: 'Remove search' })).toBeVisible();
  expect(host.value).toEqual(['search']);
  expect(input.value).toBe('');
  await combo.fill('SEARCH');
  await expect.element(page.getByText('No results', { exact: true })).toBeVisible();
});

it('S4 replaces open results while the server search loads', async () => {
  const { host, combo } = await mount('filter="none"');
  await combo.fill('An');
  await expect.element(page.getByRole('option', { name: 'Ana Ruiz' })).toBeVisible();
  host.loading = true;
  await expect.element(page.getByText('Loading results')).toBeVisible();
  await expect.element(page.getByRole('option', { name: 'Ana Ruiz' })).not.toBeInTheDocument();
  await expectAccessible(fixture);
});

it('S5 opens with an arrow, skips disabled rows and commits without moving focus', async () => {
  const { host, input } = await mount('', `<ki-option disabled>Unavailable</ki-option>${options}`);
  input.focus();
  await userEvent.keyboard('{ArrowDown}{Enter}');
  await expect.poll(() => host.value).toBe('ana');
  expect(host.shadowRoot?.activeElement).toBe(input);
});

it('S6 preserves the query on the first Escape and clears it on the second', async () => {
  const { input, combo } = await mount();
  await combo.fill('An');
  await userEvent.keyboard('{Escape}');
  await expect.element(combo).toHaveAttribute('aria-expanded', 'false');
  expect(input.value).toBe('An');
  await userEvent.keyboard('{Escape}');
  await expect.element(combo).toHaveValue('');
});

it('S7 Backspace removes the last selection from an empty query', async () => {
  const { host, input } = await mount('multiple');
  host.value = ['ana', 'juan'];
  input.focus();
  await userEvent.keyboard('{Backspace}');
  expect(host.value).toEqual(['ana']);
});

it('S8 reports listbox relationships, active option and result count without moving focus', async () => {
  const { host, input, combo } = await mount();
  input.focus();
  await userEvent.keyboard('{ArrowDown}');
  const listbox = page.getByRole('listbox', { name: 'Assignee' });
  const option = page.getByRole('option', { name: 'Ana Ruiz', exact: true });
  await expect.element(listbox).toBeVisible();
  await expect.element(combo).toHaveAttribute('aria-expanded', 'true');
  expect(host.shadowRoot?.getElementById(input.getAttribute('aria-controls') ?? '')).toBe(
    listbox.element(),
  );
  expect(host.shadowRoot?.getElementById(input.getAttribute('aria-activedescendant') ?? '')).toBe(
    option.element(),
  );
  expect(host.shadowRoot?.activeElement).toBe(input);
  await expect.element(page.getByRole('status')).toHaveTextContent('3 results');
  await expectAccessible(fixture);
});

it('S9 removes a named tag and returns focus to the field', async () => {
  const { host, input } = await mount('multiple value=bug', '');
  const remove = page.getByRole('button', { name: 'Remove bug' });
  await expect.element(remove).toBeVisible();
  (remove.element() as HTMLButtonElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(remove).not.toBeInTheDocument();
  expect(host.value).toEqual([]);
  expect(host.shadowRoot?.activeElement).toBe(input);
});

it('S10 submits multiple chosen values in order and omits a fieldset-disabled field', async () => {
  const { form, host } = await mount('multiple name=labels', '');
  host.value = ['bug', 'search'];
  expect(new FormData(form).getAll('labels')).toEqual(['bug', 'search']);
  const fieldset = document.createElement('fieldset');
  fieldset.disabled = true;
  form.append(fieldset);
  fieldset.append(host);
  await expect.element(page.getByRole('combobox')).toBeDisabled();
  expect(new FormData(form).has('labels')).toBe(false);
});

it('S11 requires a chosen value even when the field has a query', async () => {
  const { host, combo } = await mount('required error-text="Choose an assignee"');
  await combo.fill('Something');
  expect(host.checkValidity()).toBe(false);
  expect(host.validity.valueMissing).toBe(true);
  await expect.element(combo).toHaveAccessibleDescription('Choose an assignee');
});

it('S12 resets the selection and display', async () => {
  const { form, host, combo } = await mount('name=assignee value=ana');
  host.value = 'juan';
  await expect.element(combo).toHaveValue('Juan Antón');
  form.reset();
  expect(new FormData(form).get('assignee')).toBe('ana');
  await expect.element(combo).toHaveValue('Ana Ruiz');
});

it('S13 themes the popup and active row with the customization tokens', async () => {
  const { host, input } = await mount();
  host.style.setProperty('--ki-combobox-listbox-bg', 'rgb(230, 240, 245)');
  host.style.setProperty('--ki-combobox-option-active-bg', 'rgb(200, 220, 230)');
  input.focus();
  await userEvent.keyboard('{ArrowDown}');
  const listbox = page.getByRole('listbox');
  await expect.element(listbox).toBeVisible();
  const option = page.getByRole('option', { name: 'Ana Ruiz', exact: true }).element();
  expect(getComputedStyle(listbox.element()).backgroundColor).toBe('rgb(230, 240, 245)');
  expect(getComputedStyle(option).backgroundColor).toBe('rgb(200, 220, 230)');
});

it('S16 aligns the popup to the right-hand field edge in RTL', async () => {
  fixture.dir = 'rtl';
  const { host, input } = await mount();
  host.style.inlineSize = '14rem';
  input.focus();
  await userEvent.keyboard('{ArrowDown}');
  const listbox = page.getByRole('listbox');
  await expect.element(listbox).toBeVisible();
  const field = host.shadowRoot?.querySelector('[part="field"]');
  if (!field) throw new Error('Missing field enclosure');
  await expect
    .poll(() =>
      Math.abs(
        listbox.element().getBoundingClientRect().right - field.getBoundingClientRect().right,
      ),
    )
    .toBeLessThan(0.5);
});

it('keeps selected labels when remote results replace the authored options', async () => {
  const { host, combo } = await mount('filter="none" multiple value=ana');
  await combo.fill('juan');
  host.querySelector('ki-option[value="ana"]')?.remove();
  await expect.element(page.getByRole('button', { name: 'Remove Ana Ruiz' })).toBeVisible();
  await expect.element(page.getByRole('option', { name: 'Juan Antón' })).toBeVisible();
  expect(host.value).toEqual(['ana']);
});
