// @spec:030-adapter-mcp-apps
// Hardening beyond the frozen scenarios: the surface's inbound channel is a
// security boundary (Art. VIII). The bridge validates the ENVELOPE, and an
// envelope says nothing about who sent it — so a well-formed tool result from
// any frame able to reach this document drove the surface. Only the host that
// embeds it may. The outbound half is the mirror: a reply goes to the host that
// spoke, not to whatever the parent has since become.
import { beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceMessageEvent, SurfaceWindow } from '../src/surface-wiring.js';
import { wireSurface } from '../src/surface-wiring.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const HOST_ORIGIN = 'https://host.example';

/** A frame that is not the host: a sibling, an opener, an embedded third party. */
const IMPOSTOR = { frame: 'not-the-host' };

interface Posted {
  readonly message: unknown;
  readonly targetOrigin: string;
}

interface Harness {
  /** The window identity that stands for the embedding host. */
  readonly host: SurfaceWindow['parent'];
  /** Delivers one `message` event, defaulting to a well-formed one from the host. */
  readonly deliver: (event: Partial<SurfaceMessageEvent>) => void;
  readonly posted: Posted[];
  readonly bridge: ReturnType<typeof wireSurface>;
}

const harness = (): Harness => {
  const posted: Posted[] = [];
  const listeners: ((event: SurfaceMessageEvent) => void)[] = [];
  const host: SurfaceWindow['parent'] = {
    postMessage: (message: unknown, targetOrigin: string): void => {
      posted.push({ message, targetOrigin });
    },
  };
  const win: SurfaceWindow = {
    addEventListener: (_type, listener): void => {
      listeners.push(listener);
    },
    parent: host,
  };

  const bridge = wireSurface(win, surface);

  return {
    bridge,
    deliver: (event) => {
      for (const listener of listeners) {
        listener({ data: undefined, origin: HOST_ORIGIN, source: host, ...event });
      }
    },
    host,
    posted,
  };
};

const toolResult = (spec: unknown) => ({
  jsonrpc: '2.0',
  method: 'ui/toolResult',
  params: { surface: { spec } },
});

const confirmSurface = {
  actions: ['confirm'],
  root: { component: 'ki-button', slots: { '': ['Confirm'] } },
  version: 1,
};

describe('only the embedding host drives the surface', () => {
  it('renders a tool result the host sends', () => {
    // The witness. Without it, a harness that silently stopped delivering would
    // make every refusal below pass for the wrong reason.
    const { deliver } = harness();

    deliver({ data: toolResult(confirmSurface) });

    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm');
  });

  it('ignores an identical tool result from a frame that is not the host', () => {
    const { deliver } = harness();

    // Same envelope, same spec, different sender — anything holding a handle
    // to this document.
    deliver({ data: toolResult(confirmSurface), source: IMPOSTOR });

    expect(surface.querySelector('ki-button')).toBeNull();
    expect(surface.childNodes).toHaveLength(0);
  });

  it('leaves a surface the host rendered untouched when an impostor speaks after it', () => {
    const { deliver } = harness();
    deliver({ data: toolResult(confirmSurface) });

    deliver({
      data: toolResult({
        actions: [],
        root: { component: 'ki-badge', slots: { '': ['Owned'] } },
        version: 1,
      }),
      source: IMPOSTOR,
    });

    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm');
    expect(surface.querySelector('ki-badge')).toBeNull();
  });
});

describe('the surface replies to the host that spoke to it', () => {
  it('announces readiness to any origin, because no host has spoken yet', () => {
    const { posted } = harness();

    // The one message that cannot be addressed: it is what makes the host speak.
    expect(posted).toHaveLength(1);
    expect(posted[0]?.targetOrigin).toBe('*');
    expect(posted[0]?.message).toMatchObject({ method: 'ui/ready' });
  });

  it('addresses a dispatched action to the origin the host spoke from', () => {
    const { bridge, deliver, posted } = harness();
    deliver({ data: toolResult(confirmSurface) });

    expect(bridge.dispatch('confirm').sent).toBe(true);

    expect(posted.at(-1)?.targetOrigin).toBe(HOST_ORIGIN);
  });

  it('keeps the wildcard when the host is a sandboxed frame with an opaque origin', () => {
    // A `ui://` resource embedded with an opaque origin reports "null", which is
    // not addressable: pinning it would throw and silence the channel entirely.
    const { bridge, deliver, posted } = harness();
    deliver({ data: toolResult(confirmSurface), origin: 'null' });

    expect(bridge.dispatch('confirm').sent).toBe(true);

    expect(posted.at(-1)?.targetOrigin).toBe('*');
  });

  it('never learns an origin from a frame that is not the host', () => {
    const { bridge, deliver, posted } = harness();
    deliver({ data: toolResult(confirmSurface) });
    deliver({
      data: toolResult(confirmSurface),
      origin: 'https://attacker.example',
      source: IMPOSTOR,
    });

    expect(bridge.dispatch('confirm').sent).toBe(true);

    expect(posted.at(-1)?.targetOrigin).toBe(HOST_ORIGIN);
  });
});
