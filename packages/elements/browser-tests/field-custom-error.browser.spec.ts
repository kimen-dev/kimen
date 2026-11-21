// @spec:156-field-custom-error
// The application's own error, written as the `custom-error` text prop on
// every form control that shows a message: shown next to the field at once,
// announced as invalid, withdrawn by the person's next change, and removed by
// the application that set it. Asserted on the BUILT custom elements
// (Art. III). The description, the invalid state and the live region's text
// are read from Chromium's accessibility tree over CDP, so those assertions
// run on Chromium only; the shown text, validity, focus, form submission and
// styles run on every engine.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { defineAllComponents } from './all-components';

interface AxNode {
  readonly role: string;
  readonly name: string;
  readonly description: string;
  readonly invalid: unknown;
  readonly live: unknown;
  /** The text a live region holds; '' for other nodes. */
  readonly text: string;
}

const browserCommands = commands as unknown as {
  accessibilityTree: () => Promise<AxNode[] | null>;
};

type Field = HTMLElement & {
  customError?: string;
  value?: unknown;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity?: (message: string) => void;
};

type Control =
  | 'ki-checkbox'
  | 'ki-checkbox-group'
  | 'ki-code-input'
  | 'ki-combobox'
  | 'ki-date-picker'
  | 'ki-input'
  | 'ki-number-input'
  | 'ki-radio-group'
  | 'ki-select'
  | 'ki-switch'
  | 'ki-textarea'
  | 'ki-time-input';

const controls: readonly Control[] = [
  'ki-input',
  'ki-textarea',
  'ki-select',
  'ki-checkbox',
  'ki-checkbox-group',
  'ki-radio-group',
  'ki-switch',
  'ki-number-input',
  'ki-time-input',
  'ki-code-input',
  'ki-date-picker',
  'ki-combobox',
];

// The three controls that gain checkValidity() and reportValidity().
const newlyValidating = ['ki-number-input', 'ki-date-picker', 'ki-combobox'] as const;

// The three error-line markups: the shared one of spec 042, and the own
// markup of the date picker and the combobox.
const errorLineMarkups = ['ki-input', 'ki-date-picker', 'ki-combobox'] as const;

// The role each control exposes, so its node can be found in the tree.
const roleOf: Record<Control, string> = {
  'ki-input': 'textbox',
  'ki-textarea': 'textbox',
  'ki-select': 'combobox',
  'ki-checkbox': 'checkbox',
  'ki-checkbox-group': 'group',
  'ki-radio-group': 'radiogroup',
  'ki-switch': 'switch',
  'ki-number-input': 'spinbutton',
  'ki-time-input': 'combobox',
  'ki-code-input': 'textbox',
  'ki-date-picker': 'textbox',
  'ki-combobox': 'combobox',
};

// Each control labeled "Answer" and named "answer"; `attrs` carries the state
// a scenario needs, `answered` an otherwise valid answer.
function markup(control: Control, attrs: string, answered = true): string {
  switch (control) {
    case 'ki-input':
      return `<ki-input label="Answer" name="answer" ${answered ? 'value="ok"' : ''} ${attrs}></ki-input>`;
    case 'ki-textarea':
      return `<ki-textarea label="Answer" name="answer" ${answered ? 'value="ok"' : ''} ${attrs}></ki-textarea>`;
    case 'ki-select':
      return `<ki-select label="Answer" name="answer" ${answered ? 'value="a"' : ''} ${attrs}><ki-option value="a">Alpha</ki-option><ki-option value="b">Beta</ki-option></ki-select>`;
    case 'ki-checkbox':
      return `<ki-checkbox name="answer" ${answered ? 'checked' : ''} ${attrs}>Answer</ki-checkbox>`;
    case 'ki-checkbox-group':
      return `<ki-checkbox-group label="Answer" name="answer" ${attrs}><ki-checkbox value="a" ${answered ? 'checked' : ''}>Alpha</ki-checkbox><ki-checkbox value="b">Beta</ki-checkbox></ki-checkbox-group>`;
    case 'ki-radio-group':
      return `<ki-radio-group label="Answer" name="answer" ${answered ? 'value="a"' : ''} ${attrs}><ki-radio value="a">Alpha</ki-radio><ki-radio value="b">Beta</ki-radio></ki-radio-group>`;
    case 'ki-switch':
      return `<ki-switch name="answer" ${answered ? 'checked' : ''} ${attrs}>Answer</ki-switch>`;
    case 'ki-number-input':
      return `<ki-number-input label="Answer" name="answer" ${answered ? 'value="3"' : ''} ${attrs}></ki-number-input>`;
    case 'ki-time-input':
      return `<ki-time-input label="Answer" name="answer" ${answered ? 'value="09:30"' : ''} ${attrs}></ki-time-input>`;
    case 'ki-code-input':
      return `<ki-code-input label="Answer" name="answer" length="4" ${answered ? 'value="1234"' : ''} ${attrs}></ki-code-input>`;
    case 'ki-date-picker':
      return `<ki-date-picker label="Answer" name="answer" ${answered ? 'value="2026-12-24"' : ''} ${attrs}></ki-date-picker>`;
    case 'ki-combobox':
      return `<ki-combobox label="Answer" name="answer" ${answered ? 'value="a"' : ''} ${attrs}><ki-option value="a">Alpha</ki-option><ki-option value="b">Beta</ki-option></ki-combobox>`;
  }
}

