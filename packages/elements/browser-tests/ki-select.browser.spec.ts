import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:005-ki-select
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III).
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';
import { defineCustomElement as defineKiSelect } from '../dist/components/ki-select.js';
import { expectAccessible } from './axe';

type KiSelectElement = HTMLElement & {
  value: string;
  disabled: boolean;
  required: boolean;
};

const browserCommands = commands as unknown as {
  installClock: () => Promise<void>;
  pauseClock: () => Promise<void>;
  fastForwardClock: (milliseconds: number) => Promise<void>;
  resumeClock: () => Promise<void>;
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
  main.innerHTML = `<ki-select label="Country" placeholder="Choose a country" ${attrs}>${options}</ki-select><button id="after" tabindex="0">After</button>`;
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

  it('S1 choosing the option that is already selected closes without input or change events', async () => {
    const el = await mountSelect('value="fr"');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));

    await userEvent.click(trigger(el));
    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(rowAt(el, 1));

    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'false');
    expect(el.value).toBe('fr');
    expect(events).toEqual([]);
  });

  it('S3 disabling a select while its options are open closes them', async () => {
    const el = await mountSelect();

    await userEvent.click(trigger(el));
    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'true');
    el.disabled = true;

    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'false');
    expect(trigger(el).disabled).toBe(true);
  });

  // Select-only combobox (APG): DOM focus stays on the combobox while the
  // options are pointed at through aria-activedescendant. A real pointer press
  // moves focus onto the pressed row, and the row is then hidden with the
  // popup — so these use real clicks, not element.click().
  it('S1 choosing an option with the pointer returns focus to the trigger', async () => {
    const el = await mountSelect();

    await userEvent.click(trigger(el));
    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(rowAt(el, 1));

    expect(el.value).toBe('fr');
    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(el);
    expect(el.shadowRoot?.activeElement).toBe(trigger(el));
  });

  it('S4 pressing a disabled option keeps the open select operable from the keyboard', async () => {
    const el = await mountSelect(
      '',
      `<ki-option value="es">Spain</ki-option><ki-option value="fr" disabled>France</ki-option>`,
    );

    await userEvent.click(trigger(el));
    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'true');
    // force: the row is exposed unavailable, so the driver would wait for it.
    await userEvent.click(rowAt(el, 1), { force: true });

    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
    expect(el.shadowRoot?.activeElement).toBe(trigger(el));
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'false');
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

  it('S20 moving focus outside the open select closes it without committing', async () => {
    const el = await mountSelect('value="es"');
    const events: Event[] = [];
    el.addEventListener('change', (event) => events.push(event));

    trigger(el).focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{End}');
    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'true');
    document.querySelector<HTMLElement>('#after')?.focus();

    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'false');
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
    await expectAccessible(main());

    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await expectAccessible(main());

    await mountSelect('disabled');
    await expectAccessible(main());
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

  it.each(['Alt', 'Control', 'Meta'])(
    'S7 leaves Arrow Down held with %s to the browser and stays closed',
    async (modifier) => {
      const el = await mountSelect('value="fr"');

      trigger(el).focus();
      await userEvent.keyboard(`{${modifier}>}{ArrowDown}{/${modifier}}`);
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
      expect(el.value).toBe('fr');
    },
  );

  it('S8 S9 S10 S21 S22 S23 implements the approved keyboard path', async () => {
    const el = await mountSelect(
      '',
      `<ki-option value="es">Spain</ki-option><ki-option value="fr" disabled>France</ki-option><ki-option value="pt">Portugal</ki-option>`,
    );
    const events: string[] = [];
    el.addEventListener('change', () => events.push('change'));
    const firstId = rows(el)[0]?.id ?? '';
    const lastId = rows(el)[2]?.id ?? '';

    trigger(el).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(trigger(el)).toHaveAttribute('aria-activedescendant', firstId);
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(trigger(el)).toHaveAttribute('aria-activedescendant', lastId);
    await userEvent.keyboard('{Home}');
    await expect.element(trigger(el)).toHaveAttribute('aria-activedescendant', firstId);
    await userEvent.keyboard('{End}');
    await expect.element(trigger(el)).toHaveAttribute('aria-activedescendant', lastId);
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
    await expect
      .element(trigger(unselected))
      .toHaveAttribute('aria-activedescendant', rows(unselected)[0]?.id ?? '');
    await userEvent.keyboard('f');
    expect(unselected.value).toBe('');
  });

  // The active option is what assistive technology announces: it must never
  // point at an option that stopped being available while the list is open.
  it('S22 moves the highlight off an option that is disabled or removed while the list is open', async () => {
    const el = await mountSelect();
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    const activeText = (): string =>
      el.shadowRoot
        ?.getElementById(trigger(el).getAttribute('aria-activedescendant') ?? '')
        ?.textContent.trim() ?? '';

    trigger(el).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(activeText).toBe('Spain');

    el.querySelector('ki-option[value="es"]')?.setAttribute('disabled', '');
    await expect.poll(activeText).toBe('France');

    el.querySelector('ki-option[value="fr"]')?.remove();
    await expect.poll(activeText).toBe('Portugal');

    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
    expect(el.value).toBe('');
    expect(events).toEqual([]);
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

    // The mirror runs from a MutationObserver plus a queued re-render: poll
    // the observable outcome instead of guessing a settle delay.
    await expect.poll(() => el.value).toBe('FR');
    await expect.poll(() => valueText(el)).toBe('France');
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

    // MarsUI Dropdown danger state: a persistent 3px Focus/danger ring
    // (danger-500 at 20% light) composes over the secondary_default rest
    // elevation. Poll: box-shadow is motion-gated (120ms transition).
    await expect
      .poll(() => getComputedStyle(trigger(el)).boxShadow)
      .toContain('rgba(240, 81, 73, 0.2)');

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

  it('S15 resetting a form after a blocked submission clears the invalid state', async () => {
    const { form, el } = await mountForm('required');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });

    form.requestSubmit();
    await expect.element(trigger(el)).toHaveAttribute('aria-invalid', 'true');
    form.reset();

    await expect.element(trigger(el)).not.toHaveAttribute('aria-invalid');
    expect(el.value).toBe('');
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
    // Poll: background-color is motion-gated (120ms transition), so the first
    // frame after retheming may still be mid-transition.
    await expect.poll(() => getComputedStyle(trigger(el)).backgroundColor).not.toBe(baseBg);

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

  it('S17 paints the MarsUI Dropdown trigger geometry, typography, and rest elevation', async () => {
    const el = await mountSelect();
    const triggerEl = trigger(el);
    const cs = getComputedStyle(triggerEl);

    // Input_cell: min-height 40px border-box, padding-inline 10px (Space/lg),
    // radius 10px (Radius/component/radius_md), 1px hairline border.
    expect(triggerEl.getBoundingClientRect().height).toBe(40);
    expect(cs.paddingInlineStart).toBe('10px');
    expect(cs.paddingInlineEnd).toBe('10px');
    expect(cs.borderTopLeftRadius).toBe('10px');
    expect(cs.borderBlockStartWidth).toBe('1px');

    // Value text UI/Body 1/medium: 13px / 24px / weight 600.
    expect(cs.fontSize).toBe('13px');
    expect(cs.fontWeight).toBe('600');
    expect(cs.lineHeight).toBe('24px');

    // Rest fill white (light) + Component_effect/secondary_default:
    // drop 0/2/1.5/-0.5 Elevation/shadow plus inner White/3 0/2/3.
    expect(cs.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(cs.boxShadow).not.toBe('none');
    expect(cs.boxShadow).toContain('inset');

    // Input_label row: UI/Para/medium 13/20/600 with 2px (Space/xxs) inset.
    const label = el.shadowRoot?.querySelector('[part="label"]');
    expect(label).toBeInstanceOf(HTMLElement);
    const labelCs = label ? getComputedStyle(label) : null;
    expect(labelCs?.paddingInlineStart).toBe('2px');
    expect(labelCs?.fontSize).toBe('13px');
    expect(labelCs?.fontWeight).toBe('600');
    expect(labelCs?.lineHeight).toBe('20px');
  });

  it('S17 draws the indicator as an 18px slot with an inset hairline chevron that flips open', async () => {
    const el = await mountSelect();
    const indicator = el.shadowRoot?.querySelector('[part="indicator"]');
    expect(indicator).toBeInstanceOf(HTMLElement);
    if (!indicator) {
      throw new Error('missing indicator');
    }

    // 18x18 icon slot; the glyph is an 8px (Space/md) border-box square whose
    // trailing hairlines rotate into a ~11x6px chevron (box no longer paints).
    const box = indicator.getBoundingClientRect();
    expect(box.width).toBe(18);
    expect(box.height).toBe(18);
    const glyph = getComputedStyle(indicator, '::before');
    expect(glyph.borderBottomWidth).toBe('1px');
    expect(glyph.borderRightWidth).toBe('1px');
    // 8px BORDER-BOX square carrying the trailing hairlines. Chromium
    // resolves the `width` property to its used value, which under
    // `box-sizing: border-box` describes the border box (8px), not the 7px
    // content box the first draft of this assertion predicted.
    expect(glyph.boxSizing).toBe('border-box');
    expect(glyph.width).toBe('8px');
    expect(glyph.transform).not.toBe('none');

    // Open state rotates the chevron half a turn (transform-only motion).
    const restTransform = glyph.transform;
    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await expect
      .poll(() => getComputedStyle(indicator, '::before').transform)
      .not.toBe(restTransform);
  });

  it('S17 opens a glass Dropmenu panel with MarsUI row geometry and highlight elevation', async () => {
    const el = await mountSelect();
    trigger(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Dropmenu panel: radius 20px (Radius/big_component/radius_sm), content
    // inset 12px (Space/xl), White/80 glass + BACKGROUND_BLUR Blur/48 (24px),
    // Elevation/e3.
    const listbox = el.shadowRoot?.querySelector('[part="listbox"]');
    expect(listbox).toBeInstanceOf(HTMLElement);
    const listboxCs = listbox ? getComputedStyle(listbox) : null;
    expect(listboxCs?.borderTopLeftRadius).toBe('20px');
    expect(listboxCs?.paddingBlockStart).toBe('12px');
    expect(listboxCs?.backdropFilter).toBe('blur(24px)');
    expect(listboxCs?.backgroundColor).toBe('rgba(255, 255, 255, 0.8)');
    expect(listboxCs?.boxShadow).not.toBe('none');

    // Menu rows: height 36px (Space/11xl), radius 12px, padding-inline 8px,
    // label UI/Para/medium 13/20/600.
    const row = rowAt(el, 0);
    const rowCs = getComputedStyle(row);
    expect(rowCs.minHeight).toBe('36px');
    expect(rowCs.borderTopLeftRadius).toBe('12px');
    expect(rowCs.paddingInlineStart).toBe('8px');
    expect(rowCs.fontSize).toBe('13px');
    expect(rowCs.fontWeight).toBe('600');
    expect(rowCs.lineHeight).toBe('20px');

    // Pointer-open highlights the first enabled row: the hover_overlay_inverse
    // wash rides Elevation/e1. Poll: box-shadow is motion-gated (120ms).
    expect(row.getAttribute('data-highlighted')).toBe('true');
    await expect.poll(() => getComputedStyle(rowAt(el, 0)).boxShadow).not.toBe('none');
  });

  it('S17 hovers with a hover_overlay_inverse wash over the same rest fill', async () => {
    const el = await mountSelect();
    const restBg = getComputedStyle(trigger(el)).backgroundColor;

    await userEvent.hover(trigger(el));

    // Figma hover: SAME fill + hover_overlay_inverse gradient (Black/3 light);
    // the fill must NOT step to another surface.
    await expect
      .poll(() => getComputedStyle(trigger(el)).backgroundImage)
      .toContain('linear-gradient');
    expect(getComputedStyle(trigger(el)).backgroundColor).toBe(restBg);
  });
});

// APG select-only combobox: printable characters move the active option to
// the next one that starts with what was typed. Characters typed in quick
// succession build one string; a pause starts a new one.
describe('ki-select typeahead', () => {
  const countries = `
    <ki-option value="es">Spain</ki-option>
    <ki-option value="fr">France</ki-option>
    <ki-option value="pt">Portugal</ki-option>
    <ki-option value="pl">Poland</ki-option>
  `;

  function activeOption(el: KiSelectElement): string {
    const id = trigger(el).getAttribute('aria-activedescendant') ?? '';
    return el.shadowRoot?.getElementById(id)?.textContent ?? '';
  }

  /** Open from the keyboard with no selection: "Spain" is the active option. */
  async function openCountries(): Promise<KiSelectElement> {
    const el = await mountSelect('', countries);
    trigger(el).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => activeOption(el)).toBe('Spain');
    return el;
  }

  it('S27 typing a character on the closed select opens it on the matching option', async () => {
    const el = await mountSelect('', countries);
    trigger(el).focus();

    await userEvent.keyboard('f');

    await expect.element(trigger(el)).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => activeOption(el)).toBe('France');
    // Typing moves the active option; it never commits.
    expect(el.value).toBe('');
  });

  it('S27 typing a character moves the active option of the open select', async () => {
    const el = await openCountries();

    await userEvent.keyboard('f');

    await expect.poll(() => activeOption(el)).toBe('France');
    expect(el.value).toBe('');
  });

  it('S27 characters typed in quick succession match as one string', async () => {
    const el = await openCountries();

    await userEvent.keyboard('pol');

    await expect.poll(() => activeOption(el)).toBe('Poland');
  });

  it('S27 repeating a character walks the options that start with it', async () => {
    const el = await openCountries();

    await userEvent.keyboard('p');
    await expect.poll(() => activeOption(el)).toBe('Portugal');
    await userEvent.keyboard('p');
    await expect.poll(() => activeOption(el)).toBe('Poland');
    await userEvent.keyboard('p');
    await expect.poll(() => activeOption(el)).toBe('Portugal');
  });

  it('S27 a pause starts a new string instead of extending the previous one', async () => {
    await browserCommands.installClock();
    try {
      const el = await openCountries();
      await browserCommands.pauseClock();

      await userEvent.keyboard('p');
      // Under the paused clock Stencil renders only once a frame elapses.
      await browserCommands.fastForwardClock(20);
      expect(activeOption(el)).toBe('Portugal');

      // Typed straight after "p", the "f" would read "pf" and match nothing.
      await browserCommands.fastForwardClock(600);
      await userEvent.keyboard('f');
      await browserCommands.fastForwardClock(20);

      expect(activeOption(el)).toBe('France');
    } finally {
      await browserCommands.resumeClock();
    }
  });

  it('S27 a string no option starts with leaves the active option where it was', async () => {
    const el = await openCountries();

    await userEvent.keyboard('pf');

    await expect.poll(() => activeOption(el)).toBe('Portugal');
  });

  it('S27 S22 typeahead skips a disabled option', async () => {
    const el = await mountSelect(
      '',
      `<ki-option value="es">Spain</ki-option><ki-option value="pt" disabled>Portugal</ki-option><ki-option value="pl">Poland</ki-option>`,
    );
    trigger(el).focus();

    await userEvent.keyboard('p');

    await expect.poll(() => activeOption(el)).toBe('Poland');
  });

  it('S27 the matching option is brought into view in a list longer than the panel', async () => {
    const letters = [
      'Alpha',
      'Beta',
      'Gamma',
      'Delta',
      'Epsilon',
      'Zeta',
      'Eta',
      'Theta',
      'Iota',
      'Kappa',
      'Lambda',
      'Mu',
    ];
    const el = await mountSelect(
      '',
      letters.map((letter) => `<ki-option>${letter}</ki-option>`).join(''),
    );
    trigger(el).focus();

    await userEvent.keyboard('k');

    await expect.poll(() => activeOption(el)).toBe('Kappa');
    const listbox = el.shadowRoot?.querySelector('[part="listbox"]');
    if (!listbox) {
      throw new Error('missing listbox');
    }
    // Both boxes are read together on every attempt: the panel is still
    // easing in when the highlight lands, so a box read once goes stale.
    await expect
      .poll(() => {
        const panel = listbox.getBoundingClientRect();
        const row = rowAt(el, 9).getBoundingClientRect();
        return row.top >= panel.top && row.bottom <= panel.bottom;
      })
      .toBe(true);
  });
});

