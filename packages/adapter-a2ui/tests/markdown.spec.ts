// @spec:130-ki-markdown
import { expect, it } from 'vitest';

import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';

it.each([
  ['v0.9.1', A2UI_BASIC_CATALOG_IDS[0], 'path'],
  ['1.0', A2UI_V1_BASIC_CATALOG_IDS[0], '@path'],
])(
  'S5 renders A2UI %s content as Markdown and keeps control labels literal',
  (version, catalogId, pathKey) => {
    const surface = document.createElement('div');
    const adapter = createA2uiAdapter({ surface });
    const surfaceId = 'workspace';
    const source = '## Workspace\n\n<em>Literal markup</em>';
    const label = '**Open workspace**';

    expect(adapter.apply({ version, createSurface: { surfaceId, catalogId } }).ok).toBe(true);
    expect(
      adapter.apply({ version, updateDataModel: { surfaceId, path: '/source', value: source } }).ok,
    ).toBe(true);

    const result = adapter.apply({
      version,
      updateComponents: {
        surfaceId,
        components: [
          { id: 'root', component: 'Column', children: ['answer', 'open'] },
          { id: 'answer', component: 'Text', text: { [pathKey]: '/source' } },
          { id: 'open', component: 'Button', child: 'label' },
          { id: 'label', component: 'Text', text: label },
        ],
      },
    });

    expect(result.ok).toBe(true);
    const markdown = surface.querySelector('ki-stack > ki-markdown');
    expect(markdown?.textContent).toBe(source);
    expect(markdown?.firstElementChild).toBeNull();
    const button = surface.querySelector('ki-button');
    expect(button?.textContent).toBe(label);
    expect(button?.firstElementChild).toBeNull();
  },
);