// The person changes the answer to another valid one, the way each control
// takes an answer: a keystroke, a pick or a toggle.
async function changeAnswer(control: Control, field: Field): Promise<void> {
  switch (control) {
    case 'ki-input':
    case 'ki-textarea':
      field.focus();
      await userEvent.keyboard('{End}k');
      return;
    case 'ki-number-input':
      field.focus();
      await userEvent.keyboard('{ArrowUp}');
      return;
    case 'ki-time-input':
      await page.getByRole('combobox', { name: 'Answer' }).fill('10:30');
      return;
    case 'ki-code-input':
      await page.getByRole('textbox', { name: 'Answer' }).fill('5678');
      return;
    case 'ki-date-picker':
      await page.getByRole('textbox', { name: 'Answer' }).fill('25/12/2026');
      return;
    case 'ki-select':
      await page.getByRole('combobox', { name: 'Answer' }).click();
      await page.getByRole('option', { name: 'Beta' }).click();
      return;
    case 'ki-combobox':
      await page.getByRole('combobox', { name: 'Answer' }).fill('Be');
      await page.getByRole('option', { name: 'Beta' }).click();
      return;
    case 'ki-checkbox':
      await page.getByRole('checkbox', { name: 'Answer' }).click();
      return;
    case 'ki-checkbox-group':
      await page.getByRole('checkbox', { name: 'Beta' }).click();
      return;
    case 'ki-radio-group':
      await page.getByRole('radio', { name: 'Beta' }).click();
      return;
    case 'ki-switch':
      await page.getByRole('switch', { name: 'Answer' }).click();
      return;
  }
}

// The fixtures below are fixed markup: a missing element is a broken
// fixture, reported as such rather than as a confusing type error later.
function found<T extends Element>(element: T | null | undefined, what: string): T {
  if (!element) {
    throw new Error(`fixture is missing ${what}`);
  }
  return element;
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

// A blocked submission leaves Firefox's validation bubble over the page until
// the invalid control loses focus: blur before the next fixture.
function releaseFocus(): void {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  if (active instanceof HTMLElement) {
    active.blur();
  }
}

async function mount(html: string, theme = ''): Promise<HTMLElement> {
  releaseFocus();
  document.body.replaceChildren();
  const style = document.createElement('style');
  style.textContent = `${tokensCss}\n${theme}`;
  const main = document.createElement('main');
  // The date picker reads typed dates in the page language.
  main.lang = 'en-GB';
  main.innerHTML = html;
  document.body.append(style, main);
  await Promise.all(
    [...main.querySelectorAll('*')]
      .map((element) => element.localName)
      .filter((tag) => tag.startsWith('ki-'))
      .map((tag) => customElements.whenDefined(tag)),
  );
  await nextFrame();
  await nextFrame();
  return main;
}

async function mountField(
  control: Control,
  attrs = '',
  answered = true,
  theme = '',
): Promise<Field> {
  const main = await mount(markup(control, attrs, answered), theme);
  return found(main.querySelector<Field>(control), control);
}

async function mountForm(
  html: string,
): Promise<{ form: HTMLFormElement; submits: () => number; send: () => Promise<void> }> {
  const main = await mount(
    `<form>${html}<button type="submit">Send</button><button type="reset">Reset</button></form>`,
  );
  const form = found(main.querySelector('form'), 'the form');
  let submitted = 0;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted += 1;
  });
  const sendButton = found(form.querySelector('button[type="submit"]'), 'the send button');
  let clicks = 0;
  sendButton.addEventListener('click', () => {
    clicks += 1;
  });
  return {
    form,
    submits: () => submitted,
    // A click that never reaches the button blocks nothing either: without
    // this check "the form is not submitted" would pass for a lost click.
    send: async () => {
      await userEvent.click(sendButton);
      expect(clicks, 'the click on Send reached the button').toBe(1);
    },
  };
}