// WCAG 2.4.7 / 1.4.11 / 1.4.1: whoever moves through the list with the arrow
// keys must be able to see where they are, and the committed choice must not
// rest on a tint alone. Measured on the rendered result, in every theme and
// scheme the tokens ship, against the panel the rows actually sit on.
describe('ki-select active and selected options can be told apart', () => {
  const contexts = [
    { theme: 'onmars', scheme: 'light' },
    { theme: 'onmars', scheme: 'dark' },
    { theme: 'material3', scheme: 'light' },
    { theme: 'material3', scheme: 'dark' },
  ] as const;

  type Rgba = [red: number, green: number, blue: number, alpha: number];

  function parseColor(color: string): Rgba {
    const channels =
      /rgba?\(([^)]+)\)/
        .exec(color)?.[1]
        ?.split(/[\s,/]+/)
        .map(Number) ?? [];
    const [red, green, blue, alpha = 1] = channels;
    if (red === undefined || green === undefined || blue === undefined) {
      throw new Error(`Unparseable color: ${color}`);
    }
    return [red, green, blue, alpha];
  }

  function over([red, green, blue, alpha]: Rgba, [backRed, backGreen, backBlue]: Rgba): Rgba {
    const mix = (front: number, back: number): number => front * alpha + back * (1 - alpha);
    return [mix(red, backRed), mix(green, backGreen), mix(blue, backBlue), 1];
  }

  /** WCAG relative luminance. */
  function luminance([red, green, blue]: Rgba): number {
    const channel = (value: number): number => {
      const normalized = value / 255;
      return normalized <= 0.040_45 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
  }

  function contrast(first: Rgba, second: Rgba): number {
    const lighter = Math.max(luminance(first), luminance(second));
    const darker = Math.min(luminance(first), luminance(second));
    return (lighter + 0.05) / (darker + 0.05);
  }

  /** The panel as painted: its (possibly translucent) fill over the page. */
  function panel(el: KiSelectElement): Rgba {
    const listbox = el.shadowRoot?.querySelector('[part="listbox"]');
    if (!listbox) {
      throw new Error('missing listbox');
    }
    return over(
      parseColor(getComputedStyle(listbox).backgroundColor),
      parseColor(getComputedStyle(document.body).backgroundColor),
    );
  }

  /** France is selected; the keyboard has moved the active option to Portugal. */
  async function openWithPortugalActive(
    theme: (typeof contexts)[number]['theme'],
    scheme: (typeof contexts)[number]['scheme'],
  ): Promise<KiSelectElement> {
    const el = await mountSelect('value="fr"');
    const page = document.createElement('style');
    // The page contract (@kimen/tokens/css/base): the page sits on surface s0.
    page.textContent = `${material3Css} body { background-color: var(--ki-surface-s0); }`;
    document.body.append(page);
    document.documentElement.setAttribute('data-ki-theme', theme);
    document.documentElement.setAttribute('data-ki-color-scheme', scheme);

    trigger(el).focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(trigger(el)).toHaveAttribute('aria-activedescendant', rowAt(el, 2).id);
    return el;
  }

  it.each(contexts)(
    'S7 the keyboard-active option shows an indicator at 3:1 or more against the panel ($theme $scheme)',
    async ({ theme, scheme }) => {
      const el = await openWithPortugalActive(theme, scheme);
      const active = getComputedStyle(rowAt(el, 2));

      expect(active.outlineStyle).toBe('solid');
      expect(Number.parseFloat(active.outlineWidth)).toBeGreaterThanOrEqual(2);
      expect(contrast(parseColor(active.outlineColor), panel(el))).toBeGreaterThanOrEqual(3);
      // The indicator says where the keyboard is: no other row carries it.
      expect(getComputedStyle(rowAt(el, 0)).outlineStyle).toBe('none');
      expect(getComputedStyle(rowAt(el, 1)).outlineStyle).toBe('none');
    },
  );

  it.each(contexts)(
    'S12 the selected option carries a mark that does not rely on colour ($theme $scheme)',
    async ({ theme, scheme }) => {
      const el = await openWithPortugalActive(theme, scheme);
      const mark = getComputedStyle(rowAt(el, 1), '::after');

      // A drawn glyph in the label ink, not text and not a tint.
      expect(mark.content).toBe('""');
      expect(Number.parseFloat(mark.inlineSize)).toBeGreaterThan(0);
      expect(Number.parseFloat(mark.blockSize)).toBeGreaterThan(0);
      expect(Number.parseFloat(mark.borderBlockEndWidth)).toBeGreaterThan(0);
      expect(mark.borderBlockEndColor).toBe(getComputedStyle(rowAt(el, 1)).color);
      expect(contrast(parseColor(mark.borderBlockEndColor), panel(el))).toBeGreaterThanOrEqual(3);
      // Unselected rows, the active one included, carry no mark.
      expect(getComputedStyle(rowAt(el, 0), '::after').content).toBe('none');
      expect(getComputedStyle(rowAt(el, 2), '::after').content).toBe('none');
    },
  );
});

