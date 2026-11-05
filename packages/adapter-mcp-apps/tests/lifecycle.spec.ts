// @spec:030-adapter-mcp-apps
// The surface speaks the MCP Apps 2026-01-26 lifecycle (apps.mdx "Lifecycle",
// :1272-1383): the View opens with `ui/initialize`, confirms with
// `ui/notifications/initialized`, renders `ui/notifications/tool-result`, and
// answers host requests. Fixtures and their spec citations: ./spec-messages.ts.
import { beforeEach, describe, expect, it } from 'vitest';

import type { BridgeRefusal, SurfaceOutboundMessage } from '../src/index.js';
import { createSurfaceBridge, KIMEN_APP_INFO } from '../src/index.js';
import {
  confirmSurface,
  errorResponse,
  expectedActionCall,
  expectedEmptyResult,
  expectedInitializeRequest,
  expectedInitialized,
  hostContextChanged,
  initializeResult,
  ping,
  resourceTeardown,
  toolCancelled,
  toolInput,
  toolInputPartial,
  toolResult,
} from './spec-messages.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const harness = () => {
  const sent: SurfaceOutboundMessage[] = [];
  const refusals: BridgeRefusal[] = [];
  const bridge = createSurfaceBridge({
    onRefusal: (refusal) => refusals.push(refusal),
    send: (message) => sent.push(message),
    surface,
  });
  return { bridge, refusals, sent };
};

/** Starts the bridge and answers its `ui/initialize` like a conforming host. */
const connected = () => {
  const h = harness();
  h.bridge.start();
  h.bridge.receive(initializeResult(1));
  return h;
};

