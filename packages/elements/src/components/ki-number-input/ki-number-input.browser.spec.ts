// @spec:091-ki-number-input
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-number-input.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const seats = { label: 'Seats', name: 'seats', value: '3', min: '1', max: '50', steppers: '' };

function mount(attributes: Record<string, string> = seats, parent: HTMLElement = fixture) {
  const host = document.createElement('ki-number-input') as HTMLElement & {
    value?: number;
    format?: Intl.NumberFormatOptions;
  };
  for (const [name, value] of Object.entries(attributes)) host.setAttribute(name, value);
  parent.append(host);
  return host;
}

function spinbutton(name = 'Seats') {
  return page.getByRole('spinbutton', { name, exact: true });
}

function form() {
  const element = document.createElement('form');
  fixture.append(element);
  return element;
}

function leave() {
  const next = document.createElement('button');
  next.textContent = 'Continue';
  fixture.append(next);
  next.focus();
}

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  fixture.lang = 'en-US';
  fixture.style.backgroundColor = 'var(--ki-surface-s0)';
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

it('S1 steps to the maximum once and reports the current value on input and change', async () => {
  const host = mount({ ...seats, max: '4' });
  const events: [string, number | undefined][] = [];
  host.addEventListener('input', (event) => events.push([event.type, host.value]));
  host.addEventListener('change', (event) => events.push([event.type, host.value]));
  const increase = page.getByRole('button', { name: 'Increase Seats' });

  await increase.click();

  await expect.element(spinbutton()).toHaveValue('4');
  await expect.element(increase).toBeDisabled();
  expect(events).toEqual([
    ['input', 4],
    ['change', 4],
  ]);
  await page.getByRole('button', { name: 'Decrease Seats' }).click();
  await expect.element(increase).toBeEnabled();
});

it('S2 shows a unit next to the number without default steppers', async () => {
  mount({ label: 'Timeout', value: '30', unit: 'seconds' });

  await expect.element(spinbutton('Timeout')).toHaveValue('30');
  await expect.element(page.getByText('seconds', { exact: true })).toBeVisible();
  expect(page.getByRole('button').all()).toHaveLength(0);
});

it.each([
  ['{ArrowUp}', '14'],
  ['{ArrowDown}', '10'],
  ['{Shift>}{ArrowUp}{/Shift}', '32'],
  ['{Shift>}{ArrowDown}{/Shift}', '2'],
  ['{PageUp}', '32'],
  ['{PageDown}', '2'],
  ['{Home}', '2'],
  ['{End}', '40'],
])('S3 adjusts the focused quantity with %s', async (key, result) => {
  const host = mount({ label: 'Seats', value: '12', min: '2', max: '40', step: '2' });
  const input = spinbutton();
  await input.click();

  await userEvent.keyboard(key);

  await expect.element(input).toHaveValue(result);
  expect(host.shadowRoot?.activeElement).toBe(input.element());
});

it('S3 keeps Home and End available for editing without bounds', async () => {
  mount({ label: 'Seats', value: '123' });
  const input = spinbutton();
  await input.click();
  const editor = input.element();
  const handled: boolean[] = [];
  editor.addEventListener('keydown', (event) => handled.push(event.defaultPrevented));

  await userEvent.keyboard('{Home}{End}');

  expect(handled).toEqual([false, false]);
  await expect.element(input).toHaveValue('123');
});

it('S4 exposes a named spinbutton, its quantity and description, and passes axe', async () => {
  mount({ ...seats, 'help-text': 'Capacity per class', unit: 'seats' });
  const input = spinbutton();

  await expect.element(input).toHaveAttribute('aria-valuemin', '1');
  await expect.element(input).toHaveAttribute('aria-valuemax', '50');
  await expect.element(input).toHaveAttribute('aria-valuenow', '3');
  await expect.element(input).toHaveAttribute('aria-valuetext', '3 seats');
  await expect.element(input).toHaveAccessibleDescription('seats Capacity per class');
  await expect.element(page.getByRole('button', { name: 'Decrease Seats' })).toBeEnabled();
  await expect.element(page.getByRole('button', { name: 'Increase Seats' })).toBeEnabled();
  await expectAccessible(fixture);
});

it.each([
  ['-3', '1', 'minimum'],
  ['85', '50', 'maximum'],
])('S5 clamps %s on blur and announces the %s bound', async (entered, limit, bound) => {
  mount();
  const input = spinbutton();
  await input.fill(entered);

  leave();

  await expect.element(input).toHaveValue(limit);
  await expect
    .element(page.getByRole('status'))
    .toHaveTextContent(`Value adjusted to the ${bound} of ${limit}.`);
  await expect.element(input).toHaveAttribute('aria-invalid', 'false');
});

