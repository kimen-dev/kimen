// @spec:077-ki-checkbox-group
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineGroup } from '../../../dist/components/ki-checkbox-group.js';
import { defineCustomElement as defineCheckbox } from '../../../dist/components/ki-checkbox.js';

interface Group extends HTMLElement {
  disabled: boolean;
  value: string[];
  readonly validity: ValidityState;
}

const media = commands as unknown as {
  emulateForcedColors: (mode: 'active' | null) => Promise<void>;
  emulateReducedMotion: (mode: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineCheckbox();
  defineGroup();
  const style = document.createElement('style');
  style.textContent = tokensCss + material3Css;
  document.head.append(style);
});

afterEach(async () => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-ki-theme');
  await parkPointer();
});

const options = `
  <ki-checkbox value="eu">Europe</ki-checkbox>
  <ki-checkbox value="am">Americas</ki-checkbox>
`;

const groupRole = () => page.getByRole('group', { name: 'Regions' });
const option = (name: string) => page.getByRole('checkbox', { name });
const after = () => page.getByRole('button', { name: 'After Regions' });

async function mount({
  attributes = '',
  choices = options,
  initial,
  fieldset,
  direction = 'ltr',
}: {
  attributes?: string;
  choices?: string;
  initial?: string[];
  fieldset?: boolean;
  direction?: 'ltr' | 'rtl';
} = {}) {
  const form = document.createElement('form');
  form.dir = direction;
  const groupMarkup = `
    <ki-checkbox-group label="Regions" name="regions" ${attributes}>
      ${choices}
    </ki-checkbox-group>`;
  form.innerHTML = `
    <button type="button">Before Regions</button>
    ${fieldset ? `<fieldset disabled>${groupMarkup}</fieldset>` : groupMarkup}
    <button type="submit">After Regions</button>
  `;
  const group = form.querySelector<Group>('ki-checkbox-group');
  if (!group) throw new Error('Regions did not mount');
  if (initial !== undefined) {
    group.value = initial;
  }
  const submitted: FormData[] = [];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted.push(new FormData(form));
  });
  document.body.append(form);
  await expect.element(groupRole()).toBeVisible();
  await expect.element(option('Europe')).toBeVisible();
  return { form, group, submitted };
}

it('S1 commits both choices and sends one composed group change with the current selection', async () => {
  const { form, group } = await mount({
    choices: options.replace('value="eu"', 'value="eu" checked'),
  });
  const changes: unknown[] = [];
  form.addEventListener('ki-change', (event) => {
    changes.push({
      value: group.value,
      data: new FormData(form).getAll('regions'),
      detail: (event as CustomEvent<unknown>).detail,
      composed: event.composed,
      target: event.target,
    });
  });

  await option('Americas').click();

  await expect.element(option('Europe')).toBeChecked();
  await expect.element(option('Americas')).toBeChecked();
  expect(changes).toEqual([
    {
      value: ['eu', 'am'],
      data: ['eu', 'am'],
      detail: { value: ['eu', 'am'] },
      composed: true,
      target: group,
    },
  ]);
});

it('S2 tabs through enabled checkboxes in order and preserves selection', async () => {
  await mount({ initial: ['eu'] });
  page.getByRole('button', { name: 'Before Regions' }).element().focus();
  await userEvent.tab();
  await expect.element(option('Europe')).toHaveFocus();

  await userEvent.tab();

  await expect.element(option('Americas')).toHaveFocus();
  expect(option('Americas').element().matches(':focus-visible')).toBe(true);
  await expect.element(option('Europe')).toBeChecked();
  await expect.element(option('Americas')).not.toBeChecked();
  await userEvent.tab();
  await expect.element(after()).toHaveFocus();
});

it('S3 Space toggles the focused checkbox alone', async () => {
  await mount();
  option('Americas').element().focus();

  await userEvent.keyboard(' ');

  await expect.element(option('Americas')).toBeChecked();
  await expect.element(option('Europe')).not.toBeChecked();
});

