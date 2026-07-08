import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:003-ki-input
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-input.js';
import material3Css from '@kimen/tokens/css/material3?raw';

type KiInputElement = HTMLElement & {
  disabled: boolean;
  label: string;
  readonly: boolean;
  required: boolean;
  type: string;
  value: string;
};

const STYLE_ID = 'ki-input-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-input-browser-material3-token-style';

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
      | 'type'
      | 'value',
      string | boolean
    >
  > = { label: 'Email' },
  parent: ParentNode = document.body,
): Promise<KiInputElement> {
  ensureTokens();
  const el = document.createElement('ki-input') as KiInputElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  parent.appendChild(el);
  await customElements.whenDefined('ki-input');
  const deadline = Date.now() + 500;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function inputOf(el: KiInputElement): HTMLInputElement | null {
  return el.shadowRoot?.querySelector('input') ?? null;
}

function requireInput(el: KiInputElement): HTMLInputElement {
  const input = inputOf(el);
  expect(input).toBeInstanceOf(HTMLInputElement);
  if (!input) {
    throw new Error('ki-input did not render an internal native input');
  }
  return input;
}

function fieldOf(el: KiInputElement): HTMLElement | null {
  return el.shadowRoot?.querySelector('[part="field"]') ?? null;
}

function requireLabel(el: KiInputElement): HTMLLabelElement {
  const label = el.shadowRoot?.querySelector('label') ?? null;
  expect(label).toBeInstanceOf(HTMLLabelElement);
  if (!label) {
    throw new Error('ki-input did not render its label element');
  }
  return label;
}

function requireField(el: KiInputElement): HTMLElement {
  const field = fieldOf(el);
  expect(field).toBeInstanceOf(HTMLElement);
  if (!field) {
    throw new Error('ki-input did not render a field enclosure');
  }
  return field;
}

function submitButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Submit';
  return button;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

async function waitForStyles(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

describe('ki-input in a real browser', () => {
  it('S1 real typing updates value and emits composed input events', async () => {
    cleanup();
    const el = await mount({ label: 'Email' });
    const input = requireInput(el);
    const inputEvents: Event[] = [];
    el.addEventListener('input', (event) => inputEvents.push(event));

    await userEvent.type(input, 'ada@example.com');

    expect(el.value).toBe('ada@example.com');
    expect(input.value).toBe('ada@example.com');
    expect(inputEvents.length).toBeGreaterThan(0);
    expect(inputEvents.every((event) => event.composed)).toBe(true);
  });

  it('S2 committing an edit reports one composed change with the final value', async () => {
    cleanup();
    const el = await mount({ label: 'Email' });
    const input = requireInput(el);
    const changes: Event[] = [];
    el.addEventListener('change', (event) => changes.push(event));

    await userEvent.type(input, 'ada@example.com');
    input.blur();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(changes).toHaveLength(1);
    expect(changes[0]?.composed).toBe(true);
    expect(el.value).toBe('ada@example.com');
  });

  it('S3 disabled input accepts no entry', async () => {
    cleanup();
    const el = await mount({ disabled: true, label: 'Email' });
    const input = requireInput(el);

    await userEvent.type(input, 'ada@example.com').catch(() => undefined);

    expect(el.value).toBe('');
    expect(input.value).toBe('');
  });

  it('S4 readonly input keeps its value under edit attempts', async () => {
    cleanup();
    const el = await mount({ label: 'Membership ID', readonly: true, value: 'KMN-0042' });
    const input = requireInput(el);

    await userEvent.type(input, 'CHANGED').catch(() => undefined);

    expect(el.value).toBe('KMN-0042');
    expect(input.value).toBe('KMN-0042');
  });

  it('S5 password entry is obscured while value returns plain text', async () => {
    cleanup();
    const el = await mount({ label: 'Password', type: 'password' });
    const input = requireInput(el);

    await userEvent.type(input, 'correct horse battery');

    expect(input.type).toBe('password');
    expect(el.value).toBe('correct horse battery');
  });

  it('S6 unknown type behaves as a plain text field', async () => {
    cleanup();
    const el = await mount({ label: 'Email', type: 'number' });
    const input = requireInput(el);

    expect(input.type).toBe('text');
  });

  it('S7 Tab reaches the field and shows a visible focus indication', async () => {
    cleanup();
    const el = await mount({ label: 'Email' });
    const input = requireInput(el);
    const field = requireField(el);

    await userEvent.keyboard('{Tab}');
    await waitForStyles();

    expect(el.shadowRoot?.activeElement).toBe(input);
    const focused = getComputedStyle(field);
    expect(`${focused.outlineStyle} ${focused.boxShadow}`).not.toBe('none none');
  });

  it('S22 Tab reaches a readonly field with the same visible focus indication', async () => {
    cleanup();
    const el = await mount({ label: 'Membership ID', readonly: true, value: 'KMN-0042' });
    const input = requireInput(el);
    const field = requireField(el);

    await userEvent.keyboard('{Tab}');
    await waitForStyles();

    expect(el.shadowRoot?.activeElement).toBe(input);
    const focused = getComputedStyle(field);
    expect(`${focused.outlineStyle} ${focused.boxShadow}`).not.toBe('none none');
  });

  it('S9 exposes a named text field to the accessibility tree', async () => {
    cleanup();
    await mount({ label: 'Email' });

    await expect.element(page.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  // Review round 1 (Critical-1): slotted adornments must NEVER join the
  // control's accessible name — the label is the name, exactly (FR-002).
  it('S9 keeps the accessible name equal to the label with slotted text affixes', async () => {
    cleanup();
    const el = await mount({ label: 'Email' });
    const start = document.createElement('span');
    start.slot = 'start';
    start.textContent = 'https://';
    const end = document.createElement('span');
    end.slot = 'end';
    end.textContent = '.example.com';
    el.append(start, end);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    await expect.element(page.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(requireLabel(el).textContent.trim()).toBe('Email');
  });

  // Review round 1 (Minor-7): S19's visibility observable belongs in the
  // authoritative browser suite, not only mock-doc.
  it('S19 renders the label visibly on screen', async () => {
    cleanup();
    const el = await mount({ label: 'Email' });
    const label = requireLabel(el);
    const computed = getComputedStyle(label);
    expect(computed.display).not.toBe('none');
    expect(computed.visibility).not.toBe('hidden');
    expect(label.getBoundingClientRect().height).toBeGreaterThan(0);
  });

  // Review round 1 (Minor-7): S20's silence contract verified in a real
  // browser — programmatic assignment emits neither input nor change.
  it('S20 stays silent on programmatic value assignment in a real browser', async () => {
    cleanup();
    const el = await mount({ label: 'Email', value: 'first' });
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));

    el.value = 'second';
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(requireInput(el).value).toBe('second');
    expect(events).toEqual([]);
  });

  it('S10 exposes required state to assistive technology', async () => {
    cleanup();
    await mount({ label: 'Email', required: true });

    await expect
      .element(page.getByRole('textbox', { name: 'Email' }))
      .toHaveAttribute('required', '');
  });

  it('S11 exposes disabled state as unavailable', async () => {
    cleanup();
    const el = await mount({ disabled: true, label: 'Email' });
    const input = requireInput(el);

    expect(input).toHaveProperty('disabled', true);
  });

  it('S23 placeholder never becomes the accessible name', async () => {
    cleanup();
    await mount({ label: 'Email', placeholder: 'name@example.com' });

    await expect.element(page.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('textbox', { name: 'name@example.com' }))
      .not.toBeInTheDocument();
  });

  it('S24 exposes readonly state to assistive technology', async () => {
    cleanup();
    const el = await mount({ label: 'Membership ID', readonly: true });
    const input = requireInput(el);

    expect(input).toHaveProperty('readOnly', true);
  });

  it('S25 forwards autocomplete to the internal entry control', async () => {
    cleanup();
    const el = await mount({ autocomplete: 'email', label: 'Email' });
    const input = requireInput(el);

    expect(input.autocomplete).toBe('email');
  });

  it('S9 has zero axe violations across the type and state matrix', async () => {
    cleanup();
    const main = document.createElement('main');
    document.body.append(main);
    const types = ['text', 'email', 'password', 'url', 'tel', 'search'] as const;
    const states = [{}, { disabled: true }, { readonly: true }, { required: true }] as const;
    for (const type of types) {
      for (const state of states) {
        await mount({ label: `${type} field`, type, ...state }, main);
      }
    }

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S12 submitted FormData contains the field name and value', async () => {
    cleanup();
    const form = document.createElement('form');
    form.append(submitButton());
    document.body.append(form);
    await mount({ label: 'Email', name: 'email', value: 'ada@example.com' }, form);
    let submittedData: Record<string, string> | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submittedData = Object.fromEntries(
        [...new FormData(form)].map(([name, value]) => [
          name,
          value instanceof File ? value.name : value,
        ]),
      );
    });

    form.requestSubmit();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submittedData).toEqual({ email: 'ada@example.com' });
  });

  it('S8 Enter inside the focused field submits its form', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ label: 'Email', name: 'email', value: 'ada@example.com' }, form);
    const input = requireInput(el);
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });

    input.focus();
    await userEvent.keyboard('{Enter}');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submissions).toBe(1);
  });

  it('S13 reset restores the attribute-declared initial value', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ label: 'Email', name: 'email', value: 'ada@example.com' }, form);
    const input = requireInput(el);

    await userEvent.clear(input);
    await userEvent.type(input, 'grace@example.com');
    form.reset();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.value).toBe('ada@example.com');
    expect(input.value).toBe('ada@example.com');
  });

  it('S14 empty required field blocks submission and reports invalid', async () => {
    cleanup();
    const form = document.createElement('form');
    form.append(submitButton());
    document.body.append(form);
    const el = await mount({ label: 'Email', name: 'email', required: true }, form);
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });

    form.requestSubmit();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submissions).toBe(0);
    expect(el.matches(':invalid')).toBe(true);
  });

  it('S21 invalid appearance appears only after a blocked submission attempt', async () => {
    cleanup();
    const form = document.createElement('form');
    form.append(submitButton());
    document.body.append(form);
    const el = await mount({ label: 'Email', name: 'email', required: true }, form);
    const field = requireField(el);
    await waitForStyles();
    const initialBorder = getComputedStyle(field).borderBlockEndColor;

    form.requestSubmit();
    await waitForStyles();

    expect(getComputedStyle(field).borderBlockEndColor).not.toBe(initialBorder);
  });

  it('S15 disabled fieldset removes the entry from FormData', async () => {
    cleanup();
    const form = document.createElement('form');
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    form.append(fieldset, submitButton());
    document.body.append(form);
    await mount({ label: 'Email', name: 'email', value: 'ada@example.com' }, fieldset);
    let submittedData: Record<string, string> | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submittedData = Object.fromEntries(
        [...new FormData(form)].map(([name, value]) => [
          name,
          value instanceof File ? value.name : value,
        ]),
      );
    });

    form.requestSubmit();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submittedData).toEqual({});
  });

  it('S26 readonly field still submits its value', async () => {
    cleanup();
    const form = document.createElement('form');
    form.append(submitButton());
    document.body.append(form);
    await mount({ label: 'Membership ID', name: 'id', readonly: true, value: 'KMN-0042' }, form);
    let submittedData: Record<string, string> | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submittedData = Object.fromEntries(
        [...new FormData(form)].map(([name, value]) => [
          name,
          value instanceof File ? value.name : value,
        ]),
      );
    });

    form.requestSubmit();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submittedData).toEqual({ id: 'KMN-0042' });
  });

  it('S27 empty readonly required field does not block submission', async () => {
    cleanup();
    const form = document.createElement('form');
    form.append(submitButton());
    document.body.append(form);
    await mount({ label: 'Membership ID', name: 'id', readonly: true, required: true }, form);
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });

    form.requestSubmit();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submissions).toBe(1);
  });

  it('S28 email kind mismatch blocks submission and reports invalid', async () => {
    cleanup();
    const form = document.createElement('form');
    form.append(submitButton());
    document.body.append(form);
    const el = await mount(
      { label: 'Email', name: 'email', type: 'email', value: 'not-an-email' },
      form,
    );
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });

    form.requestSubmit();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submissions).toBe(0);
    expect(el.matches(':invalid')).toBe(true);
  });

  it('S16 material3 restyles the field through component tokens alone', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount({ label: 'Email' });
    const onmarsField = requireField(onmars);
    await waitForStyles();
    const onmarsBg = getComputedStyle(onmarsField).backgroundColor;
    const onmarsBlockStart = getComputedStyle(onmarsField).borderBlockStartWidth;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const material = await mount({ label: 'Email' });
    const materialField = requireField(material);
    await waitForStyles();
    const materialStyles = getComputedStyle(materialField);

    expect(materialStyles.backgroundColor).toBe(readTokenColor('--ki-input-rest-bg'));
    expect(materialStyles.backgroundColor).not.toBe(onmarsBg);
    expect(materialStyles.borderBlockStartWidth).toBe('0px');
    expect(materialStyles.borderBlockEndWidth).not.toBe('0px');
    expect(materialStyles.borderBlockStartWidth).not.toBe(onmarsBlockStart);
  });

  it('S17 forced dark under onmars resolves dark input token values', async () => {
    cleanup();
    ensureTokens();
    const light = await mount({ label: 'Email' });
    const lightField = requireField(light);
    await waitForStyles();
    const lightBg = getComputedStyle(lightField).backgroundColor;
    light.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    const dark = await mount({ label: 'Email' });
    const darkField = requireField(dark);
    await waitForStyles();
    const darkBg = getComputedStyle(darkField).backgroundColor;

    expect(darkBg).toBe(readTokenColor('--ki-input-rest-bg'));
    expect(darkBg).not.toBe(lightBg);
  });

  it('S18 start and end adornments follow the document writing direction', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount({ label: 'Search', type: 'search' });
    const start = document.createElement('span');
    start.slot = 'start';
    start.textContent = 'A';
    const end = document.createElement('span');
    end.slot = 'end';
    end.textContent = 'Z';
    el.prepend(start);
    el.append(end);
    await waitForStyles();

    const startRect = start.getBoundingClientRect();
    const endRect = end.getBoundingClientRect();
    expect(startRect.left, 'start leads under RTL').toBeGreaterThan(endRect.left);
  });
});
