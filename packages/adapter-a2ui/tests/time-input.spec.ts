// @spec:108-ki-time-input
import { describe, expect, it } from 'vitest';

import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';

describe.each([
  { version: 'v0.9.1', catalogId: A2UI_BASIC_CATALOG_IDS[0], path: 'path' },
  { version: '1.0', catalogId: A2UI_V1_BASIC_CATALOG_IDS[0], path: '@path' },
])('DateTimeInput in A2UI $version', ({ version, catalogId, path }) => {
  const createSurface = () => {
    const surface = document.createElement('div');
    const adapter = createA2uiAdapter({ surface });
    const surfaceId = 'appointment';
    expect(adapter.apply({ version, createSurface: { surfaceId, catalogId } }).ok).toBe(true);
    const setField = (props: Record<string, unknown>) =>
      adapter.apply({
        version,
        updateComponents: {
          surfaceId,
          components: [{ id: 'root', component: 'DateTimeInput', ...props }],
        },
      });
    const setTime = (value: string) =>
      adapter.apply({ version, updateDataModel: { surfaceId, path: '/start', value } });
    return { setField, setTime, surface };
  };

  it('S12 renders a labeled time-only field and updates its canonical value', () => {
    const { setField, setTime, surface } = createSurface();
    expect(setTime('09:30').ok).toBe(true);
    expect(
      setField({ enableTime: true, label: 'Start time', value: { [path]: '/start' } }),
    ).toEqual({ ok: true, diagnostics: [], degradations: [] });

    const field = () => surface.querySelector('ki-time-input');
    expect(field()?.getAttribute('label')).toBe('Start time');
    expect(field()?.getAttribute('value')).toBe('09:30');

    expect(setTime('16:45:59').ok).toBe(true);
    expect(field()?.getAttribute('value')).toBe('16:45');
  });

  it('reports the fallback when a time-only field has no accessible label', () => {
    const { setField, surface } = createSurface();
    const result = setField({ enableTime: true, value: '09:30' });

    expect(result.ok).toBe(true);
    expect(result.degradations).toMatchObject([
      { componentId: 'root', componentType: 'DateTimeInput', reason: 'unsupported-variant' },
    ]);
    expect(surface.querySelector('ki-badge')?.textContent).toBe('Unsupported component');
    expect(surface.querySelector('ki-time-input')).toBeNull();
  });

  it('rejects a malformed bound time and preserves the current field', () => {
    const { setField, setTime, surface } = createSurface();
    expect(setTime('09:30').ok).toBe(true);
    expect(
      setField({ enableTime: true, label: 'Start time', value: { [path]: '/start' } }).ok,
    ).toBe(true);

    const result = setTime('25:00');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toMatchObject([
      { path: '/components/root/value', rule: 'malformed-message' },
    ]);
    expect(surface.querySelector('ki-time-input')?.getAttribute('value')).toBe('09:30');
  });

  it.each([
    { variant: 'date-only', enableTime: false, value: '2026-11-20' },
    { variant: 'date and time', enableTime: true, value: '2026-11-20T09:30:00' },
  ])(
    'reports the fallback for $variant while DatePicker is unavailable',
    ({ enableTime, value }) => {
      const { setField, surface } = createSurface();
      const result = setField({ enableDate: true, enableTime, value });

      expect(result.ok).toBe(true);
      expect(result.degradations).toMatchObject([
        { componentId: 'root', componentType: 'DateTimeInput', reason: 'unsupported-variant' },
      ]);
      expect(surface.querySelector('ki-badge')?.textContent).toBe('Unsupported component');
      expect(surface.querySelector('ki-time-input')).toBeNull();
    },
  );
});
