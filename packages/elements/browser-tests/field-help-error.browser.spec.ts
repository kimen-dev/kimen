// @spec:042-field-help-error
// Help and error text on every form control: what is shown with the control,
// and what the engine's own accessibility tree says about it. Asserted on the
// BUILT custom elements (Art. III). The description and the invalid state are
// read from Chromium's computed accessibility tree over CDP, the only place
// that shows what a screen reader receives across shadow roots, so those
// assertions run on Chromium only; the shown text, read from the documented
// `help` and `error` parts, and everything else run on every engine.
import pageContractCss from '@kimen/tokens/css/base?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';

import { defineAllComponents } from './all-components';
import { expectAccessible } from './axe';

interface AxNode {
  readonly role: string;
  readonly name: string;
  readonly description: string;
  readonly invalid: unknown;
  readonly live: unknown;
  /** The text a live region holds; '' for other nodes. */
  readonly text: string;
  readonly focused: boolean;
}

const browserCommands = commands as unknown as {
  accessibilityTree: () => Promise<AxNode[] | null>;
  emulateForcedColors: (forcedColors: 'active' | 'none' | null) => Promise<void>;
};

type Field = HTMLElement & {
  readonly validity: ValidityState;
  readonly validationMessage: string;
  disabled: boolean;
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

// The role each control exposes, so its node can be found in the tree.
const roleOf: Record<Control, string> = {
  'ki-input': 'textbox',
  'ki-textarea': 'textbox',
  'ki-select': 'combobox',
  'ki-checkbox': 'checkbox',
  'ki-switch': 'switch',
  'ki-radio-group': 'radiogroup',
};

// Each control labeled "Answer" and named "answer"; `attrs` carries the help
// and error text and the state a scenario needs, `answered` an otherwise
// valid answer.
function markup(control: Control, attrs: string, answered = false): string {
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
// the invalid control loses focus, and removing the focused control does not
// blur it: the bubble then swallows the next test's click. Blur first.
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

async function mountField(control: Control, attrs: string, answered = false): Promise<Field> {
  const main = await mount(markup(control, attrs, answered));
  return found(main.querySelector<Field>(control), control);
}

async function mountForm(
  html: string,
  theme = '',
): Promise<{ form: HTMLFormElement; submits: () => number; send: () => Promise<void> }> {
  const main = await mount(
    `<form>${html}<button type="submit">Send</button><button type="reset">Reset</button></form>`,
    theme,
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
function shown(field: HTMLElement, name: 'error' | 'help'): string | null {
  const line = part(field, name);
  if (!line?.checkVisibility()) {
    return null;
  }
  const text = line.textContent.trim();
  return text === '' ? null : text;
}

// The engine's accessibility tree is read over CDP, which only Chromium
// exposes: `accessibilityTree` answers null on Firefox and WebKit. So the
// assertions on it run on Chromium, the engine the PR gate runs, where a null
// answer fails the test; everything a page can observe (the shown lines,
// focus, validity, styles, axe) runs on every engine of the release matrix.
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

const description = async (role: string, name: string): Promise<string | undefined> =>
  (await axNode(role, name))?.description;

const invalid = async (role: string, name: string): Promise<unknown> =>
  (await axNode(role, name))?.invalid;

const WITNESS_COLOUR = 'rgb(1, 2, 3)';
const FORCED_PALETTE_DEADLINE_MS = 2000;

/** Is the page really under a forced palette, or is it only announced? */
async function forcedPaletteApplies(): Promise<boolean> {
  const witness = document.createElement('span');
  witness.style.backgroundColor = WITNESS_COLOUR;
  document.body.append(witness);
  const applied = (): boolean =>
    matchMedia('(forced-colors: active)').matches &&
    getComputedStyle(witness).backgroundColor !== WITNESS_COLOUR;
  const deadline = Date.now() + FORCED_PALETTE_DEADLINE_MS;
  while (!applied() && Date.now() < deadline) {
    await nextFrame();
  }
  const result = applied();
  witness.remove();
  return result;
}

beforeAll(() => {
  defineAllComponents();
});

const allControls: readonly Control[] = [
  'ki-input',
  'ki-textarea',
  'ki-select',
  'ki-checkbox',
  'ki-switch',
  'ki-radio-group',
];
const validatingControls: readonly Control[] = allControls.filter(
  (control) => control !== 'ki-switch',
);

describe('help text guides the answer', () => {
  for (const control of allControls) {
    it(`S1 a ${control}'s help text is shown with it and describes it`, async () => {
      const field = await mountField(control, 'help-text="You can change this later"');

      field.focus();

      await expect.poll(() => shown(field, 'help')).toBe('You can change this later');
      if (IS_CHROMIUM) {
        await expect
          .poll(() => description(roleOf[control], 'Answer'))
          .toBe('You can change this later');
      }
    });
  }

  it('S2 removing the help text removes it from the description', async () => {
    const main = await mount(
      '<ki-input label="Email" name="email" help-text="We never share your email"></ki-input>',
    );
    const field = found(main.querySelector<Field>('ki-input'), 'the Email field');
    await expect.poll(() => shown(field, 'help')).toBe('We never share your email');
    if (IS_CHROMIUM) {
      await expect.poll(() => description('textbox', 'Email')).toBe('We never share your email');
    }

    field.removeAttribute('help-text');

    await expect.poll(() => shown(field, 'help')).toBeNull();
    if (IS_CHROMIUM) {
      await expect.poll(() => description('textbox', 'Email')).toBe('');
    }
  });

  it('S1 whitespace-only help text shows nothing and describes nothing', async () => {
    const field = await mountField('ki-input', 'help-text="   "');

    await nextFrame();

    expect(shown(field, 'help')).toBeNull();
    if (IS_CHROMIUM) {
      await expect.poll(() => description('textbox', 'Answer')).toBe('');
    }
  });
});

describe('the error message takes the help text place once the answer fails', () => {
  async function typeInvalidEmail(help = ''): Promise<Field> {
    const main = await mount(
      `<ki-input label="Email" name="email" type="email" ${help} error-text="Enter an email address like name@example.com"></ki-input><button type="button">Next</button>`,
    );
    const field = found(main.querySelector<Field>('ki-input'), 'the Email field');
    field.focus();
    await userEvent.keyboard('ana@');
    return field;
  }

  it('S3 tabbing away from an invalid answer shows the error message', async () => {
    const field = await typeInvalidEmail();

    await userEvent.tab();

    await expect
      .poll(() => shown(field, 'error'))
      .toBe('Enter an email address like name@example.com');
    if (IS_CHROMIUM) {
      await expect.poll(() => invalid('textbox', 'Email')).toBe('true');
    }
  });

  for (const control of validatingControls) {
    it(`S4 a blocked submission shows the error of an unanswered required ${control}`, async () => {
      const { submits, send } = await mountForm(
        markup(control, 'required error-text="Answer this question"'),
      );
      const field = found(document.querySelector<Field>(control), control);

      await send();

      expect(submits()).toBe(0);
      await expect.poll(() => shown(field, 'error')).toBe('Answer this question');
    });
  }

  for (const control of ['ki-input', 'ki-checkbox'] as const) {
    it(`S5 a required ${control} the user has not answered yet shows no error`, async () => {
      // Text fields as bookends: every engine puts them in the tab order,
      // while WebKit on macOS leaves buttons and checkboxes out by default.
      const main = await mount(
        `<input aria-label="Before">${markup(control, 'required error-text="Answer this question"')}<input aria-label="After">`,
      );
      const field = found(main.querySelector<Field>(control), control);
      const after = found(main.querySelector('input[aria-label="After"]'), 'the After field');
      found(main.querySelector<HTMLInputElement>('input'), 'the Before field').focus();

      for (let press = 0; press < 3 && document.activeElement !== after; press += 1) {
        await userEvent.tab();
      }

      expect(document.activeElement).toBe(after);
      expect(shown(field, 'error')).toBeNull();
      if (IS_CHROMIUM) {
        await expect.poll(() => invalid(roleOf[control], 'Answer')).toBe('false');
      }
    });
  }

  it('S6 correcting the answer brings the help text back at once', async () => {
    const field = await typeInvalidEmail('help-text="We never share your email"');
    await userEvent.tab();
    await expect
      .poll(() => shown(field, 'error'))
      .toBe('Enter an email address like name@example.com');
    expect(shown(field, 'help')).toBeNull();
    field.focus();

    await userEvent.keyboard('{End}example.com');

    await expect.poll(() => shown(field, 'help')).toBe('We never share your email');
    expect(shown(field, 'error')).toBeNull();
    if (IS_CHROMIUM) {
      await expect.poll(() => invalid('textbox', 'Email')).toBe('false');
      await expect.poll(() => description('textbox', 'Email')).toBe('We never share your email');
    }
  });

  it('S7 without error text a control shows its own validation message', async () => {
    const { send } = await mountForm('<ki-input label="Email" name="email" required></ki-input>');
    const field = found(document.querySelector<Field>('ki-input'), 'the Email field');

    await send();

    expect(field.validationMessage).not.toBe('');
    await expect.poll(() => shown(field, 'error')).toBe(field.validationMessage);
  });

  it('S8 the error text becomes the control validation message', async () => {
    const field = await mountField('ki-input', 'required error-text="Enter your email"');

    const valid = field.checkValidity();

    expect(valid).toBe(false);
    expect(field.validationMessage).toBe('Enter your email');
    expect(field.validity.valueMissing).toBe(true);
  });

  for (const control of allControls) {
    it(`S9 an error the application sets on a ${control} is shown when the form is submitted`, async () => {
      const { submits, send } = await mountForm(markup(control, '', true));
      const field = found(document.querySelector<Field>(control), control);
      field.setCustomValidity('Choose another answer');

      await send();

      expect(submits()).toBe(0);
      await expect.poll(() => shown(field, 'error')).toBe('Choose another answer');
      if (IS_CHROMIUM) {
        await expect.poll(() => invalid(roleOf[control], 'Answer')).toBe('true');
      }
    });
  }

  it('S10 an error the application sets outranks the error text', async () => {
    await mountForm(
      '<ki-input label="Email" name="email" value="ana@example.com" error-text="Enter your email"></ki-input>',
    );
    const field = found(document.querySelector<Field>('ki-input'), 'the Email field');
    field.setCustomValidity('Already registered');

    field.reportValidity();

    await expect.poll(() => shown(field, 'error')).toBe('Already registered');
    expect(field.validationMessage).toBe('Already registered');
  });

  it('S10 an application error set while the error shows replaces the shown message', async () => {
    const { send } = await mountForm(
      '<ki-input label="Email" name="email" value="ana@example.com"></ki-input>',
    );
    const field = found(document.querySelector<Field>('ki-input'), 'the Email field');
    field.setCustomValidity('Already registered');
    await send();
    await expect.poll(() => shown(field, 'error')).toBe('Already registered');

    field.setCustomValidity('Try again later');

    await expect.poll(() => shown(field, 'error')).toBe('Try again later');
  });

  it('S11 disabling a control clears its error', async () => {
    const { send } = await mountForm(
      '<ki-input label="Email" name="email" required error-text="Enter your email"></ki-input>',
    );
    const field = found(document.querySelector<Field>('ki-input'), 'the Email field');
    await send();
    await expect.poll(() => shown(field, 'error')).toBe('Enter your email');

    field.disabled = true;

    await expect.poll(() => shown(field, 'error')).toBeNull();
    if (IS_CHROMIUM) {
      await expect.poll(() => invalid('textbox', 'Email')).toBe('false');
    }
  });
});

describe('assistive technology learns of the error', () => {
  it('S12 the error is announced politely when it appears', async () => {
    const main = await mount(
      '<ki-input label="Email" name="email" type="email" error-text="Enter an email address like name@example.com"></ki-input><button type="button">Next</button>',
    );
    const field = found(main.querySelector<Field>('ki-input'), 'the Email field');
    field.focus();
    await userEvent.keyboard('ana@');
    // The polite region is in the tree, empty, BEFORE its text arrives: a
    // region created together with its text is not announced.
    const politeText = async (): Promise<string[]> =>
      (await tree()).filter((node) => node.live === 'polite').map((node) => node.text);
    if (IS_CHROMIUM) {
      expect(await politeText()).toEqual(['']);
    }

    await userEvent.tab();

    await expect
      .poll(() => shown(field, 'error'))
      .toBe('Enter an email address like name@example.com');
    if (IS_CHROMIUM) {
      await expect.poll(politeText).toEqual(['Enter an email address like name@example.com']);
    }
  });

  it('S13 a blocked submission lands on the first invalid control with its error as description', async () => {
    const { send } = await mountForm(
      '<ki-input label="Email" name="email" required error-text="Enter your email"></ki-input><ki-input label="Name" name="name" required></ki-input>',
    );
    const field = found(document.querySelector<Field>('ki-input'), 'the Email field');

    await send();

    expect(document.activeElement).toBe(field);
    await expect.poll(() => shown(field, 'error')).toBe('Enter your email');
    if (IS_CHROMIUM) {
      await expect
        .poll(() => axNode('textbox', 'Email'))
        .toMatchObject({ focused: true, invalid: 'true', description: 'Enter your email' });
    }
  });
});

describe('resetting the form clears the error', () => {
  it('S14 resetting the form clears the error and restores the help text', async () => {
    const { form, send } = await mountForm(
      '<ki-input label="Email" name="email" required help-text="We never share your email" error-text="Enter your email"></ki-input>',
    );
    const field = found(document.querySelector<Field>('ki-input'), 'the Email field');
    await send();
    await expect.poll(() => shown(field, 'error')).toBe('Enter your email');

    await userEvent.click(found(form.querySelector('button[type="reset"]'), 'the reset button'));

    await expect.poll(() => shown(field, 'help')).toBe('We never share your email');
    expect(shown(field, 'error')).toBeNull();
  });
});

describe('help and error restyle through semantic tokens alone', () => {
  afterEach(async () => {
    await browserCommands.emulateForcedColors(null);
  });

  const reassignedInk = 'rgb(122, 31, 162)';

  it('S15 reassigning the semantic danger ink restyles the error message', async () => {
    const { send } = await mountForm(
      '<ki-input label="Email" name="email" required error-text="Enter your email"></ki-input>',
      ':root { --ki-text-danger-high-em: #7a1fa2; }',
    );
    const field = found(document.querySelector<Field>('ki-input'), 'the Email field');

    await send();

    await expect.poll(() => shown(field, 'error')).toBe('Enter your email');
    expect(getComputedStyle(found(part(field, 'error'), 'the error line')).color).toBe(
      reassignedInk,
    );
  });

  it('S16 reassigning the semantic medium-emphasis ink restyles the help text', async () => {
    const main = await mount(
      '<ki-input label="Email" name="email" help-text="We never share your email"></ki-input>',
      ':root { --ki-text-med-em: #7a1fa2; }',
    );
    const field = found(main.querySelector<Field>('ki-input'), 'the Email field');
    field.focus();

    await userEvent.keyboard('ana');

    await expect.poll(() => shown(field, 'help')).toBe('We never share your email');
    expect(getComputedStyle(found(part(field, 'help'), 'the help line')).color).toBe(reassignedInk);
  });

  it('S17 under forced colors the error is marked by a symbol, not by color alone', async (context) => {
    await browserCommands.emulateForcedColors('active');
    const { send } = await mountForm(
      '<ki-input label="Email" name="email" required error-text="Enter your email"></ki-input>',
    );
    const field = found(document.querySelector<Field>('ki-input'), 'the Email field');
    // An engine may flip the media feature without repainting anything
    // (forced-colors.browser.spec.ts): measuring there would test the
    // author's colours. Chromium, the PR gate's engine, must repaint.
    if (!(await forcedPaletteApplies())) {
      expect(IS_CHROMIUM, 'Chromium stopped applying the forced palette under emulation').toBe(
        false,
      );
      context.skip(`${navigator.userAgent} does not apply a forced palette under emulation`);
    }
    const witness = document.createElement('span');
    witness.style.color = 'CanvasText';
    document.body.append(witness);
    const forcedText = getComputedStyle(witness).color;

    await send();

    await expect.poll(() => shown(field, 'error')).toBe('Enter your email');
    const line = found(part(field, 'error'), 'the error line');
    const symbol = found(line.firstElementChild, 'the error symbol');
    expect(symbol.localName).toBe('svg');
    expect(symbol.getAttribute('aria-hidden')).toBe('true');
    const box = symbol.getBoundingClientRect();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
    const glyph = found(symbol.querySelector('path'), 'the error symbol path');
    expect(getComputedStyle(glyph).fill).toBe(forcedText);
    expect(getComputedStyle(line).color).toBe(forcedText);
  });

  it('S17 help text carries no error symbol', async () => {
    const field = await mountField('ki-input', 'help-text="You can change this later"');

    await expect.poll(() => shown(field, 'help')).toBe('You can change this later');
    expect(found(part(field, 'help'), 'the help line').querySelector('svg')).toBeNull();
  });
});

// SC-002: every control with its help or error line showing passes axe, in
// both shipped themes and both schemes, on a consumer page (the page contract
// paints the surface the lines are read against).
describe('help and error lines pass axe in every theme and scheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-ki-theme');
    document.documentElement.removeAttribute('data-ki-color-scheme');
  });

  for (const theme of ['onmars', 'material3'] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      it(`SC-002 help and error lines of every control under ${theme} ${scheme}`, async () => {
        if (theme === 'material3') {
          document.documentElement.setAttribute('data-ki-theme', theme);
        }
        document.documentElement.setAttribute('data-ki-color-scheme', scheme);
        const { form, send } = await mountForm(
          [
            ...validatingControls.map((control) =>
              markup(control, 'required error-text="Answer this question"'),
            ),
            markup('ki-switch', 'help-text="You can change this later"'),
            markup('ki-input', 'help-text="You can change this later"', true),
          ].join(''),
          `${material3Css}\n${pageContractCss}`,
        );

        await send();

        const fields = [...form.querySelectorAll<Field>(validatingControls.join(','))];
        await expect
          .poll(() => fields.filter((field) => shown(field, 'error') === 'Answer this question'))
          .toHaveLength(validatingControls.length);
        await expectAccessible(form);
      });
    }
  }
});
