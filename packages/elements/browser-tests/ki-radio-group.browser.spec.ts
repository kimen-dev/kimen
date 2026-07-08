import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:007-ki-radio-group
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineRadioGroup } from '../dist/components/ki-radio-group.js';

type KiRadioGroupElement = HTMLElement & {
  disabled: boolean;
  label: string;
  value: string;
};

const STYLE_ID = 'ki-radio-group-browser-token-style';

beforeAll(() => {
  defineRadioGroup();
  defineRadio();
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
  attributes: Record<string, string | boolean> = {},
): Promise<KiRadioGroupElement> {
  ensureTokens();
  const el = document.createElement('ki-radio-group') as unknown as KiRadioGroupElement;
  el.setAttribute('label', 'Contact preference');
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  el.innerHTML = `
    <ki-radio value="email">Email</ki-radio>
    <ki-radio value="sms">SMS</ki-radio>
    <ki-radio value="phone">Phone</ki-radio>
  `;
  document.body.appendChild(el);
  await customElements.whenDefined('ki-radio-group');
  await customElements.whenDefined('ki-radio');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

function radios(el: KiRadioGroupElement): HTMLInputElement[] {
  return [...el.querySelectorAll('ki-radio')].map((radio) => {
    const input = radio.shadowRoot?.querySelector('input');
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!input) {
      throw new Error('ki-radio did not render an input');
    }
    return input;
  });
}

function radioAt(el: KiRadioGroupElement, index: number): HTMLInputElement {
  const input = radios(el)[index];
  if (!input) {
    throw new Error(`Missing radio input at index ${String(index)}`);
  }
  return input;
}

describe('ki-radio-group in a real browser', () => {
  it('S1 selecting an option makes it the group single choice and emits input before change', async () => {
    cleanup();
    const el = await mount();
    const email = radioAt(el, 0);
    const events: string[] = [];
    el.addEventListener('input', (event) => {
      events.push(`input:${String(event.composed)}:${el.value}`);
    });
    el.addEventListener('change', (event) => {
      events.push(`change:${String(event.composed)}:${el.value}`);
    });

    await userEvent.click(email);

    expect(email.checked).toBe(true);
    expect(radios(el).filter((input) => input.checked)).toHaveLength(1);
    expect(el.value).toBe('email');
    expect(events).toEqual(['input:true:email', 'change:true:email']);
  });

  it('S2 selecting another option releases the previous option', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    const email = radioAt(el, 0);
    const sms = radioAt(el, 1);

    await userEvent.click(sms);

    expect(email.checked).toBe(false);
    expect(sms.checked).toBe(true);
    expect(el.value).toBe('sms');
  });

  it('S3 a disabled option cannot be selected and reselection emits nothing', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    const email = radioAt(el, 0);
    const phone = radioAt(el, 2);
    el.querySelectorAll('ki-radio')[2]?.setAttribute('disabled', '');
    let eventCount = 0;
    el.addEventListener('input', () => {
      eventCount += 1;
    });
    el.addEventListener('change', () => {
      eventCount += 1;
    });

    await userEvent.click(phone, { force: true }).catch(() => undefined);
    await userEvent.click(email);

    expect(email.checked).toBe(true);
    expect(phone.checked).toBe(false);
    expect(el.value).toBe('email');
    expect(eventCount).toBe(0);
  });

  it('S4 a value matching no option leaves the group unselected and operable', async () => {
    cleanup();
    const el = await mount({ value: 'postal' });
    const sms = radioAt(el, 1);

    expect(radios(el).some((input) => input.checked)).toBe(false);
    await userEvent.click(sms);

    expect(sms.checked).toBe(true);
    expect(el.value).toBe('sms');
  });

  it('S19 a disabled group ignores selection attempts and is exposed unavailable', async () => {
    cleanup();
    const el = await mount({ disabled: true, value: 'email' });
    const sms = radioAt(el, 1);
    let eventCount = 0;
    el.addEventListener('input', () => {
      eventCount += 1;
    });
    el.addEventListener('change', () => {
      eventCount += 1;
    });

    await userEvent.click(sms, { force: true }).catch(() => undefined);

    expect(el.value).toBe('email');
    expect(sms.checked).toBe(false);
    expect(eventCount).toBe(0);
    expect(el.shadowRoot?.querySelector('[role="radiogroup"]')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
  });

  it('S1 programmatic value assignment updates display silently', async () => {
    cleanup();
    const el = await mount();
    let eventCount = 0;
    el.addEventListener('input', () => {
      eventCount += 1;
    });
    el.addEventListener('change', () => {
      eventCount += 1;
    });

    el.value = 'sms';
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(radios(el)[1]?.checked).toBe(true);
    expect(eventCount).toBe(0);
  });

  it('S10 exposes a named radiogroup and selected radio through the accessibility tree', async () => {
    cleanup();
    await mount({ value: 'email' });

    await expect
      .element(page.getByRole('radiogroup', { name: 'Contact preference' }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('radio', { name: 'Email', checked: true }))
      .toBeInTheDocument();
  });

  it('S11 exposes a disabled option as an unavailable radio with no option-level ARIA', async () => {
    cleanup();
    const el = await mount();
    const phone = el.querySelectorAll('ki-radio')[2];
    phone?.setAttribute('disabled', '');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    await expect
      .element(page.getByRole('radio', { name: 'Phone', disabled: true }))
      .toBeInTheDocument();
    const optionAria = [...el.querySelectorAll('ki-radio')].flatMap((radio) => [
      ...(radio.shadowRoot?.querySelectorAll('[aria-checked], [aria-disabled]') ?? []),
    ]);
    expect(optionAria).toEqual([]);
  });

  it('has zero axe violations (Art. V floor)', async () => {
    cleanup();
    const el = await mount();
    el.querySelectorAll('ki-radio')[2]?.setAttribute('disabled', '');
    const results = await axe.run(el);
    expect(results.violations).toEqual([]);
  });
});
