import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import { normalizeBooleanPresence } from '../ki-radio-group/ki-radio-group.form';

// @spec:007-ki-radio-group
// Option-anatomy tests only; every behavior S-ID lives in the group suite.
describe('ki-radio', () => {
  type KiRadioTestElement = HTMLElement & { disabled: boolean; value: string };

  it('S10 renders an enabled unnamed native radio with the default value', async () => {
    const { root } = await render(<ki-radio>Email</ki-radio>);
    const label = root.shadowRoot?.querySelector('label');
    const input = root.shadowRoot?.querySelector('input');

    expect(label?.tagName).toBe('LABEL');
    expect(input?.tagName).toBe('INPUT');
    expect(input?.type).toBe('radio');
    expect(input?.hasAttribute('name')).toBe(false);
    expect(input?.value).toBe('on');
    expect(input?.disabled).toBe(false);
    expect(input?.tabIndex).toBe(0);
  });

  it('S10 renders control and label parts with no named slots', async () => {
    const { root } = await render(<ki-radio>Email</ki-radio>);
    const control = root.shadowRoot?.querySelector('[part="control"]');
    const label = root.shadowRoot?.querySelector('[part="label"]');
    const slots = [...(root.shadowRoot?.querySelectorAll('slot') ?? [])];

    expect(control?.tagName).toBe('SPAN');
    expect(control?.getAttribute('aria-hidden')).toBe('true');
    expect(label?.tagName).toBe('SPAN');
    expect(label?.querySelector('slot')?.tagName).toBe('SLOT');
    expect(slots.every((slot) => !slot.name)).toBe(true);
    expect(
      [...(root.shadowRoot?.querySelector('label')?.children ?? [])].map((node) => node.tagName),
    ).toEqual(['INPUT', 'SPAN', 'SPAN']);
  });

  it('S1 has no public checked or selected member and defaults value to on', async () => {
    const { root } = await render(<ki-radio>Email</ki-radio>);

    expect('checked' in root).toBe(false);
    expect('selected' in root).toBe(false);
    expect((root as KiRadioTestElement).value).toBe('on');
  });

  it('S3 S11 normalizes initial disabled="false" presence and forwards disabled', async () => {
    const { root } = await render('<ki-radio disabled="false">Email</ki-radio>');
    const input = root.shadowRoot?.querySelector('input');

    expect(normalizeBooleanPresence('false')).toBe(true);
    expect((root as KiRadioTestElement).disabled).toBe(true);
    expect(input?.disabled).toBe(true);
    expect(input?.tabIndex).toBe(-1);
  });

  it('S3 S11 normalizes a watched falsy disabled attribute and restores on removal', async () => {
    const { root, waitForChanges } = await render(<ki-radio>Email</ki-radio>);
    const radio = root as KiRadioTestElement;
    const input = root.shadowRoot?.querySelector('input');

    radio.disabled = true;
    await waitForChanges();
    root.setAttribute('disabled', 'false');
    await waitForChanges();

    expect(radio.disabled).toBe(true);
    expect(root.hasAttribute('disabled')).toBe(true);
    expect(input?.disabled).toBe(true);
    expect(input?.tabIndex).toBe(-1);

    root.removeAttribute('disabled');
    await waitForChanges();

    expect(radio.disabled).toBe(false);
    expect(input?.disabled).toBe(false);
    expect(input?.tabIndex).toBe(0);
  });

  it('S1 forwards a domain value to the native radio without authoring selection', async () => {
    const { root } = await render(h('ki-radio', { value: 'email' }, 'Email'));
    const input = root.shadowRoot?.querySelector('input');

    expect(root.getAttribute('value')).toBe('email');
    expect((root as KiRadioTestElement).value).toBe('email');
    expect(input?.value).toBe('email');
    expect(input?.checked).toBe(false);
  });
});
