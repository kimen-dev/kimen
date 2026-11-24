// @spec:162-action-rate-budget
// The MCP Apps surface delivers its actions within the action-rate budget of
// the guarded renderer (spec 162): beyond it no `tools/call` leaves, the first
// held action is reported once as a refusal, a full repaint discards what the
// replaced surface held, and the host's budgets reach the live surface.
// happy-dom stands in for the DOM: "the carousel moves" is its declared
// event dispatched on the rendered element, as the component dispatches it.
import type { RenderBudgets } from '@kimen/catalog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BridgeRefusal, SurfaceOutboundMessage } from '../src/index.js';
import { createSurfaceBridge, METHOD_TOOLS_CALL } from '../src/index.js';
import { initializeResult, TEXT_MESSAGE_CAPABILITIES, toolResult } from './spec-messages.js';

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

const carouselSpec = {
  actions: ['slide'],
  root: {
    action: 'slide',
    component: 'ki-carousel',
    props: { autoplay: 1, label: 'Highlights', loop: true },
    slots: { '': [{ component: 'ki-carousel-item', slots: { '': ['One'] } }] },
  },
  version: 1,
};

const harness = (budgets?: Partial<RenderBudgets>) => {
  const sent: SurfaceOutboundMessage[] = [];
  const refusals: BridgeRefusal[] = [];
  const bridge = createSurfaceBridge({
    ...(budgets === undefined ? {} : { budgets }),
    onRefusal: (refusal) => refusals.push(refusal),
    send: (message) => sent.push(message),
    surface,
  });
  bridge.start();
  bridge.receive(initializeResult(1, undefined, {}, TEXT_MESSAGE_CAPABILITIES));
  expect(bridge.receive(toolResult(carouselSpec)).ok).toBe(true);
  sent.length = 0;
  return { bridge, refusals, sent };
};

const actionCalls = (sent: readonly SurfaceOutboundMessage[]) =>
  sent.filter((message) => 'method' in message && message.method === METHOD_TOOLS_CALL);

/** The carousel reports a move every millisecond, as autoplay 1 does. */
const rotate = (): (() => void) => {
  const carousel = surface.querySelector('ki-carousel');
  if (carousel === null) {
    throw new Error('no carousel rendered');
  }
  const timer = setInterval(() => {
    carousel.dispatchEvent(new CustomEvent('ki-slide-change', { bubbles: true, composed: true }));
  }, 1);
  return () => {
    clearInterval(timer);
  };
};

describe('an MCP Apps surface within its action budget', () => {
  it('S2 a carousel moving every millisecond sends at most 12 action calls in one second', () => {
    const { sent } = harness();
    const stop = rotate();
    vi.advanceTimersByTime(1000);
    stop();
    // The burst, then a refill at 500 ms and, if the first move came at once, at 1000 ms.
    expect(actionCalls(sent).length).toBeGreaterThanOrEqual(11);
    expect(actionCalls(sent).length).toBeLessThanOrEqual(12);
  });

  it('S6 the first held action is reported once as a refusal', () => {
    const { refusals, sent } = harness();
    const stop = rotate();
    vi.advanceTimersByTime(3000);
    stop();
    expect(actionCalls(sent).length).toBeGreaterThan(10);
    expect(refusals).toEqual([
      expect.objectContaining({ reason: 'action-rate-budget', value: 'slide' }),
    ]);
  });

  it('S5 a full repaint discards what the replaced surface held', () => {
    const { bridge, sent } = harness();
    const stop = rotate();
    vi.advanceTimersByTime(50);
    stop();
    expect(actionCalls(sent)).toHaveLength(10);
    expect(
      bridge.receive(
        toolResult({
          actions: ['done'],
          root: { action: 'done', component: 'ki-button', slots: { '': ['Done'] } },
          version: 1,
        }),
      ).ok,
    ).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(actionCalls(sent)).toHaveLength(10);
  });

  it('S7 the host budgets reach the surface', () => {
    const { sent } = harness({ actionRefillMs: 2000, maxActionBurst: 1 });
    const stop = rotate();
    vi.advanceTimersByTime(1000);
    stop();
    expect(actionCalls(sent)).toHaveLength(1);
  });
});

