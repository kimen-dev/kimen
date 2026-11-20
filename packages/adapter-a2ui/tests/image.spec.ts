// @spec:076-ki-image
import { beforeEach, describe, expect, it } from 'vitest';

import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';

const dialects = [
  {
    accessibilityKey: 'accessibility',
    bindingKey: 'path',
    catalogId: A2UI_BASIC_CATALOG_IDS[0],
    version: 'v0.9.1',
  },
  {
    accessibilityKey: '@accessibility',
    bindingKey: '@path',
    catalogId: A2UI_V1_BASIC_CATALOG_IDS[0],
    version: '1.0',
  },
];

describe.each(dialects)(
  'A2UI $version Image',
  ({ accessibilityKey, bindingKey, catalogId, version }) => {
    const surfaceId = 'gallery';
    let surface: HTMLElement;
    let adapter: ReturnType<typeof createA2uiAdapter>;

    beforeEach(() => {
      surface = document.createElement('div');
      document.body.replaceChildren(surface);
      adapter = createA2uiAdapter({ actions: ['inspect-image'], surface });
      adapter.apply({ version, createSurface: { catalogId, surfaceId } });
    });

    const setPicture = (properties: Record<string, unknown>) =>
      adapter.apply({
        version,
        updateComponents: {
          components: [{ id: 'root', component: 'Image', ...properties }],
          surfaceId,
        },
      });

    it('S14 maps a bound URL, accessibility label and fit to the catalog image', () => {
      const pending = setPicture({
        [accessibilityKey]: { label: 'Low green hills under a pale sky' },
        fit: 'contain',
        url: { [bindingKey]: '/picture' },
        variant: 'largeFeature',
      });
      expect(pending.ok).toBe(true);
      expect(surface.querySelector('ki-image')).toBeNull();

      const result = adapter.apply({
        version,
        updateDataModel: { surfaceId, value: { picture: '/photos/hills.jpg' } },
      });

      expect(result).toStrictEqual({ degradations: [], diagnostics: [], ok: true });
      const image = surface.querySelector('ki-image');
      expect(image?.getAttribute('src')).toBe('/photos/hills.jpg');
      expect(image?.getAttribute('alt')).toBe('Low green hills under a pale sky');
      expect(image?.getAttribute('fit')).toBe('contain');
      expect(image?.hasAttribute('variant')).toBe(false);
    });

    it('maps an explicitly hidden image to decorative', () => {
      const result = setPicture({
        [accessibilityKey]: { hidden: true },
        url: '/photos/divider.svg',
      });

      expect(result.ok).toBe(true);
      expect(surface.querySelector('ki-image')?.hasAttribute('decorative')).toBe(true);
    });

    it('falls back and reports a missing alternative for an unlabeled image', () => {
      const result = setPicture({ [accessibilityKey]: { label: '  ' }, url: '/photos/hills.jpg' });

      expect(result.ok).toBe(true);
      expect(result.degradations).toStrictEqual([
        { componentId: 'root', componentType: 'Image', reason: 'missing-image-alt', surfaceId },
      ]);
      expect(surface.querySelector('ki-image')).toBeNull();
      expect(surface.querySelector('ki-badge')?.textContent).toBe('Unsupported component');
    });

    it('keeps the previous image when the catalog refuses a URL', () => {
      const label = { label: 'Hills' };
      setPicture({ [accessibilityKey]: label, url: '/photos/hills.jpg' });
      const previous = surface.firstElementChild;

      const result = setPicture({ [accessibilityKey]: label, url: 'data:image/png;base64,AA==' });

      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]?.rule).toBe('url-scheme');
      expect(surface.firstElementChild).toBe(previous);
      expect(surface.querySelector('ki-image')?.getAttribute('src')).toBe('/photos/hills.jpg');
    });

    it('rejects action properties outside the Image contract', () => {
      const result = setPicture({
        [accessibilityKey]: { label: 'Hills' },
        action: { event: { name: 'inspect-image' } },
        url: '/photos/hills.jpg',
      });

      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]).toMatchObject({
        path: '/components/root/action',
        rule: 'unknown-property',
      });
      expect(surface.firstElementChild).toBeNull();
    });
  },
);
