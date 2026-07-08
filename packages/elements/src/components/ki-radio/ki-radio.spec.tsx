import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:007-ki-radio-group
// Option-anatomy tests only; every behavior S-ID lives in the group suite.
describe('ki-radio', () => {
  it('renders an unnamed native radio input wrapped by a shadow label', async () => {
    const { root } = await render(<ki-radio>Email</ki-radio>);
    const label = root.shadowRoot?.querySelector('label');
    const input = root.shadowRoot?.querySelector('input');

    expect(label?.tagName).toBe('LABEL');
    expect(input?.tagName).toBe('INPUT');
    expect(input?.type).toBe('radio');
    expect(input?.hasAttribute('name')).toBe(false);
  });

  it('renders control and label parts with no named slots', async () => {
    const { root } = await render(<ki-radio>Email</ki-radio>);
    const control = root.shadowRoot?.querySelector('[part="control"]');
    const label = root.shadowRoot?.querySelector('[part="label"]');
    const slots = [...(root.shadowRoot?.querySelectorAll('slot') ?? [])];

    expect(control?.tagName).toBe('SPAN');
    expect(control?.getAttribute('aria-hidden')).toBe('true');
    expect(label?.tagName).toBe('SPAN');
    expect(label?.querySelector('slot')?.tagName).toBe('SLOT');
    expect(slots.every((slot) => !slot.name)).toBe(true);
  });

  it('has no public checked or selected member and defaults value to on', async () => {
    const { root } = await render(<ki-radio>Email</ki-radio>);

    expect('checked' in root).toBe(false);
    expect('selected' in root).toBe(false);
    expect(root.value).toBe('on');
  });

  it('normalizes disabled presence, including disabled=false, to disabled', async () => {
    const { root } = await render(h('ki-radio', { disabled: 'false' }, 'Email'));
    const input = root.shadowRoot?.querySelector('input');

    expect(root.disabled).toBe(true);
    expect(input?.disabled).toBe(true);
  });
});
