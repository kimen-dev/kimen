import { h } from '@stencil/core';
import { describe, expect, it, render, vi } from '@stencil/vitest';
import { normalizeKiInputType } from './ki-input.form';

// @spec:003-ki-input
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).

type KiInputHost = HTMLElement & {
  value: string;
  formDisabledCallback(disabled: boolean): void;
  formResetCallback(): void;
};

function inputOf(root: HTMLElement): HTMLInputElement {
  const input = root.shadowRoot?.querySelector('input');
  if (!input) {
    throw new Error('ki-input did not render its internal input');
  }
  return input;
}

// mock-doc implements no constraint validation; the guarded input/change
// handlers need a ValidityState to run, so the platform gap is stubbed here.
// Real validity behavior is asserted by the browser suite (Art. III).
function stubValidity(input: HTMLInputElement): void {
  Object.defineProperty(input, 'validity', { configurable: true, value: { valid: true } });
}

// mock-doc's attachInternals() returns an inert proxy without `states`, which
// the user-invalid bookkeeping needs; the stub keeps the same public shape
// (a CustomStateSet is set-like). Same pattern as ki-select.spec.tsx.
function stubInternalsStates(root: HTMLElement): void {
  const host = root as unknown as {
    __stencil__getHostRef?: () => { $lazyInstance$?: unknown; o?: unknown };
  };
  const hostRef = host.__stencil__getHostRef?.();
  const instance = (hostRef?.$lazyInstance$ ?? hostRef?.o ?? root) as { internals: unknown };
  instance.internals = { states: new Set<string>() };
}

