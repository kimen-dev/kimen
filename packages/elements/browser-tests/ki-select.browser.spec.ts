import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

// @spec:005-ki-select
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III).
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
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
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
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

async function mountForm(
  attrs = '',
  options?: string,
): Promise<{
  form: HTMLFormElement;
  el: KiSelectElement;
}> {
  const el = await mountSelect(`name="country" ${attrs}`, options);
  const mainElement = main();
  const form = document.createElement('form');
  while (mainElement.firstChild) {
    form.append(mainElement.firstChild);
  }
  mainElement.append(form);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return { form, el };
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

function rowAt(el: KiSelectElement, index: number): HTMLElement {
  const row = rows(el)[index];
  expect(row).toBeInstanceOf(HTMLElement);
  if (!row) {
    throw new Error(`missing row ${String(index)}`);
  }
  return row;
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

  it('S11 resolves a value assigned as a property before options are slotted (framework path)', async () => {
    // Frameworks (React/Vue/Angular) set the `value` PROPERTY after the host
    // connects and often before child <ki-option>s upgrade. The requested value
    // must survive until the roster is built, not be discarded as unmatched.
    cleanup();
    const style = document.createElement('style');
    style.textContent = tokensCss;
    const main = document.createElement('main');
    document.body.append(style, main);
    const el = document.createElement('ki-select') as KiSelectElement;
    el.setAttribute('label', 'Country');
    el.setAttribute('placeholder', 'Choose a country');
    main.append(el);
    await customElements.whenDefined('ki-select');
    el.value = 'fr';
    for (const [value, label] of [
      ['es', 'Spain'],
      ['fr', 'France'],
      ['pt', 'Portugal'],
    ] as const) {
      const option = document.createElement('ki-option');
      option.setAttribute('value', value);
      option.textContent = label;
      el.append(option);
    }
    await customElements.whenDefined('ki-option');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(el.value).toBe('fr');
    expect(valueText(el)).toBe('France');
  });

  it('S25 clears value to "" when every option is removed after a selection (FR-004 edge)', async () => {
    // The retention that keeps a pre-roster value must NOT keep a value once
    // options have existed and then all disappear — the selection is gone.
    const el = await mountSelect('value="fr"');
    expect(el.value).toBe('fr');
    for (const option of [...el.querySelectorAll('ki-option')]) {
      option.remove();
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(el.value).toBe('');
    expect(valueText(el)).toBe('Choose a country');
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

  it('S8 S9 S10 S21 S22 S23 implements the approved keyboard path', async () => {
    const el = await mountSelect(
      '',
      `<ki-option value="es">Spain</ki-option><ki-option value="fr" disabled>France</ki-option><ki-option value="pt">Portugal</ki-option>`,
    );
    const events: string[] = [];
    el.addEventListener('change', () => events.push('change'));

    trigger(el).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(trigger(el).getAttribute('aria-activedescendant')).toBe(rows(el)[0]?.id);
    await userEvent.keyboard('{ArrowDown}');
    expect(trigger(el).getAttribute('aria-activedescendant')).toBe(rows(el)[2]?.id);
    await userEvent.keyboard('{Home}');
    expect(trigger(el).getAttribute('aria-activedescendant')).toBe(rows(el)[0]?.id);
    await userEvent.keyboard('{End}');
    expect(trigger(el).getAttribute('aria-activedescendant')).toBe(rows(el)[2]?.id);
    await userEvent.keyboard('{Enter}');
    expect(el.value).toBe('pt');
    expect(events).toEqual(['change']);

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Home}');
    await userEvent.keyboard('{Escape}');
    expect(el.value).toBe('pt');
    expect(events).toEqual(['change']);

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Home}');
    await userEvent.keyboard('{Tab}');
    expect(el.value).toBe('pt');
    expect(document.activeElement?.id).toBe('after');

    const unselected = await mountSelect();
    trigger(unselected).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(trigger(unselected).getAttribute('aria-activedescendant')).toBe(rows(unselected)[0]?.id);
    await userEvent.keyboard('f');
    expect(unselected.value).toBe('');
  });

  it('S13 S24 submits selected values and omits unselected values', async () => {
    const selected = await mountForm('value="fr"');
    expect(new FormData(selected.form).get('country')).toBe('fr');

    const empty = await mountForm();
    expect(new FormData(empty.form).has('country')).toBe(false);
  });

  it('S24 does not auto-select an empty-value option when no default is declared', async () => {
    const { form, el } = await mountForm(
      '',
      `<ki-option value="">None</ki-option><ki-option value="fr">France</ki-option>`,
    );

    expect(el.value).toBe('');
    expect(valueText(el)).toBe('Choose a country');
    expect(new FormData(form).has('country')).toBe(false);
  });

  it('S25 mirrors a mutated selected-option value into the select value', async () => {
    const el = await mountSelect('value="fr"');
    expect(el.value).toBe('fr');

    el.querySelector('ki-option[value="fr"]')?.setAttribute('value', 'FR');
    await new Promise((resolve) => setTimeout(resolve, 60));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.value).toBe('FR');
    expect(valueText(el)).toBe('France');
  });

  it('S16 a disabled required select is not reported invalid', async () => {
    const { el } = await mountForm('required disabled');

    expect(trigger(el).hasAttribute('aria-invalid')).toBe(false);
    expect(el.matches(':state(user-invalid)')).toBe(false);
  });

  it('S14 blocks required empty submission and clears invalid after commit', async () => {
    const { form, el } = await mountForm('required');
    let submitted = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted = true;
    });

    form.requestSubmit();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(submitted).toBe(false);
    expect(trigger(el).getAttribute('aria-invalid')).toBe('true');
    expect(el.matches(':invalid')).toBe(true);

    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    rows(el)[1]?.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(trigger(el).hasAttribute('aria-invalid')).toBe(false);

    const emptyOption = await mountForm(
      'required',
      `<ki-option value="">Choose</ki-option><ki-option value="fr">France</ki-option>`,
    );
    trigger(emptyOption.el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    rows(emptyOption.el)[0]?.click();
    expect(emptyOption.el.matches(':invalid')).toBe(true);
  });

  it('S15 resets to the declared value silently', async () => {
    const { form, el } = await mountForm('value="fr"');
    const changes: Event[] = [];
    el.addEventListener('change', (event) => changes.push(event));

    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    rows(el)[2]?.click();
    expect(el.value).toBe('pt');

    form.reset();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(el.value).toBe('fr');
    expect(valueText(el)).toBe('France');
    expect(changes).toHaveLength(1);
  });

  it('S16 honors disabled fieldsets', async () => {
    const { form, el } = await mountForm('value="fr"');
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    while (form.firstChild) {
      fieldset.append(form.firstChild);
    }
    form.append(fieldset);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    trigger(el).click();
    expect(trigger(el).disabled).toBe(true);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    expect(new FormData(form).has('country')).toBe(false);
  });

  it('S17 S19 rethemes with material3 and keeps RTL logical ordering', async () => {
    const el = await mountSelect();
    const baseBg = getComputedStyle(trigger(el)).backgroundColor;
    const style = document.createElement('style');
    style.textContent = material3Css;
    document.head.append(style);
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(getComputedStyle(trigger(el)).backgroundColor).not.toBe(baseBg);

    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(getComputedStyle(rowAt(el, 0)).backgroundColor).toBeTruthy();

    document.documentElement.setAttribute('dir', 'rtl');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const valueBox = el.shadowRoot?.querySelector('[part="value"]')?.getBoundingClientRect();
    const indicatorBox = el.shadowRoot
      ?.querySelector('[part="indicator"]')
      ?.getBoundingClientRect();
    expect(valueBox && indicatorBox ? valueBox.left > indicatorBox.left : false).toBe(true);
  });
});
