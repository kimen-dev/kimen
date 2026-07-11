import { h } from '@stencil/core';
import { afterEach, describe, expect, it, render, vi } from '@stencil/vitest';
import { checkedFromMarkup, resolveSubmittedValue } from './ki-switch.form';

type KiSwitchTestElement = HTMLElement & {
  checked: boolean;
  disabled: boolean;
  name?: string;
  value?: string;
};

interface KiSwitchTestInstance {
  checked: boolean;
  disabled: boolean;
  value?: string;
  internals: Pick<ElementInternals, 'setFormValue'>;
  disconnectedCallback(): void;
  formAssociatedCallback(): void;
  formDisabledCallback(disabled: boolean): void;
  formResetCallback(): void;
}

function requireInput(root: HTMLElement): HTMLInputElement {
  const input = root.shadowRoot?.querySelector('input[type="checkbox"][role="switch"]');
  expect(input).toBeInstanceOf(HTMLInputElement);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('ki-switch did not render its native switch input');
  }
  return input;
}

function requireInstance(
  root: HTMLElement,
  instance: KiSwitchTestInstance | HTMLElement | undefined,
): KiSwitchTestInstance {
  const hostRef = (
    root as HTMLElement & {
      __stencil__getHostRef?: () => {
        $lazyInstance$?: KiSwitchTestInstance;
        o?: KiSwitchTestInstance;
      };
    }
  ).__stencil__getHostRef?.();
  const candidate =
    instance === root
      ? (hostRef?.$lazyInstance$ ?? hostRef?.o)
      : (instance as KiSwitchTestInstance);
  expect(candidate).toBeDefined();
  if (!candidate) {
    throw new Error('ki-switch did not expose its lazy component instance');
  }
  return candidate;
}

