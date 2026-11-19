// @spec:074-ki-stack-grid
import { expect, it } from 'vitest';
import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';

it.each([
  ['v0.9.1', A2UI_BASIC_CATALOG_IDS[0]],
  ['1.0', A2UI_V1_BASIC_CATALOG_IDS[0]],
])('S8 renders nested Column and Row stacks in %s', (version, catalogId) => {
  const surface = document.createElement('div');
  const adapter = createA2uiAdapter({ surface });
  const surfaceId = 'layout';
  const components = [
    { id: 'root', component: 'Column', children: ['label', 'row'] },
    { id: 'label', component: 'Text', text: 'Summary' },
    {
      id: 'row',
      component: 'Row',
      align: 'center',
      justify: 'spaceBetween',
      children: ['first', 'second'],
    },
    { id: 'second', component: 'Text', text: 'Second' },
    { id: 'first', component: 'Text', text: 'First' },
  ];
  expect(adapter.apply({ version, createSurface: { surfaceId, catalogId } }).ok).toBe(true);

  const result = adapter.apply({ version, updateComponents: { surfaceId, components } });

  expect(result.ok).toBe(true);
  const column = surface.querySelector('ki-stack');
  const row = column?.querySelector('ki-stack[direction="row"]');
  expect(row?.getAttribute('align')).toBe('center');
  expect(row?.getAttribute('justify')).toBe('between');
  expect([...(column?.children ?? [])].map((child) => child.textContent)).toEqual([
    'Summary',
    'FirstSecond',
  ]);
  expect([...(row?.children ?? [])].map((child) => child.textContent)).toEqual(['First', 'Second']);
  expect(surface.querySelector('ki-card')).toBeNull();
});
