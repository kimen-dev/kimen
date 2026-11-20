import { expect, it } from 'vitest';

import { type CatalogEntry, catalogData, validateUiSpec } from '../src/index.js';

const components: Readonly<Partial<Record<string, CatalogEntry>>> = catalogData.components;

it('registers both Stepper elements with authoring slots and no action events', () => {
  expect(components['ki-stepper']).toMatchObject({
    props: {
      label: { required: true, type: 'string' },
      orientation: { default: 'horizontal', type: 'enum' },
    },
  });
  expect(components['ki-step']).toMatchObject({
    props: {
      state: { default: 'upcoming', type: 'enum' },
      href: { format: 'url', type: 'string' },
      description: { type: 'string' },
    },
  });
  expect(Object.keys(components['ki-stepper']?.slots ?? {})).toEqual(['']);
  expect(Object.keys(components['ki-step']?.slots ?? {})).toEqual(['']);
  expect(components['ki-stepper']?.events).toEqual({});
  expect(components['ki-step']?.events).toEqual({});
});

it.each([
  ['#account', []],
  ['ftp://example.com/account', ['url-scheme']],
])('validates a Stepper child destination %s under the catalog URL policy', (href, codes) => {
  const result = validateUiSpec({
    version: 1,
    root: {
      component: 'ki-stepper',
      props: { label: 'Setup progress' },
      slots: {
        '': [{ component: 'ki-step', props: { state: 'done', href }, slots: { '': ['Account'] } }],
      },
    },
  });
  expect(result.issues.map((issue) => issue.code)).toEqual(codes);
});