function part(field: HTMLElement, name: 'error' | 'help'): HTMLElement | null {
  return field.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`) ?? null;
}

// The text a part shows with the control: null when the part is absent, not
// rendered, or empty.
function shown(field: HTMLElement, name: 'error' | 'help' = 'error'): string | null {
  const line = part(field, name);
  if (!line?.checkVisibility()) {
    return null;
  }
  const text = line.textContent.trim();
  return text === '' ? null : text;
}

// `Chrome/` and not a word-bounded match: headless Chromium reports
// `HeadlessChrome/` (pointer-capability.browser.spec.ts found that out).
const IS_CHROMIUM = navigator.userAgent.includes('Chrome/');

async function tree(): Promise<AxNode[]> {
  await nextFrame();
  await nextFrame();
  const nodes = await browserCommands.accessibilityTree();
  if (nodes === null) {
    throw new Error('Chromium stopped answering its accessibility tree over CDP');
  }
  return nodes;
}

async function axNode(role: string, name: string): Promise<AxNode | undefined> {
  return (await tree()).find((node) => node.role === role && node.name === name);
}

const politeTexts = async (): Promise<string[]> =>
  (await tree()).filter((node) => node.live === 'polite').map((node) => node.text);

const reassignedInk = 'rgb(122, 31, 162)';

beforeAll(() => {
  defineAllComponents();
});

describe('a custom error shows at once and makes the control invalid', () => {
  for (const control of controls) {
    it(`S1 a ${control} given a custom error shows it and is announced as invalid`, async () => {
      const field = await mountField(control);
      // The polite region exists, empty, BEFORE the text arrives: a region
      // created together with its text is not announced.
      const region = found(part(field, 'error'), 'the error line');
      expect(region.getAttribute('aria-live')).toBe('polite');
      expect(shown(field)).toBeNull();

      field.setAttribute('custom-error', 'Choose another answer');

      await expect.poll(() => shown(field)).toBe('Choose another answer');
      expect(part(field, 'error')).toBe(region);
      if (IS_CHROMIUM) {
        await expect
          .poll(() => axNode(roleOf[control], 'Answer'))
          .toMatchObject({ invalid: 'true', description: 'Choose another answer' });
        await expect.poll(politeTexts).toContain('Choose another answer');
      }
    });
  }

  it('S1 the custom-error property shows the error like the attribute', async () => {
    const field = await mountField('ki-input');

    field.customError = 'Choose another answer';

    await expect.poll(() => shown(field)).toBe('Choose another answer');
    expect(field.checkValidity()).toBe(false);
  });

  it('S1 a whitespace-only custom error is no custom error', async () => {
    const field = await mountField('ki-input', 'custom-error="   "');

    await nextFrame();

    expect(shown(field)).toBeNull();
    expect(field.checkValidity()).toBe(true);
  });

  for (const control of controls) {
    it(`S2 a custom error on a ${control} blocks the form's submission`, async () => {
      const { submits, send } = await mountForm(
        markup(control, 'custom-error="Choose another answer"'),
      );

      await send();

      expect(submits()).toBe(0);
    });
  }

  it('S2 a disabled control with a custom error shows nothing and does not block its form', async () => {
    const { submits, send } = await mountForm(
      markup('ki-input', 'disabled custom-error="Choose another answer"'),
    );
    const field = found(document.querySelector<Field>('ki-input'), 'the Answer field');

    await send();

    expect(submits()).toBe(1);
    expect(shown(field)).toBeNull();
  });

  it('S3 submitting with the keyboard lands on the field with the custom error', async () => {
    const { submits } = await mountForm(
      '<ki-input label="Name" name="name"></ki-input><ki-input label="Email" name="email" value="ana@example.com" custom-error="Already registered"></ki-input>',
    );
    const [name, email] = [...document.querySelectorAll<Field>('ki-input')];
    found(name, 'the Name field').focus();

    await userEvent.keyboard('{Enter}');

    expect(submits()).toBe(0);
    expect(document.activeElement).toBe(found(email, 'the Email field'));
  });

  it('S4 a custom error takes the place of the error text', async () => {
    const { send } = await mountForm(
      '<ki-number-input label="Seats" name="seats" required error-text="Enter the number of seats"></ki-number-input>',
    );
    const field = found(document.querySelector<Field>('ki-number-input'), 'the Seats field');
    await send();
    await expect.poll(() => shown(field)).toBe('Enter the number of seats');

    field.setAttribute('custom-error', 'Booking is closed');

    await expect.poll(() => shown(field)).toBe('Booking is closed');
    expect(shown(field)).not.toContain('Enter the number of seats');
  });

  it('S4 a custom error also takes the place of an error set with setCustomValidity', async () => {
    const field = await mountField('ki-input');
    field.setCustomValidity?.('Try again later');

    field.setAttribute('custom-error', 'Already registered');

    await expect.poll(() => shown(field)).toBe('Already registered');
  });

  it('S5 a custom error that arrives while the person is typing shows and keeps their text', async () => {
    const main = await mount('<ki-input label="Email" name="email"></ki-input>');
    const field = found(main.querySelector<Field>('ki-input'), 'the Email field');
    field.focus();
    await userEvent.keyboard('ana@exa');

    field.setAttribute('custom-error', 'Already registered');

    await expect.poll(() => shown(field)).toBe('Already registered');
    expect(field.value).toBe('ana@exa');
    await expect.element(page.getByRole('textbox', { name: 'Email' })).toHaveValue('ana@exa');
  });
});

