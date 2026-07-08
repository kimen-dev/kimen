import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:003-ki-input
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-input.js';

type KiInputElement = HTMLElement & {
  disabled: boolean;
  label: string;
  readonly: boolean;
  required: boolean;
  type: string;
  value: string;
};

const STYLE_ID = 'ki-input-browser-token-style';

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

function requireField(el: KiInputElement): HTMLElement {
  const field = fieldOf(el);
  expect(field).toBeInstanceOf(HTMLElement);
  if (!field) {
    throw new Error('ki-input did not render a field enclosure');
  }
  return field;
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
});
