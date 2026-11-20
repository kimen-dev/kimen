import { expect, it, vi } from 'vitest';
import { type CatalogEntry, catalogData, renderUiSpec, validateUiSpec } from '../src/index.js';

const entries: Readonly<Partial<Record<string, CatalogEntry>>> = catalogData.components;
const sliderSpec = (value: boolean | number | string) => ({
  actions: ['adjust'],
  root: { action: 'adjust', component: 'ki-slider', props: { label: 'Volume', value } },
  version: 1,
});

it('registers Slider with the commit event and no slots', () => {
  expect(entries['ki-slider']?.props['value']?.type).toBe('number-or-string');
  expect(Object.keys(entries['ki-slider']?.events ?? {})).toEqual(['change']);
  expect(entries['ki-slider']?.slots).toEqual({});
});

it.each([60, '20,80'])('accepts a numeric or interval Slider value %s', (value) => {
  expect(validateUiSpec(sliderSpec(value))).toEqual({
    issues: [],
    ok: true,
  });
});

it('rejects boolean Slider values', () => {
  const result = validateUiSpec(sliderSpec(true));
  expect(result.issues.map((issue) => issue.code)).toContain('invalid-prop-type');
});

it('dispatches the current numeric value through the declared commit action', () => {
  const surface = document.createElement('div');
  const onAction = vi.fn();
  expect(renderUiSpec(sliderSpec(60), { onAction, surface }).ok).toBe(true);
  const element = surface.querySelector<HTMLElement & { value: number }>('ki-slider');
  if (element === null) throw new Error('Expected a rendered slider');
  element.value = 75;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  expect(onAction).not.toHaveBeenCalled();

  element.dispatchEvent(new Event('change', { bubbles: true }));

  expect(onAction).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ action: 'adjust', data: { label: 'Volume', value: 75 } }),
  );
});
