import axe from 'axe-core';
import { commands, page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:006-ki-checkbox
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement } from '../dist/components/ki-checkbox.js';

type KiCheckboxElement = HTMLElement & {
  checked: boolean;
  disabled: boolean;
  indeterminate: boolean;
  required: boolean;
  value: string;
};

const STYLE_ID = 'ki-checkbox-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-checkbox-browser-material3-token-style';
const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
});

function ensureTokens(): void {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = tokensCss;
    document.head.append(style);
  }
}

function ensureMaterial3Tokens(): void {
  if (!document.getElementById(MATERIAL3_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = MATERIAL3_STYLE_ID;
    style.textContent = material3Css;
    document.head.append(style);
  }
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function mount(
  label = 'Email notifications',
  attributes: Partial<
    Record<
      'checked' | 'disabled' | 'indeterminate' | 'name' | 'required' | 'value',
      string | boolean
    >
  > = {},
  parent: ParentNode = document.body,
): Promise<KiCheckboxElement> {
  ensureTokens();
  const el = document.createElement('ki-checkbox') as KiCheckboxElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  el.textContent = label;
  parent.appendChild(el);
  await customElements.whenDefined('ki-checkbox');
  const deadline = Date.now() + 1000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

function inputOf(el: KiCheckboxElement): HTMLInputElement {
  const input = el.shadowRoot?.querySelector('input');
  expect(input).toBeInstanceOf(HTMLInputElement);
  if (!input) {
    throw new Error('ki-checkbox did not render an internal native input');
  }
  return input;
}

function controlOf(el: KiCheckboxElement): HTMLElement {
  const control = el.shadowRoot?.querySelector('[part="control"]');
  expect(control).toBeInstanceOf(HTMLElement);
  if (!(control instanceof HTMLElement)) {
    throw new Error('ki-checkbox did not render a control part');
  }
  return control;
}

function labelPartOf(el: KiCheckboxElement): HTMLElement {
  const label = el.shadowRoot?.querySelector('[part="label"]');
  expect(label).toBeInstanceOf(HTMLElement);
  if (!(label instanceof HTMLElement)) {
    throw new Error('ki-checkbox did not render a label part');
  }
  return label;
}

async function waitForStyles(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.documentElement.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

function checkboxState(el: KiCheckboxElement): 'hover' | 'rest' {
  return el.matches(':hover') ? 'hover' : 'rest';
}

function formEntries(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(
    [...new FormData(form)].map(([name, value]) => [
      name,
      value instanceof File ? value.name : value,
    ]),
  );
}

describe('ki-checkbox in a real browser', () => {
  it('S1 clicking checks it and emits composed input before composed change', async () => {
    cleanup();
    const el = await mount();
    const input = inputOf(el);
    const events: string[] = [];
    el.addEventListener('input', (event) => {
      expect(event.composed).toBe(true);
      events.push(`input:${String(el.checked)}`);
    });
    el.addEventListener('change', (event) => {
      expect(event.composed).toBe(true);
      events.push(`change:${String(el.checked)}`);
    });

    await userEvent.click(input);
    await userEvent.click(input);

    expect(el.checked).toBe(false);
    expect(events).toEqual(['input:true', 'change:true', 'input:false', 'change:false']);
  });

  it('S2 disabled checkbox stays inert, unfocused and emits no change', async () => {
    cleanup();
    const el = await mount('Email notifications', { disabled: true });
    let changes = 0;
    el.addEventListener('change', () => {
      changes += 1;
    });

    await userEvent.click(el, { force: true }).catch(() => undefined);
    await userEvent.keyboard('{Tab}');

    expect(el.checked).toBe(false);
    expect(changes).toBe(0);
    expect(el.shadowRoot?.activeElement).not.toBe(inputOf(el));
  });

  it('S20 activating the slotted label toggles the checkbox', async () => {
    cleanup();
    const el = await mount();

    await userEvent.click(page.getByText('Email notifications'));

    expect(el.checked).toBe(true);
  });

  it('S5 Tab reaches the checkbox with visible focus', async () => {
    cleanup();
    const el = await mount();
    const input = inputOf(el);

    await userEvent.keyboard('{Tab}');

    expect(el.shadowRoot?.activeElement).toBe(input);
    const focused = getComputedStyle(controlOf(el));
    expect(`${focused.outlineStyle} ${focused.outlineColor}`).not.toContain('none');
  });

  it('S6 Space toggles the focused checkbox and Enter does not', async () => {
    cleanup();
    const el = await mount();
    inputOf(el).focus();

    await userEvent.keyboard(' ');
    expect(el.checked).toBe(true);

    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(true);
  });

  it('S7 exposes a checkbox named from the slotted label in checked state', async () => {
    cleanup();
    await mount('Email notifications', { checked: true });

    await expect
      .element(page.getByRole('checkbox', { name: 'Email notifications', checked: true }))
      .toBeInTheDocument();
  });

  it('S9 exposes disabled state as unavailable', async () => {
    cleanup();
    await mount('Email notifications', { disabled: true });

    await expect
      .element(page.getByRole('checkbox', { name: 'Email notifications', disabled: true }))
      .toBeInTheDocument();
  });

  it('S3 resolves unchecked indeterminate to checked and removes the attribute', async () => {
    cleanup();
    const el = await mount('Select all', { indeterminate: true });
    expect(inputOf(el).indeterminate).toBe(true);

    await userEvent.click(inputOf(el));

    expect(el.checked).toBe(true);
    expect(el.indeterminate).toBe(false);
    expect(el.hasAttribute('indeterminate')).toBe(false);
  });

  it('S19 resolves checked indeterminate to unchecked and not mixed', async () => {
    cleanup();
    const el = await mount('Select all', { checked: true, indeterminate: true });

    await userEvent.click(inputOf(el));

    expect(el.checked).toBe(false);
    expect(el.indeterminate).toBe(false);
  });

  it('S8 exposes indeterminate as mixed through the native input', async () => {
    cleanup();
    const el = await mount('Select all', { indeterminate: true });

    expect(inputOf(el).indeterminate).toBe(true);
    // Review round 1: assert the platform state that computes the mixed AT
    // exposure (a native input with :indeterminate exposes aria-checked=mixed
    // by spec; the locator's typed options accept only booleans for checked).
    expect(inputOf(el).matches(':indeterminate')).toBe(true);
    await expect.element(page.getByRole('checkbox', { name: 'Select all' })).toBeInTheDocument();
  });

  it('S10 and S11 submit checked values and omit unchecked values', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount('Newsletter', { name: 'newsletter' }, form);

    expect(formEntries(form)).toEqual({});
    el.checked = true;
    await waitForStyles();
    expect(formEntries(form)).toEqual({ newsletter: 'on' });

    el.value = 'weekly';
    await waitForStyles();
    expect(formEntries(form)).toEqual({ newsletter: 'weekly' });
  });

  it('S12 submits the binary checked value while displayed indeterminate', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    await mount('Select all', { checked: true, indeterminate: true, name: 'select-all' }, form);

    expect(formEntries(form)).toEqual({ 'select-all': 'on' });
  });

  it('S13 reset restores the checked association baseline only', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount(
      'Newsletter',
      { checked: true, indeterminate: true, name: 'newsletter' },
      form,
    );

    await userEvent.click(inputOf(el));
    expect(el.checked).toBe(false);
    expect(el.indeterminate).toBe(false);

    form.reset();
    await waitForStyles();

    expect(el.checked).toBe(true);
    expect(el.indeterminate).toBe(false);
  });

  it('S14 required unchecked blocks submission and shows user-invalid only after submit', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount('Accept the terms', { required: true, name: 'terms' }, form);
    const control = controlOf(el);
    await waitForStyles();
    const restBorder = getComputedStyle(control).borderTopColor;

    expect(inputOf(el).validity.valueMissing).toBe(true);
    expect(getComputedStyle(control).borderTopColor).toBe(restBorder);

    // Review round 1: observe the blocked submission directly, not only
    // reportValidity's side effects.
    let submitted = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted = true;
    });
    form.requestSubmit();
    await waitForStyles();
    expect(submitted).toBe(false);

    form.reportValidity();
    await waitForStyles();

    expect(el.matches(':state(user-invalid)')).toBe(true);
    expect(getComputedStyle(control).borderTopColor).toBe(
      readTokenColor('--ki-checkbox-invalid-border'),
    );
  });

  it('S15 disabled fieldset prevents changes and removes form data', async () => {
    cleanup();
    const form = document.createElement('form');
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    form.append(fieldset);
    document.body.append(form);
    const el = await mount('Newsletter', { checked: true, name: 'newsletter' }, fieldset);

    await userEvent.click(el, { force: true }).catch(() => undefined);

    expect(el.checked).toBe(true);
    expect(inputOf(el).disabled).toBe(true);
    expect(formEntries(form)).toEqual({});
  });

  it('S16 material3 restyles checkbox selection states through component tokens', async () => {
    cleanup();
    ensureTokens();
    const baseline = await mount('Selected', { checked: true });
    await waitForStyles();
    const onmars = getComputedStyle(controlOf(baseline)).backgroundColor;
    baseline.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const selected = await mount('Selected', { checked: true });
    const mixed = await mount('Mixed', { indeterminate: true });
    await waitForStyles();

    expect(getComputedStyle(controlOf(selected)).backgroundColor).toBe(
      readTokenColor(`--ki-checkbox-checked-${checkboxState(selected)}-bg`),
    );
    expect(getComputedStyle(controlOf(mixed)).backgroundColor).toBe(
      readTokenColor(`--ki-checkbox-indeterminate-${checkboxState(mixed)}-bg`),
    );
    expect(getComputedStyle(controlOf(selected)).backgroundColor).not.toBe(onmars);
  });

  it('S17 forced dark resolves dark onmars token values', async () => {
    cleanup();
    ensureTokens();
    const light = await mount('Selected', { checked: true });
    await waitForStyles();
    const lightBg = getComputedStyle(controlOf(light)).backgroundColor;
    light.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    const dark = await mount('Selected', { checked: true });
    await waitForStyles();

    expect(getComputedStyle(controlOf(dark)).backgroundColor).toBe(
      readTokenColor(`--ki-checkbox-checked-${checkboxState(dark)}-bg`),
    );
    expect(getComputedStyle(controlOf(dark)).backgroundColor).not.toBe(lightBg);
  });

  it('S18 control leads and label trails under RTL', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount('Notifications');
    await waitForStyles();

    const controlRect = controlOf(el).getBoundingClientRect();
    const labelRect = labelPartOf(el).getBoundingClientRect();
    expect(controlRect.left, 'control leads on the right in RTL').toBeGreaterThan(labelRect.left);
  });

  it('S21 applies state with no mark animation under reduced motion', async () => {
    cleanup();
    await browserCommands.emulateReducedMotion('reduce');
    const el = await mount();
    const mark = el.shadowRoot?.querySelector('.mark');
    expect(mark).toBeInstanceOf(SVGElement);
    if (!mark) {
      throw new Error('ki-checkbox did not render a mark');
    }

    await userEvent.click(inputOf(el));

    const style = getComputedStyle(mark);
    expect(el.checked).toBe(true);
    expect(`${style.transitionDuration} ${style.animationName}`).toBe('0s none');
    await browserCommands.emulateReducedMotion(null);
  });

  it('S9 has zero axe violations across selection and validity states', async () => {
    cleanup();
    ensureTokens();
    const main = document.createElement('main');
    document.body.append(main);
    await mount('Unchecked', {}, main);
    await mount('Checked', { checked: true }, main);
    await mount('Mixed', { indeterminate: true }, main);
    await mount('Disabled', { disabled: true }, main);
    await mount('Required invalid', { required: true }, main);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
