import { h } from '@stencil/core';
import { afterEach, describe, expect, it, render, vi } from '@stencil/vitest';
import { booleanFromAttributePresence, checkboxFormValue } from './ki-checkbox.form';

interface KiCheckboxHarness {
  checked: boolean;
  checkedChanged(): void;
  componentDidLoad(): void;
  disabled: boolean;
  disconnectedCallback(): void;
  formAssociatedCallback(): void;
  formDisabledCallback(disabled: boolean): void;
  formResetCallback(): void;
  handleChange(): void;
  handleInput(): void;
  handleInvalid(): void;
  handlePresenceMutation(): void;
  hostInvalid(): void;
  indeterminate: boolean;
  indeterminateChanged(): void;
  input?: HTMLInputElement;
  inputConstraintChanged(): void;
  internals: {
    setFormValue?: (value: FormData | File | string | null) => void;
    setValidity?: (flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement) => void;
    states?: {
      add(name: string): void;
      delete(name: string): void;
    };
  };
  name?: string;
  presenceObserver?: MutationObserver;
  required: boolean;
  setInput(input?: HTMLInputElement): void;
  setState(name: string, enabled: boolean): void;
  setUserInvalid(invalid: boolean): void;
  syncFormValue(): void;
  syncFromInput(): void;
  syncInputState(): void;
  syncUserInvalidState(fromUserToggle: boolean): void;
  syncValidity(): void;
  value?: string;
  valueChanged(): void;
}

async function sourceCheckbox(html = '<ki-checkbox>Email notifications</ki-checkbox>') {
  return render<HTMLElement, KiCheckboxHarness>(html);
}

function sourceInstance(rootInstance: unknown): KiCheckboxHarness {
  const host = rootInstance as {
    __stencil__getHostRef?: () => { $lazyInstance$?: unknown; o?: unknown };
  };
  const hostRef = host.__stencil__getHostRef?.();
  return (hostRef?.$lazyInstance$ ?? hostRef?.o ?? rootInstance) as KiCheckboxHarness;
}

function internalInput(root: Element | null | undefined): HTMLInputElement {
  const input = root?.shadowRoot?.querySelector('input[type="checkbox"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('ki-checkbox did not render a native checkbox input');
  }
  return input;
}

function installInternals(instance: KiCheckboxHarness) {
  const setFormValue = vi.fn();
  const setValidity = vi.fn();
  const states = {
    add: vi.fn(),
    delete: vi.fn(),
  };
  instance.internals = { setFormValue, setValidity, states };
  return { setFormValue, setValidity, states };
}