it('S6 commits a German percentage with Enter and submits the underlying ratio', async () => {
  const container = form();
  container.lang = 'de-DE';
  mount(
    {
      label: 'Discount',
      name: 'discount',
      format: '{"style":"percent","maximumFractionDigits":1}',
    },
    container,
  );
  const input = spinbutton('Discount');
  const submitted: (FormDataEntryValue | null)[] = [];
  container.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted.push(new FormData(container).get('discount'));
  });
  await input.fill('12,5');

  await userEvent.keyboard('{Enter}');

  const displayed = new Intl.NumberFormat('de-DE', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(0.125);
  await expect.element(input).toHaveValue(displayed);
  expect(submitted).toEqual(['0.125']);
});

it('S6 preserves underlying precision after a focus and blur with rounded display', async () => {
  const container = form();
  const host = mount({ label: 'Price', name: 'price', value: '12.5678' }, container);
  host.format = { style: 'currency', currency: 'USD' };
  const input = spinbutton('Price');
  await expect.element(input).toHaveValue('$12.57');
  await input.click();
  await expect.element(input).toHaveValue('12.5678');

  leave();

  await expect.element(input).toHaveValue('$12.57');
  expect(new FormData(container).get('price')).toBe('12.5678');
});

it('S7 reports a required empty field on form submission', async () => {
  const container = form();
  mount(
    { label: 'Seats', name: 'seats', required: '', 'error-text': 'Enter the number of seats.' },
    container,
  );
  const input = spinbutton();
  await expect.element(input).toHaveAttribute('aria-required', 'true');

  container.requestSubmit();

  expect(container.checkValidity()).toBe(false);
  await expect.element(input).toHaveAccessibleDescription('Enter the number of seats.');
  await expect.element(input).toHaveAttribute('aria-invalid', 'true');
});

it('S8 restores the declared value and FormData on reset', async () => {
  const container = form();
  mount(seats, container);
  const input = spinbutton();
  await input.fill('5');
  leave();
  expect(new FormData(container).get('seats')).toBe('5');

  container.reset();

  await expect.element(input).toHaveValue('3');
  expect(new FormData(container).get('seats')).toBe('3');
});

it('S9 disables the field and excludes it from FormData through a fieldset', async () => {
  const container = form();
  const fieldset = document.createElement('fieldset');
  container.append(fieldset);
  mount(seats, fieldset);
  const input = spinbutton();
  await expect.element(input).toBeEnabled();

  fieldset.disabled = true;

  await expect.element(input).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'Decrease Seats' })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'Increase Seats' })).toBeDisabled();
  expect(new FormData(container).has('seats')).toBe(false);
});

it('S10 paints steppers with the consumer-specified background', async () => {
  const host = mount();
  host.style.setProperty('--ki-number-input-stepper-bg', 'rgb(234, 240, 253)');
  const increase = page.getByRole('button', { name: 'Increase Seats' });
  await expect.element(increase).toBeVisible();

  expect(getComputedStyle(increase.element()).backgroundColor).toBe('rgb(234, 240, 253)');
});

it('S11 places steppers and unit in RTL reading order', async () => {
  fixture.dir = 'rtl';
  mount({ ...seats, unit: 'seats' });
  const input = spinbutton();
  const unit = page.getByText('seats', { exact: true });
  const decrease = page.getByRole('button', { name: 'Decrease Seats' });
  const increase = page.getByRole('button', { name: 'Increase Seats' });
  await expect.element(input).toBeVisible();

  const center = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return rect.left + rect.width / 2;
  };
  expect(center(decrease.element())).toBeGreaterThan(center(input.element()));
  expect(center(input.element())).toBeGreaterThan(center(unit.element()));
  expect(center(unit.element())).toBeGreaterThan(center(increase.element()));
});

it('S15 shows invalid text for correction and prevents submitting it', async () => {
  const container = form();
  mount(seats, container);
  const input = spinbutton();
  await input.fill('abc');

  leave();

  await expect.element(input).toHaveValue('abc');
  await expect.element(input).toHaveAccessibleDescription('Enter a number.');
  expect(container.checkValidity()).toBe(false);
  expect(new FormData(container).has('seats')).toBe(false);
});
