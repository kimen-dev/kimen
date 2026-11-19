// @spec:077-ki-checkbox-group
import { expect, it } from 'vitest';

import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';

it.each([
  { version: 'v0.9.1', catalogId: A2UI_BASIC_CATALOG_IDS[0], path: 'path' },
  { version: '1.0', catalogId: A2UI_V1_BASIC_CATALOG_IDS[0], path: '@path' },
])(
  'S12 $version maps bound multiple selections and updates checked options',
  ({ version, catalogId, path }) => {
    const surface = document.createElement('div');
    const adapter = createA2uiAdapter({ surface });
    const surfaceId = 'regions';
    const setSelection = (value: string[]) =>
      adapter.apply({ version, updateDataModel: { surfaceId, path: '/regions', value } });
    expect(adapter.apply({ version, createSurface: { surfaceId, catalogId } }).ok).toBe(true);
    expect(setSelection(['eu', 'apac', 'unknown']).ok).toBe(true);

    const result = adapter.apply({
      version,
      updateComponents: {
        surfaceId,
        components: [
          {
            id: 'root',
            component: 'ChoicePicker',
            label: 'Regions',
            variant: 'multipleSelection',
            options: [
              { value: 'eu', label: 'Europe' },
              { value: 'am', label: 'Americas' },
              { value: 'apac', label: 'Asia-Pacific' },
            ],
            value: { [path]: '/regions' },
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    expect(surface.querySelector('ki-checkbox-group')?.getAttribute('label')).toBe('Regions');
    const choices = () =>
      [...surface.querySelectorAll('ki-checkbox-group > ki-checkbox')].map((option) => [
        option.getAttribute('value'),
        option.textContent,
        option.hasAttribute('checked'),
      ]);
    expect(choices()).toEqual([
      ['eu', 'Europe', true],
      ['am', 'Americas', false],
      ['apac', 'Asia-Pacific', true],
    ]);

    expect(setSelection(['am']).ok).toBe(true);
    expect(choices()).toEqual([
      ['eu', 'Europe', false],
      ['am', 'Americas', true],
      ['apac', 'Asia-Pacific', false],
    ]);
  },
);
