// @spec:162-action-rate-budget
// Every render path delivers a surface's actions within its action budget
// (spec 162): a burst, then one more per refill interval. An action beyond
// it is held, the latest report of each binding is delivered in turn, a
// report whose node left the surface is discarded, and the first hold is
// diagnosed once. happy-dom stands in for the DOM: "the component reports an
// event" is that event dispatched on the rendered element, as the component
// itself dispatches it. The real carousel (S2) runs in Chromium in
// packages/adapter-mcp-apps/browser-tests/action-rate-budget.browser.spec.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ActionEvent,
  createLiveSurface,
  createStreamingRenderer,
  DEFAULT_RENDER_BUDGETS,
  type LiveActionEvent,
  type RenderDiagnostic,
  renderUiSpec,
} from '../src/index.js';

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

type Rendered = HTMLElement & Record<string, unknown>;

const rendered = (selector: string, index = 0): Rendered => {
  const element = surface.querySelectorAll<Rendered>(selector)[index];
  if (element === undefined) {
    throw new Error(`nothing rendered for ${selector}`);
  }
  return element;
};

/** The component reports `type`, as its own emitter would. */
const report = (target: Element, type: string): void => {
  target.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }));
};

const click = (target: Element): void => {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

const carousel = (action = 'slide') => ({
  action,
  component: 'ki-carousel',
  props: { autoplay: 1, label: 'Highlights', loop: true },
  slots: { '': [{ component: 'ki-carousel-item', slots: { '': ['One'] } }] },
});

/** A carousel that reports a slide change every millisecond, as autoplay 1 does. */
const rotate = (element: Element): (() => void) => {
  const timer = setInterval(() => {
    report(element, 'ki-slide-change');
  }, 1);
  return () => {
    clearInterval(timer);
  };
};

const named = (events: readonly ActionEvent[], action: string) =>
  events.filter((event) => event.action === action);

describe('the action budget defaults', () => {
  it('declares a burst of 10 and one more action every 500 ms', () => {
    expect(DEFAULT_RENDER_BUDGETS.maxActionBurst).toBe(10);
    expect(DEFAULT_RENDER_BUDGETS.actionRefillMs).toBe(500);
  });
});

describe('S1 a burst exactly at the action budget arrives whole', () => {
  const buttons = Array.from({ length: 11 }, (_, index) => ({
    action: `pick-${String(index)}`,
    component: 'ki-button',
    slots: { '': [`Item ${String(index)}`] },
  }));
  const spec = {
    actions: buttons.map((button) => button.action),
    root: { component: 'ki-stack', slots: { '': buttons } },
    version: 1,
  };

  it.each([
    [10, 10, 0],
    [11, 10, 1],
  ])('S1 %i buttons activated at once: %i now, %i more 500 ms later', (count, now, later) => {
    const events: ActionEvent[] = [];
    expect(renderUiSpec(spec, { onAction: (event) => events.push(event), surface }).ok).toBe(true);
    for (let index = 0; index < count; index += 1) {
      click(rendered('ki-button', index));
    }
    expect(events).toHaveLength(now);
    vi.advanceTimersByTime(499);
    expect(events).toHaveLength(now);
    vi.advanceTimersByTime(1);
    expect(events).toHaveLength(now + later);
    expect(new Set(events.map((event) => event.action)).size).toBe(now + later);
  });

  it('S1 the streaming renderer and the live surface hold the same boundary', () => {
    const streamed: ActionEvent[] = [];
    const stream = createStreamingRenderer({
      actions: spec.actions,
      onAction: (event) => streamed.push(event),
      surface,
    });
    expect(stream.push(spec.root).ok).toBe(true);
    for (let index = 0; index < 11; index += 1) {
      click(rendered('ki-button', index));
    }
    expect(streamed).toHaveLength(10);
    vi.advanceTimersByTime(500);
    expect(streamed).toHaveLength(11);

    surface.replaceChildren();
    const live: LiveActionEvent[] = [];
    const liveSurface = createLiveSurface({
      actions: spec.actions,
      onAction: (event) => live.push(event),
      surface,
    });
    expect(liveSurface.apply({ ops: [{ node: spec.root, op: 'insert' }] }).ok).toBe(true);
    for (let index = 0; index < 11; index += 1) {
      click(rendered('ki-button', index));
    }
    expect(live).toHaveLength(10);
    vi.advanceTimersByTime(500);
    expect(live).toHaveLength(11);
  });

  it('S1 an idle surface keeps no timer', () => {
    const events: ActionEvent[] = [];
    renderUiSpec(spec, { onAction: (event) => events.push(event), surface });
    for (let index = 0; index < 10; index += 1) {
      click(rendered('ki-button', index));
    }
    expect(events).toHaveLength(10);
    expect(vi.getTimerCount()).toBe(0);
    click(rendered('ki-button', 10));
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(500);
    expect(events).toHaveLength(11);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('the latest report of each binding arrives, and none starves another', () => {
  it('S3 a code typed faster than the budget refills arrives as last typed', () => {
    const events: ActionEvent[] = [];
    const arrivals: number[] = [];
    const onAction = (event: ActionEvent): void => {
      events.push(event);
      arrivals.push(Date.now());
    };
    const spec = {
      actions: ['spend', 'code'],
      root: {
        component: 'ki-stack',
        slots: {
          '': [
            { action: 'spend', component: 'ki-button', slots: { '': ['Spend'] } },
            {
              action: { 'ki-input': 'code' },
              component: 'ki-code-input',
              props: { label: 'Code' },
            },
          ],
        },
      },
      version: 1,
    };
    expect(renderUiSpec(spec, { onAction, surface }).ok).toBe(true);
    const spend = rendered('ki-button');
    for (let index = 0; index < 10; index += 1) {
      click(spend);
    }
    expect(events).toHaveLength(10);
    const field = rendered('ki-code-input');
    const typed = '482916';
    let lastKeystroke = 0;
    for (let length = 1; length <= typed.length; length += 1) {
      vi.advanceTimersByTime(40);
      field['value'] = typed.slice(0, length);
      report(field, 'ki-input');
      lastKeystroke = Date.now();
    }
    vi.advanceTimersByTime(1000);
    const codes = named(events, 'code');
    // Every edit was held while the budget was spent: one report, the latest.
    const [code] = codes;
    if (code === undefined) {
      throw new Error('no code action arrived');
    }
    expect(codes).toHaveLength(1);
    expect(code.data['value']).toBe('482916');
    const arrived = arrivals[events.indexOf(code)] ?? Number.NaN;
    expect(arrived - lastKeystroke).toBeGreaterThanOrEqual(0);
    expect(arrived - lastKeystroke).toBeLessThanOrEqual(500);
  });

  it('S4 a flooding binding cannot starve a person action', () => {
    const events: ActionEvent[] = [];
    const arrivals: number[] = [];
    const onAction = (event: ActionEvent): void => {
      events.push(event);
      arrivals.push(Date.now());
    };
    const spec = {
      actions: ['slide', 'confirm'],
      root: {
        component: 'ki-stack',
        slots: {
          '': [
            carousel(),
            { action: 'confirm', component: 'ki-button', slots: { '': ['Confirm'] } },
          ],
        },
      },
      version: 1,
    };
    expect(renderUiSpec(spec, { onAction, surface }).ok).toBe(true);
    const stop = rotate(rendered('ki-carousel'));
    vi.advanceTimersByTime(100);
    expect(named(events, 'slide')).toHaveLength(10);
    click(rendered('ki-button'));
    const clicked = Date.now();
    vi.advanceTimersByTime(2000);
    stop();
    const confirm = events.findIndex((event) => event.action === 'confirm');
    expect(confirm).toBeGreaterThan(-1);
    // Held behind the one slide first in line, then delivered at the next refill.
    expect(events.slice(10, confirm + 1).map((event) => event.action)).toEqual([
      'slide',
      'confirm',
    ]);
    expect((arrivals[confirm] ?? Number.NaN) - clicked).toBeLessThanOrEqual(1000);
  });
});

describe('a held report never outlives its node', () => {
  it('S5 a report held for a node the surface no longer shows is never sent', () => {
    const events: ActionEvent[] = [];
    renderUiSpec(
      { actions: ['slide'], root: carousel(), version: 1 },
      { onAction: (event) => events.push(event), surface },
    );
    const stop = rotate(rendered('ki-carousel'));
    vi.advanceTimersByTime(50);
    stop();
    expect(events).toHaveLength(10);
    // The host renders a new spec without the carousel on the same surface.
    const next: ActionEvent[] = [];
    renderUiSpec(
      {
        actions: ['done'],
        root: { action: 'done', component: 'ki-button', slots: { '': ['Done'] } },
        version: 1,
      },
      { onAction: (event) => next.push(event), surface },
    );
    vi.advanceTimersByTime(2000);
    expect(events).toHaveLength(10);
    expect(next).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('S5 a live surface discards the held report of a node it removed', () => {
    const events: LiveActionEvent[] = [];
    const live = createLiveSurface({
      actions: ['slide'],
      onAction: (event) => events.push(event),
      surface,
    });
    expect(live.apply({ ops: [{ node: { ...carousel(), id: 'reel' }, op: 'insert' }] }).ok).toBe(
      true,
    );
    const stop = rotate(rendered('ki-carousel'));
    vi.advanceTimersByTime(50);
    stop();
    expect(events).toHaveLength(10);
    expect(live.apply({ ops: [{ id: 'reel', op: 'remove' }] }).ok).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(events).toHaveLength(10);
  });
});

describe('exceeding the budget is diagnosable', () => {
  it('S6 the first report the budget holds is diagnosed once', () => {
    const diagnostics: RenderDiagnostic[] = [];
    renderUiSpec(
      { actions: ['slide'], root: carousel(), version: 1 },
      { onAction: () => undefined, onDiagnostic: (d) => diagnostics.push(d), surface },
    );
    const stop = rotate(rendered('ki-carousel'));
    vi.advanceTimersByTime(9);
    expect(diagnostics).toHaveLength(0);
    vi.advanceTimersByTime(3000);
    stop();
    expect(diagnostics).toEqual([
      expect.objectContaining({ path: 'root', rule: 'action-rate-budget', value: 'slide' }),
    ]);
  });

  it('S6 a live surface diagnoses its first hold with the node path', () => {
    const diagnostics: RenderDiagnostic[] = [];
    const live = createLiveSurface({
      actions: ['slide'],
      onAction: () => undefined,
      onDiagnostic: (d) => diagnostics.push(d),
      surface,
    });
    live.apply({ ops: [{ node: carousel(), op: 'insert' }] });
    const stop = rotate(rendered('ki-carousel'));
    vi.advanceTimersByTime(2000);
    stop();
    expect(diagnostics).toEqual([
      expect.objectContaining({ path: 'surface[0]', rule: 'action-rate-budget', value: 'slide' }),
    ]);
  });
});

describe('the host sets the budget', () => {
  it('S7 a host that tightens the budget receives fewer actions', () => {
    const events: ActionEvent[] = [];
    renderUiSpec(
      { actions: ['slide'], root: carousel(), version: 1 },
      {
        budgets: { actionRefillMs: 2000, maxActionBurst: 1 },
        onAction: (event) => events.push(event),
        surface,
      },
    );
    const stop = rotate(rendered('ki-carousel'));
    vi.advanceTimersByTime(1000);
    stop();
    expect(events).toHaveLength(1);
  });
});
