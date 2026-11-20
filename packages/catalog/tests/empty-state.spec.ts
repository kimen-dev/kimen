import { expect, it } from 'vitest';

import { type CatalogEntry, catalogData, type UiSpec, validateUiSpec } from '../src/index.js';

const components: Readonly<Partial<Record<string, CatalogEntry>>> = catalogData.components;
const root = {
  component: 'ki-empty-state',
  props: { announce: true, heading: 'No projects yet', 'heading-level': 2, size: 'sm' },
  slots: {
    '': ['Create a project to get started.'],
    actions: [{ action: 'create', component: 'ki-button', slots: { '': ['New project'] } }],
  },
} satisfies UiSpec['root'];

it('registers EmptyState properties and the three content slots', () => {
  const entry = components['ki-empty-state'];
  expect(entry?.props).toMatchObject({
    announce: { default: false, type: 'boolean' },
    heading: { required: true, type: 'string' },
    'heading-level': { default: 3, minimum: 2, maximum: 6, type: 'number' },
    'icon-name': { type: 'string' },
    size: { default: 'md', type: 'enum' },
    tone: { default: 'neutral', type: 'enum' },
  });
  expect(Object.keys(entry?.slots ?? {}).sort()).toEqual(['', 'actions', 'media']);
  expect(entry?.events).toEqual({});
});

it('validates the slotted next step when its action is declared', () => {
  expect(validateUiSpec({ actions: ['create'], root, version: 1 })).toEqual({
    issues: [],
    ok: true,
  });
});

it('rejects an undeclared action on the slotted next step', () => {
  const result = validateUiSpec({ root, version: 1 });
  expect(result.issues.map((issue) => issue.code)).toEqual(['undeclared-action']);
});

it('rejects a heading level outside the native range', () => {
  const result = validateUiSpec({
    root: { component: 'ki-empty-state', props: { heading: 'No results', 'heading-level': 7 } },
    version: 1,
  });
  expect(result.issues.map((issue) => issue.code)).toEqual(['prop-out-of-range']);
});