it.each(['onmars', 'material3'])(
  'S4 exposes names, description and option state with axe in %s',
  async (theme) => {
    document.documentElement.dataset.kiTheme = theme;
    const { form } = await mount({
      attributes: 'help-text="Choose your regions"',
      initial: ['eu'],
    });

    await expect.element(groupRole()).toHaveAccessibleDescription('Choose your regions');
    await expect.element(option('Europe')).toBeChecked();
    await expect.element(option('Americas')).not.toBeChecked();
    await expectAccessible(form);
  },
);

it('S5 submits each selected value exactly once under the group name', async () => {
  const { submitted } = await mount({
    choices: options.replace('value="eu"', 'value="eu" name="regions"'),
    initial: ['am', 'eu'],
  });

  await after().click();

  expect(submitted.map((data) => [...data])).toEqual([
    [
      ['regions', 'eu'],
      ['regions', 'am'],
    ],
  ]);
});

it('S6 blocks submission below min, announces its error, and clears it on recovery', async () => {
  const { form, group, submitted } = await mount({
    attributes: 'min="1" help-text="Choose your regions" error-text="Choose at least one region."',
  });
  await expect.element(groupRole()).toHaveAccessibleDescription('Choose your regions');

  form.requestSubmit();

  expect(submitted).toHaveLength(0);
  expect(group.validity.valueMissing).toBe(true);
  await expect.element(groupRole()).toHaveAccessibleDescription('Choose at least one region.');
  await expect.element(groupRole()).toHaveAttribute('aria-invalid', 'true');
  await expect.element(page.getByText('Choose at least one region.')).toBeVisible();
  await expectAccessible(form);
  await option('Europe').click();
  await expect.element(groupRole()).toHaveAccessibleDescription('Choose your regions');
  expect(group.validity.valid).toBe(true);
});

it('S7 displays range overflow only after leaving the whole group', async () => {
  const { group } = await mount({
    initial: ['eu', 'am'],
    attributes: 'max="1" help-text="Choose your regions" error-text="Choose at most one region."',
  });
  option('Europe').element().focus();
  await userEvent.tab();
  await expect.element(option('Americas')).toHaveFocus();
  await expect.element(groupRole()).toHaveAccessibleDescription('Choose your regions');

  await userEvent.tab();

  await expect.element(after()).toHaveFocus();
  expect(group.validity.rangeOverflow).toBe(true);
  await expect.element(groupRole()).toHaveAccessibleDescription('Choose at most one region.');
});

it('S8 reset restores group-authored selection after an invalid edit', async () => {
  const { form, group } = await mount({
    initial: ['eu'],
    attributes: 'max="1" help-text="Choose your regions" error-text="Choose at most one region."',
  });
  await option('Americas').click();
  await after().click();
  await expect.element(groupRole()).toHaveAccessibleDescription('Choose at most one region.');
  group.value = ['am'];

  form.reset();

  expect(group.value).toEqual(['eu']);
  expect([...new FormData(form)]).toEqual([['regions', 'eu']]);
  await expect.element(option('Europe')).toBeChecked();
  await expect.element(option('Americas')).not.toBeChecked();
  await expect.element(groupRole()).toHaveAccessibleDescription('Choose your regions');
});

it.each([false, true])(
  'S9 skips disabled options and entries (ancestor fieldset: %s)',
  async (fieldset) => {
    const { form, group } = await mount({
      fieldset,
      attributes: fieldset ? '' : 'disabled="false"',
      initial: ['eu'],
    });
    await expect.element(option('Europe')).toBeDisabled();
    await expect.element(option('Americas')).toBeDisabled();
    page.getByRole('button', { name: 'Before Regions' }).element().focus();

    await userEvent.tab();

    await expect.element(after()).toHaveFocus();
    expect(group.value).toEqual(['eu']);
    expect([...new FormData(form)]).toEqual([]);
  },
);

it('S9 re-enables group options without clearing an individually disabled option', async () => {
  const { group } = await mount({
    attributes: 'disabled',
    choices: options.replace('value="am"', 'value="am" disabled'),
  });
  group.disabled = false;

  await expect.element(option('Europe')).toBeEnabled();
  await expect.element(option('Americas')).toBeDisabled();
});

