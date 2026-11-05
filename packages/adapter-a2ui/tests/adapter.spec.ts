// @spec:029-adapter-a2ui
// User Story 1 (P1): an A2UI v0.9.1 agent's declarative UI reaches the user
// safely. Messages replay the official v0.9.1 example corpus
// (tests/fixtures/spec-examples.ts, copied from the A2UI repository) or
// follow the shapes of `specification/v0_9_1/json/server_to_client.json`.
import { beforeEach, describe, expect, it } from 'vitest';

import type { A2uiActionMessage, A2uiActionMetadata } from '../src/index.js';
import { A2UI_BASIC_CATALOG_IDS, createA2uiAdapter } from '../src/index.js';
import {
  childListTemplate,
  incremental,
  interactiveButton,
  simpleLoginForm,
  validClientMessages,
} from './fixtures/spec-examples.js';

let surface: HTMLElement;

/** Activates the first element matching `selector`, failing the test when it is absent. */
const activate = (root: Element, selector: string): void => {
  const target = root.querySelector<HTMLElement>(selector);
  if (target === null) {
    throw new Error(`no ${selector} rendered`);
  }
  target.click();
};

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const BASIC = A2UI_BASIC_CATALOG_IDS[0] ?? '';

const create = (surfaceId: string, extra: Record<string, unknown> = {}) => ({
  version: 'v0.9.1',
  createSurface: { surfaceId, catalogId: BASIC, ...extra },
});

/** Order summary card with a confirm button (Card → Column → Text, Button). */
const orderSummary = (surfaceId = 'checkout') => ({
  version: 'v0.9.1',
  updateComponents: {
    surfaceId,
    components: [
      { id: 'root', component: 'Card', child: 'body' },
      {
        id: 'body',
        component: 'Column',
        children: ['title', 'total', 'confirm'],
      },
      { id: 'title', component: 'Text', text: 'Order summary', variant: 'h2' },
      { id: 'total', component: 'Text', text: { path: '/order/total' } },
      {
        id: 'confirm',
        component: 'Button',
        child: 'confirm-label',
        variant: 'primary',
        action: {
          event: {
            name: 'confirm-order',
            context: { total: { path: '/order/total' } },
          },
        },
      },
      { id: 'confirm-label', component: 'Text', text: 'Confirm order' },
    ],
  },
});

const isCatalogTree = (root: Element): boolean =>
  [...root.querySelectorAll('*')].every((element) => element.localName.startsWith('ki-'));