describe('the surface speaks the MCP Apps lifecycle', () => {
  it('S11 opens with a ui/initialize request and confirms with ui/notifications/initialized', () => {
    const { bridge, sent } = harness();
    expect(sent).toHaveLength(0);
    expect(bridge.state).toBe('idle');

    bridge.start();
    bridge.start(); // idempotent: one handshake per connection

    // The only message before the host answers is the handshake request.
    expect(sent).toEqual([expectedInitializeRequest(1, KIMEN_APP_INFO.version)]);
    expect(bridge.state).toBe('initializing');

    const result = bridge.receive(initializeResult(1));

    expect(result.ok).toBe(true);
    expect(sent.at(-1)).toEqual(expectedInitialized());
    expect(sent).toHaveLength(2);
    expect(bridge.state).toBe('ready');
    // The host context from McpUiInitializeResult is kept and merged on change.
    expect(bridge.hostContext['theme']).toBe('dark');
    bridge.receive(hostContextChanged());
    expect(bridge.hostContext['theme']).toBe('light');
    expect(bridge.hostContext['displayMode']).toBe('inline');
  });

  it('S11 treats a host error answer to ui/initialize as a refused connection', () => {
    const { bridge, refusals, sent } = harness();
    bridge.start();

    bridge.receive(errorResponse(1, 'Policy violation'));

    expect(bridge.state).toBe('refused');
    expect(refusals.some((r) => r.reason === 'initialize-failed')).toBe(true);
    expect(sent).toHaveLength(1); // never `initialized`
  });

  it('S11 ignores a response whose id is not the pending ui/initialize', () => {
    const { bridge, sent } = harness();
    bridge.start();

    const result = bridge.receive(initializeResult(99));

    expect(result.handled).toBe(false);
    expect(bridge.state).toBe('initializing');
    expect(sent).toHaveLength(1);
  });

  it('S12 never renders host traffic that arrives before the handshake completes', () => {
    const { bridge, refusals, sent } = harness();

    // Before start() and while initializing: a conforming host sends nothing
    // before `initialized` (apps.mdx:485); a non-conforming one is ignored.
    expect(bridge.receive(toolResult(confirmSurface)).ok).toBe(false);
    bridge.start();
    const early = bridge.receive(toolResult(confirmSurface));

    expect(early.ok).toBe(false);
    expect(early.refusals[0]?.reason).toBe('not-initialized');
    expect(surface.childNodes).toHaveLength(0);
    expect(refusals.every((r) => r.reason === 'not-initialized')).toBe(true);
    // Nor can an action leave before the handshake.
    expect(bridge.dispatch('confirm').refusal?.reason).toBe('not-initialized');
    expect(sent).toHaveLength(1);
  });

  it('S13 renders a ui/notifications/tool-result through the guarded renderer', () => {
    const { bridge } = connected();

    expect(bridge.receive(toolInputPartial()).ok).toBe(true);
    expect(bridge.receive(toolInput()).ok).toBe(true);
    // Tool input is acknowledged, never rendered.
    expect(surface.childNodes).toHaveLength(0);

    const result = bridge.receive(toolResult(confirmSurface));

    expect(result.ok).toBe(true);
    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm');
  });

  it('S13 refuses a tool result without a Kimen surface and leaves state unchanged', () => {
    const { bridge, refusals } = connected();
    bridge.receive(toolResult(confirmSurface));

    const result = bridge.receive({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        content: [{ text: 'Current weather: Sunny, 72°F', type: 'text' }],
      },
    });

    expect(result.ok).toBe(false);
    expect(refusals.at(-1)?.reason).toBe('missing-surface');
    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm');
  });

  it('S13 keeps the rendered surface when the tool is cancelled', () => {
    const { bridge } = connected();
    bridge.receive(toolResult(confirmSurface));

    expect(bridge.receive(toolCancelled()).ok).toBe(true);

    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm');
  });

  it('S14 answers ui/resource-teardown with an empty result and lets nothing leave after it', () => {
    const { bridge, sent } = connected();
    bridge.receive(toolResult(confirmSurface));

    bridge.receive(resourceTeardown(7));

    expect(sent.at(-1)).toEqual(expectedEmptyResult(7));
    expect(bridge.state).toBe('closed');
    const after = bridge.dispatch('confirm');
    expect(after.sent).toBe(false);
    expect(sent.at(-1)).toEqual(expectedEmptyResult(7));
  });

  it('S15 answers an unsupported host request with JSON-RPC method-not-found', () => {
    const { bridge, sent } = connected();

    bridge.receive({
      id: 'r-1',
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
    });

    expect(sent.at(-1)).toEqual({
      error: {
        code: -32601,
        message: 'method "tools/list" is not supported by this surface',
      },
      id: 'r-1',
      jsonrpc: '2.0',
    });
  });

  it('S15 answers ping at any point of the connection', () => {
    const { bridge, sent } = harness();
    bridge.start();

    bridge.receive(ping(42));

    expect(sent.at(-1)).toEqual(expectedEmptyResult(42));
  });

  it('S6 routes a declared action as tools/call and accepts only its own response', () => {
    const { bridge, refusals, sent } = connected();
    bridge.receive(toolResult(confirmSurface));

    expect(bridge.dispatch('confirm', { sku: 'SKU-104' }).sent).toBe(true);
    expect(sent.at(-1)).toEqual(expectedActionCall(2, 'confirm', { sku: 'SKU-104' }));

    // A host error for that call is reported against the action.
    bridge.receive(errorResponse(2, 'Policy violation'));
    expect(refusals.at(-1)).toMatchObject({
      reason: 'action-failed',
      value: 'confirm',
    });

    // A tools/call response carrying a new surface re-renders through the
    // guarded path ("Interactive Updates", apps.mdx:1477-1488).
    bridge.dispatch('confirm');
    const fresh = {
      actions: [],
      root: { component: 'ki-badge', slots: { '': ['Confirmed'] } },
      version: 1,
    };
    bridge.receive({ id: 3, jsonrpc: '2.0', result: toolResult(fresh)['params'] });
    expect(surface.querySelector('ki-badge')?.textContent).toBe('Confirmed');

    // A response to a request the surface never sent is ignored.
    expect(
      bridge.receive({
        id: 3,
        jsonrpc: '2.0',
        result: toolResult(confirmSurface)['params'],
      }).handled,
    ).toBe(false);
    expect(surface.querySelector('ki-button')).toBeNull();
  });

  it('reports its size only after the handshake, and only on change', () => {
    const { bridge, sent } = harness();
    bridge.reportSize(400, 120.4);
    bridge.start();
    expect(
      sent.filter((m) => 'method' in m && m.method === 'ui/notifications/size-changed'),
    ).toHaveLength(0);

    bridge.receive(initializeResult(1));
    bridge.reportSize(400, 120.4);
    bridge.reportSize(400, 180);

    // Shape: apps.mdx:1206-1214.
    expect(
      sent.filter((m) => 'method' in m && m.method === 'ui/notifications/size-changed'),
    ).toEqual([
      {
        jsonrpc: '2.0',
        method: 'ui/notifications/size-changed',
        params: { height: 121, width: 400 },
      },
      {
        jsonrpc: '2.0',
        method: 'ui/notifications/size-changed',
        params: { height: 180, width: 400 },
      },
    ]);
  });
});
