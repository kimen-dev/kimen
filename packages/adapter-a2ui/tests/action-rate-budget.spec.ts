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