describe('ki-input', () => {
  it('S6 renders unknown type values as a plain text internal input', async () => {
    const { root } = await render(h('ki-input', { label: 'Email', type: 'number' }));
    const input = root.shadowRoot?.querySelector('[part="input"]');

    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input?.getAttribute('type')).toBe('text');
  });

  it('S19 renders a visible label wired to the internal input', async () => {
    const { root } = await render(<ki-input label="Email"></ki-input>);
    const label = root.shadowRoot?.querySelector('[part="label"]');
    const input = root.shadowRoot?.querySelector('[part="input"]');

    expect(label?.tagName).toBe('LABEL');
    expect(label).toHaveTextContent('Email');
    expect(label?.getAttribute('for')).toBeTruthy();
    expect(label?.getAttribute('for')).toBe(input?.getAttribute('id'));
  });

  it('S20 replaces the rendered value when assigned programmatically without dispatching change', async () => {
    const onChange = vi.fn();
    const { root, waitForChanges } = await render(
      h('ki-input', { label: 'Email', value: 'draft', onChange }),
    );
    const input = root.shadowRoot?.querySelector('input');

    expect(input).toHaveProperty('value', 'draft');
    (root as HTMLElement & { value: string }).value = 'ada@example.com';
    await waitForChanges();

    expect(input).toHaveProperty('value', 'ada@example.com');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('S19 exposes the approved anatomy parts and slots without a default slot', async () => {
    const { root } = await render(<ki-input label="Email"></ki-input>);
    const field = root.shadowRoot?.querySelector('[part="field"]');
    const input = root.shadowRoot?.querySelector('[part="input"]');
    const label = root.shadowRoot?.querySelector('[part="label"]');
    const slots = [...(root.shadowRoot?.querySelectorAll('slot') ?? [])].map((slot) =>
      slot.getAttribute('name'),
    );

    expect(field?.tagName).toBe('DIV');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(label?.tagName).toBe('LABEL');
    expect(slots).toEqual(['start', 'end']);
  });

  it('S6 normalizes every supported input type and falls unknown values back to text', () => {
    expect(normalizeKiInputType('text')).toBe('text');
    expect(normalizeKiInputType('email')).toBe('email');
    expect(normalizeKiInputType('password')).toBe('password');
    expect(normalizeKiInputType('url')).toBe('url');
    expect(normalizeKiInputType('tel')).toBe('tel');
    expect(normalizeKiInputType('search')).toBe('search');
    expect(normalizeKiInputType('number')).toBe('text');
    expect(normalizeKiInputType('date')).toBe('text');
    expect(normalizeKiInputType(undefined)).toBe('text');
  });

  it('S3 forwards disabled to the internal input', async () => {
    const { root } = await render(h('ki-input', { disabled: true, label: 'Email' }));

    expect(inputOf(root).hasAttribute('disabled')).toBe(true);
  });

  it('S4 forwards readonly to the internal input and keeps its value', async () => {
    const { root } = await render(
      h('ki-input', { label: 'Membership ID', readonly: true, value: 'KMN-0042' }),
    );
    const input = inputOf(root);

    expect(input.hasAttribute('readonly')).toBe(true);
    expect(input.hasAttribute('disabled')).toBe(false);
    expect(input).toHaveProperty('value', 'KMN-0042');
  });

  it('S5 forwards the password kind to the internal input', async () => {
    const { root } = await render(h('ki-input', { label: 'Password', type: 'password' }));

    expect(inputOf(root).getAttribute('type')).toBe('password');
  });

  it('S10 forwards required to the internal input as the exposure source', async () => {
    const { root } = await render(h('ki-input', { label: 'Email', required: true }));

    expect(inputOf(root).hasAttribute('required')).toBe(true);
  });

  it('S12 forwards the form-data name to the internal input', async () => {
    const named = await render(h('ki-input', { label: 'Email', name: 'email' }));
    const unnamed = await render(h('ki-input', { label: 'Email' }));

    expect(inputOf(named.root).getAttribute('name')).toBe('email');
    expect(inputOf(unnamed.root).hasAttribute('name')).toBe(false);
  });

  it('S25 forwards the autocomplete entry purpose and omits it by default', async () => {
    const withPurpose = await render(h('ki-input', { autocomplete: 'email', label: 'Email' }));
    const withoutPurpose = await render(h('ki-input', { label: 'Email' }));

    expect(inputOf(withPurpose.root).getAttribute('autocomplete')).toBe('email');
    expect(inputOf(withoutPurpose.root).hasAttribute('autocomplete')).toBe(false);
  });

  it('S1 syncs the host value while the internal input receives input', async () => {
    const { root, waitForChanges } = await render(h('ki-input', { label: 'Email' }));
    stubInternalsStates(root);
    const input = inputOf(root);
    stubValidity(input);

    input.value = 'ada@example.com';
    input.dispatchEvent(new Event('input'));
    await waitForChanges();

    expect((root as KiInputHost).value).toBe('ada@example.com');
  });

  it('S2 re-dispatches a composed change from the host when an edit commits', async () => {
    const { root, waitForChanges } = await render(h('ki-input', { label: 'Email' }));
    const input = inputOf(root);
    stubValidity(input);
    const change = vi.fn();
    root.addEventListener('change', change);

    input.dispatchEvent(new Event('change'));
    await waitForChanges();

    expect(change).toHaveBeenCalledTimes(1);
    expect((change.mock.calls[0] as Event[])[0]?.composed).toBe(true);
  });

  it('S13 formResetCallback restores the declared value attribute', async () => {
    const { root, waitForChanges } = await render(
      '<ki-input label="Email" value="draft"></ki-input>',
    );
    await waitForChanges();
    stubInternalsStates(root);
    const host = root as KiInputHost;
    host.value = 'edited away';
    await waitForChanges();
    expect(inputOf(root)).toHaveProperty('value', 'edited away');

    host.formResetCallback();
    await waitForChanges();

    expect(host.value).toBe('draft');
    expect(inputOf(root)).toHaveProperty('value', 'draft');
  });

  it('S15 formDisabledCallback disables and re-enables the internal input', async () => {
    const { root, waitForChanges } = await render(h('ki-input', { label: 'Email' }));
    const host = root as KiInputHost;
    expect(inputOf(root).hasAttribute('disabled')).toBe(false);

    host.formDisabledCallback(true);
    await waitForChanges();
    expect(inputOf(root).hasAttribute('disabled')).toBe(true);

    host.formDisabledCallback(false);
    await waitForChanges();
    expect(inputOf(root).hasAttribute('disabled')).toBe(false);
  });
});
