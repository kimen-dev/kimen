import { h } from '@stencil/core';
import { afterEach, describe, expect, it, render, vi } from '@stencil/vitest';
import {
  normalizeBooleanPresence,
  optionValue,
  resolveSelection,
  type SelectOptionRecord,
  selectFormValue,
  selectValueMissing,
} from './ki-select.form';
import {
  firstEnabled,
  keyIntent,
  lastEnabled,
  moveHighlight,
  openHighlight,
} from './ki-select.keyboard';

type KiSelectHost = HTMLElement & {
  disabled: boolean;
  formDisabledCallback(disabled: boolean): void;
  formResetCallback(): void;
  label: string;
  name?: string;
  placeholder: string;
  required: boolean;
  value: string;
};

interface KiSelectHarness {
  disconnectedCallback(): void;
  donorElement?: HTMLSelectElement | undefined;
  formDisabledCallback(disabled: boolean): void;
  formResetCallback(): void;
  handleInvalid(): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleSlotChange(): void;
  internals: {
    setFormValue(value: string | null): void;
    setValidity(flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement): void;
  };
  mutationObserver?: MutationObserver | undefined;
  setDonorRef(element?: HTMLSelectElement): void;
  setTriggerRef(element?: HTMLButtonElement): void;
  stateAttributeChanged(): void;
  triggerElement?: HTMLButtonElement | undefined;
  valueChanged(nextValue: string): void;
}

const countryOptions = `
  <ki-option value="es">Spain</ki-option>
  <ki-option value="fr">France</ki-option>
  <ki-option value="pt">Portugal</ki-option>
`;

async function aCountrySelect(attrs = '', options = countryOptions) {
  const result = await render<KiSelectHost, KiSelectHarness>(`
    <ki-select label="Country" placeholder="Choose a country" ${attrs}>
      ${options}
    </ki-select>
  `);
  await result.waitForChanges();
  return result;
}

function sourceInstance(rootInstance: unknown): KiSelectHarness {
  const host = rootInstance as {
    __stencil__getHostRef?: () => { $lazyInstance$?: unknown; o?: unknown };
  };
  const hostRef = host.__stencil__getHostRef?.();
  return (hostRef?.$lazyInstance$ ?? hostRef?.o ?? rootInstance) as KiSelectHarness;
}

function trigger(root: KiSelectHost): HTMLButtonElement {
  const element = root.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
  if (!element) {
    throw new Error('missing trigger');
  }
  return element;
}