// @spec:006-ki-checkbox
describe('ki-checkbox', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('S4 treats checked="false" as checked by boolean presence semantics', async () => {
    const { root } = await render(h('ki-checkbox', { checked: 'false' }, 'Email notifications'));
    const input = root.shadowRoot?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!input) {
      throw new Error('ki-checkbox did not render a native checkbox input');
    }

    expect(root.hasAttribute('checked')).toBe(true);
    expect(input.checked).toBe(true);
  });

  it('S4 renders native label anatomy with control and label parts', async () => {
    const { root } = await render(<ki-checkbox>Email notifications</ki-checkbox>);
    const label = root.shadowRoot?.querySelector('label');
    const input = label?.querySelector('input[type="checkbox"]');
    const control = label?.querySelector('[part="control"]');
    const labelPart = label?.querySelector('[part="label"]');
    const defaultSlot = labelPart?.querySelector('slot:not([name])');
    const namedSlots = root.shadowRoot?.querySelectorAll('slot[name]');
    const marks = control?.querySelectorAll('svg[aria-hidden="true"] path[stroke="currentColor"]');

    expect(label?.tagName).toBe('LABEL');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(control?.tagName).toBe('SPAN');
    expect(labelPart?.tagName).toBe('SPAN');
    expect(defaultSlot?.tagName).toBe('SLOT');
    expect(namedSlots?.length).toBe(0);
    expect(marks?.length).toBe(2);
  });

  it('S10 computes native checkbox form values', () => {
    expect(checkboxFormValue(true, undefined)).toBe('on');
    expect(checkboxFormValue(true, '')).toBe('');
    expect(checkboxFormValue(true, 'weekly')).toBe('weekly');
    expect(checkboxFormValue(false, undefined)).toBeNull();
    expect(checkboxFormValue(false, '')).toBeNull();
    expect(checkboxFormValue(false, 'weekly')).toBeNull();
  });

  it('S4 normalizes booleans from attribute presence', () => {
    expect(booleanFromAttributePresence(false, false)).toBe(false);
    expect(booleanFromAttributePresence(false, true)).toBe(true);
    expect(booleanFromAttributePresence(true, false)).toBe(true);
    expect(booleanFromAttributePresence(true, true)).toBe(true);
  });

  it('S4 renders source defaults with native control, marks, label and value anatomy', async () => {
    const page = await sourceCheckbox();
    const instance = sourceInstance(page.instance);
    const input = internalInput(page.root);
    const label = page.root.shadowRoot?.querySelector('label');
    const control = page.root.shadowRoot?.querySelector('[part="control"]');

    expect(instance.checked).toBe(false);
    expect(instance.indeterminate).toBe(false);
    expect(instance.disabled).toBe(false);
    expect(instance.required).toBe(false);
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(false);
    expect(input.disabled).toBe(false);
    expect(input.required).toBe(false);
    expect(input.value).toBe('on');
    expect(input.getAttribute('tabindex')).toBe('0');
    expect(label?.getAttribute('for')).toBe(input.id);
    expect(control?.getAttribute('aria-hidden')).toBe('true');
    expect(
      control?.querySelectorAll('svg[aria-hidden="true"] path[stroke="currentColor"]'),
    ).toHaveLength(2);
    expect(page.root.shadowRoot?.querySelector('[part="label"] slot:not([name])')?.tagName).toBe(
      'SLOT',
    );
  });

  it('S4 applies boolean presence semantics to every initial boolean attribute', async () => {
    const page = await sourceCheckbox(`
      <ki-checkbox
        checked="false"
        indeterminate="false"
        disabled="false"
        required="false"
      >Select all</ki-checkbox>
    `);
    const instance = sourceInstance(page.instance);
    const input = internalInput(page.root);

    expect(instance.checked).toBe(true);
    expect(instance.indeterminate).toBe(true);
    expect(instance.disabled).toBe(true);
    expect(instance.required).toBe(true);
    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(true);
    expect(input.disabled).toBe(true);
    expect(input.required).toBe(true);
    expect(input.getAttribute('tabindex')).toBe('-1');
  });

  it('S4 repairs present falsy attributes after hydration and disconnects its observer', async () => {
    const page = await sourceCheckbox();
    const instance = sourceInstance(page.instance);
    let callback: MutationCallback = () => undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    class MutationObserverHarness {
      constructor(received: MutationCallback) {
        callback = received;
      }

      disconnect = disconnect;
      observe = observe;
      takeRecords = () => [];
    }
    vi.stubGlobal('MutationObserver', MutationObserverHarness);
    instance.componentDidLoad();

    expect(observe).toHaveBeenCalledOnce();
    expect(observe.mock.calls[0]?.[0]).toBe(page.root);
    expect(observe.mock.calls[0]?.[1]).toEqual({
      attributeFilter: ['checked', 'indeterminate'],
    });

    callback([], {} as MutationObserver);
    expect(instance.checked).toBe(false);
    expect(instance.indeterminate).toBe(false);

    page.root.setAttribute('checked', 'false');
    page.root.setAttribute('indeterminate', 'false');
    callback([], {} as MutationObserver);
    await page.waitForChanges();
    expect(instance.checked).toBe(true);
    expect(instance.indeterminate).toBe(true);
    expect(internalInput(page.root).checked).toBe(true);
    expect(internalInput(page.root).indeterminate).toBe(true);

    instance.disconnectedCallback();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('S4 tolerates lifecycle synchronization before an input or observer exists', async () => {
    const page = await sourceCheckbox();
    const instance = sourceInstance(page.instance);
    vi.stubGlobal('MutationObserver', undefined);
    delete instance.input;
    delete instance.presenceObserver;

    expect(() => {
      instance.componentDidLoad();
    }).not.toThrow();
    expect(() => {
      instance.disconnectedCallback();
    }).not.toThrow();
  });

  it('S10 propagates checked, indeterminate, required and value changes to platform state', async () => {
    const page = await sourceCheckbox();
    const instance = sourceInstance(page.instance);
    const { setFormValue, setValidity } = installInternals(instance);

    await page.setProps({ checked: true, indeterminate: true, required: true, value: 'weekly' });
    const input = internalInput(page.root);

    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(true);
    expect(input.required).toBe(true);
    expect(input.value).toBe('weekly');
    expect(setFormValue).toHaveBeenLastCalledWith('weekly');
    expect(setValidity).toHaveBeenLastCalledWith(input.validity, input.validationMessage, input);
  });

  it('S1 synchronizes input then emits one composed change from the host', async () => {
    const page = await sourceCheckbox('<ki-checkbox indeterminate>Newsletter</ki-checkbox>');
    const instance = sourceInstance(page.instance);
    const { setFormValue } = installInternals(instance);
    const input = internalInput(page.root);
    const changes: Event[] = [];
    page.root.addEventListener('change', (event) => {
      changes.push(event);
    });
    Object.defineProperty(input, 'validity', {
      configurable: true,
      value: { valid: true },
    });
    input.checked = true;

    input.dispatchEvent(new Event('input'));
    expect(instance.checked).toBe(true);
    expect(instance.indeterminate).toBe(false);
    expect(input.indeterminate).toBe(false);
    expect(setFormValue).toHaveBeenLastCalledWith('on');

    input.checked = false;
    input.dispatchEvent(new Event('change'));
    expect(instance.checked).toBe(false);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.target).toBe(page.root);
    expect(changes[0]?.bubbles).toBe(true);
    expect(changes[0]?.composed).toBe(true);
  });

  it('S13 captures association baseline and restores binary form state on reset', async () => {
    const page = await sourceCheckbox(
      '<ki-checkbox checked name="newsletter">Newsletter</ki-checkbox>',
    );
    const instance = sourceInstance(page.instance);
    const { setFormValue, setValidity, states } = installInternals(instance);
    instance.formAssociatedCallback();
    await page.setProps({ checked: false });
    instance.setUserInvalid(true);
    expect(page.root.classList.contains('ki-user-invalid')).toBe(true);

    instance.formResetCallback();
    await page.waitForChanges();

    expect(instance.checked).toBe(true);
    expect(internalInput(page.root).checked).toBe(true);
    expect(setFormValue).toHaveBeenLastCalledWith('on');
    expect(setValidity).toHaveBeenCalled();
    expect(page.root.classList.contains('ki-user-invalid')).toBe(false);
    expect(states.delete).toHaveBeenCalledWith('user-invalid');

    await page.setProps({ checked: false });
    instance.formAssociatedCallback();
    await page.setProps({ checked: true });
    instance.formResetCallback();
    await page.waitForChanges();
    expect(instance.checked).toBe(false);
    expect(internalInput(page.root).checked).toBe(false);
    expect(setFormValue).toHaveBeenLastCalledWith(null);
  });

  it('S15 mirrors fieldset disabled state to input, validity and custom states', async () => {
    const page = await sourceCheckbox('<ki-checkbox checked>Newsletter</ki-checkbox>');
    const instance = sourceInstance(page.instance);
    const { setValidity, states } = installInternals(instance);
    page.root.classList.add('ki-user-invalid');

    instance.formDisabledCallback(true);
    await page.waitForChanges();
    expect(internalInput(page.root).disabled).toBe(true);
    expect(internalInput(page.root).getAttribute('tabindex')).toBe('-1');
    expect(setValidity).toHaveBeenLastCalledWith({});
    expect(states.add).toHaveBeenCalledWith('fieldset-disabled');
    expect(page.root.classList.contains('ki-user-invalid')).toBe(false);

    instance.formDisabledCallback(false);
    await page.waitForChanges();
    expect(internalInput(page.root).disabled).toBe(false);
    expect(internalInput(page.root).getAttribute('tabindex')).toBe('0');
    expect(states.delete).toHaveBeenCalledWith('fieldset-disabled');
  });

  it('S14 forwards native invalid state and clears user-invalid when validity recovers', async () => {
    const page = await sourceCheckbox('<ki-checkbox required>Accept terms</ki-checkbox>');
    const instance = sourceInstance(page.instance);
    const { setValidity, states } = installInternals(instance);
    const input = internalInput(page.root);
    const invalidValidity = { valid: false, valueMissing: true } as ValidityState;
    Object.defineProperties(input, {
      validationMessage: { configurable: true, value: 'Accept terms' },
      validity: { configurable: true, value: invalidValidity },
    });

    instance.handleInvalid();
    expect(setValidity).toHaveBeenLastCalledWith(invalidValidity, 'Accept terms', input);
    expect(page.root.classList.contains('ki-user-invalid')).toBe(true);
    expect(states.add).toHaveBeenCalledWith('user-invalid');

    Object.defineProperty(input, 'validity', {
      configurable: true,
      value: { valid: true },
    });
    instance.checkedChanged();
    expect(page.root.classList.contains('ki-user-invalid')).toBe(false);
    expect(states.delete).toHaveBeenCalledWith('user-invalid');
  });

  it('S14 leaves an invalid control pristine until a user-originated toggle', async () => {
    const page = await sourceCheckbox('<ki-checkbox required>Accept terms</ki-checkbox>');
    const instance = sourceInstance(page.instance);
    const { states } = installInternals(instance);
    Object.defineProperty(internalInput(page.root), 'validity', {
      configurable: true,
      value: { valid: false, valueMissing: true },
    });

    instance.syncUserInvalidState(false);
    expect(page.root.classList.contains('ki-user-invalid')).toBe(false);
    expect(states.add).not.toHaveBeenCalledWith('user-invalid');

    instance.syncUserInvalidState(true);
    expect(page.root.classList.contains('ki-user-invalid')).toBe(true);
    expect(states.add).toHaveBeenCalledWith('user-invalid');
  });

  it('S10 safely skips unavailable platform hooks and absent input synchronization', async () => {
    const page = await sourceCheckbox();
    const instance = sourceInstance(page.instance);
    instance.internals = {};
    delete instance.input;
    instance.checked = true;
    instance.indeterminate = true;
    instance.value = 'weekly';

    expect(() => {
      instance.checkedChanged();
    }).not.toThrow();
    expect(() => {
      instance.indeterminateChanged();
    }).not.toThrow();
    expect(() => {
      instance.inputConstraintChanged();
    }).not.toThrow();
    expect(() => {
      instance.valueChanged();
    }).not.toThrow();
    expect(() => {
      instance.syncFromInput();
    }).not.toThrow();
    expect(() => {
      instance.syncInputState();
    }).not.toThrow();
    expect(() => {
      instance.syncFormValue();
    }).not.toThrow();
    expect(() => {
      instance.syncValidity();
    }).not.toThrow();
    expect(() => {
      instance.syncUserInvalidState(true);
    }).not.toThrow();
    expect(() => {
      instance.setInput(undefined);
    }).not.toThrow();
    expect(() => {
      instance.setState('fieldset-disabled', true);
    }).not.toThrow();
    expect(instance.checked).toBe(true);
    expect(instance.indeterminate).toBe(true);
  });

  it('S9 host invalid listener exposes the same user-invalid state', async () => {
    const page = await sourceCheckbox();
    const instance = sourceInstance(page.instance);
    const { states } = installInternals(instance);

    instance.hostInvalid();

    expect(page.root.classList.contains('ki-user-invalid')).toBe(true);
    expect(states.add).toHaveBeenCalledWith('user-invalid');
  });
});