describe('a held action names the page it fired on', () => {
  const payPage = (label: string) => ({
    actions: ['spend', 'confirm'],
    root: {
      component: 'ki-stack',
      slots: {
        '': [
          { action: 'spend', component: 'ki-button', id: 'spend', slots: { '': ['Spend'] } },
          { action: 'confirm', component: 'ki-button', id: 'pay', slots: { '': [label] } },
        ],
      },
    },
    version: 1,
  });

  it('S8 a held action names the page revision it fired on after an update', () => {
    const sent: SurfaceOutboundMessage[] = [];
    const bridge = createSurfaceBridge({ send: (message) => sent.push(message), surface });
    bridge.start();
    bridge.receive(initializeResult(1, undefined, {}, TEXT_MESSAGE_CAPABILITIES));
    expect(bridge.receive(toolResult(payPage('Pay order A'))).ok).toBe(true);
    const buttons = surface.querySelectorAll<HTMLElement>('ki-button');
    for (let index = 0; index < 10; index += 1) {
      buttons[0]?.click();
    }
    buttons[1]?.click();
    // The server updates the page (revision 1 → 2) before the held action leaves.
    expect(
      bridge.receive(
        toolResult(payPage('Pay order A'), 'Order', {
          baseRevision: 1,
          batch: { ops: [{ id: 'pay', op: 'set', props: { variant: 'primary' } }] },
        }),
      ).ok,
    ).toBe(true);
    vi.advanceTimersByTime(500);
    const confirm = actionCalls(sent).find(
      (message) =>
        'params' in message &&
        (message.params as { arguments?: { action?: string } }).arguments?.action === 'confirm',
    );
    expect(confirm).toMatchObject({
      params: { arguments: { action: 'confirm', id: 'pay', revision: 1 } },
    });
  });
});

describe('an empty update leaves the page revision of an action right', () => {
  const page = {
    actions: ['spend', 'confirm'],
    root: {
      component: 'ki-stack',
      slots: {
        '': [
          { action: 'spend', component: 'ki-button', id: 'spend', slots: { '': ['Spend'] } },
          { action: 'confirm', component: 'ki-button', id: 'pay', slots: { '': ['Pay'] } },
        ],
      },
    },
    version: 1,
  };

  /** A ready bridge painted at page revision 1, then updated by an empty batch to revision 2. */
  const emptied = () => {
    const sent: SurfaceOutboundMessage[] = [];
    const bridge = createSurfaceBridge({ send: (message) => sent.push(message), surface });
    bridge.start();
    bridge.receive(initializeResult(1, undefined, {}, TEXT_MESSAGE_CAPABILITIES));
    expect(bridge.receive(toolResult(page)).ok).toBe(true);
    return { bridge, sent };
  };

  const emptyUpdate = { baseRevision: 1, batch: { ops: [] } };

  const confirmRevision = (sent: readonly SurfaceOutboundMessage[]): unknown =>
    actionCalls(sent)
      .map((message) => ('params' in message ? message.params : undefined))
      .map((params) => (params as { arguments?: Record<string, unknown> }).arguments)
      .find((args) => args?.['action'] === 'confirm')?.['revision'];

  it('S8 an action after an empty update names the page revision it fired on', () => {
    const { bridge, sent } = emptied();
    expect(bridge.receive(toolResult(page, 'Pay', emptyUpdate)).ok).toBe(true);
    surface.querySelectorAll<HTMLElement>('ki-button')[1]?.click();
    expect(confirmRevision(sent)).toBe(2);
  });

  it('S8 an action held across an empty update names the page it still shows', () => {
    const { bridge, sent } = emptied();
    const buttons = surface.querySelectorAll<HTMLElement>('ki-button');
    for (let index = 0; index < 10; index += 1) {
      buttons[0]?.click();
    }
    buttons[1]?.click();
    expect(bridge.receive(toolResult(page, 'Pay', emptyUpdate)).ok).toBe(true);
    vi.advanceTimersByTime(500);
    // Nothing changed on the page: the latest revision showing it is 2.
    expect(confirmRevision(sent)).toBe(2);
    // The server's next update, computed on that revision, still applies.
    const refusals: unknown[] = [];
    expect(
      bridge.receive(
        toolResult(page, 'Pay', {
          baseRevision: 2,
          batch: { ops: [{ id: 'pay', op: 'set', props: { variant: 'primary' } }] },
        }),
      ).refusals,
    ).toEqual(refusals);
  });
});
