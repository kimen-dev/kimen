import { expect, it } from 'vitest';

import { type CatalogEntry, catalogData, validateUiSpec } from '../src/index.js';

const components: Readonly<Partial<Record<string, CatalogEntry>>> = catalogData.components;

it('registers a passive Spinner with four properties and a required label', () => {
  const entry = components['ki-spinner'];
  expect(Object.keys(entry?.props ?? {}).sort()).toEqual([
    'label',
    'show-label',
    'size',
    'variant',
  ]);
  expect(entry?.props).toMatchObject({
    label: { required: true, type: 'string' },
    'show-label': { default: false, type: 'boolean' },
    size: { default: 'md', type: 'enum' },
    variant: { default: 'ring', type: 'enum' },
  });
  expect([...(entry?.props['size']?.values ?? [])].sort()).toEqual(['lg', 'md', 'sm']);
  expect([...(entry?.props['variant']?.values ?? [])].sort()).toEqual(['dots', 'ring']);
  expect(entry?.slots).toEqual({});
  expect(entry?.events).toEqual({});
});

it('accepts the Spinner props in a declarative UI spec', () => {
  expect(
    validateUiSpec({
      root: {
        component: 'ki-spinner',
        props: { label: 'Assistant is thinking', 'show-label': true, size: 'sm', variant: 'dots' },
      },
      version: 1,
    }),
  ).toEqual({ issues: [], ok: true });
});

it.each([
  [{ variant: 'ring' }, 'missing-required-prop'],
  [{ label: 'Saving changes', size: '16' }, 'invalid-prop-type'],
  [{ label: 'Saving changes', variant: 'progress' }, 'invalid-prop-type'],
] as const)('rejects unsupported Spinner props %j', (props, code) => {
  const result = validateUiSpec({ root: { component: 'ki-spinner', props }, version: 1 });
  expect(result.issues.map((issue) => issue.code)).toEqual([code]);
});