it('S10 lays out horizontal options in RTL using the group gap token', async () => {
  const { group } = await mount({ attributes: 'orientation="horizontal"', direction: 'rtl' });
  group.style.setProperty('--ki-checkbox-group-gap', '36px');
  const europe = group.querySelector('ki-checkbox[value="eu"]');
  const americas = group.querySelector('ki-checkbox[value="am"]');

  await expect
    .poll(() => {
      const first = europe?.getBoundingClientRect();
      const second = americas?.getBoundingClientRect();
      return first && second ? [first.top - second.top, first.left - second.right] : [];
    })
    .toEqual([0, 36]);
});

it('S11 applies property selections and grouped checkbox edits silently', async () => {
  const { form, group } = await mount();
  const changes: Event[] = [];
  group.addEventListener('ki-change', (event) => changes.push(event));
  const americas = group.querySelector('ki-checkbox[value="am"]');
  if (!americas) throw new Error('Americas did not mount');

  group.value = ['am', 'apac'];

  await expect.element(option('Americas')).toBeChecked();
  await expect.element(option('Europe')).not.toBeChecked();
  expect(group.value).toEqual(['am']);
  expect([...new FormData(form)]).toEqual([['regions', 'am']]);

  group.insertAdjacentHTML('beforeend', '<ki-checkbox value="apac">Asia-Pacific</ki-checkbox>');
  await expect.element(option('Asia-Pacific')).toBeChecked();

  americas.value = 'usa';
  expect(group.value).toEqual(['usa', 'apac']);
  expect([...new FormData(form)]).toEqual([
    ['regions', 'usa'],
    ['regions', 'apac'],
  ]);
  expect(changes).toEqual([]);
});

it('S5 a checkbox moved out of a disabled group regains standalone form behavior', async () => {
  const { form, group } = await mount({
    attributes: 'disabled',
    choices: options.replace('value="eu"', 'value="eu" name="destination" checked'),
  });
  const europe = group.querySelector('ki-checkbox[value="eu"]');
  if (!europe) throw new Error('Europe did not mount');

  form.append(europe);

  await expect.element(option('Europe')).toBeEnabled();
  expect([...new FormData(form)]).toEqual([['destination', 'eu']]);
  await expect.poll(() => group.value).toEqual([]);
});

it('S4 keeps its label, options and error visible under a forced palette', async ({ skip }) => {
  const witness = document.createElement('span');
  witness.style.backgroundColor = 'rgb(1, 2, 3)';
  document.body.append(witness);
  try {
    await media.emulateForcedColors('active');
    const paints = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(witness).backgroundColor !== 'rgb(1, 2, 3)';
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(paints).toBe(true);
    } else if (!paints()) {
      skip('This engine does not repaint author colors with a forced palette.');
    }

    const { form, group } = await mount({
      attributes: 'min="1" error-text="Choose at least one region."',
    });
    form.requestSubmit();
    await expect.element(groupRole()).toBeVisible();
    await expect.element(page.getByText('Choose at least one region.')).toBeVisible();
    const control = group
      .querySelector('ki-checkbox')
      ?.shadowRoot?.querySelector('[part="control"]');
    if (!control) throw new Error('Europe did not render a control');
    expect(getComputedStyle(control).borderInlineStartStyle).toBe('solid');
  } finally {
    await media.emulateForcedColors(null);
  }
});

it('S1 updates selection with no checkbox motion under reduced motion', async () => {
  try {
    await media.emulateReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const { group } = await mount();

    await option('Europe').click();

    const mark = group.querySelector('ki-checkbox')?.shadowRoot?.querySelector('.mark');
    if (!mark) throw new Error('Europe did not render a mark');
    expect(getComputedStyle(mark).transitionDuration).toBe('0s');
    expect(group.value).toEqual(['eu']);
  } finally {
    await media.emulateReducedMotion(null);
  }
});