describe("the person's change withdraws the custom error", () => {
  for (const control of controls) {
    it(`S6 the person's next change withdraws the custom error of a ${control}`, async () => {
      const field = await mountField(control, 'custom-error="Choose another answer"');
      await expect.poll(() => shown(field)).toBe('Choose another answer');

      await changeAnswer(control, field);

      await expect.poll(() => shown(field)).toBeNull();
      expect(field.checkValidity()).toBe(true);
      expect(field.customError).toBe('Choose another answer');
    });
  }

  it('S6 typing filter text in a ki-combobox does not withdraw its custom error', async () => {
    const field = await mountField('ki-combobox', 'custom-error="Choose another answer"');
    await expect.poll(() => shown(field)).toBe('Choose another answer');

    await page.getByRole('combobox', { name: 'Answer' }).fill('Be');

    await nextFrame();
    expect(shown(field)).toBe('Choose another answer');
    expect(field.checkValidity()).toBe(false);
  });

  it('S6 the error set with setCustomValidity returns once the custom error is withdrawn', async () => {
    const { send } = await mountForm(markup('ki-input', 'custom-error="Already registered"'));
    const field = found(document.querySelector<Field>('ki-input'), 'the Answer field');
    field.setCustomValidity?.('Try again later');
    field.focus();

    await userEvent.keyboard('{End}k');

    await send();
    await expect.poll(() => shown(field)).toBe('Try again later');
  });

  it('S7 resetting the form withdraws the custom error', async () => {
    const { form } = await mountForm(
      '<ki-input label="Email" name="email" value="ana@example.com" custom-error="Already registered"></ki-input>',
    );
    const field = found(document.querySelector<Field>('ki-input'), 'the Email field');
    await expect.poll(() => shown(field)).toBe('Already registered');

    await userEvent.click(found(form.querySelector('button[type="reset"]'), 'the reset button'));

    await expect.poll(() => shown(field)).toBeNull();
    expect(field.checkValidity()).toBe(true);
  });
});

