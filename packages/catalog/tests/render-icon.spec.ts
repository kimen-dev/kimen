// @spec:069-ki-icon
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type Catalog,
  CATALOG_SCHEMA_VERSION,
  createLiveSurface,
  createStreamingRenderer,
  preflightUiSpec,
  renderUiSpec,
  selectSpecIcons,
  validateUiSpec,
} from '../src/index.js';

const catalog: Catalog = {
  catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
  components: {
    'ki-icon': {
      description: 'A named icon.',
      events: {},
      props: { name: { description: 'Icon name.', required: true, type: 'string' } },
      slots: {},
      tag: 'ki-icon',
      whenNotToUse: 'For an action.',
      whenToUse: 'For a glyph.',
    },
  },
};

const registered = 'circle-check';
const unimported = 'alarm-clock-off';
const unknown = 'kimen-not-an-icon';
const node = (name: string) => ({ component: 'ki-icon', id: 'status-icon', props: { name } });
const spec = (name: string) => ({ root: node(name), version: 1 });

describe('ki-icon at the guarded catalog boundary', () => {
  beforeEach(() => {
    // Stand in for the one glyph module the host imported. The catalog has
    // no package dependency on elements or its build artifacts.
    vi.stubGlobal(Symbol.for('kimen.icon-registry.v1'), new Map([[registered, '<circle />']]));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('S6 preflights and renders an icon registered by the host', () => {
    const surface = document.createElement('div');

    expect(preflightUiSpec(spec(registered), { catalog })).toEqual({ diagnostics: [], ok: true });
    expect(renderUiSpec(spec(registered), { catalog, surface }).ok).toBe(true);
    expect(surface.querySelector('ki-icon')?.getAttribute('name')).toBe(registered);
  });

  it.each([unimported, unknown])(
    'S6 rejects unavailable icon %s before replacing the surface',
    (name) => {
      const surface = document.createElement('div');
      surface.textContent = 'Previous content';

      expect(validateUiSpec(spec(name), { catalog }).ok).toBe(true);
      const verdict = preflightUiSpec(spec(name), { catalog });
      expect(verdict).toMatchObject({
        diagnostics: [
          {
            path: 'root.props.name',
            rule: 'unavailable-icon',
            value: name,
          },
        ],
        ok: false,
      });
      expect(renderUiSpec(spec(name), { catalog, surface })).toEqual(verdict);
      expect(surface.textContent).toBe('Previous content');
      expect(surface.querySelector('ki-icon')).toBeNull();
    },
  );

  it('S6 rejects an unavailable icon streamed after a registered one', () => {
    const surface = document.createElement('div');
    const renderer = createStreamingRenderer({ catalog, surface });
    expect(renderer.push(node(registered)).ok).toBe(true);

    expect(renderer.push(node(unimported)).diagnostics[0]?.rule).toBe('unavailable-icon');
    expect(surface.querySelectorAll('ki-icon')).toHaveLength(1);
    expect(surface.firstElementChild?.getAttribute('name')).toBe(registered);
  });

  it('S6 rejects a live update to an unavailable icon', () => {
    const surface = document.createElement('div');
    const live = createLiveSurface({ catalog, surface });
    expect(live.apply({ ops: [{ node: node(registered), op: 'insert' }] }).ok).toBe(true);

    const result = live.apply({
      ops: [{ id: 'status-icon', op: 'set', props: { name: unimported } }],
    });
    expect(result).toMatchObject({
      diagnostics: [{ path: 'surface[0].props.name', rule: 'unavailable-icon', value: unimported }],
      ok: false,
      revision: 1,
    });
    expect(surface.firstElementChild?.getAttribute('name')).toBe(registered);
  });

  it('S11 rejects a declared action bound to an icon', () => {
    const input = {
      actions: ['clear'],
      root: { ...node(registered), action: 'clear' },
      version: 1,
    };

    expect(preflightUiSpec(input, { catalog })).toMatchObject({
      diagnostics: [{ path: 'root.action', rule: 'action-not-allowed', value: 'clear' }],
      ok: false,
    });
  });
});

// Spec 069 S14: a declared selection, not registration, decides which glyph
// names a spec may use. Components register the glyphs they draw themselves.
describe('the spec-facing icon selection', () => {
  const selectionKey = Symbol.for('kimen.spec-icons.v1');
  const tiles: Catalog = {
    catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
    components: {
      ...catalog.components,
      'ki-tile': {
        description: 'A tile with a decorative glyph.',
        events: {},
        props: {
          heading: { description: 'Heading.', required: true, type: 'string' },
          'icon-name': { description: 'Glyph.', type: 'string' },
        },
        slots: {},
        tag: 'ki-tile',
        whenNotToUse: 'For an action.',
        whenToUse: 'For a tile.',
      },
    },
  };
  const tile = (name?: string) => ({
    root: {
      component: 'ki-tile',
      props: name === undefined ? { heading: 'Tile' } : { heading: 'Tile', 'icon-name': name },
    },
    version: 1,
  });

  beforeEach(() => {
    // The stock glyph, plus one a component imported to draw its own control.
    vi.stubGlobal(
      Symbol.for('kimen.icon-registry.v1'),
      new Map([
        [registered, '<circle />'],
        ['x', '<path />'],
      ]),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, selectionKey);
  });

  it('S14 refuses a registered glyph the surface did not select, in ki-icon and icon-name alike', () => {
    selectSpecIcons([registered]);

    expect(preflightUiSpec(spec(registered), { catalog: tiles }).ok).toBe(true);
    expect(preflightUiSpec(tile(registered), { catalog: tiles }).ok).toBe(true);
    expect(preflightUiSpec(tile(), { catalog: tiles }).ok).toBe(true);
    expect(preflightUiSpec(spec('x'), { catalog: tiles })).toMatchObject({
      diagnostics: [{ path: 'root.props.name', rule: 'unavailable-icon', value: 'x' }],
      ok: false,
    });
    expect(preflightUiSpec(tile('x'), { catalog: tiles })).toMatchObject({
      diagnostics: [{ path: 'root.props.icon-name', rule: 'unavailable-icon', value: 'x' }],
      ok: false,
    });
  });

  it('S14 refuses a selected name that is not imported, since it cannot draw', () => {
    selectSpecIcons([registered, unimported]);

    expect(preflightUiSpec(spec(unimported), { catalog: tiles })).toMatchObject({
      diagnostics: [{ rule: 'unavailable-icon', value: unimported }],
      ok: false,
    });
  });

  it('S14 holds live updates and streams to the selection', () => {
    selectSpecIcons([registered]);
    const surface = document.createElement('div');
    const live = createLiveSurface({ catalog: tiles, surface });
    expect(live.apply({ ops: [{ node: node(registered), op: 'insert' }] }).ok).toBe(true);
    expect(
      live.apply({ ops: [{ id: 'status-icon', op: 'set', props: { name: 'x' } }] }).diagnostics[0]
        ?.rule,
    ).toBe('unavailable-icon');

    const renderer = createStreamingRenderer({
      catalog: tiles,
      surface: document.createElement('div'),
    });
    expect(renderer.push(node('x')).diagnostics[0]?.rule).toBe('unavailable-icon');
  });

  it('S14 keeps the import-based behaviour where no selection is declared', () => {
    expect(preflightUiSpec(spec('x'), { catalog: tiles }).ok).toBe(true);
    expect(preflightUiSpec(tile('x'), { catalog: tiles }).ok).toBe(true);
    expect(preflightUiSpec(tile(unimported), { catalog: tiles }).diagnostics[0]?.rule).toBe(
      'unavailable-icon',
    );
  });
});
