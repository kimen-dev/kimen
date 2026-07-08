import axe from 'axe-core';
import tokensCss from '@kimen/tokens/css?raw';
import { page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:008-ki-switch
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import { defineCustomElement } from '../dist/components/ki-switch.js';

type KiSwitchElement = HTMLElement & {
  checked: boolean;
  disabled: boolean;
  value?: string;
};

const STYLE_ID = 'ki-switch-browser-token-style';
const defineKiSwitchElement: () => void = defineCustomElement;

beforeAll(() => {
  defineKiSwitchElement();
  ensureTokens();
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

async function waitForHydration(el: KiSwitchElement): Promise<void> {
  await customElements.whenDefined('ki-switch');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('input') && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

async function mount(attrs = '', label = 'Email notifications'): Promise<KiSwitchElement> {
  cleanup();
  const el = document.createElement('ki-switch') as KiSwitchElement;
  el.innerHTML = `<span id="label-text">${label}</span>`;
  for (const attr of attrs.split(/\s+/u).filter(Boolean)) {
    const [name, value] = attr.split('=');
    if (name) {
      el.setAttribute(name, value?.replace(/^"|"$/gu, '') ?? '');
    }
  }
  document.body.append(el);
  await waitForHydration(el);
  return el;
}

async function mountInForm(
  attrs = '',
  fieldsetDisabled = false,
): Promise<{
  form: HTMLFormElement;
  el: KiSwitchElement;
}> {
  cleanup();
  const form = document.createElement('form');
  const fieldset = document.createElement('fieldset');
  fieldset.disabled = fieldsetDisabled;
  const el = document.createElement('ki-switch') as KiSwitchElement;
  el.textContent = 'Newsletter';
  for (const attr of attrs.split(/\s+/u).filter(Boolean)) {
    const [name, value] = attr.split('=');
    if (name) {
      el.setAttribute(name, value?.replace(/^"|"$/gu, '') ?? '');
    }
  }
  fieldset.append(el);
  form.append(fieldset);
  document.body.append(form);
  await waitForHydration(el);
  return { form, el };
}

function formValue(form: HTMLFormElement, name: string): FormDataEntryValue | null {
  return new FormData(form).get(name);
}

function internalInput(el: KiSwitchElement): HTMLInputElement {
  const input = el.shadowRoot?.querySelector('input[type="checkbox"][role="switch"]');
  expect(input).toBeInstanceOf(HTMLInputElement);
  return input as HTMLInputElement;
}

function trackPart(el: KiSwitchElement): HTMLElement {
  const track = el.shadowRoot?.querySelector('[part="track"]');
  expect(track).toBeInstanceOf(HTMLElement);
  return track as HTMLElement;
}

function eventCounts(el: KiSwitchElement): { input: () => number; change: () => number } {
  let input = 0;
  let change = 0;
  el.addEventListener('input', (event) => {
    if (event.composed) {
      input += 1;
    }
  });
  el.addEventListener('change', (event) => {
    if (event.composed) {
      change += 1;
    }
  });

  return {
    input: () => input,
    change: () => change,
  };
}

describe('ki-switch in a real browser', () => {
  it('S1 toggling the switch turns it on with exactly one composed input and change event', async () => {
    const el = await mount();
    const counts = eventCounts(el);

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);

    expect(el.checked).toBe(true);
    expect(counts.input()).toBe(1);
    expect(counts.change()).toBe(1);
  });

  it('S2 toggling the switch again turns it off', async () => {
    const el = await mount('checked');

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);

    expect(el.checked).toBe(false);
  });

  it('S3 a disabled switch does not toggle and reports no state change', async () => {
    const el = await mount('disabled');
    const counts = eventCounts(el);

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);

    expect(el.checked).toBe(false);
    expect(counts.input()).toBe(0);
    expect(counts.change()).toBe(0);
  });

  it('S17 clicking the slotted label toggles the switch with exactly one change event', async () => {
    const el = await mount();
    const counts = eventCounts(el);
    const labelText = page.getByText('Email notifications');

    await labelText.click();

    expect(el.checked).toBe(true);
    expect(counts.change()).toBe(1);
  });

  it('S4 checked="maybe" renders on and toggles normally in a real browser', async () => {
    const el = await mount('checked="maybe"');

    expect(el.checked).toBe(true);
    await userEvent.click(internalInput(el));
    expect(el.checked).toBe(false);
  });

  it('S5 Tab reaches the switch and its focus indication is visible', async () => {
    const el = await mount();
    internalInput(el).blur();
    el.blur();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const track = trackPart(el);
    const before = getComputedStyle(track);

    await userEvent.tab();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const after = getComputedStyle(track);
    expect(document.activeElement).toBe(el);
    expect(el.shadowRoot?.activeElement).toBe(internalInput(el));
    expect([before.outlineStyle, before.outlineColor, before.boxShadow]).toBeDefined();
    expect(after.outlineStyle).toBe('solid');
    expect(after.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('S6 Space toggles the focused switch and Enter remains inert', async () => {
    const el = await mount();

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(false);

    await userEvent.keyboard(' ');
    expect(el.checked).toBe(true);
  });

  it('S20 Tab skips a disabled switch and lands on the following button', async () => {
    cleanup();
    const el = document.createElement('ki-switch') as KiSwitchElement;
    el.disabled = true;
    el.textContent = 'Email notifications';
    const button = document.createElement('button');
    button.textContent = 'Next';
    document.body.append(el, button);
    await waitForHydration(el);

    await userEvent.tab();

    expect(document.activeElement).toBe(button);
  });

  it('S7 exposes a switch named Email notifications in the off state', async () => {
    await mount();
    const control = page.getByRole('switch', { name: 'Email notifications' });

    await expect.element(control).not.toBeChecked();
  });

  it('S8 exposes the on state after a user toggle', async () => {
    const el = await mount();
    const control = page.getByRole('switch', { name: 'Email notifications' });

    await userEvent.click(internalInput(el));

    await expect.element(control).toBeChecked();
  });

  it('S9 exposes disabled switches as unavailable', async () => {
    await mount('disabled');
    const control = page.getByRole('switch', { name: 'Email notifications' });

    await expect.element(control).toBeDisabled();
  });

  it('S7 S9 keeps the rendered pointer target at least 24 by 24 CSS pixels', async () => {
    const el = await mount();
    const rect = el.getBoundingClientRect();

    expect(rect.width).toBeGreaterThanOrEqual(24);
    expect(rect.height).toBeGreaterThanOrEqual(24);
  });

  it('S7 S8 S9 has zero axe violations across checked and disabled states', async () => {
    cleanup();
    const main = document.createElement('main');
    document.body.append(main);
    for (const checked of [false, true]) {
      for (const disabled of [false, true]) {
        const el = document.createElement('ki-switch') as KiSwitchElement;
        el.textContent = `Email notifications ${String(checked)} ${String(disabled)}`;
        if (checked) {
          el.setAttribute('checked', '');
        }
        if (disabled) {
          el.setAttribute('disabled', '');
        }
        main.append(el);
        await waitForHydration(el);
      }
    }

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S10 submitted FormData contains newsletter=on when the switch is on', async () => {
    const { form } = await mountInForm('name="newsletter" checked');

    expect(formValue(form, 'newsletter')).toBe('on');
  });

  it('S11 submitted FormData omits newsletter when the switch is off', async () => {
    const { form } = await mountInForm('name="newsletter"');

    expect(formValue(form, 'newsletter')).toBeNull();
  });

  it('S12 resetting restores an initially on switch after it was toggled off', async () => {
    const { form, el } = await mountInForm('name="newsletter" checked');

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);
    expect(el.checked).toBe(false);
    form.reset();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.checked).toBe(true);
  });

  it('S21 resetting restores an initially off switch after it was toggled on', async () => {
    const { form, el } = await mountInForm('name="newsletter"');

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);
    expect(el.checked).toBe(true);
    form.reset();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.checked).toBe(false);
  });

  it('S13 a switch inside disabled fieldset stays unchanged and contributes nothing', async () => {
    const { form, el } = await mountInForm('name="newsletter" checked', true);

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);

    expect(el.checked).toBe(true);
    expect(formValue(form, 'newsletter')).toBeNull();
  });

  it('S18 value="weekly" submits newsletter=weekly when on', async () => {
    const { form } = await mountInForm('name="newsletter" value="weekly" checked');

    expect(formValue(form, 'newsletter')).toBe('weekly');
  });
});
