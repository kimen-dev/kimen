// @spec:036-field-validation-api
// The field validation API every Kimen form control owes the application:
// the native names and shapes, answered synchronously. Asserted on the BUILT
// custom elements (Art. III) through the public members only, so code
// written for native fields can be pointed at Kimen fields unchanged.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { defineAllComponents } from './all-components';

type Field = HTMLElement & {
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
};

type Control =
  | 'ki-checkbox'
  | 'ki-input'
  | 'ki-radio-group'
  | 'ki-select'
  | 'ki-switch'
  | 'ki-textarea';

// Each control labeled "Answer" and named "answer". `attrs` carries the
// state a scenario needs (required, disabled) and `answered` an otherwise
// valid answer.
function markup(control: Control, attrs: string, answered: boolean): string {
  switch (control) {
    case 'ki-input':
      return `<ki-input label="Answer" name="answer" ${answered ? 'value="ok"' : ''} ${attrs}></ki-input>`;
    case 'ki-textarea':
      return `<ki-textarea label="Answer" name="answer" ${answered ? 'value="ok"' : ''} ${attrs}></ki-textarea>`;
    case 'ki-select':
      return `<ki-select label="Answer" name="answer" ${answered ? 'value="a"' : ''} ${attrs}><ki-option value="a">Alpha</ki-option><ki-option value="b">Beta</ki-option></ki-select>`;
    case 'ki-checkbox':
      return `<ki-checkbox name="answer" ${answered ? 'checked' : ''} ${attrs}>Answer</ki-checkbox>`;
    case 'ki-switch':
      return `<ki-switch name="answer" ${answered ? 'checked' : ''} ${attrs}>Answer</ki-switch>`;
    case 'ki-radio-group':
      return `<ki-radio-group label="Answer" name="answer" ${answered ? 'value="a"' : ''} ${attrs}><ki-radio value="a">Alpha</ki-radio><ki-radio value="b">Beta</ki-radio></ki-radio-group>`;
  }
}

// The fixtures below are fixed markup: a missing element is a broken
// fixture, reported as such rather than as a confusing type error later.
function found<T extends Element>(element: T | null, what: string): T {
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

async function mount(html: string): Promise<HTMLElement> {
  document.body.replaceChildren();
  const style = document.createElement('style');
  style.textContent = tokensCss;
  const main = document.createElement('main');
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

async function mountField(control: Control, attrs = '', answered = false): Promise<Field> {
  const main = await mount(markup(control, attrs, answered));
  return found(main.querySelector<Field>(control), control);
}

async function mountForm(
  control: Control,
  attrs = '',
  answered = false,
): Promise<{ field: Field; form: HTMLFormElement; submits: () => number }> {
  const main = await mount(
    `<form>${markup(control, attrs, answered)}<button type="submit">Send</button></form>`,
  );
  const form = found(main.querySelector('form'), 'the form');
  let submitted = 0;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted += 1;
  });
  return {
    field: found(form.querySelector<Field>(control), control),
    form,
    submits: () => submitted,
  };
}

function sendButton(form: HTMLFormElement): HTMLButtonElement {
  return found(form.querySelector<HTMLButtonElement>('button[type="submit"]'), 'the send button');
}

beforeAll(() => {
  defineAllComponents();
});

describe('field validation API', () => {
  const required: readonly Control[] = [
    'ki-input',
    'ki-textarea',
    'ki-select',
    'ki-checkbox',
    'ki-radio-group',
  ];
  for (const control of required) {
    it(`S1 a required ${control} left empty answers at once that a value is missing`, async () => {
      const field = await mountField(control, 'required');

      const answer = field.checkValidity();

      expect(answer).toBe(false);
      expect(field.validity.valueMissing).toBe(true);
      expect(field.validationMessage).not.toBe('');
    });
  }

  it('S2 a disabled ki-input takes no part in validation', async () => {
    const field = await mountField('ki-input', 'required disabled');

    expect(field.checkValidity()).toBe(true);
    expect(field.willValidate).toBe(false);
  });

  const all: readonly Control[] = [...required, 'ki-switch'];
  for (const control of all) {
    it(`S3 an error the application sets on a ${control} blocks submission with its message`, async () => {
      const { field, form, submits } = await mountForm(control, '', true);
      expect(field.checkValidity()).toBe(true);

      field.setCustomValidity('Choose another answer');
      await userEvent.click(sendButton(form));

      expect(submits()).toBe(0);
      expect(field.validity.customError).toBe(true);
      expect(field.validationMessage).toBe('Choose another answer');
    });
  }

  it('S4 clearing the application error makes the ki-input and its form valid again', async () => {
    const { field, form } = await mountForm('ki-input', 'value="ana@example.com"');
    field.setCustomValidity('Already registered');
    expect(field.checkValidity()).toBe(false);

    field.setCustomValidity('');

    expect(field.checkValidity()).toBe(true);
    expect(field.validity.valid).toBe(true);
    expect(form.checkValidity()).toBe(true);
  });

  const change: Record<
    'ki-input' | 'ki-radio-group' | 'ki-select',
    (field: Field) => Promise<void>
  > = {
    'ki-input': async (field) => {
      await userEvent.click(field);
      await userEvent.keyboard('k');
    },
    'ki-select': async (field) => {
      field.focus();
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');
    },
    'ki-radio-group': async (field) => {
      await userEvent.click(found(field.querySelector('ki-radio[value="b"]'), 'the Beta radio'));
    },
  };
  for (const [control, act] of Object.entries(change) as [
    keyof typeof change,
    (field: Field) => Promise<void>,
  ][]) {
    it(`S5 the application error on a ${control} outlasts the user's next change`, async () => {
      const field = await mountField(control, '', true);
      field.setCustomValidity('Choose another answer');

      await act(field);
      await nextFrame();

      expect(field.validationMessage).toBe('Choose another answer');
      expect(field.checkValidity()).toBe(false);
    });
  }

  it('S6 reporting an invalid ki-input answers invalid and moves focus to it', async () => {
    const main = await mount(
      '<form><ki-input label="Email" name="email" required></ki-input><button type="button">Later</button></form>',
    );
    const field = found(main.querySelector<Field>('ki-input'), 'ki-input');
    found(main.querySelector('button'), 'the later button').focus();

    const answer = field.reportValidity();

    expect(answer).toBe(false);
    expect(document.activeElement).toBe(field);
  });

  it('S7 a blocked submission exposes a ki-select with the application error as invalid', async () => {
    const main = await mount(
      '<form><ki-select label="Country" name="country" value="es"><ki-option value="es">Spain</ki-option><ki-option value="fr">France</ki-option></ki-select><button type="submit">Send</button></form>',
    );
    const form = found(main.querySelector('form'), 'the form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });
    found(main.querySelector<Field>('ki-select'), 'ki-select').setCustomValidity(
      'We do not ship there',
    );

    await userEvent.click(sendButton(form));

    await expect
      .element(page.getByRole('combobox', { name: 'Country' }))
      .toHaveAttribute('aria-invalid', 'true');
  });
});