describe('the application that sets the custom error removes it', () => {
  for (const control of controls) {
    it(`S8 removing the custom error returns a ${control} to valid`, async () => {
      const field = await mountField(control, 'custom-error="Choose another answer"');
      await expect.poll(() => shown(field)).toBe('Choose another answer');

      field.removeAttribute('custom-error');

      await expect.poll(() => shown(field)).toBeNull();
      expect(field.checkValidity()).toBe(true);
      if (IS_CHROMIUM) {
        await expect
          .poll(async () => (await axNode(roleOf[control], 'Answer'))?.invalid)
          .toBe('false');
      }
    });
  }

  it('S8 clearing the custom-error property returns the control to valid', async () => {
    const field = await mountField('ki-input', 'custom-error="Choose another answer"');
    await expect.poll(() => shown(field)).toBe('Choose another answer');

    field.customError = '';

    await expect.poll(() => shown(field)).toBeNull();
    expect(field.checkValidity()).toBe(true);
  });

  async function withdrawnEmail(): Promise<Field> {
    const main = await mount(
      '<ki-input label="Email" name="email" value="ana@example.com" custom-error="Already registered"></ki-input>',
    );
    const field = found(main.querySelector<Field>('ki-input'), 'the Email field');
    await expect.poll(() => shown(field)).toBe('Already registered');
    field.focus();
    await userEvent.keyboard('{End}x');
    await expect.poll(() => shown(field)).toBeNull();
    return field;
  }

  it('S9 setting the same custom error again without removing it first shows nothing', async () => {
    const field = await withdrawnEmail();

    field.setAttribute('custom-error', 'Already registered');

    await nextFrame();
    await nextFrame();
    expect(shown(field)).toBeNull();
    expect(field.checkValidity()).toBe(true);
  });

  it('S9 assigning the same text to the property again shows nothing either', async () => {
    const field = await withdrawnEmail();

    field.customError = 'Already registered';

    await nextFrame();
    await nextFrame();
    expect(shown(field)).toBeNull();
    expect(field.checkValidity()).toBe(true);
  });

  it('S10 removing the custom error and setting it again in one update shows it again', async () => {
    const field = await withdrawnEmail();

    field.removeAttribute('custom-error');
    field.setAttribute('custom-error', 'Already registered');

    await expect.poll(() => shown(field)).toBe('Already registered');
    expect(field.checkValidity()).toBe(false);
  });

  it('S10 a different custom error after a withdrawal shows at once', async () => {
    const field = await withdrawnEmail();

    field.setAttribute('custom-error', 'Try another address');

    await expect.poll(() => shown(field)).toBe('Try another address');
  });
});

describe('every control with a custom error answers validity questions', () => {
  for (const control of newlyValidating) {
    it(`S11 checking an invalid ${control} answers at once`, async () => {
      const field = await mountField(control, 'required', false);

      const valid = field.checkValidity();

      expect(valid).toBe(false);
    });

    it(`S12 reporting an invalid ${control} answers invalid and shows its message`, async () => {
      const field = await mountField(control, 'required error-text="Answer this question"', false);

      const valid = field.reportValidity();

      expect(valid).toBe(false);
      await expect.poll(() => shown(field)).toBe('Answer this question');
    });
  }
});

describe('the custom error restyles through semantic tokens alone', () => {
  for (const control of errorLineMarkups) {
    it(`S13 reassigning the semantic danger ink restyles the custom error of a ${control}`, async () => {
      const field = await mountField(
        control,
        '',
        true,
        ':root { --ki-text-danger-high-em: #7a1fa2; }',
      );

      field.setAttribute('custom-error', 'Choose another answer');

      await expect.poll(() => shown(field)).toBe('Choose another answer');
      expect(getComputedStyle(found(part(field, 'error'), 'the error line')).color).toBe(
        reassignedInk,
      );
    });
  }
});

// S14 end to end crosses a module boundary: the live surface belongs to
// @kimen/catalog, which may not import the elements. Its catalog half
// (packages/catalog/tests/field-custom-error.spec.ts) proves the live update
// is accepted and writes the `custom-error` attribute on the generated field;
// this half proves that attribute shows the error next to that field.
describe('an agent marks a generated field invalid', () => {
  it('S14 the attribute a live update writes shows the custom error next to the field', async () => {
    const main = await mount(
      '<ki-number-input label="Seats" name="seats" value="42"></ki-number-input>',
    );
    const field = found(main.querySelector<Field>('ki-number-input'), 'the Seats field');

    field.setAttribute('custom-error', 'Only 40 seats left');

    await expect.poll(() => shown(field)).toBe('Only 40 seats left');
    if (IS_CHROMIUM) {
      await expect.poll(async () => (await axNode('spinbutton', 'Seats'))?.invalid).toBe('true');
    }
  });
});