describe('A2UI v0.9.1 messages become catalog specs rendered through the guardrail', () => {
  it('S1 renders a supported v0.9.1 surface as catalog components only', () => {
    const adapter = createA2uiAdapter({ surface });

    expect(adapter.apply(create('checkout')).ok).toBe(true);
    const result = adapter.apply(orderSummary());

    expect(result.ok).toBe(true);
    const card = surface.querySelector('ki-card');
    expect(card?.textContent).toContain('Order summary');
    const button = surface.querySelector('ki-button');
    expect(button?.textContent).toBe('Confirm order');
    expect(button?.getAttribute('variant')).toBe('primary');
    expect(isCatalogTree(surface)).toBe(true);
  });

  it('S1 replays the official interactive-button example (v0.9 envelope, Column root)', () => {
    const adapter = createA2uiAdapter({ surface });

    const results = interactiveButton.map((message) => adapter.apply(message));

    expect(results.every((r) => r.ok)).toBe(true);
    // A Column root with two children renders inside the declared root container.
    expect(surface.firstElementChild?.localName).toBe('ki-card');
    expect(surface.textContent).toContain('Click the button below');
    expect(surface.querySelector('ki-button')?.textContent).toBe('Click Me');
    expect(isCatalogTree(surface)).toBe(true);
  });

  it('S2 applies an incremental updateComponents without losing the surface', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create('checkout'));
    adapter.apply(orderSummary());

    const result = adapter.apply({
      version: 'v0.9.1',
      updateComponents: {
        surfaceId: 'checkout',
        components: [
          {
            id: 'body',
            component: 'Column',
            children: ['title', 'total', 'notes', 'confirm'],
          },
          {
            id: 'notes',
            component: 'TextField',
            label: 'Delivery notes',
            variant: 'longText',
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    expect(surface.querySelector('ki-textarea')?.getAttribute('label')).toBe('Delivery notes');
    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm order');
    expect(surface.textContent).toContain('Order summary');
  });

  it('S2 replays the official incremental example: buffered until root, then progressive', () => {
    const adapter = createA2uiAdapter({ surface });

    const results = incremental.map((message) => adapter.apply(message));

    expect(results.map((r) => r.ok)).toStrictEqual([true, true, true, true, true, true]);
    // Four restaurants after the /restaurants/3 upsert, each with its book button.
    expect(surface.querySelectorAll('ki-button')).toHaveLength(4);
    expect(surface.textContent).toContain('Spice Route');
    expect(surface.textContent).toContain('456 Shoreline Dr');
  });

  it('S3 returns a declared action to the agent as an A2UI action event', () => {
    const events: A2uiActionMessage[] = [];
    const adapter = createA2uiAdapter({
      now: () => new Date('2026-11-05T10:00:00.000Z'),
      onAction: (event) => events.push(event),
      surface,
    });
    adapter.apply(create('checkout'));
    adapter.apply({
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'checkout',
        path: '/order',
        value: { total: '42.00 EUR' },
      },
    });
    adapter.apply(orderSummary());

    activate(surface, 'ki-button');

    expect(events).toStrictEqual([
      {
        version: 'v0.9.1',
        action: {
          name: 'confirm-order',
          surfaceId: 'checkout',
          sourceComponentId: 'confirm',
          timestamp: '2026-11-05T10:00:00.000Z',
          context: { total: '42.00 EUR' },
        },
      },
    ]);
  });
});

describe('surface lifecycle, data binding and templates follow v0.9.1', () => {
  it('S13 requires createSurface before updates and refuses duplicates and foreign catalogs', () => {
    const adapter = createA2uiAdapter({ surface });

    const orphan = adapter.apply(orderSummary('nowhere'));
    expect(orphan.ok).toBe(false);
    expect(orphan.diagnostics[0]?.rule).toBe('unknown-surface');

    expect(adapter.apply(create('checkout')).ok).toBe(true);
    const duplicate = adapter.apply(create('checkout'));
    expect(duplicate.diagnostics[0]?.rule).toBe('surface-exists');

    const foreign = adapter.apply({
      version: 'v0.9.1',
      createSurface: {
        surfaceId: 'other',
        catalogId: 'https://example.com/schemas/custom_catalog.json',
      },
    });
    expect(foreign.ok).toBe(false);
    expect(foreign.diagnostics[0]?.rule).toBe('unsupported-catalog');

    // deleteSurface frees the id: it can be created again (v0.9.1 evolution guide §2.2).
    expect(
      adapter.apply({
        version: 'v0.9.1',
        deleteSurface: { surfaceId: 'checkout' },
      }).ok,
    ).toBe(true);
    expect(adapter.apply(create('checkout')).ok).toBe(true);
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S14 resolves bindings inside the adapter and applies updateDataModel upsert and removal', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create('profile'));
    adapter.apply({
      version: 'v0.9.1',
      updateComponents: {
        surfaceId: 'profile',
        components: [
          { id: 'root', component: 'Card', child: 'name' },
          { id: 'name', component: 'Text', text: { path: '/user/firstName' } },
        ],
      },
    });
    expect(surface.textContent).toBe('');

    // Examples from a2ui_protocol.md, "Server to client updates".
    adapter.apply({
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'profile',
        value: { user: { firstName: 'Alice', lastName: 'Smith' } },
      },
    });
    expect(surface.textContent).toBe('Alice');

    adapter.apply({
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'profile',
        path: '/user/firstName',
        value: 'Ada',
      },
    });
    expect(surface.textContent).toBe('Ada');

    adapter.apply({
      version: 'v0.9.1',
      updateDataModel: { surfaceId: 'profile', path: '/user/firstName' },
    });
    expect(surface.textContent).toBe('');
  });

  it('S14 maps the official login form: bound fields, obscured variant, scoped action context', () => {
    const events: A2uiActionMessage[] = [];
    const metadata: (A2uiActionMetadata | undefined)[] = [];
    const adapter = createA2uiAdapter({
      onAction: (event, meta) => {
        events.push(event);
        metadata.push(meta);
      },
      surface,
    });
    for (const message of simpleLoginForm) {
      expect(adapter.apply(message).ok).toBe(true);
    }
    adapter.apply({
      version: 'v0.9',
      updateDataModel: {
        surfaceId: 'gallery-simple-login-form',
        value: { username: 'ada', password: 'pw' },
      },
    });

    const inputs = [...surface.querySelectorAll('ki-input')];
    expect(inputs.map((i) => i.getAttribute('label'))).toStrictEqual(['Username', 'Password']);
    expect(inputs[0]?.getAttribute('value')).toBe('ada');
    expect(inputs[1]?.getAttribute('type')).toBe('password');

    activate(surface, 'ki-button');
    expect(events[0]?.action.context).toStrictEqual({
      user: 'ada',
      pass: 'pw',
    });
    // The example creates the surface with sendDataModel: true.
    expect(metadata[0]).toStrictEqual({
      a2uiClientDataModel: {
        version: 'v0.9.1',
        surfaces: {
          'gallery-simple-login-form': { username: 'ada', password: 'pw' },
        },
      },
    });
  });

  it('S15 expands a ChildList template once per list item with relative paths', () => {
    const adapter = createA2uiAdapter({ surface });

    const results = childListTemplate.map((message) => adapter.apply(message));

    expect(results.every((r) => r.ok)).toBe(true);
    const items = [...surface.querySelectorAll('ki-list > ki-list-item')];
    expect(items.map((item) => item.textContent)).toStrictEqual([
      'Apple - Qty: 10',
      'Banana - Qty: 5',
      'Cherry - Qty: 20',
    ]);
  });

  it('S16 resolves the action context in the scope of the template instance that fired', () => {
    const events: A2uiActionMessage[] = [];
    const adapter = createA2uiAdapter({
      onAction: (event) => events.push(event),
      surface,
    });
    for (const message of incremental) {
      adapter.apply(message);
    }

    const buttons = [...surface.querySelectorAll('ki-button')] as HTMLElement[];
    buttons[1]?.click();
    buttons[3]?.click();

    expect(events.map((e) => e.action.sourceComponentId)).toStrictEqual(['rc_button', 'rc_button']);
    expect(events.map((e) => e.action.context)).toStrictEqual([
      { restaurantName: "Ocean's Bounty" },
      { restaurantName: 'Spice Route' },
    ]);
    expect(events.map((e) => e.version)).toStrictEqual(['v0.9.1', 'v0.9.1']);
    // Same envelope and field set as the spec's valid action example
    // (test/cases/client_messages.json).
    const [reference] = validClientMessages;
    expect(Object.keys(events[0] ?? {}).sort()).toStrictEqual(Object.keys(reference).sort());
    expect(Object.keys(events[0]?.action ?? {}).sort()).toStrictEqual(
      Object.keys(reference.action).sort(),
    );
    expect(events.every((e) => !Number.isNaN(Date.parse(e.action.timestamp)))).toBe(true);
  });
});