function installFormValueSpy(instance: KiSwitchTestInstance) {
  const setFormValue = vi.fn();
  instance.internals = { setFormValue };
  return setFormValue;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// @spec:008-ki-switch
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-switch', () => {
  it('S4 renders checked="maybe" as on while keeping the switch operable', async () => {
    const { root } = await render(h('ki-switch', { checked: 'maybe' }, 'Email notifications'));
    const switchRoot = root as KiSwitchTestElement;
    const input = root.shadowRoot?.querySelector('input[type="checkbox"][role="switch"]');

    expect(switchRoot.checked).toBe(true);
    expect(root.hasAttribute('checked')).toBe(true);
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect((input as HTMLInputElement | null)?.checked).toBe(true);
    if (input instanceof HTMLInputElement) {
      input.checked = false;
    }
    input?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(switchRoot.checked).toBe(false);
  });

  it('S7 renders native switch anatomy with track thumb label and no input part', async () => {
    const { root } = await render(<ki-switch>Email notifications</ki-switch>);
    const label = root.shadowRoot?.querySelector('label');
    const input = root.shadowRoot?.querySelector('input[type="checkbox"][role="switch"]');
    const track = root.shadowRoot?.querySelector('[part="track"]');
    const thumb = root.shadowRoot?.querySelector('[part="thumb"]');
    const labelPart = root.shadowRoot?.querySelector('[part="label"]');

    expect(label?.tagName).toBe('LABEL');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input?.getAttribute('part')).toBeNull();
    expect(label?.contains(input ?? null)).toBe(true);
    expect(label?.contains(track ?? null)).toBe(true);
    expect(track?.contains(thumb ?? null)).toBe(true);
    expect(labelPart?.querySelector('slot')?.tagName).toBe('SLOT');
    expect((input as HTMLInputElement | null)?.checked).toBe(false);
    expect((input as HTMLInputElement | null)?.disabled).toBe(false);
    expect((input as HTMLInputElement | null)?.tabIndex).toBe(0);
    expect((input as HTMLInputElement | null)?.name).toBe('');
    expect((input as HTMLInputElement | null)?.value).toBe('on');
    expect(root.hasAttribute('checked')).toBe(false);
  });

  it('S1 programmatic checked changes update state and attribute without input or change events', async () => {
    const onInput = vi.fn();
    const onChange = vi.fn();
    const { root, waitForChanges } = await render(
      <ki-switch onInput={onInput} onChange={onChange}>
        Email notifications
      </ki-switch>,
    );
    const switchRoot = root as KiSwitchTestElement;
    const input = root.shadowRoot?.querySelector('input[type="checkbox"][role="switch"]');

    switchRoot.checked = true;
    await waitForChanges();

    expect(switchRoot.checked).toBe(true);
    expect(root.hasAttribute('checked')).toBe(true);
    expect((input as HTMLInputElement | null)?.checked).toBe(true);
    expect(onInput).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('S4 observes checked attribute presence after hydration and disconnects cleanly', async () => {
    let presenceCallback: MutationCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    class TestMutationObserver {
      constructor(callback: MutationCallback) {
        presenceCallback = callback;
      }

      observe = observe;
      disconnect = disconnect;
      takeRecords = (): MutationRecord[] => [];
    }
    vi.stubGlobal('MutationObserver', TestMutationObserver);

    const { instance, root, unmount, waitForChanges } = await render<
      KiSwitchTestElement,
      KiSwitchTestInstance
    >(<ki-switch>Email notifications</ki-switch>);
    const switchInstance = requireInstance(root, instance);
    const input = requireInput(root);

    expect(observe).toHaveBeenCalledOnce();
    expect(observe.mock.calls[0]?.[0]).toBe(root);
    expect(observe.mock.calls[0]?.[1]).toEqual({ attributeFilter: ['checked'] });

    root.setAttribute('checked', 'false');
    presenceCallback?.([], {} as MutationObserver);
    await waitForChanges();

    expect(switchInstance.checked).toBe(true);
    expect(input.checked).toBe(true);

    switchInstance.checked = false;
    await waitForChanges();
    presenceCallback?.([], {} as MutationObserver);
    await waitForChanges();

    expect(root.hasAttribute('checked')).toBe(false);
    expect(switchInstance.checked).toBe(false);
    expect(input.checked).toBe(false);

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('S4 remains operable where MutationObserver is unavailable', async () => {
    vi.stubGlobal('MutationObserver', undefined);

    const { root, unmount } = await render(<ki-switch>Email notifications</ki-switch>);

    expect(requireInput(root).checked).toBe(false);
    expect(unmount).not.toThrow();
  });

  it('S12 restores an initially on state and synchronizes the form value', async () => {
    const { instance, root, waitForChanges } = await render<
      KiSwitchTestElement,
      KiSwitchTestInstance
    >(h('ki-switch', { checked: true, name: 'newsletter', value: 'weekly' }, 'Newsletter'));
    const switchInstance = requireInstance(root, instance);
    const input = requireInput(root);
    const setFormValue = installFormValueSpy(switchInstance);

    switchInstance.formAssociatedCallback();
    expect(setFormValue).toHaveBeenLastCalledWith('weekly');

    root.checked = false;
    await waitForChanges();
    expect(input.checked).toBe(false);
    expect(setFormValue).toHaveBeenLastCalledWith(null);

    switchInstance.formResetCallback();
    await waitForChanges();

    expect(root.checked).toBe(true);
    expect(root.hasAttribute('checked')).toBe(true);
    expect(input.checked).toBe(true);
    expect(setFormValue).toHaveBeenLastCalledWith('weekly');
  });

  it('S21 restores an initially off state after a toggle', async () => {
    const { instance, root, waitForChanges } = await render<
      KiSwitchTestElement,
      KiSwitchTestInstance
    >(<ki-switch name="newsletter">Newsletter</ki-switch>);
    const switchInstance = requireInstance(root, instance);
    const input = requireInput(root);
    const setFormValue = installFormValueSpy(switchInstance);

    switchInstance.formAssociatedCallback();
    root.checked = true;
    await waitForChanges();
    expect(input.checked).toBe(true);
    expect(setFormValue).toHaveBeenLastCalledWith('on');

    switchInstance.formResetCallback();
    await waitForChanges();

    expect(root.checked).toBe(false);
    expect(root.hasAttribute('checked')).toBe(false);
    expect(input.checked).toBe(false);
    expect(setFormValue).toHaveBeenLastCalledWith(null);
  });

  it('S4 form association preserves present-but-falsy checked markup as the reset state', async () => {
    const { instance, root, waitForChanges } = await render<
      KiSwitchTestElement,
      KiSwitchTestInstance
    >(<ki-switch name="newsletter">Newsletter</ki-switch>);
    const switchInstance = requireInstance(root, instance);
    installFormValueSpy(switchInstance);

    root.setAttribute('checked', 'false');
    switchInstance.formAssociatedCallback();
    root.removeAttribute('checked');
    switchInstance.formResetCallback();
    await waitForChanges();

    expect(root.checked).toBe(true);
    expect(requireInput(root).checked).toBe(true);
  });

  it('S13 synchronizes property and fieldset disabled states to keyboard reach', async () => {
    const { instance, root, waitForChanges } = await render<
      KiSwitchTestElement,
      KiSwitchTestInstance
    >(h('ki-switch', { checked: true }, 'Newsletter'));
    const switchInstance = requireInstance(root, instance);
    const input = requireInput(root);
    installFormValueSpy(switchInstance);

    switchInstance.formDisabledCallback(true);
    expect(input.disabled).toBe(true);
    await waitForChanges();
    expect(input.tabIndex).toBe(-1);

    switchInstance.formDisabledCallback(false);
    expect(input.disabled).toBe(false);
    await waitForChanges();
    expect(input.tabIndex).toBe(0);

    root.disabled = true;
    await waitForChanges();
    expect(input.disabled).toBe(true);
    expect(input.tabIndex).toBe(-1);

    root.disabled = false;
    await waitForChanges();
    expect(input.disabled).toBe(false);
    expect(input.tabIndex).toBe(0);
  });

  it('S1 updates checked and form value before the composed input reaches the page', async () => {
    const { instance, root, waitForChanges } = await render<
      KiSwitchTestElement,
      KiSwitchTestInstance
    >(<ki-switch name="newsletter">Newsletter</ki-switch>);
    const switchInstance = requireInstance(root, instance);
    const input = requireInput(root);
    const setFormValue = installFormValueSpy(switchInstance);
    const onInput = vi.fn();
    root.addEventListener('input', onInput);

    input.checked = true;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await waitForChanges();

    expect(root.checked).toBe(true);
    expect(root.hasAttribute('checked')).toBe(true);
    expect(input.checked).toBe(true);
    expect(setFormValue).toHaveBeenLastCalledWith('on');
    expect(onInput).toHaveBeenCalledOnce();
  });

  it('S1 emits one composed change after synchronizing checked state', async () => {
    const { instance, root, spyOnEvent, waitForChanges } = await render<
      KiSwitchTestElement,
      KiSwitchTestInstance
    >(<ki-switch name="newsletter">Newsletter</ki-switch>);
    const switchInstance = requireInstance(root, instance);
    const input = requireInput(root);
    const setFormValue = installFormValueSpy(switchInstance);
    const changes = spyOnEvent('change');

    input.checked = true;
    input.dispatchEvent(new Event('change'));
    await waitForChanges();

    expect(root.checked).toBe(true);
    expect(input.checked).toBe(true);
    expect(setFormValue).toHaveBeenLastCalledWith('on');
    expect(changes.length).toBe(1);
    expect(changes.firstEvent?.bubbles).toBe(true);
    expect(changes.firstEvent?.composed).toBe(true);
  });

  it('S3 ignores forced input and change events while disabled', async () => {
    const { root, spyOnEvent } = await render<KiSwitchTestElement>(
      <ki-switch disabled>Email notifications</ki-switch>,
    );
    const input = requireInput(root);
    const changes = spyOnEvent('change');

    input.checked = true;
    input.dispatchEvent(new Event('input'));
    expect(root.checked).toBe(false);
    expect(input.checked).toBe(false);

    input.checked = true;
    input.dispatchEvent(new Event('change'));

    expect(root.checked).toBe(false);
    expect(input.checked).toBe(false);
    expect(changes.length).toBe(0);
  });

  it('S10 S18 renders custom form metadata and resynchronizes a changed value', async () => {
    const { instance, root, waitForChanges } = await render<
      KiSwitchTestElement,
      KiSwitchTestInstance
    >(h('ki-switch', { checked: true, name: 'newsletter', value: 'daily' }, 'Newsletter'));
    const switchInstance = requireInstance(root, instance);
    const input = requireInput(root);
    const setFormValue = installFormValueSpy(switchInstance);

    expect(input.name).toBe('newsletter');
    expect(input.value).toBe('daily');

    root.value = 'weekly';
    await waitForChanges();

    expect(input.value).toBe('weekly');
    expect(setFormValue).toHaveBeenLastCalledWith('weekly');
  });

  it('S4 normalizes checked markup by attribute presence', () => {
    expect(checkedFromMarkup(true, true)).toBe(true);
    expect(checkedFromMarkup(true, false)).toBe(true);
    expect(checkedFromMarkup(true, undefined)).toBe(true);
    expect(checkedFromMarkup(false, true)).toBe(true);
    expect(checkedFromMarkup(false, false)).toBe(false);
    expect(checkedFromMarkup(false, undefined)).toBe(false);
  });

  it('S10 S11 S18 resolves submitted values with native checkbox parity', () => {
    expect(resolveSubmittedValue(true, undefined)).toBe('on');
    expect(resolveSubmittedValue(true, '')).toBe('');
    expect(resolveSubmittedValue(true, 'weekly')).toBe('weekly');
    expect(resolveSubmittedValue(false, undefined)).toBeNull();
    expect(resolveSubmittedValue(false, 'weekly')).toBeNull();
  });
});
