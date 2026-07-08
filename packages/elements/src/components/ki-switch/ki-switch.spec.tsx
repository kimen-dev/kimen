import { h } from '@stencil/core';
import { describe, expect, it, render, vi } from '@stencil/vitest';
import { checkedFromMarkup, resolveSubmittedValue } from './ki-switch.form';

// @spec:008-ki-switch
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-switch', () => {
  it('S4 renders checked="maybe" as on while keeping the switch operable', async () => {
    const { root } = await render(h('ki-switch', { checked: 'maybe' }, 'Email notifications'));
    const input = root.shadowRoot?.querySelector('input[type="checkbox"][role="switch"]');

    expect(root.checked).toBe(true);
    expect(root.hasAttribute('checked')).toBe(true);
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect((input as HTMLInputElement | null)?.checked).toBe(true);
    input?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(root.checked).toBe(false);
  });

  it('S7 renders native switch anatomy with track thumb label and no input part', async () => {
    const { root } = await render(<ki-switch>Email notifications</ki-switch>);
    const label = root.shadowRoot?.querySelector('label');
    const input = root.shadowRoot?.querySelector('input[type="checkbox"][role="switch"]');
    const track = root.shadowRoot?.querySelector('[part="track"]');
    const thumb = root.shadowRoot?.querySelector('[part="thumb"]');
    const labelPart = root.shadowRoot?.querySelector('[part="label"]');

    expect(label).toBeInstanceOf(HTMLLabelElement);
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input?.getAttribute('part')).toBeNull();
    expect(label?.contains(input)).toBe(true);
    expect(label?.contains(track)).toBe(true);
    expect(track?.contains(thumb)).toBe(true);
    expect(labelPart?.querySelector('slot')).toBeInstanceOf(HTMLSlotElement);
  });

  it('S1 programmatic checked changes update state and attribute without input or change events', async () => {
    const onInput = vi.fn();
    const onChange = vi.fn();
    const { root } = await render(
      <ki-switch onInput={onInput} onChange={onChange}>
        Email notifications
      </ki-switch>,
    );
    const input = root.shadowRoot?.querySelector('input[type="checkbox"][role="switch"]');

    root.checked = true;
    await new Promise((resolve) => { queueMicrotask(resolve); });

    expect(root.checked).toBe(true);
    expect(root.hasAttribute('checked')).toBe(true);
    expect((input as HTMLInputElement | null)?.checked).toBe(true);
    expect(onInput).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
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
