import { h } from '@stencil/core';
import { describe, expect, it, render, vi } from '@stencil/vitest';
import { normalizeKiInputType } from './ki-input.form';

// @spec:003-ki-input
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
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
});
