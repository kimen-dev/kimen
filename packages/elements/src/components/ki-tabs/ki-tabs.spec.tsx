import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import {
  buildPairing,
  isBooleanAttributePresent,
  resolveSelection,
  type TabRecord,
} from './ki-tabs.selection';
import {
  firstSelectableIndex,
  lastSelectableIndex,
  navigationIntentForKey,
  nextSelectableIndex,
} from './ki-tabs.keyboard';

// @spec:014-ki-tabs
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test title carries an approved S-ID.
function requireElement<T extends Element>(value: T | null, selector: string): T {
  if (value === null) {
    throw new Error(`Missing ${selector}`);
  }
  return value;
}

function shadowRootOf(root: HTMLElement): ShadowRoot {
  if (root.shadowRoot === null) {
    throw new Error('Missing shadow root');
  }
  return root.shadowRoot;
}

const tabs: TabRecord[] = [
  { value: 'email', disabled: false, duplicate: false },
  { value: 'billing', disabled: true, duplicate: false },
  { value: 'notifications', disabled: false, duplicate: false },
  { value: 'notifications', disabled: false, duplicate: true },
];

describe('ki-tabs', () => {
  it('S7 renders a shadow tablist wrapper and keeps panels outside it', async () => {
    const { root } = await render(
      h(
        'ki-tabs',
        { label: 'Settings' },
        h('ki-tab', { value: 'email' }, 'Email'),
        h('ki-tab-panel', { value: 'email' }, 'Email panel'),
      ),
    );

    const shadow = shadowRootOf(root);
    const tablist = requireElement(shadow.querySelector('[part="tablist"]'), 'tablist');
    const tabSlot = requireElement(tablist.querySelector('slot[name="tab"]'), 'tab slot');
    const defaultSlot = requireElement(shadow.querySelector('slot:not([name])'), 'default slot');

    expect(tablist.getAttribute('role')).toBe('tablist');
    expect(tablist.getAttribute('aria-label')).toBe('Settings');
    expect(tabSlot.parentElement).toBe(tablist);
    expect(defaultSlot.parentElement).toBe(shadow);
  });

  it('S7 omits the tablist aria-label when no label is provided', async () => {
    const { root } = await render(<ki-tabs></ki-tabs>);
    const tablist = requireElement(shadowRootOf(root).querySelector('[part="tablist"]'), 'tablist');

    expect(tablist.hasAttribute('aria-label')).toBe(false);
  });

  it('S8 auto-assigns tabs, preserves author ids and wires tab-panel IDREFs', async () => {
    const { root } = await render(
      h(
        'ki-tabs',
        { value: 'email' },
        h('ki-tab', { id: 'email-tab', value: 'email' }, 'Email'),
        h('ki-tab-panel', { id: 'email-panel', value: 'email' }, 'Email panel'),
      ),
    );
    const tab = requireElement(root.querySelector('ki-tab'), 'ki-tab');
    const panel = requireElement(root.querySelector('ki-tab-panel'), 'ki-tab-panel');

    expect(tab.getAttribute('slot')).toBe('tab');
    expect(tab.id).toBe('email-tab');
    expect(panel.id).toBe('email-panel');
    expect(tab.getAttribute('aria-controls')).toBe('email-panel');
    expect(panel.getAttribute('aria-labelledby')).toBe('email-tab');
  });

  it('S3 resolves requested, unknown, disabled, duplicate and empty selections', () => {
    expect(resolveSelection(tabs, 'notifications')).toBe(2);
    expect(resolveSelection(tabs, 'missing')).toBe(0);
    expect(resolveSelection(tabs, 'billing')).toBe(0);
    expect(resolveSelection(tabs, '')).toBe(0);
    expect(
      resolveSelection([{ value: 'email', disabled: true, duplicate: false }], 'email'),
    ).toBeNull();
  });

  it('S3 builds first-owner tab and panel pairings', () => {
    expect(
      buildPairing(
        [
          { value: '', disabled: false, duplicate: false },
          { value: 'email', disabled: false, duplicate: false },
          { value: 'email', disabled: false, duplicate: true },
        ],
        [{ value: 'email' }, { value: 'email' }, { value: 'orphan' }],
      ),
    ).toEqual([
      { value: '', tabIndex: 0, panelIndex: null },
      { value: 'email', tabIndex: 1, panelIndex: 0 },
      { value: 'orphan', tabIndex: null, panelIndex: 2 },
    ]);
  });

  it('S13 finds next and previous selectable tabs with wrap and duplicate skipping', () => {
    expect(nextSelectableIndex(tabs, 0, 'next')).toBe(2);
    expect(nextSelectableIndex(tabs, 2, 'next')).toBe(0);
    expect(nextSelectableIndex(tabs, 0, 'previous')).toBe(2);
    expect(
      nextSelectableIndex([{ value: 'one', disabled: false, duplicate: false }], 0, 'next'),
    ).toBe(0);
    expect(
      nextSelectableIndex([{ value: 'one', disabled: true, duplicate: false }], 0, 'next'),
    ).toBeNull();
  });

  it('S5 S14 finds first and last selectable tabs', () => {
    expect(firstSelectableIndex(tabs)).toBe(0);
    expect(lastSelectableIndex(tabs)).toBe(2);
    expect(firstSelectableIndex([{ value: 'one', disabled: true, duplicate: false }])).toBeNull();
    expect(lastSelectableIndex([{ value: 'one', disabled: true, duplicate: false }])).toBeNull();
  });

  it('S4 S16 maps horizontal arrows through writing direction plus Home and End', () => {
    expect(navigationIntentForKey('ArrowRight', 'ltr')).toBe('next');
    expect(navigationIntentForKey('ArrowLeft', 'ltr')).toBe('previous');
    expect(navigationIntentForKey('ArrowRight', 'rtl')).toBe('previous');
    expect(navigationIntentForKey('ArrowLeft', 'rtl')).toBe('next');
    expect(navigationIntentForKey('Home', 'ltr')).toBe('first');
    expect(navigationIntentForKey('End', 'rtl')).toBe('last');
    expect(navigationIntentForKey('ArrowDown', 'ltr')).toBeNull();
  });

  it('S2 normalizes boolean attribute presence without treating disabled false as false', () => {
    expect(isBooleanAttributePresent('')).toBe(true);
    expect(isBooleanAttributePresent('false')).toBe(true);
    expect(isBooleanAttributePresent(true)).toBe(true);
    expect(isBooleanAttributePresent(null)).toBe(false);
    expect(isBooleanAttributePresent(undefined)).toBe(false);
  });
});
