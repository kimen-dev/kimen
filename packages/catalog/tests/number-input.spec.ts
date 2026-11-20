import { expect, it } from 'vitest';
import { type CatalogEntry, catalogData, validateUiSpec } from '../src/index.js';

const components: Readonly<Partial<Record<string, CatalogEntry>>> = catalogData.components;

it('registers numeric props, serialized format, and the single change event', () => {
  const entry = components['ki-number-input'];
  expect(entry?.props).toMatchObject({
    label: { type: 'string', required: true },
    value: { type: 'number' },
    min: { type: 'number' },
    max: { type: 'number' },
    step: { type: 'number', default: 1 },
    steppers: { type: 'boolean', default: false },
    format: { type: 'string' },
  });
  expect(entry?.slots).toEqual({});
  expect(Object.keys(entry?.events ?? {})).toEqual(['change']);
});

it('accepts NumberInput in a declarative UI spec', () => {
  expect(
    validateUiSpec({
      root: {
        component: 'ki-number-input',
        props: { label: 'Discount', value: 0.125, format: '{"style":"percent"}' },
      },
      version: 1,
    }),
  ).toEqual({ issues: [], ok: true });
});
