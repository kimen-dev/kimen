// @spec:102-ki-slider
import { describe, expect, it, vi } from 'vitest';
import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';

describe.each([
  {
    bindingKey: 'path',
    catalogId: A2UI_BASIC_CATALOG_IDS[0],
    division: {},
    step: null,
    version: 'v0.9.1',
  },
  {
    bindingKey: '@path',
    catalogId: A2UI_V1_BASIC_CATALOG_IDS[0],
    division: { steps: 5 },
    step: '8',
    version: '1.0',
  },
])('A2UI $version Slider', ({ bindingKey, catalogId, division, step, version }) => {
  it('S11 maps the scale, resolved value and division count, without an outbound action', () => {
    const surface = document.createElement('div');
    const onAction = vi.fn();
    const adapter = createA2uiAdapter({ onAction, surface });
    const surfaceId = 'volume';
    adapter.apply({ version, createSurface: { catalogId, surfaceId } });
    adapter.apply({ version, updateDataModel: { surfaceId, value: { volume: 34 } } });

    const result = adapter.apply({
      version,
      updateComponents: {
        components: [
          {
            component: 'Slider',
            id: 'root',
            label: 'Volume',
            min: 10,
            max: 50,
            value: { [bindingKey]: '/volume' },
            ...division,
          },
        ],
        surfaceId,
      },
    });

    expect(result).toStrictEqual({ degradations: [], diagnostics: [], ok: true });
    const slider = surface.querySelector('ki-slider');
    expect(slider?.getAttribute('label')).toBe('Volume');
    expect(slider?.getAttribute('min')).toBe('10');
    expect(slider?.getAttribute('max')).toBe('50');
    expect(slider?.getAttribute('step')).toBe(step);
    expect(slider?.getAttribute('value')).toBe('34');
    slider?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onAction).not.toHaveBeenCalled();
  });
});
