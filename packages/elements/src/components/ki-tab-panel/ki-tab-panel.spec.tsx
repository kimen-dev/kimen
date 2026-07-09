import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:014-ki-tabs
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test title carries an approved S-ID.
type WithInternals = HTMLElement & { internals: ElementInternals };

function requireElement<T extends Element>(value: T | null, selector: string): T {
  if (value === null) {
    throw new Error(`Missing ${selector}`);
  }
  return value;
}

describe('ki-tab-panel', () => {
  it('S8 renders tabpanel anatomy around the default slot', async () => {
    const { root } = await render(<ki-tab-panel>Panel content</ki-tab-panel>);
    const panel = requireElement(root.shadowRoot.querySelector('[part="panel"]'), '[part="panel"]');
    const slot = requireElement(panel.querySelector('slot'), 'default slot');

    expect(slot.name).toBe('');
    expect(root.shadowRoot.textContent).not.toContain('TODO');
  });

  it('S8 exposes tabpanel semantics through internals', async () => {
    const { root } = await render(<ki-tab-panel>Email panel</ki-tab-panel>);
    const internals = (root as WithInternals).internals;

    expect(internals.role).toBe('tabpanel');
  });

  it('S3 reflects value with an empty-string effective default', async () => {
    const { root } = await render(<ki-tab-panel value="email">Email panel</ki-tab-panel>);
    const { root: emptyRoot } = await render(<ki-tab-panel>Email panel</ki-tab-panel>);

    expect(root.getAttribute('value')).toBe('email');
    expect((emptyRoot as HTMLElement & { value: string }).value).toBe('');
  });

  it('S18 carries the native hidden display guard in CSS', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'ki-tab-panel.css'),
      'utf8',
    );

    expect(css).toContain(':host([hidden])');
    expect(css).toContain('display: none !important');
  });
});
