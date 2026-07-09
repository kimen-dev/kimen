import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import {
  firstEnabled,
  keyIntent,
  lastEnabled,
  moveHighlight,
  openHighlight,
} from './ki-select.keyboard';
import {
  normalizeBooleanPresence,
  optionValue,
  resolveSelection,
  selectFormValue,
  selectValueMissing,
  type SelectOptionRecord,
} from './ki-select.form';

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
