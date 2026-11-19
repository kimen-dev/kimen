import { describe, expect, it } from 'vitest';
import { type Catalog, catalogData, createLiveSurface, renderUiSpec } from '../src/index.js';

const catalog: Catalog = catalogData;

const root = {
  component: 'ki-note',
  id: 'billing',
  props: { icon: false, size: 'sm', tone: 'warning' },
  slots: { '': ['Only owners can change billing.'] },
} as const;

describe('ki-note catalog integration', () => {
  it('publishes the props and slots of a static note', () => {
    const note = catalog.components['ki-note'];
    expect(note?.props).toMatchObject({
      icon: { default: true, type: 'boolean' },
      size: { default: 'md', values: ['sm', 'md'] },
      tone: {
        default: 'neutral',
        values: ['neutral', 'primary', 'info', 'success', 'warning', 'danger'],
      },
    });
    expect(Object.keys(note?.slots ?? {})).toEqual(['', 'icon']);
    expect(note?.events).toEqual({});
  });

  it('renders an explicit icon opt-out', () => {
    const surface = document.createElement('main');
    expect(renderUiSpec({ root, version: 1 }, { surface }).ok).toBe(true);
    expect(surface.querySelector('ki-note')?.getAttribute('icon')).toBe('false');
  });

  it('keeps the opt-out through a live patch and clears it when unset', () => {
    const surface = document.createElement('main');
    const live = createLiveSurface({ actions: [], surface });
    expect(live.apply({ ops: [{ node: { ...root, props: {} }, op: 'insert' }] }).ok).toBe(true);
    const note = surface.querySelector('ki-note');
    expect(note).not.toBeNull();
    expect(live.apply({ ops: [{ id: root.id, op: 'set', props: { icon: false } }] }).ok).toBe(true);
    expect(note?.getAttribute('icon')).toBe('false');
    expect(live.apply({ ops: [{ id: root.id, op: 'set', props: { icon: null } }] }).ok).toBe(true);
    expect(note?.hasAttribute('icon')).toBe(false);
  });
});
