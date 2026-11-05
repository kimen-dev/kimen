// @spec:030-adapter-mcp-apps
// Hardening beyond the frozen scenarios: the surface's inbound channel is a
// security boundary (Art. VIII). The bridge validates the JSON-RPC message and
// the lifecycle, and neither says anything about who sent it — so a
// well-formed message from any frame able to reach this document could drive
// the surface, even forge the handshake. Only the host that embeds it may. The
// outbound half is the mirror: a reply goes to the host that spoke, not to
// whatever the parent has since become. Fixtures: ./spec-messages.ts.
import { beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceMessageEvent, SurfaceWindow } from '../src/surface-wiring.js';
import { wireSurface } from '../src/surface-wiring.js';
import { confirmSurface, initializeResult, toolResult } from './spec-messages.js';

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
  /** Delivers one `message` event, defaulting to a well-formed one from the host. */
  readonly deliver: (event: Partial<SurfaceMessageEvent>) => void;
  readonly posted: Posted[];
  readonly bridge: ReturnType<typeof wireSurface>;
  /** Pushes a measured size through the window's size source. */
  readonly resize: (width: number, height: number) => void;
}

const harness = (): Harness => {
  const posted: Posted[] = [];
  const listeners: ((event: SurfaceMessageEvent) => void)[] = [];
  let sizeListener: ((width: number, height: number) => void) | undefined;
  const host: SurfaceWindow['parent'] = {
    postMessage: (message: unknown, targetOrigin: string): void => {
      posted.push({ message, targetOrigin });
    },
  };
  const win: SurfaceWindow = {
    addEventListener: (_type, listener): void => {
      listeners.push(listener);
    },
    observeSize: (listener): void => {
      sizeListener = listener;
    },
    parent: host,
  };

  const bridge = wireSurface(win, surface);

  return {
    bridge,
    deliver: (event) => {
      for (const listener of listeners) {
        listener({
          data: undefined,
          origin: HOST_ORIGIN,
          source: host,
          ...event,
        });
      }
    },
    posted,
    resize: (width, height) => sizeListener?.(width, height),
  };
};

/** A harness whose handshake the embedding host completed from `origin`. */
const connected = (origin = HOST_ORIGIN): Harness => {
  const h = harness();
  h.deliver({ data: initializeResult(1), origin });
  return h;
};

describe('only the embedding host drives the surface', () => {
  it('renders a tool result the host sends after the handshake', () => {
    // The witness. Without it, a harness that silently stopped delivering would
    // make every refusal below pass for the wrong reason.
    const { deliver } = connected();

    deliver({ data: toolResult(confirmSurface) });

    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm');
  });

  it('ignores an identical tool result from a frame that is not the host', () => {
    const { deliver } = connected();

    // Same message, same spec, different sender — anything holding a handle
    // to this document.
    deliver({ data: toolResult(confirmSurface), source: IMPOSTOR });

    expect(surface.querySelector('ki-button')).toBeNull();
    expect(surface.childNodes).toHaveLength(0);
  });

  it('cannot be initialized by a frame that is not the host', () => {
    const { bridge, deliver } = harness();

    deliver({
      data: initializeResult(1),
      origin: 'https://attacker.example',
      source: IMPOSTOR,
    });
    deliver({ data: toolResult(confirmSurface), source: IMPOSTOR });

    expect(bridge.state).toBe('initializing');
    expect(surface.childNodes).toHaveLength(0);
  });

  it('leaves a surface the host rendered untouched when an impostor speaks after it', () => {
    const { deliver } = connected();
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
  it('opens with ui/initialize to any origin, because no host has spoken yet', () => {
    const { posted } = harness();

    // The one message that cannot be addressed: it is what makes the host
    // speak, and it carries only the surface's name, version and capabilities.
    expect(posted).toHaveLength(1);
    expect(posted[0]?.targetOrigin).toBe('*');
    expect(posted[0]?.message).toMatchObject({
      id: 1,
      method: 'ui/initialize',
    });
  });

  it('confirms the handshake to the origin the host answered from', () => {
    const { posted } = connected();

    expect(posted.at(-1)).toEqual({
      message: {
        jsonrpc: '2.0',
        method: 'ui/notifications/initialized',
        params: {},
      },
      targetOrigin: HOST_ORIGIN,
    });
  });

  it('addresses a dispatched action to the origin the host spoke from', () => {
    const { bridge, deliver, posted } = connected();
    deliver({ data: toolResult(confirmSurface) });

    expect(bridge.dispatch('confirm').sent).toBe(true);

    expect(posted.at(-1)?.targetOrigin).toBe(HOST_ORIGIN);
    expect(posted.at(-1)?.message).toMatchObject({ method: 'tools/call' });
  });

  it('keeps the wildcard when the host is a sandboxed frame with an opaque origin', () => {
    // A `ui://` resource embedded with an opaque origin reports "null", which is
    // not addressable: pinning it would throw and silence the channel entirely.
    const { bridge, deliver, posted } = connected('null');
    deliver({ data: toolResult(confirmSurface), origin: 'null' });

    expect(bridge.dispatch('confirm').sent).toBe(true);

    expect(posted.at(-1)?.targetOrigin).toBe('*');
  });

  it('never learns an origin from a frame that is not the host', () => {
    const { bridge, deliver, posted } = connected();
    deliver({ data: toolResult(confirmSurface) });
    deliver({
      data: toolResult(confirmSurface),
      origin: 'https://attacker.example',
      source: IMPOSTOR,
    });

    expect(bridge.dispatch('confirm').sent).toBe(true);

    expect(posted.at(-1)?.targetOrigin).toBe(HOST_ORIGIN);
  });

  it('forwards measured sizes as ui/notifications/size-changed once connected', () => {
    const h = harness();
    h.resize(320, 90);
    expect(h.posted).toHaveLength(1); // only ui/initialize

    h.deliver({ data: initializeResult(1) });

    expect(h.posted.at(-1)).toEqual({
      message: {
        jsonrpc: '2.0',
        method: 'ui/notifications/size-changed',
        params: { height: 90, width: 320 },
      },
      targetOrigin: HOST_ORIGIN,
    });
  });
});