function rows(root: KiSelectHost): HTMLElement[] {
  return [...(root.shadowRoot?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
}

function press(
  instance: KiSelectHarness,
  key: string,
  modifiers: Pick<KeyboardEventInit, 'altKey' | 'ctrlKey' | 'metaKey'> = {},
): KeyboardEvent {
  const event = new Event('keydown', {
    bubbles: true,
    cancelable: true,
  }) as KeyboardEvent;
  Object.defineProperties(event, {
    altKey: { value: modifiers.altKey ?? false },
    ctrlKey: { value: modifiers.ctrlKey ?? false },
    key: { value: key },
    metaKey: { value: modifiers.metaKey ?? false },
  });
  instance.handleKeyDown(event);
  return event;
}

function announceSlotChange(root: KiSelectHost): void {
  const slot = root.shadowRoot?.querySelector('slot');
  if (!slot) {
    throw new Error('missing data slot');
  }
  slot.dispatchEvent(new Event('slotchange'));
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// @spec:005-ki-select
describe('ki-select', () => {
  it('S2 renders closed combobox anatomy with mirrored option rows', async () => {
    const { root } = await render(
      <ki-select label="Country" placeholder="Choose a country" value="fr">
        <ki-option value="es">Spain</ki-option>
        <ki-option value="fr">France</ki-option>
        <ki-option value="pt" disabled>
          Portugal
        </ki-option>
      </ki-select>,
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const label = root.shadowRoot?.querySelector('label[part="label"]');
    const trigger = root.shadowRoot?.querySelector('button[part="trigger"]');
    const listbox = root.shadowRoot?.querySelector('[part="listbox"]');
    const rows = root.shadowRoot?.querySelectorAll('[role="option"]');
    const donor = root.shadowRoot?.querySelector('select.validity-donor');

    expect(label?.getAttribute('for')).toBe(trigger?.id);
    expect(trigger?.getAttribute('role')).toBe('combobox');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.getAttribute('aria-controls')).toBe(listbox?.id);
    expect(trigger?.querySelector('[part="value"]')).toHaveTextContent('France');
    expect(trigger?.querySelector('[part="indicator"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(listbox?.getAttribute('role')).toBe('listbox');
    expect(listbox?.hasAttribute('hidden')).toBe(true);
    expect(rows).toHaveLength(3);
    expect(rows?.[1]?.getAttribute('aria-selected')).toBe('true');
    expect(rows?.[2]?.getAttribute('aria-disabled')).toBe('true');
    expect(donor?.getAttribute('tabindex')).toBe('-1');
    expect(donor?.getAttribute('aria-hidden')).toBe('true');
  });

  it('S2 exposes exact defaults, ids, and placeholder state', async () => {
    const result = await render<KiSelectHost>(<ki-select />);
    await result.waitForChanges();

    const root = result.root;
    const button = trigger(root);
    const label = root.shadowRoot?.querySelector('[part="label"]');
    const listbox = root.shadowRoot?.querySelector('[part="listbox"]');
    const value = button.querySelector('[part="value"]');

    expect(root.label).toBe('');
    expect(root.placeholder).toBe('');
    expect(root.name).toBeUndefined();
    expect(root.value).toBe('');
    expect(root.disabled).toBe(false);
    expect(root.required).toBe(false);
    expect(label?.id).toBe('label');
    expect(button.id).toBe('trigger');
    expect(listbox?.id).toBe('listbox');
    expect(button.tabIndex).toBe(0);
    expect(button.hasAttribute('aria-activedescendant')).toBe(false);
    expect(button.hasAttribute('aria-required')).toBe(false);
    expect(button.hasAttribute('aria-invalid')).toBe(false);
    expect(value?.getAttribute('data-placeholder')).toBe('true');
    expect(rows(root)).toHaveLength(0);
  });

  it('S2 mirrors only ki-option children with trimmed labels and exact row state', async () => {
    const { root } = await aCountrySelect(
      'value="France" required name="country"',
      `
        <span>ignored</span>
        <ki-option> France </ki-option>
        <ki-option value="pt" disabled="false">Portugal</ki-option>
      `,
    );

    const button = trigger(root);
    const optionRows = rows(root);

    expect(root.name).toBe('country');
    expect(root.value).toBe('France');
    expect(button.getAttribute('aria-required')).toBe('true');
    expect(button.querySelector('[part="value"]')).toHaveTextContent('France');
    expect(button.querySelector('[part="value"]')?.hasAttribute('data-placeholder')).toBe(false);
    expect(optionRows).toHaveLength(2);
    expect(optionRows[0]?.id).toBe('option-0');
    expect(optionRows[0]?.textContent).toBe('France');
    expect(optionRows[0]?.getAttribute('aria-selected')).toBe('true');
    expect(optionRows[0]?.hasAttribute('aria-disabled')).toBe(false);
    expect(optionRows[0]?.getAttribute('data-highlighted')).toBeNull();
    expect(optionRows[0]?.getAttribute('tabindex')).toBe('-1');
    expect(optionRows[1]?.id).toBe('option-1');
    expect(optionRows[1]?.getAttribute('aria-selected')).toBe('false');
    expect(optionRows[1]?.getAttribute('aria-disabled')).toBe('true');
  });

  it('S3 applies boolean-presence disabling to render and form state', async () => {
    const { root } = await aCountrySelect('disabled="false" required');

    const button = trigger(root);

    expect(root.getAttribute('disabled')).toBe('false');
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.tabIndex).toBe(-1);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.hasAttribute('aria-invalid')).toBe(false);
  });

  it('S1 opens at the selected option, scrolls it, and toggles closed', async () => {
    const { root, waitForChanges } = await aCountrySelect('value="fr"');
    const selectedRow = rows(root)[1];
    const scrollIntoView = vi.fn();
    Object.defineProperty(selectedRow, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    trigger(root).click();
    await waitForChanges();

    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-1');
    expect(rows(root)[1]?.getAttribute('data-highlighted')).toBe('true');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });

    trigger(root).click();
    await waitForChanges();

    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
    expect(trigger(root).hasAttribute('aria-activedescendant')).toBe(false);
    expect(rows(root)[1]?.hasAttribute('data-highlighted')).toBe(false);
  });

  it('S1 commits a pointer selection and emits input before change exactly once', async () => {
    const { root, waitForChanges } = await aCountrySelect();
    const events: [string, boolean, boolean][] = [];
    root.addEventListener('input', (event) => {
      events.push([event.type, event.bubbles, event.composed]);
    });
    root.addEventListener('change', (event) => {
      events.push([event.type, event.bubbles, event.composed]);
    });

    trigger(root).click();
    rows(root)[1]?.click();
    await waitForChanges();

    expect(root.value).toBe('fr');
    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('France');
    expect(rows(root)[1]?.getAttribute('aria-selected')).toBe('true');
    expect(events).toEqual([
      ['input', true, true],
      ['change', true, true],
    ]);
  });

  it('S4 leaves disabled options open and inert', async () => {
    const { root, waitForChanges } = await aCountrySelect(
      '',
      '<ki-option value="es">Spain</ki-option><ki-option value="fr" disabled>France</ki-option>',
    );
    const changes = vi.fn();
    root.addEventListener('change', changes);

    trigger(root).click();
    rows(root)[1]?.click();
    await waitForChanges();

    expect(root.value).toBe('');
    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('Choose a country');
    expect(changes).not.toHaveBeenCalled();
  });

  it('S22 re-derives the active option after disabling, reordering, and removing it while open', async () => {
    const { root, waitForChanges } = await aCountrySelect();
    const input = vi.fn();
    const change = vi.fn();
    const spain = root.querySelector<HTMLElement>('ki-option[value="es"]');
    const france = root.querySelector<HTMLElement>('ki-option[value="fr"]');
    const portugal = root.querySelector<HTMLElement>('ki-option[value="pt"]');
    if (!spain || !france || !portugal) {
      throw new Error('missing country option');
    }
    root.addEventListener('input', input);
    root.addEventListener('change', change);

    trigger(root).click();
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-0');
    expect(rows(root)[0]).toHaveTextContent('Spain');

    spain.setAttribute('disabled', '');
    announceSlotChange(root);
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-1');
    expect(rows(root)[1]).toHaveTextContent('France');
    expect(rows(root)[1]?.getAttribute('data-highlighted')).toBe('true');

    root.append(france);
    announceSlotChange(root);
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-1');
    expect(rows(root)[1]).toHaveTextContent('Portugal');
    expect(rows(root)[1]?.getAttribute('data-highlighted')).toBe('true');

    portugal.remove();
    announceSlotChange(root);
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-1');
    expect(rows(root)).toHaveLength(2);
    expect(rows(root)[1]).toHaveTextContent('France');
    expect(rows(root)[1]?.getAttribute('data-highlighted')).toBe('true');
    expect(root.value).toBe('');
    expect(input).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it('S1 closes an already-selected option without re-emitting events', async () => {
    const { root, waitForChanges } = await aCountrySelect('value="fr"');
    const input = vi.fn();
    const change = vi.fn();
    root.addEventListener('input', input);
    root.addEventListener('change', change);

    trigger(root).click();
    rows(root)[1]?.click();
    await waitForChanges();

    expect(root.value).toBe('fr');
    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
    expect(input).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it('S3 ignores pointer and keyboard activation while disabled', async () => {
    const page = await aCountrySelect('disabled');
    const { root, waitForChanges } = page;
    const instance = sourceInstance(page.instance);

    trigger(root).click();
    const keyboardEvent = press(instance, 'ArrowDown');
    await waitForChanges();

    expect(keyboardEvent.defaultPrevented).toBe(false);
    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
    expect(trigger(root).hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('S20 distinguishes inside from outside pointer dismissal', async () => {
    const { root, waitForChanges } = await aCountrySelect('value="es"');

    trigger(root).click();
    root.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    await waitForChanges();

    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
    expect(root.value).toBe('es');
  });

  it('S20 keeps focus transitions inside open and closes on external focusout', async () => {
    const { root, waitForChanges } = await aCountrySelect();
    const inside = root.querySelector('ki-option');
    const outside = document.createElement('button');
    document.body.append(outside);

    trigger(root).click();
    const insideFocusOut = new Event('focusout', { bubbles: true });
    Object.defineProperty(insideFocusOut, 'relatedTarget', { value: inside });
    root.dispatchEvent(insideFocusOut);
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');

    const outsideFocusOut = new Event('focusout', { bubbles: true });
    Object.defineProperty(outsideFocusOut, 'relatedTarget', { value: outside });
    root.dispatchEvent(outsideFocusOut);
    await waitForChanges();

    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
  });

  it.each([
    ['ArrowDown', 'option-1'],
    ['ArrowUp', 'option-1'],
    ['Enter', 'option-1'],
    [' ', 'option-1'],
    ['Home', 'option-0'],
    ['End', 'option-2'],
  ])('S6 S7 opens a closed selected combobox with %s', async (key, activeId) => {
    const page = await aCountrySelect('value="fr"');
    const { root, waitForChanges } = page;
    const instance = sourceInstance(page.instance);

    const event = press(instance, key);
    await waitForChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe(activeId);
  });

  it.each([
    ['altKey', { altKey: true }],
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
  ])('S7 ignores ArrowDown modified by %s', async (_name, modifiers) => {
    const page = await aCountrySelect();
    const { root, waitForChanges } = page;
    const instance = sourceInstance(page.instance);

    const event = press(instance, 'ArrowDown', modifiers);
    await waitForChanges();

    expect(event.defaultPrevented).toBe(false);
    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
  });

  it('S8 S10 S22 moves, skips disabled rows, clamps, and supports Home/End', async () => {
    const page = await aCountrySelect(
      '',
      '<ki-option value="es">Spain</ki-option><ki-option value="fr" disabled>France</ki-option><ki-option value="pt">Portugal</ki-option>',
    );
    const { root, waitForChanges } = page;
    const instance = sourceInstance(page.instance);

    press(instance, 'ArrowDown');
    press(instance, 'ArrowDown');
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-2');

    press(instance, 'ArrowDown');
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-2');

    press(instance, 'ArrowUp');
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-0');

    press(instance, 'End');
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-2');

    press(instance, 'Home');
    await waitForChanges();
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-0');
  });

  it.each(['Enter', ' '])('S9 commits the highlighted row with %s', async (key) => {
    const page = await aCountrySelect();
    const { root, waitForChanges } = page;
    const instance = sourceInstance(page.instance);
    const change = vi.fn();
    root.addEventListener('change', change);

    press(instance, 'End');
    press(instance, key);
    await waitForChanges();

    expect(root.value).toBe('pt');
    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
    expect(change).toHaveBeenCalledTimes(1);
  });

  it('S21 Escape closes without commit and an excluded key has no effect', async () => {
    const page = await aCountrySelect('value="es"');
    const { root, waitForChanges } = page;
    const instance = sourceInstance(page.instance);
    const change = vi.fn();
    root.addEventListener('change', change);

    press(instance, 'ArrowDown');
    const excluded = press(instance, 'f');
    await waitForChanges();
    expect(excluded.defaultPrevented).toBe(false);
    expect(trigger(root).getAttribute('aria-activedescendant')).toBe('option-0');

    const escape = press(instance, 'Escape');
    await waitForChanges();

    expect(escape.defaultPrevented).toBe(true);
    expect(root.value).toBe('es');
    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
    expect(change).not.toHaveBeenCalled();
  });

  it('S23 Tab closes without preventing native focus movement or committing', async () => {
    const page = await aCountrySelect('value="es"');
    const { root, waitForChanges } = page;
    const instance = sourceInstance(page.instance);

    press(instance, 'ArrowDown');
    press(instance, 'End');
    const tab = press(instance, 'Tab');
    await waitForChanges();

    expect(tab.defaultPrevented).toBe(false);
    expect(root.value).toBe('es');
    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
  });

  it('S5 applies programmatic values silently and clears a dangling value', async () => {
    const page = await aCountrySelect();
    const { root } = page;
    const input = vi.fn();
    const change = vi.fn();
    root.addEventListener('input', input);
    root.addEventListener('change', change);

    await page.setProps({ value: 'pt' });

    expect(root.value).toBe('pt');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('Portugal');
    expect(rows(root)[2]?.getAttribute('aria-selected')).toBe('true');

    await page.setProps({ value: 'atlantis' });

    expect(root.value).toBe('');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('Choose a country');
    expect(input).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it('S11 retains a property value until later options are slotted', async () => {
    const page = await aCountrySelect('', '');
    const { root } = page;
    const instance = sourceInstance(page.instance);

    await page.setProps({ value: 'fr' });
    expect(root.value).toBe('fr');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('Choose a country');

    root.innerHTML =
      '<ki-option value="es">Spain</ki-option><ki-option value="fr">France</ki-option>';
    instance.handleSlotChange();
    await page.waitForChanges();

    expect(root.value).toBe('fr');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('France');
    expect(rows(root)[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('S25 clears a selection after every option is removed', async () => {
    const page = await aCountrySelect('value="fr"');
    const { root } = page;
    const instance = sourceInstance(page.instance);
    const change = vi.fn();
    root.addEventListener('change', change);

    root.innerHTML = '';
    instance.handleSlotChange();
    await page.waitForChanges();

    expect(root.value).toBe('');
    expect(rows(root)).toHaveLength(0);
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('Choose a country');
    expect(change).not.toHaveBeenCalled();
  });

  it('S25 preserves selected element identity across reorder and mirrors its changed value', async () => {
    const page = await aCountrySelect(
      'value="duplicate"',
      '<ki-option value="duplicate">First</ki-option><ki-option value="duplicate">Second</ki-option>',
    );
    const { root } = page;
    const instance = sourceInstance(page.instance);
    const first = root.querySelector('ki-option');
    if (!first) {
      throw new Error('missing selected option');
    }

    first.setAttribute('value', 'renamed');
    root.append(first);
    instance.handleSlotChange();
    await page.waitForChanges();

    expect(root.value).toBe('renamed');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('First');
    expect(rows(root)[0]?.getAttribute('aria-selected')).toBe('false');
    expect(rows(root)[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('S25 observes option contract changes and disconnects the previous roster observer', async () => {
    let mutationCallback: MutationCallback = () => undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    class MutationObserverHarness {
      constructor(callback: MutationCallback) {
        mutationCallback = callback;
      }

      disconnect = disconnect;
      observe = observe;
      takeRecords = () => [];
    }
    vi.stubGlobal('MutationObserver', MutationObserverHarness);

    const page = await aCountrySelect('value="fr"');
    const { root } = page;
    const selected = root.querySelector('ki-option[value="fr"]');
    if (!selected) {
      throw new Error('missing selected option');
    }

    expect(observe).toHaveBeenCalledTimes(3);
    expect(observe.mock.calls[1]?.[0]).toBe(selected);
    expect(observe.mock.calls[1]?.[1]).toEqual({
      attributeFilter: ['value', 'disabled'],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    disconnect.mockClear();
    selected.setAttribute('value', 'FR');
    mutationCallback([], {} as MutationObserver);
    await page.waitForChanges();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(root.value).toBe('FR');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('France');
  });

  it('S15 resets to the declared value silently and clears user-invalid state', async () => {
    const page = await aCountrySelect('value="fr" required');
    const { root } = page;
    const instance = sourceInstance(page.instance);
    const change = vi.fn();
    root.addEventListener('change', change);

    trigger(root).click();
    rows(root)[2]?.click();
    await page.waitForChanges();
    instance.handleInvalid();
    await page.waitForChanges();
    expect(root.value).toBe('pt');
    expect(trigger(root).getAttribute('aria-invalid')).toBe('true');

    root.formResetCallback();
    await page.waitForChanges();

    expect(root.value).toBe('fr');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('France');
    expect(trigger(root).hasAttribute('aria-invalid')).toBe(false);
    expect(change).toHaveBeenCalledTimes(1);
  });

  it('S16 closes, clears invalidity, and excludes value while fieldset-disabled', async () => {
    const page = await aCountrySelect('value="fr" required');
    const { root } = page;
    const instance = sourceInstance(page.instance);
    const setFormValue = vi.fn();
    const setValidity = vi.fn();
    instance.internals = { setFormValue, setValidity };

    trigger(root).click();
    instance.handleInvalid();
    root.formDisabledCallback(true);
    await page.waitForChanges();

    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
    expect(trigger(root).hasAttribute('disabled')).toBe(true);
    expect(trigger(root).tabIndex).toBe(-1);
    expect(trigger(root).hasAttribute('aria-invalid')).toBe(false);
    expect(setFormValue).toHaveBeenLastCalledWith(null);
    expect(setValidity).toHaveBeenLastCalledWith({});

    root.formDisabledCallback(false);
    await page.waitForChanges();

    expect(trigger(root).hasAttribute('disabled')).toBe(false);
    expect(trigger(root).tabIndex).toBe(0);
    expect(setFormValue).toHaveBeenLastCalledWith('fr');
    expect(setValidity).toHaveBeenLastCalledWith({});
  });

  it('S14 reports required value-missing through the donor and trigger anchor', async () => {
    const page = await aCountrySelect();
    const { root } = page;
    const instance = sourceInstance(page.instance);
    const setFormValue = vi.fn();
    const setValidity = vi.fn();
    instance.internals = { setFormValue, setValidity };

    await page.setProps({ required: true });

    expect(trigger(root).getAttribute('aria-required')).toBe('true');
    expect(instance.donorElement?.hasAttribute('required')).toBe(true);
    expect(setFormValue).toHaveBeenLastCalledWith(null);
    expect(setValidity).toHaveBeenLastCalledWith(
      instance.donorElement?.validity ?? { valueMissing: true },
      instance.donorElement?.validationMessage,
      trigger(root),
    );
  });

  it('S14 clears required invalidity publicly without changing the empty selection', async () => {
    const setFormValue = vi.fn();
    const setValidity = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'attachInternals').mockReturnValue({
      setFormValue,
      setValidity,
    } as unknown as ElementInternals);
    const page = await aCountrySelect('required');
    const { root } = page;
    const input = vi.fn();
    const change = vi.fn();
    root.addEventListener('input', input);
    root.addEventListener('change', change);

    root.dispatchEvent(new Event('invalid'));
    await page.waitForChanges();
    expect(trigger(root).getAttribute('aria-required')).toBe('true');
    expect(trigger(root).getAttribute('aria-invalid')).toBe('true');

    setValidity.mockClear();
    root.removeAttribute('required');
    await page.waitForChanges();

    expect(root.required).toBe(false);
    expect(trigger(root).hasAttribute('aria-required')).toBe(false);
    expect(trigger(root).hasAttribute('aria-invalid')).toBe(false);
    expect(root.value).toBe('');
    expect(trigger(root).querySelector('[part="value"]')).toHaveTextContent('Choose a country');
    expect(setFormValue).toHaveBeenLastCalledWith(null);
    expect(setValidity).toHaveBeenLastCalledWith({});
    expect(input).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it('S14 uses valueMissing fallback when validity donor refs are unavailable', async () => {
    const page = await aCountrySelect('required');
    const instance = sourceInstance(page.instance);
    const setFormValue = vi.fn();
    const setValidity = vi.fn();
    instance.internals = { setFormValue, setValidity };
    instance.donorElement = undefined;
    instance.triggerElement = undefined;

    instance.stateAttributeChanged();

    expect(setFormValue).toHaveBeenCalledWith(null);
    expect(setValidity).toHaveBeenCalledWith({ valueMissing: true }, undefined, undefined);
  });

  it('S13 clears validity and form value guards tolerate missing internals methods', async () => {
    const page = await aCountrySelect('value="fr"');
    const instance = sourceInstance(page.instance);
    const setFormValue = vi.fn();
    const setValidity = vi.fn();
    instance.internals = { setFormValue, setValidity };

    instance.stateAttributeChanged();

    expect(setFormValue).toHaveBeenCalledWith('fr');
    expect(setValidity).toHaveBeenCalledWith({});

    instance.internals = {} as KiSelectHarness['internals'];
    expect(() => {
      instance.stateAttributeChanged();
    }).not.toThrow();
  });

  it('S3 closes immediately when the disabled prop watcher runs', async () => {
    const page = await aCountrySelect();
    const { root } = page;

    trigger(root).click();
    await page.waitForChanges();
    expect(trigger(root).getAttribute('aria-expanded')).toBe('true');

    await page.setProps({ disabled: true });

    expect(trigger(root).getAttribute('aria-expanded')).toBe('false');
    expect(trigger(root).hasAttribute('disabled')).toBe(true);
  });

  it('S2 keeps mounted refs when ref callbacks receive undefined', async () => {
    const page = await aCountrySelect();
    const instance = sourceInstance(page.instance);
    const donor = instance.donorElement;
    const button = instance.triggerElement;

    instance.setDonorRef(undefined);
    instance.setTriggerRef(undefined);

    expect(instance.donorElement).toBe(donor);
    expect(instance.triggerElement).toBe(button);
  });

  it('S20 disconnects focus, outside-pointer, and roster observers on teardown', async () => {
    const page = await aCountrySelect();
    const { root } = page;
    const instance = sourceInstance(page.instance);
    const observerDisconnect = vi.fn();
    instance.mutationObserver = {
      disconnect: observerDisconnect,
      observe: vi.fn(),
      takeRecords: vi.fn(() => []),
    };
    const hostRemove = vi.spyOn(root, 'removeEventListener');
    const documentRemove = vi.spyOn(document, 'removeEventListener');

    trigger(root).click();
    instance.disconnectedCallback();

    expect(hostRemove).toHaveBeenCalledWith('focusout', expect.any(Function));
    expect(documentRemove).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(observerDisconnect).toHaveBeenCalledOnce();
  });

  it('S5 resolves selection and value helpers with native select parity', () => {
    const options: SelectOptionRecord[] = [
      { value: 'fr', label: 'France', disabled: false },
      { value: 'fr', label: 'France duplicate', disabled: false },
      { value: '', label: 'Empty', disabled: false },
    ];

    expect(resolveSelection(options, 'fr')).toBe(options[0]);
    expect(resolveSelection(options, 'missing')).toBeNull();
    expect(optionValue(null, ' France ')).toBe('France');
    expect(selectFormValue(null)).toBeNull();
    expect(selectFormValue(options[2] ?? null)).toBe('');
    expect(selectValueMissing(true, null)).toBe(true);
    expect(selectValueMissing(true, '')).toBe(true);
    expect(selectValueMissing(true, 'fr')).toBe(false);
    expect(normalizeBooleanPresence('false')).toBe(true);
  });

  it('S7 S10 S22 S23 computes non-wrapping disabled-skipping highlight movement', () => {
    const options = [
      { disabled: true },
      { disabled: false },
      { disabled: true },
      { disabled: false },
    ];

    expect(firstEnabled(options)).toBe(1);
    expect(lastEnabled(options)).toBe(3);
    expect(openHighlight(options, 3)).toBe(3);
    expect(openHighlight(options, 0)).toBe(1);
    expect(moveHighlight(options, 1, 'next')).toBe(3);
    expect(moveHighlight(options, 3, 'next')).toBe(3);
    expect(moveHighlight(options, 3, 'previous')).toBe(1);
    expect(moveHighlight([{ disabled: true }], -1, 'next')).toBe(-1);
  });

  it('S7 S8 S9 S10 S21 maps approved keys to intents and excludes typeahead', () => {
    expect(keyIntent('ArrowDown', false)).toBe('open-selected');
    expect(keyIntent('Home', false)).toBe('open-first');
    expect(keyIntent('End', false)).toBe('open-last');
    expect(keyIntent('ArrowDown', true)).toBe('next');
    expect(keyIntent('ArrowUp', true)).toBe('previous');
    expect(keyIntent('Enter', true)).toBe('commit');
    expect(keyIntent(' ', true)).toBe('commit');
    expect(keyIntent('Escape', true)).toBe('close');
    expect(keyIntent('Tab', true)).toBe('tab');
    expect(keyIntent('f', true)).toBeNull();
    expect(keyIntent('PageDown', true)).toBeNull();
  });
});
