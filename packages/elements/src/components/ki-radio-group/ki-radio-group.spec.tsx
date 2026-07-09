import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import { normalizeBooleanPresence } from './ki-radio-group.form';
import { radioGroupFormValue } from './ki-radio-group.form';
import { arrowDirection, nextEnabledIndex } from './ki-radio-group.keyboard';

// @spec:007-ki-radio-group
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-radio-group', () => {
  it('S10 renders a visible group label and labelled radiogroup wrapper', async () => {
    const { root } = await render(
      <ki-radio-group label="Contact preference">
        {h('ki-radio', { value: 'email' }, 'Email')}
      </ki-radio-group>,
    );
    const label = root.shadowRoot?.querySelector('[part="label"]');
    const group = root.shadowRoot?.querySelector('[role="radiogroup"]');

    expect(label).toHaveTextContent('Contact preference');
    expect(label?.id).toBeTruthy();
    expect(group?.getAttribute('aria-labelledby')).toBe(label?.id);
    expect(group?.querySelector('slot')?.tagName).toBe('SLOT');
  });

  it('S6 computes next enabled index with wrapping and disabled skips', () => {
    expect(nextEnabledIndex([false, false, false], 0, 1)).toBe(1);
    expect(nextEnabledIndex([false, false, false], 0, -1)).toBe(2);
    expect(nextEnabledIndex([false, true, false], 0, 1)).toBe(2);
    expect(nextEnabledIndex([false, true, true], 0, 1)).toBe(0);
    expect(nextEnabledIndex([true, true], 0, 1)).toBeNull();
  });

  it('S7 computes previous navigation with wrapping and disabled runs', () => {
    expect(nextEnabledIndex([false, false, true], 1, 1)).toBe(0);
    expect(nextEnabledIndex([false, true, false], 2, -1)).toBe(0);
    expect(nextEnabledIndex([false], 0, 1)).toBe(0);
  });

  it('S21 maps horizontal arrows through writing direction', () => {
    expect(arrowDirection('ArrowDown', false)).toBe(1);
    expect(arrowDirection('ArrowUp', false)).toBe(-1);
    expect(arrowDirection('ArrowRight', false)).toBe(1);
    expect(arrowDirection('ArrowLeft', false)).toBe(-1);
    expect(arrowDirection('ArrowRight', true)).toBe(-1);
    expect(arrowDirection('ArrowLeft', true)).toBe(1);
    expect(arrowDirection('Home', false)).toBeNull();
  });

  it('S12 computes form value only from a selected enabled option', () => {
    expect(radioGroupFormValue(null)).toBeNull();
    expect(radioGroupFormValue({ value: 'email', disabled: false })).toBe('email');
    expect(radioGroupFormValue({ disabled: false })).toBe('on');
    expect(radioGroupFormValue({ value: 'email', disabled: true })).toBeNull();
  });

  it('S13 normalizes boolean presence values', () => {
    expect(normalizeBooleanPresence(true)).toBe(true);
    expect(normalizeBooleanPresence(false)).toBe(false);
    expect(normalizeBooleanPresence('')).toBe(true);
    expect(normalizeBooleanPresence('false')).toBe(true);
    expect(normalizeBooleanPresence(undefined)).toBe(false);
  });
});
