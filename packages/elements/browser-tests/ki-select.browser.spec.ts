import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

// @spec:005-ki-select
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III).
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';
import { defineCustomElement as defineKiSelect } from '../dist/components/ki-select.js';

type KiSelectElement = HTMLElement & {
  value: string;
  disabled: boolean;
};

beforeAll(() => {
  defineKiSelect();
  defineKiOption();
});

function cleanup(): void {
  document.body.replaceChildren();
}

async function mountSelect(
  attrs = '',
  options = `
    <ki-option value="es">Spain</ki-option>
    <ki-option value="fr">France</ki-option>
    <ki-option value="pt">Portugal</ki-option>
  `,
): Promise<KiSelectElement> {
  cleanup();
  const style = document.createElement('style');
  style.textContent = tokensCss;
  const main = document.createElement('main');
  main.innerHTML = `<ki-select label="Country" placeholder="Choose a country" ${attrs}>${options}</ki-select><button id="after">After</button>`;
  document.body.append(style, main);
  await customElements.whenDefined('ki-select');
  await customElements.whenDefined('ki-option');
  const el = main.querySelector('ki-select') as KiSelectElement;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

function trigger(el: KiSelectElement): HTMLButtonElement {
  const button = el.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
  expect(button).toBeInstanceOf(HTMLButtonElement);
  if (!button) {
    throw new Error('missing trigger');
  }
  return button;
}

function valueText(el: KiSelectElement): string {
  return el.shadowRoot?.querySelector('[part="value"]')?.textContent.trim() ?? '';
}

function rows(el: KiSelectElement): HTMLElement[] {
  return [...(el.shadowRoot?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
}

function main(): HTMLElement {
  const element = document.querySelector('main');
  expect(element).toBeInstanceOf(HTMLElement);
  if (!element) {
    throw new Error('missing main');
  }
  return element;
}

describe('ki-select in a real browser', () => {
  it('S2 renders closed with the placeholder and hidden options', async () => {
    const el = await mountSelect();

    expect(trigger(el).getAttribute('role')).toBe('combobox');
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    expect(valueText(el)).toBe('Choose a country');
    expect(el.shadowRoot?.querySelector('[part="listbox"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('S1 selects France by pointer and emits composed input before change', async () => {
    const el = await mountSelect();
    const events: string[] = [];
    el.addEventListener('input', (event) => events.push(`input:${String(event.composed)}`));
    el.addEventListener('change', (event) => events.push(`change:${String(event.composed)}`));

    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    rows(el)[1]?.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(valueText(el)).toBe('France');
    expect(el.value).toBe('fr');
    expect(events).toEqual(['input:true', 'change:true']);
  });

  it('S3 S4 disabled select and disabled option are inert', async () => {
    const disabledSelect = await mountSelect('disabled');
    trigger(disabledSelect).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(trigger(disabledSelect).getAttribute('aria-expanded')).toBe('false');

    const el = await mountSelect(
      '',
      `<ki-option value="es">Spain</ki-option><ki-option value="fr" disabled>France</ki-option>`,
    );
    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    rows(el)[1]?.click();
    expect(el.value).toBe('');
    expect(valueText(el)).toBe('Choose a country');
  });

  it('S5 S25 falls back to placeholder for dangling values and removed selections silently', async () => {
    const dangling = await mountSelect('value="atlantis"');
    expect(dangling.value).toBe('');
    expect(valueText(dangling)).toBe('Choose a country');

    const el = await mountSelect('value="fr"');
    const changes: Event[] = [];
    el.addEventListener('change', (event) => changes.push(event));
    expect(valueText(el)).toBe('France');
    el.querySelector('ki-option[value="fr"]')?.remove();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(el.value).toBe('');
    expect(valueText(el)).toBe('Choose a country');
    expect(changes).toHaveLength(0);
  });

  it('S20 outside pointerdown closes without changing selection or events', async () => {
    const el = await mountSelect('value="es"');
    const events: Event[] = [];
    el.addEventListener('change', (event) => events.push(event));
    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    expect(valueText(el)).toBe('Spain');
    expect(events).toHaveLength(0);
  });

  it('S11 S12 exposes combobox and listbox roles in the real accessibility path', async () => {
    const el = await mountSelect('value="fr"');

    await expect.element(page.getByRole('combobox', { name: 'Country' })).toBeVisible();
    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await expect.element(page.getByRole('listbox', { name: 'Country' })).toBeVisible();
    expect(rows(el)[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('S11 S12 has zero axe violations inside main across closed, open, and disabled states', async () => {
    const el = await mountSelect();
    let results = await axe.run(main());
    expect(results.violations).toEqual([]);

    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    results = await axe.run(main());
    expect(results.violations).toEqual([]);

    await mountSelect('disabled');
    results = await axe.run(main());
    expect(results.violations).toEqual([]);
  });

  it('S6 S7 opens from keyboard with aria-activedescendant in the same shadow scope', async () => {
    const el = await mountSelect('value="fr"');

    trigger(el).focus();
    await userEvent.keyboard('{ArrowDown}');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const activeId = trigger(el).getAttribute('aria-activedescendant');
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
    expect(activeId).toBe(rows(el)[1]?.id);
    expect(el.shadowRoot?.getElementById(activeId ?? '')).toBe(rows(el)[1]);
  });
});
