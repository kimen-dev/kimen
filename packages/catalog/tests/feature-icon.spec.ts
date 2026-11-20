// @spec:090-ki-feature-icon
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  type Catalog,
  catalogData,
  CATALOG_SCHEMA_VERSION,
  preflightUiSpec,
  renderUiSpec,
} from '../src/index.js';

const glyph = 'shield-check';
const tile = {
  component: 'ki-feature-icon',
  props: { shape: 'circle', size: 'lg', tone: 'primary-light' },
  slots: {
    '': [{ component: 'ki-icon', props: { name: glyph } }],
  },
};

beforeEach(() => {
  vi.stubGlobal(Symbol.for('kimen.icon-registry.v1'), new Map([[glyph, '<path />']]));
});

afterEach(() => vi.unstubAllGlobals());

it('renders a registered glyph in the catalogued FeatureIcon default slot', () => {
  const surface = document.createElement('div');
  const result = renderUiSpec({ root: tile, version: 1 }, { surface });

  expect(result).toEqual({ diagnostics: [], ok: true });
  expect(surface.querySelector('ki-feature-icon > ki-icon')?.getAttribute('name')).toBe(glyph);
  expect(surface.firstElementChild?.getAttribute('shape')).toBe('circle');
});

it('S13 rejects a declared action bound to a decorative tile', () => {
  const catalog: Catalog = {
    catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
    components: {
      'ki-icon': catalogData.components['ki-icon'],
      'ki-feature-icon': {
        description: 'A decorative tile.',
        events: {},
        props: {},
        slots: { '': 'The decorative glyph.' },
        tag: 'ki-feature-icon',
        whenNotToUse: 'For an action.',
        whenToUse: 'Beside a heading.',
      },
    },
  };

  const result = preflightUiSpec(
    {
      actions: ['open'],
      root: { action: 'open', component: tile.component, slots: tile.slots },
      version: 1,
    },
    { catalog },
  );

  expect(result).toMatchObject({
    diagnostics: [{ path: 'root.action', rule: 'action-not-allowed', value: 'open' }],
    ok: false,
  });
});
