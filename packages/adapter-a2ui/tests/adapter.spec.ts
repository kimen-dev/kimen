// @spec:029-adapter-a2ui
// User Story 1 (P1): a supported A2UI surface reaches the user as catalog
// components, incremental updates revise it without losing it, and a declared
// action returns to the agent as a userAction. Plus the no-own-render-path
// guarantee (S12) proven with an instrumented guarded-renderer double.
import { catalogData } from '@kimen/catalog';
import { beforeEach, describe, expect, it } from 'vitest';

import { createA2uiAdapter } from '../src/index.js';
import type { A2uiUserAction, GuardedRender } from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const orderSurface = () => ({
  surfaceUpdate: {
    surfaceId: 'checkout',
    root: 'card',
    components: [
      { id: 'card', component: { Card: { children: { explicitList: ['summary', 'confirm'] } } } },
      { id: 'summary', component: { Text: { text: { literalString: 'Order total: 42' } } } },
      {
        id: 'confirm',
        component: {
          Button: {
            label: { literalString: 'Confirm order' },
            action: { name: 'confirm-order' },
          },
        },
      },
    ],
  },
});

const isCatalogComponent = (element: Element): boolean =>
  Object.prototype.hasOwnProperty.call(catalogData.components, element.tagName.toLowerCase());

describe('A2UI messages become catalog specs rendered through the guardrail', () => {
  it('S1 renders a supported A2UI message as catalog components only', () => {
    const adapter = createA2uiAdapter({ protocolVersion: '0.9.1', surface });

    const result = adapter.apply(orderSurface());

    expect(result.ok).toBe(true);
    const elements = [...surface.querySelectorAll('*')];
    expect(elements.length).toBeGreaterThanOrEqual(2);
    expect(elements.every(isCatalogComponent)).toBe(true);
    expect(surface.querySelector('ki-card')).not.toBeNull();
    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm order');
  });

  it('S2 revises the surface with an incremental update without losing it', () => {
    const adapter = createA2uiAdapter({ protocolVersion: '0.9.1', surface });
    adapter.apply(orderSurface());

    const result = adapter.apply({
      surfaceUpdate: {
        surfaceId: 'checkout',
        components: [
          {
            id: 'card',
            component: { Card: { children: { explicitList: ['summary', 'confirm', 'notes'] } } },
          },
          { id: 'notes', component: { TextField: { label: { literalString: 'Delivery notes' } } } },
        ],
      },
    });

    expect(result.ok).toBe(true);
    // The new input is present...
    const input = surface.querySelector('ki-input');
    expect(input?.getAttribute('label')).toBe('Delivery notes');
    // ...and the previously rendered components persist.
    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm order');
    expect(surface.querySelector('ki-card')).not.toBeNull();
  });

  it('S3 returns a declared action to the agent as an A2UI userAction event', () => {
    const events: A2uiUserAction[] = [];
    const adapter = createA2uiAdapter({
      onUserAction: (event) => events.push(event),
      protocolVersion: '0.9.1',
      surface,
    });
    adapter.apply(orderSurface());

    const button = surface.querySelector('ki-button');
    expect(button).not.toBeNull();
    button?.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));

    expect(events).toHaveLength(1);
    expect(events[0]?.userAction.name).toBe('confirm-order');
    expect(events[0]?.userAction.sourceComponentId).toBe('confirm');
    expect(events[0]?.userAction.surfaceId).toBe('checkout');
  });
});

describe('the adapter owns no render path of its own', () => {
  it('S12 sends every render call for protocol input to the guarded renderer alone', () => {
    const calls: { input: unknown; surface: Element }[] = [];
    const double: GuardedRender = (input, renderOptions) => {
      calls.push({ input, surface: renderOptions.surface });
      return { diagnostics: [], ok: true };
    };
    const adapter = createA2uiAdapter({ protocolVersion: '0.9.1', render: double, surface });

    const result = adapter.apply({
      surfaceUpdate: {
        surfaceId: 's',
        root: 'root',
        components: [
          { id: 'root', component: { Card: { children: { explicitList: ['weird'] } } } },
          { id: 'weird', component: { SomeUnmappedThing: { text: { literalString: 'x' } } } },
        ],
      },
    });

    expect(result.ok).toBe(true);
    // Every rendering call arrives at the double, targeting the host surface...
    expect(calls).toHaveLength(1);
    expect(calls[0]?.surface).toBe(surface);
    // ...the unmapped type was translated to a catalog fallback for the double...
    expect(JSON.stringify(calls[0]?.input)).toContain('ki-badge');
    // ...and nothing reached the surface outside those calls.
    expect(surface.childNodes).toHaveLength(0);
  });
});
