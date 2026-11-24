// @spec:162-action-rate-budget
// An A2UI surface delivers its actions within the action-rate budget of the
// guarded renderer (spec 162): a burst of 10, then one more every 500 ms, and
// the first held action reaches the agent once as an A2UI `error`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { A2uiActionMessage, A2uiErrorMessage } from '../src/index.js';
import { A2UI_BASIC_CATALOG_IDS, createA2uiAdapter } from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
  });
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

afterEach(() => {
  vi.useRealTimers();
});

const BASIC = A2UI_BASIC_CATALOG_IDS[0] ?? '';

const buttons = (count: number) => ({
  version: 'v0.9.1',
  updateComponents: {
    surfaceId: 'picks',
    components: [
      {
        id: 'root',
        component: 'Column',
        children: Array.from({ length: count }, (_, index) => `pick-${String(index)}`),
      },
      ...Array.from({ length: count }, (_, index) => [
        {
          id: `pick-${String(index)}`,
          component: 'Button',
          child: `label-${String(index)}`,
          action: { event: { name: `pick-${String(index)}` } },
        },
        { id: `label-${String(index)}`, component: 'Text', text: `Item ${String(index)}` },
      ]).flat(),
    ],
  },
});

describe('an A2UI surface within its action budget', () => {
  it('S1 eleven buttons activated at once: ten now, one 500 ms later', () => {
    const actions: A2uiActionMessage[] = [];
    const adapter = createA2uiAdapter({ onAction: (event) => actions.push(event), surface });
    expect(
      adapter.apply({ version: 'v0.9.1', createSurface: { surfaceId: 'picks', catalogId: BASIC } })
        .ok,
    ).toBe(true);
    expect(adapter.apply(buttons(11)).ok).toBe(true);
    for (const button of surface.querySelectorAll<HTMLElement>('ki-button')) {
      button.click();
    }
    expect(actions).toHaveLength(10);
    vi.advanceTimersByTime(500);
    expect(actions).toHaveLength(11);
  });

  it('S6 the first held action reaches the agent once as an error', () => {
    const errors: A2uiErrorMessage[] = [];
    const adapter = createA2uiAdapter({
      onAction: () => undefined,
      onError: (error) => errors.push(error),
      surface,
    });
    adapter.apply({ version: 'v0.9.1', createSurface: { surfaceId: 'picks', catalogId: BASIC } });
    adapter.apply(buttons(12));
    for (const button of surface.querySelectorAll<HTMLElement>('ki-button')) {
      button.click();
    }
    expect(errors).toHaveLength(1);
    expect(errors[0]?.error.code).toBe('VALIDATION_FAILED');
    expect(errors[0]?.error.surfaceId).toBe('picks');
    expect(errors[0]?.error.message).toContain('action-rate budget');
  });
});

describe('a value committed in an A2UI form reaches its data model whatever the budget', () => {
  it('S9 an update before the budget refills keeps what the person committed', () => {
    const actions: A2uiActionMessage[] = [];
    const adapter = createA2uiAdapter({
      budgets: { actionRefillMs: 2000, maxActionBurst: 1 },
      onAction: (event) => actions.push(event),
      surface,
    });
    const components = [
      { children: ['name', 'spend', 'book'], component: 'Column', id: 'root' },
      { component: 'TextField', id: 'name', label: 'Name', value: { path: '/name' } },
      {
        action: { event: { name: 'spend' } },
        child: 'spend-label',
        component: 'Button',
        id: 'spend',
      },
      { component: 'Text', id: 'spend-label', text: 'Spend' },
      {
        action: { event: { context: { name: { path: '/name' } }, name: 'book' } },
        child: 'book-label',
        component: 'Button',
        id: 'book',
      },
      { component: 'Text', id: 'book-label', text: 'Book' },
    ];
    const update = { version: 'v0.9.1', updateComponents: { components, surfaceId: 'picks' } };
    adapter.apply({ version: 'v0.9.1', createSurface: { surfaceId: 'picks', catalogId: BASIC } });
    adapter.apply({
      version: 'v0.9.1',
      updateDataModel: { path: '/', surfaceId: 'picks', value: { name: '' } },
    });
    expect(adapter.apply(update).ok).toBe(true);
    // The person spends the surface's budget of one action.
    surface.querySelectorAll<HTMLElement>('ki-button')[0]?.click();
    expect(actions).toHaveLength(1);
    // The person commits "Ana" in the bound field.
    const field = surface.querySelector('ki-input');
    Reflect.set(field ?? {}, 'value', 'Ana');
    field?.dispatchEvent(new Event('change', { bubbles: true }));
    // The agent updates the surface before the budget refills.
    expect(adapter.apply(update).ok).toBe(true);
    vi.advanceTimersByTime(2000);
    surface.querySelectorAll<HTMLElement>('ki-button')[1]?.click();
    expect(actions.at(-1)?.action).toMatchObject({ context: { name: 'Ana' }, name: 'book' });
  });
});
