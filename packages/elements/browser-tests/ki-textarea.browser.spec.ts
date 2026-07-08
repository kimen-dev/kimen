import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:004-ki-textarea
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement } from '../dist/components/ki-textarea.js';

type KiTextareaElement = HTMLElement & {
  autocomplete?: string;
  disabled: boolean;
  label: string;
  name?: string;
  placeholder?: string;
  readonly: boolean;
  required: boolean;
  rows: number;
  value: string;
};

const STYLE_ID = 'ki-textarea-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-textarea-browser-material3-token-style';

beforeAll(() => {
  defineCustomElement();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function mount(
  attributes: Partial<
    Record<
      | 'autocomplete'
      | 'disabled'
      | 'label'
      | 'name'
      | 'placeholder'
      | 'readonly'
      | 'required'
      | 'rows'
      | 'value',
      string | number | boolean
    >
  > = {},
  parent: ParentNode = document.body,
): Promise<KiTextareaElement> {
  ensureTokens();
  const el = document.createElement('ki-textarea') as KiTextareaElement;
  for (const [name, value] of Object.entries({ label: 'Delivery notes', ...attributes })) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, String(value));
    }
  }
  parent.appendChild(el);
  await customElements.whenDefined('ki-textarea');
  const deadline = Date.now() + 1000;
  while (!el.shadowRoot?.querySelector('textarea') && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function innerTextarea(el: KiTextareaElement): HTMLTextAreaElement {
  const textarea = el.shadowRoot?.querySelector('textarea');
  expect(textarea).toBeInstanceOf(HTMLTextAreaElement);
  if (!textarea) {
    throw new Error('ki-textarea did not render an internal native textarea');
  }
  return textarea;
}

function requireElement(element: Element | null | undefined, message: string): Element {
  expect(element, message).toBeInstanceOf(Element);
  if (!element) {
    throw new Error(message);
  }
  return element;
}

async function waitForStyles(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function px(value: string): number {
  return Number.parseFloat(value.replace('px', ''));
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

describe('ki-textarea in a real browser', () => {
  it('S1 typing fills the textarea and the page observes composed input', async () => {
    cleanup();
    const el = await mount();
    const textarea = innerTextarea(el);
    const observed: string[] = [];
    el.addEventListener('input', () => observed.push(el.value));

    await userEvent.type(textarea, 'Leave the package at the back door');

    expect(el.value).toBe('Leave the package at the back door');
    expect(observed.at(-1)).toBe('Leave the package at the back door');
    expect(observed.length).toBeGreaterThan(1);
  });

  it('S2 preserves line breaks as part of the value', async () => {
    cleanup();
    const el = await mount();
    const textarea = innerTextarea(el);

    await userEvent.type(textarea, 'Ring twice{Enter}Leave at the back door');

    expect(el.value).toBe('Ring twice\nLeave at the back door');
  });

  it('S3 rows set height by line-height delta and disable native resize', async () => {
    cleanup();
    const twoRows = await mount({ rows: 2 });
    const sixRows = await mount({ rows: 6 });
    await waitForStyles();
    const two = innerTextarea(twoRows);
    const six = innerTextarea(sixRows);
    const lineHeight = px(getComputedStyle(six).lineHeight);

    expect(
      Math.round(six.getBoundingClientRect().height - two.getBoundingClientRect().height),
    ).toBe(Math.round(4 * lineHeight));
    expect(getComputedStyle(six).resize).toBe('none');
  });

  it('S4 readonly preserves its text under edit attempts', async () => {
    cleanup();
    const el = await mount({ label: 'Terms', readonly: true, value: 'No refunds after 30 days' });
    const textarea = innerTextarea(el);

    await userEvent.type(textarea, ' ignored').catch(() => undefined);

    expect(el.value).toBe('No refunds after 30 days');
  });

  it('S5 disabled accepts no input and never receives focus', async () => {
    cleanup();
    const el = await mount({ disabled: true });
    const textarea = innerTextarea(el);

    await userEvent.type(textarea, 'ignored').catch(() => undefined);
    await userEvent.keyboard('{Tab}');

    expect(el.value).toBe('');
    expect(el.shadowRoot?.activeElement).not.toBe(textarea);
  });

  it('S19 placeholder shows only while the field is empty', async () => {
    cleanup();
    const el = await mount({ placeholder: 'Add any special instructions' });
    const textarea = innerTextarea(el);

    expect(textarea.matches(':placeholder-shown')).toBe(true);
    await userEvent.type(textarea, 'Ring twice');

    expect(textarea.matches(':placeholder-shown')).toBe(false);
  });

  it('S20 committing an edit reports one composed change with the final value', async () => {
    cleanup();
    const el = await mount();
    const textarea = innerTextarea(el);
    const next = document.createElement('button');
    next.textContent = 'Next';
    document.body.append(next);
    const changes: string[] = [];
    el.addEventListener('change', () => changes.push(el.value));

    await userEvent.type(textarea, 'Leave at the back door');
    await userEvent.tab();

    expect(document.activeElement).toBe(next);
    expect(changes).toEqual(['Leave at the back door']);
  });

  it('S6 unknown rows values render at the default height', async () => {
    cleanup();
    const invalid = await mount({ rows: 'tall' });
    const baseline = await mount({ rows: 2 });

    expect(innerTextarea(invalid).getAttribute('rows')).toBe('2');
    expect(innerTextarea(invalid).getBoundingClientRect().height).toBe(
      innerTextarea(baseline).getBoundingClientRect().height,
    );
  });

  it('S7 Tab reaches the textarea with visible focus', async () => {
    cleanup();
    const el = await mount();
    const textarea = innerTextarea(el);
    const field = el.shadowRoot?.querySelector('[part="field"]');
    await waitForStyles();
    const before = getComputedStyle(requireElement(field, 'field part missing')).boxShadow;

    await userEvent.keyboard('{Tab}');
    await waitForStyles();

    expect(el.shadowRoot?.activeElement).toBe(textarea);
    expect(getComputedStyle(requireElement(field, 'field part missing')).boxShadow).not.toBe(
      before,
    );
  });

  it('S8 Enter inserts a newline and never submits the surrounding form', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ name: 'comments' }, form);
    const textarea = innerTextarea(el);
    let submitted = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted = true;
    });

    textarea.focus();
    await userEvent.keyboard('Ring twice{Enter}Leave at the back door');

    expect(el.value).toBe('Ring twice\nLeave at the back door');
    expect(submitted).toBe(false);
  });

  it('S21 Tab moves focus onward without inserting a character', async () => {
    cleanup();
    const el = await mount({ value: 'Ring twice' });
    const textarea = innerTextarea(el);
    const next = document.createElement('button');
    next.textContent = 'Next';
    document.body.append(next);

    textarea.focus();
    await userEvent.tab();

    expect(document.activeElement).toBe(next);
    expect(el.value).toBe('Ring twice');
  });

  it('S9 exposes a named multiline text field', async () => {
    cleanup();
    await mount({ label: 'Delivery notes' });

    await expect.element(page.getByRole('textbox', { name: 'Delivery notes' })).toBeInTheDocument();
  });

  it('S10 exposes required state', async () => {
    cleanup();
    const el = await mount({ required: true });

    expect(innerTextarea(el)).toHaveProperty('required', true);
  });

  it('S11 exposes disabled state as unavailable', async () => {
    cleanup();
    const el = await mount({ disabled: true });

    expect(innerTextarea(el)).toHaveProperty('disabled', true);
  });

  it('S22 exposes readonly state as read-only', async () => {
    cleanup();
    const el = await mount({ label: 'Terms', readonly: true });

    expect(innerTextarea(el)).toHaveProperty('readOnly', true);
  });

  it('S25 forwards autocomplete entry purpose to the internal control', async () => {
    cleanup();
    const el = await mount({ label: 'Shipping address', autocomplete: 'street-address' });

    expect(innerTextarea(el).getAttribute('autocomplete')).toBe('street-address');
  });

  it('S9 S10 S11 S22 S25 has zero axe violations across the state matrix', async () => {
    cleanup();
    const main = document.createElement('main');
    document.body.append(main);
    await mount({}, main);
    await mount({ required: true }, main);
    await mount({ disabled: true }, main);
    await mount({ readonly: true, value: 'No refunds after 30 days' }, main);
    await mount({ required: true, value: '' }, main);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S12 submits its text with the form and preserves multiline FormData', async () => {
    cleanup();
    const form = document.createElement('form');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Submit';
    form.append(submit);
    document.body.append(form);
    const el = await mount({ name: 'comments', value: 'Great service' }, form);
    let submittedData: FormData | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submittedData = new FormData(form);
    });

    await userEvent.click(submit);
    expect(submittedData?.get('comments')).toBe('Great service');

    el.value = 'Great service\nCall again';
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await userEvent.click(submit);

    expect(submittedData?.get('comments')).toBe('Great service\nCall again');
  });

  it('S13 resetting the form restores the initial text', async () => {
    cleanup();
    const form = document.createElement('form');
    const reset = document.createElement('button');
    reset.type = 'reset';
    reset.textContent = 'Reset';
    form.append(reset);
    document.body.append(form);
    const el = await mount({ name: 'comments', value: 'Call on arrival' }, form);
    const textarea = innerTextarea(el);

    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Leave in lobby');
    await userEvent.click(reset);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.value).toBe('Call on arrival');
    expect(textarea.value).toBe('Call on arrival');
  });

  it('S14 empty required blocks submission and reports a missing value after the attempt', async () => {
    cleanup();
    const form = document.createElement('form');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Submit';
    form.append(submit);
    document.body.append(form);
    const el = await mount({ name: 'comments', required: true }, form);
    const textarea = innerTextarea(el);
    const field = el.shadowRoot?.querySelector('[part="field"]');
    await waitForStyles();
    const initialBorder = getComputedStyle(
      requireElement(field, 'field part missing'),
    ).borderBlockEndColor;
    let submitted = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted = true;
    });

    await userEvent.click(submit);
    await waitForStyles();

    expect(submitted).toBe(false);
    expect(textarea.validity.valueMissing).toBe(true);
    expect(
      getComputedStyle(requireElement(field, 'field part missing')).borderBlockEndColor,
    ).not.toBe(initialBorder);
  });

  it('S15 disabled fieldset makes the textarea inert', async () => {
    cleanup();
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    document.body.append(fieldset);
    const el = await mount({ value: 'Keep this' }, fieldset);
    const textarea = innerTextarea(el);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    await userEvent.type(textarea, ' ignored').catch(() => undefined);

    expect(textarea.disabled).toBe(true);
    expect(el.value).toBe('Keep this');
  });

  it('S16 disabled textarea is left out of submitted data', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    await mount({ name: 'comments', disabled: true, value: 'Call first' }, form);

    expect(new FormData(form).has('comments')).toBe(false);
  });

  it('S23 readonly textarea submits and empty readonly required does not block', async () => {
    cleanup();
    const form = document.createElement('form');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Submit';
    form.append(submit);
    document.body.append(form);
    await mount(
      { label: 'Terms', name: 'terms', readonly: true, value: 'No refunds after 30 days' },
      form,
    );
    const empty = await mount(
      { label: 'Optional note', name: 'note', readonly: true, required: true, value: '' },
      form,
    );
    let submittedData: FormData | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submittedData = new FormData(form);
    });

    await userEvent.click(submit);

    expect(innerTextarea(empty).validity.valueMissing).toBe(false);
    expect(submittedData?.get('terms')).toBe('No refunds after 30 days');
    expect(submittedData?.get('note')).toBe('');
  });

  it('S17 material3 restyles the textarea through component tokens alone', async () => {
    cleanup();
    ensureTokens();
    const baseline = await mount();
    await waitForStyles();
    const baselineField = baseline.shadowRoot?.querySelector('[part="field"]');
    const onmarsBg = getComputedStyle(
      requireElement(baselineField, 'field part missing'),
    ).backgroundColor;
    const onmarsBlockStart = getComputedStyle(
      requireElement(baselineField, 'field part missing'),
    ).borderBlockStartWidth;
    baseline.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount();
    const field = el.shadowRoot?.querySelector('[part="field"]');
    await waitForStyles();

    expect([
      readTokenColor('--ki-textarea-rest-bg'),
      readTokenColor('--ki-textarea-hover-bg'),
    ]).toContain(getComputedStyle(requireElement(field, 'field part missing')).backgroundColor);
    expect(getComputedStyle(requireElement(field, 'field part missing')).backgroundColor).not.toBe(
      onmarsBg,
    );
    expect(
      getComputedStyle(requireElement(field, 'field part missing')).borderBlockStartWidth,
    ).not.toBe(onmarsBlockStart);
  });

  it('S18 forced dark under onmars resolves dark textarea token values', async () => {
    cleanup();
    ensureTokens();
    const baseline = await mount();
    const baselineField = baseline.shadowRoot?.querySelector('[part="field"]');
    await waitForStyles();
    const lightBg = getComputedStyle(
      requireElement(baselineField, 'field part missing'),
    ).backgroundColor;
    baseline.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    const el = await mount();
    const field = el.shadowRoot?.querySelector('[part="field"]');
    await waitForStyles();

    expect([
      readTokenColor('--ki-textarea-rest-bg'),
      readTokenColor('--ki-textarea-hover-bg'),
    ]).toContain(getComputedStyle(requireElement(field, 'field part missing')).backgroundColor);
    expect(getComputedStyle(requireElement(field, 'field part missing')).backgroundColor).not.toBe(
      lightBg,
    );
  });

  it('S24 label and entered text follow the document writing direction', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount({ value: 'اتصل مرتين' });
    const label = el.shadowRoot?.querySelector('[part="label"]');
    const field = el.shadowRoot?.querySelector('[part="field"]');
    const textarea = innerTextarea(el);

    expect(getComputedStyle(textarea).direction).toBe('rtl');
    expect(
      Math.round(requireElement(label, 'label part missing').getBoundingClientRect().right),
    ).toBe(Math.round(requireElement(field, 'field part missing').getBoundingClientRect().right));
  });
});