// Boolean presence semantics (native HTML parity): a present attribute means
// true whatever its value. Stencil >= 4.45 removes a host attribute when it
// reflects a parsed `false`, so these run against the built output.
describe('ki-select boolean presence in a real browser', () => {
  async function frames(count = 2): Promise<void> {
    for (let index = 0; index < count; index += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  it('S26 disabled="false" and required="false" in the markup keep the select disabled and required', async () => {
    const el = await mountSelect('disabled="false" required="false"');

    expect(trigger(el).disabled).toBe(true);
    expect(trigger(el).getAttribute('aria-required')).toBe('true');
    trigger(el).click();
    await frames();
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    // Presence is normalized: the host attribute stays, with an empty value.
    expect(el.getAttribute('disabled')).toBe('');
    expect(el.getAttribute('required')).toBe('');
  });

  it('S26 disabled="false" written after the first render disables the select', async () => {
    const el = await mountSelect();
    expect(trigger(el).disabled).toBe(false);

    el.setAttribute('disabled', 'false');
    await frames();

    expect(trigger(el).disabled).toBe(true);
    trigger(el).click();
    await frames();
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    // Presence is normalized: the host attribute stays, with an empty value.
    expect(el.getAttribute('disabled')).toBe('');
  });

  it('S26 disabled="false" keeps an option unavailable in the markup and after the first render', async () => {
    const el = await mountSelect(
      '',
      `<ki-option value="es">Spain</ki-option><ki-option value="fr" disabled="false">France</ki-option><ki-option value="pt">Portugal</ki-option>`,
    );
    const options = [...el.querySelectorAll('ki-option')];

    options[2]?.setAttribute('disabled', 'false');
    await frames();

    trigger(el).click();
    await frames();
    expect(rowAt(el, 1).getAttribute('aria-disabled')).toBe('true');
    expect(rowAt(el, 2).getAttribute('aria-disabled')).toBe('true');
    rowAt(el, 1).click();
    rowAt(el, 2).click();
    await frames();
    expect(el.value).toBe('');
    expect(valueText(el)).toBe('Choose a country');
    // Presence is normalized: the host attribute stays, with an empty value.
    expect(options[1]?.getAttribute('disabled')).toBe('');
    expect(options[2]?.getAttribute('disabled')).toBe('');
  });

  // Presence semantics are about ATTRIBUTES. Framework wrappers assign
  // PROPERTIES, and Stencil un-reflects a cleared property only at the next
  // render: state derived from the still-present attribute goes stale.
  it('S14 clearing the required property lifts the requirement from the form', async () => {
    const { form, el } = await mountForm('required');
    expect(form.checkValidity()).toBe(false);

    el.required = false;
    await frames();

    expect(form.checkValidity()).toBe(true);
    expect(el.matches(':invalid')).toBe(false);
    expect(trigger(el).hasAttribute('aria-required')).toBe(false);
  });
});
