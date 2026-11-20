import { describe, expect, it, vi } from 'vitest';
import { type Catalog, catalogData, renderUiSpec } from '../src/index.js';

const catalog: Catalog = catalogData;
const inbox = {
  component: 'ki-sidebar-item',
  id: 'inbox',
  props: { href: '/inbox', count: 12 },
  slots: { '': ['Inbox'] },
} as const;
const root = {
  component: 'ki-sidebar',
  id: 'main-sidebar',
  props: { collapsible: true, label: 'Main' },
  slots: {
    '': [
      {
        component: 'ki-sidebar-group',
        id: 'workspace',
        props: { label: 'Workspace' },
        slots: { '': [inbox] },
      },
    ],
  },
} as const;

describe('Sidebar in the guarded catalog', () => {
  it('registers the navigation tags and accepts a grouped destination', () => {
    expect(Object.keys(catalog.components['ki-sidebar']?.slots ?? {})).toEqual([
      '',
      'brand',
      'footer',
    ]);
    expect(catalog.components['ki-sidebar']?.events).toHaveProperty('ki-sidebar-change');
    expect(catalog.components['ki-sidebar-item']?.props['href']?.format).toBe('url');
    expect(catalog.components['ki-sidebar-item']?.slots).toHaveProperty('start');
    const surface = document.createElement('main');
    expect(renderUiSpec({ root, version: 1 }, { surface }).ok).toBe(true);
    expect(surface.querySelector('ki-sidebar-group ki-sidebar-item')?.getAttribute('href')).toBe(
      '/inbox',
    );
  });

  it('keeps local storage preference out of declarative specs', () => {
    const surface = document.createElement('main');
    const withPreference = { ...root, props: { ...root.props, preference: 'profile' } };
    expect(renderUiSpec({ root: withPreference, version: 1 }, { surface }).ok).toBe(false);
    expect(surface.children).toHaveLength(0);
  });

  it('dispatches a bound sidebar action only for the declared toggle event', () => {
    const surface = document.createElement('main');
    const onAction = vi.fn();
    const withAction = { ...root, action: 'toggle' };
    expect(
      renderUiSpec({ root: withAction, version: 1, actions: ['toggle'] }, { onAction, surface }).ok,
    ).toBe(true);
    surface
      .querySelector('ki-sidebar-item')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onAction).not.toHaveBeenCalled();
    surface.querySelector('ki-sidebar')?.dispatchEvent(new CustomEvent('ki-sidebar-change'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
