// @spec:121-ki-code-input
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-code-input.js';

type CodeInputElement = HTMLElement & { value: string };

const styles = document.createElement('style');
const fixture = document.createElement('main');
const label = 'Verification code';
const help = 'We sent a code to ana@example.com. It is valid for ten minutes.';

const browserCommands = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<boolean | undefined>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('style');
  fixture.removeAttribute('dir');
  document.documentElement.style.removeProperty('--ki-surface-s0');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

async function mount(attributes = '', parent: HTMLElement = fixture): Promise<CodeInputElement> {
  const element = document.createElement('ki-code-input') as CodeInputElement;
  element.setAttribute('label', label);
  const template = document.createElement('template');
  template.innerHTML = `<ki-code-input ${attributes}></ki-code-input>`;
  for (const { name, value } of template.content.querySelector('ki-code-input')?.attributes ?? []) {
    element.setAttribute(name, value);
  }
  parent.append(element);
  await expect.element(textbox()).toBeInTheDocument();
  return element;
}

function textbox() {
  return page.getByRole('textbox', { name: label });
}

function inputOf(element: CodeInputElement): HTMLInputElement {
  const input = element.shadowRoot?.querySelector('input');
  if (!input) throw new Error('Missing native code input');
  return input;
}

function cellsOf(element: CodeInputElement): HTMLElement[] {
  return [...(element.shadowRoot?.querySelectorAll<HTMLElement>('[part="cell"]') ?? [])];
}

function cellAt(element: CodeInputElement, index: number): HTMLElement {
  const cell = cellsOf(element)[index];
  if (!cell) throw new Error(`Missing code input cell ${String(index)}`);
  return cell;
}

function codeEvents(element: CodeInputElement) {
  const events: [string, string][] = [];
  for (const type of ['ki-input', 'ki-complete'] as const) {
    element.addEventListener(type, (event) =>
      events.push([type, (event as CustomEvent<{ value: string }>).detail.value]),
    );
  }
  return events;
}

function formFixture() {
  const form = document.createElement('form');
  fixture.append(form);
  return form;
}

async function replaceThirdDigit() {
  await userEvent.keyboard('{ArrowLeft>6/}{ArrowRight}{ArrowRight}{Shift>}{ArrowRight}{/Shift}8');
}

it('S1: filters a formatted paste and publishes the complete code once', async () => {
  const form = formFixture();
  const element = await mount('name="otp"', form);
  const events = codeEvents(element);
  const submittedCodes: FormDataEntryValue[][] = [];
  element.addEventListener('ki-complete', () =>
    submittedCodes.push(new FormData(form).getAll('otp')),
  );
  const data = new DataTransfer();
  data.setData('text/plain', '04 29-11');
  const input = inputOf(element);
  input.focus();

  input.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
  );

  await expect.element(textbox()).toHaveValue('042911');
  await expect
    .poll(() => cellsOf(element).map((cell) => cell.textContent))
    .toEqual(['0', '4', '2', '9', '1', '1']);
  expect(events).toEqual([
    ['ki-input', '042911'],
    ['ki-complete', '042911'],
  ]);
  expect(submittedCodes).toEqual([['042911']]);
});

it('S2: accepts one whole alphanumeric replacement through the autofill input', async () => {
  const element = await mount('length="4" type="alphanumeric"');
  const events = codeEvents(element);
  const input = inputOf(element);
  expect(input.autocomplete).toBe('one-time-code');
  expect(input.inputMode).toBe('text');
  expect(input.maxLength).toBe(4);

  await textbox().fill('a7B9');

  await expect
    .poll(() => cellsOf(element).map((cell) => cell.textContent))
    .toEqual(['a', '7', 'B', '9']);
  expect(events).toEqual([
    ['ki-input', 'a7B9'],
    ['ki-complete', 'a7B9'],
  ]);
});

it('S3: replaces a digit in a full code using the keyboard', async () => {
  const element = await mount('value="042911"');
  const events = codeEvents(element);
  await textbox().click();

  await replaceThirdDigit();

  await expect.element(textbox()).toHaveValue('048911');
  expect(events).toEqual([
    ['ki-input', '048911'],
    ['ki-complete', '048911'],
  ]);
});

it('S4: preserves the native undo history for an accepted edit', async () => {
  await mount('value="042911"');
  await textbox().click();
  await replaceThirdDigit();
  await expect.element(textbox()).toHaveValue('048911');

  const modifier = navigator.platform.startsWith('Mac') ? 'Meta' : 'Control';
  await userEvent.keyboard(`{${modifier}>}z{/${modifier}}`);

  await expect.element(textbox()).toHaveValue('042911');
});

it('S5: exposes one required textbox with a name and delivery help', async () => {
  const before = document.createElement('button');
  before.type = 'button';
  before.tabIndex = 0;
  before.textContent = 'Before';
  fixture.append(before);
  const element = await mount(`required help-text="${help}"`);
  const after = document.createElement('button');
  after.type = 'button';
  after.tabIndex = 0;
  after.textContent = 'After';
  fixture.append(after);
  before.focus();

  await userEvent.keyboard('{Tab}');

  await expect.poll(() => element.shadowRoot?.activeElement).toBe(inputOf(element));
  await expect.element(textbox()).toBeRequired();
  await expect.element(textbox()).toHaveAccessibleDescription(help);
  expect(inputOf(element).inputMode).toBe('numeric');
  expect(inputOf(element).maxLength).toBe(6);
  expect(element.shadowRoot?.querySelectorAll('input')).toHaveLength(1);
  expect(
    cellsOf(element).every((cell) => cell.parentElement?.getAttribute('aria-hidden') === 'true'),
  ).toBe(true);
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
  await expectAccessible(fixture);
});

