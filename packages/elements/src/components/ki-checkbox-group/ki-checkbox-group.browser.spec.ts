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
  emulateReducedMotion: (mode: 'reduce' | 'no-preference') => Promise<void>;
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

async function expectOptionFocus(name: string): Promise<void> {
  const checkbox = option(name).element();
  const root = checkbox.getRootNode();
  // The document reports the host when focus is inside a checkbox's shadow root.
  await expect
    .poll(() => root instanceof ShadowRoot && root.activeElement === checkbox, {
      message: `Expected ${name} to receive focus inside its shadow root`,
    })
    .toBe(true);
}

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
  // Explicit tab stops keep native buttons in the sequence on macOS WebKit.
  form.innerHTML = `
    <button type="button" tabindex="0">Before Regions</button>
    ${fieldset ? `<fieldset disabled>${groupMarkup}</fieldset>` : groupMarkup}
    <button type="submit" tabindex="0">After Regions</button>
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
  await expectOptionFocus('Europe');

  await userEvent.tab();

  await expectOptionFocus('Americas');
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

it('S6 lets the person fix the error from the checkbox the browser focused', async () => {
  const { form, group, submitted } = await mount({
    attributes: 'min="1" error-text="Choose at least one region."',
  });

  // The browser reports the error at the first option's own checkbox, never
  // at the option element: WebKit on Linux draws its validation bubble inside
  // the anchor's shadow root, and on an option host that replaced the
  // option's shadow root, checkbox and all.
  form.requestSubmit();
  await expectOptionFocus('Europe');
  await userEvent.keyboard(' ');

  await expect.element(option('Europe')).toBeChecked();
  expect(group.value).toEqual(['eu']);
  form.requestSubmit();
  expect(submitted).toHaveLength(1);
});

it('S7 displays range overflow only after leaving the whole group', async () => {
  const { group } = await mount({
    initial: ['eu', 'am'],
    attributes: 'max="1" help-text="Choose your regions" error-text="Choose at most one region."',
  });
  option('Europe').element().focus();
  await userEvent.tab();
  await expectOptionFocus('Americas');
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
      attributes: fieldset ? '' : 'disabled',
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

it('S16 disabled="false" leaves the options operable and in the form', async () => {
  const { form, group } = await mount({ attributes: 'disabled="false"', initial: ['eu'] });
  await expect.element(option('Europe')).toBeEnabled();
  expect(new FormData(form).getAll('regions')).toEqual(['eu']);

  group.setAttribute('disabled', 'true');
  await expect.element(option('Americas')).toBeDisabled();
  group.setAttribute('disabled', 'false');
  await option('Americas').click();

  expect(new FormData(form).getAll('regions')).toEqual(['eu', 'am']);
});

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
  const americas = group.querySelector<HTMLKiCheckboxElement>('ki-checkbox[value="am"]');
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

it('S11 an explicit empty selection overrides authored checked options', async () => {
  const { form, group } = await mount({
    choices: options.replace('value="eu"', 'value="eu" checked'),
    initial: [],
  });

  await expect.element(option('Europe')).not.toBeChecked();
  expect(group.value).toEqual([]);
  expect([...new FormData(form)]).toEqual([]);
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
    const error = page.getByText('Choose at least one region.');
    await expect.element(error).toBeVisible();
    const control = group
      .querySelector('ki-checkbox')
      ?.shadowRoot?.querySelector('[part="control"]');
    if (!control) throw new Error('Europe did not render a control');
    const canvas = getComputedStyle(witness).backgroundColor;
    const border = getComputedStyle(control);
    expect(border.borderInlineStartStyle).toBe('solid');
    expect(border.borderInlineStartColor).not.toBe(canvas);
    expect(getComputedStyle(error.element()).color).not.toBe(canvas);
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
    await media.emulateReducedMotion('no-preference');
  }
});

interface AxNode {
  readonly role: string;
  readonly name: string;
}

const accessibility = commands as unknown as {
  accessibilityTree: () => Promise<AxNode[] | null>;
  ariaSnapshotByRole: (role: 'group', name: string) => Promise<string>;
};

// The engine's accessibility tree is read over CDP, which only Chromium
// exposes; Firefox and WebKit answer null. Headless Chromium reports
// `HeadlessChrome/`, hence no word boundary.
const IS_CHROMIUM = navigator.userAgent.includes('Chrome/');

async function rolesNaming(text: string): Promise<string[]> {
  const nodes = await accessibility.accessibilityTree();
  if (nodes === null) throw new Error('Chromium stopped answering its accessibility tree');
  // Generic nodes are not announced (ARIA prohibits naming them), and inline
  // text boxes are a static text's own runs.
  return nodes
    .filter((node) => node.name === text)
    .map(({ role }) => role)
    .filter((role) => role !== 'generic' && role !== 'InlineTextBox')
    .sort();
}

async function mountNamedFromPage(attributes: string): Promise<Group> {
  document.body.innerHTML = `<main>
    <h2 id="question">Where do you ship?</h2>
    <ki-checkbox-group name="regions" ${attributes}>${options}</ki-checkbox-group>
  </main>`;
  const group = document.querySelector<Group>('ki-checkbox-group');
  if (!group) throw new Error('The group did not mount');
  await expect.element(option('Europe')).toBeVisible();
  return group;
}

it('S13 a hidden legend is not displayed and names the group once', async () => {
  const { group } = await mount({ attributes: 'label-hidden' });

  expect(group.shadowRoot?.querySelector('[part="label"]')?.getClientRects()).toHaveLength(0);
  await expect.element(groupRole()).toBeVisible();
  if (IS_CHROMIUM) {
    expect(await rolesNaming('Regions')).toEqual(['group']);
  }
  await expectAccessible(group);
});

it('S14 a heading on the page names a group that has no label of its own', async () => {
  const group = await mountNamedFromPage('aria-labelledby="question"');

  expect(group.shadowRoot?.querySelector('[part="label"]')).toBeNull();
  if (IS_CHROMIUM) {
    expect(await rolesNaming('Where do you ship?')).toEqual(['StaticText', 'group', 'heading']);
  }
  // Playwright's accessible-name computation in every engine; Vitest's own
  // role locators resolve id references only, never element references.
  expect(await accessibility.ariaSnapshotByRole('group', 'Where do you ship?')).toMatch(
    /^- group "Where do you ship\?":/u,
  );
  // After the snapshot, as aria-snapshot-reflection does: axe reads the same
  // reflected getter.
  await expectAccessible(group.closest('main') ?? document.body);
});

it('S15 the group own label follows the page heading in its name', async () => {
  await mountNamedFromPage('aria-labelledby="question" label="Pick all that apply"');

  expect(
    await accessibility.ariaSnapshotByRole('group', 'Where do you ship? Pick all that apply'),
  ).toMatch(/^- group "Where do you ship\? Pick all that apply":/u);
  await expect.element(page.getByText('Pick all that apply')).toBeVisible();
});
