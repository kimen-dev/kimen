// @spec:069-ki-icon
import type { RenderResult } from '@kimen/catalog';
import { describe, expect, it, vi } from 'vitest';

import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';

const protocols = [
  { bindingKey: 'path', catalogId: A2UI_BASIC_CATALOG_IDS[0], version: 'v0.9.1' },
  { bindingKey: '@path', catalogId: A2UI_V1_BASIC_CATALOG_IDS[0], version: '1.0' },
];

describe.each(protocols)('A2UI $version icons', ({ bindingKey, catalogId, version }) => {
  function setup() {
    const surface = document.createElement('div');
    const render = vi.fn<(input: unknown) => RenderResult>(() => ({ diagnostics: [], ok: true }));
    const adapter = createA2uiAdapter({ render, surface });
    const surfaceId = 's';
    expect(adapter.apply({ version, createSurface: { catalogId, surfaceId } }).ok).toBe(true);
    return {
      icon: (name: unknown) =>
        adapter.apply({
          version,
          updateComponents: { surfaceId, components: [{ id: 'root', component: 'Icon', name }] },
        }),
      nameIcon: (value: string) =>
        adapter.apply({ version, updateDataModel: { surfaceId, path: '/icon', value } }),
      render,
    };
  }

  it.each([
    ['check', 'check'],
    ['warning', 'triangle-alert'],
    ['circle-check', 'circle-check'],
    ['unknown-glyph', 'unknown-glyph'],
  ])('S8 passes %s to the guarded renderer as %s', (value, name) => {
    const { icon, render } = setup();

    expect(icon(value)).toStrictEqual({ degradations: [], diagnostics: [], ok: true });

    expect(render.mock.lastCall?.[0]).toStrictEqual({
      root: { component: 'ki-icon', props: { name } },
      version: 1,
    });
  });

  it('resolves the glyph when a pending data binding receives a name', () => {
    const { icon, nameIcon, render } = setup();
    expect(icon({ [bindingKey]: '/icon' }).ok).toBe(true);
    expect(render.mock.lastCall?.[0]).toMatchObject({ root: { component: 'ki-card' } });

    expect(nameIcon('close').ok).toBe(true);

    expect(render.mock.lastCall?.[0]).toStrictEqual({
      root: { component: 'ki-icon', props: { name: 'x' } },
      version: 1,
    });
  });

  it('reports an unsupported SVG path and sends only the fixed fallback', () => {
    const { icon, render } = setup();

    const result = icon({ svgPath: 'M 0 0 L 24 24' });

    expect(result.ok).toBe(true);
    expect(result.degradations).toStrictEqual([
      {
        componentId: 'root',
        componentType: 'Icon',
        detail: 'svgPath',
        reason: 'unsupported-variant',
        surfaceId: 's',
      },
    ]);
    expect(render.mock.lastCall?.[0]).toStrictEqual({
      root: {
        component: 'ki-badge',
        props: { tone: 'warning' },
        slots: { '': ['Unsupported component'] },
      },
      version: 1,
    });
  });
});