it('S6: blocks incomplete form submission and announces the error in place of help', async () => {
  const form = formFixture();
  const element = await mount(
    `required value="042" help-text="${help}" error-text="Enter all six digits."`,
    form,
  );
  const messages: Event[] = [];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    messages.push(event);
  });
  const errorLine = element.shadowRoot?.querySelector('[part="error"]');
  expect(errorLine?.textContent).toBe('');

  form.requestSubmit();

  await expect.element(textbox()).toHaveAttribute('aria-invalid', 'true');
  await expect.element(textbox()).toHaveAccessibleDescription('Enter all six digits.');
  expect(messages).toHaveLength(0);
  expect(errorLine?.textContent).toBe('Enter all six digits.');
  expect(errorLine?.getAttribute('aria-live')).toBe('polite');
  expect(errorLine?.getAttribute('aria-atomic')).toBe('true');
  expect(element.shadowRoot?.querySelector('[part="help"]')).toBeNull();

  await textbox().fill('042911');
  await expect.element(textbox()).toHaveAccessibleDescription(help);
  await expectAccessible(fixture);
});

it('S7: submits a single named value and keeps completion separate from submission', async () => {
  const form = formFixture();
  await mount('name="otp" required', form);
  const submit = document.createElement('button');
  submit.textContent = 'Verify';
  submit.type = 'submit';
  form.append(submit);
  const submittedCodes: FormDataEntryValue[][] = [];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submittedCodes.push(new FormData(form).getAll('otp'));
  });
  await textbox().fill('042911');
  expect(submittedCodes).toHaveLength(0);

  await userEvent.keyboard('{Enter}');

  expect(submittedCodes).toEqual([['042911']]);
});

it('S8: resets to the declared value without emitting user-edit events', async () => {
  const form = formFixture();
  const element = await mount('value="042911"', form);
  await textbox().fill('123456');
  const events = codeEvents(element);

  form.reset();

  await expect.element(textbox()).toHaveValue('042911');
  expect(element.value).toBe('042911');
  expect(events).toEqual([]);
});

it('S9: disables the native field and excludes its code through a disabled fieldset', async () => {
  const form = formFixture();
  const fieldset = document.createElement('fieldset');
  form.append(fieldset);
  await mount('value="042911" name="otp"', fieldset);
  expect(new FormData(form).getAll('otp')).toEqual(['042911']);

  fieldset.disabled = true;

  await expect.element(textbox()).toBeDisabled();
  expect(new FormData(form).getAll('otp')).toEqual([]);
});

it('S10: paints every box with the inherited custom semantic surface', async () => {
  document.documentElement.style.setProperty('--ki-surface-s0', 'rgb(210, 233, 245)');
  const element = await mount('length="4"');
  await expect
    .poll(() => cellsOf(element).map((cell) => getComputedStyle(cell).backgroundColor))
    .toEqual([
      'rgb(210, 233, 245)',
      'rgb(210, 233, 245)',
      'rgb(210, 233, 245)',
      'rgb(210, 233, 245)',
    ]);
});

it('S11: keeps the focused caret visible and still under reduced motion', async () => {
  await browserCommands.emulateReducedMotion('no-preference');
  try {
    const element = await mount();
    await textbox().click();
    const caret = () => getComputedStyle(cellAt(element, 0), '::after');
    await expect.poll(() => caret().animationName).not.toBe('none');

    await browserCommands.emulateReducedMotion('reduce');

    await expect.poll(() => caret().animationName).toBe('none');
    expect(caret().content).not.toBe('none');
    expect(caret().opacity).toBe('1');
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});

it('S12: shows the boundaries and a distinct focus outline in forced colours', async (test) => {
  if ((await browserCommands.emulateForcedColors('active')) === false) {
    test.skip('This browser cannot emulate forced colours');
  }
  try {
    const element = await mount();
    await textbox().click();

    await expect
      .poll(() => {
        const active = cellAt(element, 0);
        const resting = cellAt(element, 1);
        return getComputedStyle(active).outlineStyle !== getComputedStyle(resting).outlineStyle;
      })
      .toBe(true);
    const resting = cellAt(element, 1);
    expect(getComputedStyle(resting).borderBlockStartColor).not.toBe(
      getComputedStyle(resting).backgroundColor,
    );
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it('S13: aligns the field to the RTL start and preserves the order of the code', async () => {
  fixture.dir = 'rtl';
  fixture.style.inlineSize = '360px';
  const element = await mount();
  await textbox().fill('042911');

  const boxes = cellsOf(element);
  await expect.poll(() => boxes.map((cell) => cell.textContent).join('')).toBe('042911');
  expect(cellAt(element, 0).getBoundingClientRect().left).toBeLessThan(
    cellAt(element, 5).getBoundingClientRect().left,
  );
  expect(
    Math.abs(
      cellAt(element, 5).getBoundingClientRect().right - fixture.getBoundingClientRect().right,
    ),
  ).toBeLessThan(0.5);
});

it('keeps an eight-character field inside a narrow column', async () => {
  fixture.style.inlineSize = '240px';
  const element = await mount('length="8" value="12345678"');

  const input = inputOf(element);
  expect(cellsOf(element)).toHaveLength(8);
  expect(input.getBoundingClientRect().right).toBeLessThanOrEqual(
    fixture.getBoundingClientRect().right,
  );
  expect(input.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
});

it('filters programmatic values without dispatching edit events', async () => {
  const element = await mount();
  const events = codeEvents(element);

  element.value = '0x4-29 11';

  await expect.element(textbox()).toHaveValue('042911');
  expect(element.value).toBe('042911');
  expect(events).toEqual([]);
});
