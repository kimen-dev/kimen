/**
 * The surface's host channel (spec 030 FR-003/FR-004), split from the document
 * entry so a test can drive it with a double instead of a real frame tree.
 *
 * MCP Apps carries JSON-RPC 2.0 over `postMessage` between the View and its
 * host (`specification/2026-01-26/apps.mdx:413-417`). The bridge validates the
 * message and runs the lifecycle; a message's shape cannot say who sent it or
 * where a reply may go. Those are this module's two decisions:
 *
 *   inbound  — only the frame this document is embedded in may drive it
 *   outbound — a reply is addressed to the host that spoke, when it has an
 *              address at all
 */
import type { SurfaceBridge } from './bridge.js';
import { createSurfaceBridge } from './bridge.js';
import type { SurfaceOutboundMessage } from './protocol.js';

/** One inbound `message` event, structurally — a test substitutes a double. */
export interface SurfaceMessageEvent {
  readonly data: unknown;
  /** The sender's origin, or `"null"` when it is opaque. */
  readonly origin: string;
  /** The window that sent it: the only sender identity a receiver can trust. */
  readonly source: unknown;
}

/**
 * The window capabilities the surface runtime needs. `parent` is the host frame
 * itself, not a wrapper around it — the inbound check compares a message's
 * `source` against this identity, so it has to be the real thing.
 */
export interface SurfaceWindow {
  readonly parent: {
    postMessage: (message: unknown, targetOrigin: string) => void;
  };
  readonly addEventListener: (
    type: 'message',
    listener: (event: SurfaceMessageEvent) => void,
  ) => void;
  /**
   * Optional size source: calls `listener` with the rendered content size
   * whenever it changes (the document runtime backs it with ResizeObserver).
   * Forwarded as `ui/notifications/size-changed` once the handshake completes
   * (apps.mdx:1217, SHOULD).
   */
  readonly observeSize?: (listener: (width: number, height: number) => void) => void;
}

/** No addressee: used until a host has spoken, and for a host with no address. */
const ANY_ORIGIN = '*';

/** An opaque origin reports as this and cannot be addressed by `postMessage`. */
const OPAQUE_ORIGIN = 'null';

/**
 * Wires a surface bridge to a window's host channel and opens the MCP Apps
 * handshake (`ui/initialize`). Returns the bridge so the caller — and a test —
 * can dispatch through it.
 */
export function wireSurface(win: SurfaceWindow, surface: Element): SurfaceBridge {
  // Until the host speaks there is no address to reply to. The first message
  // that arrives FROM the host — normally its `ui/initialize` response —
  // carries one, unless its origin is opaque: the ordinary case for a `ui://`
  // document in a sandboxed frame, where `"null"` is not a valid target and
  // pinning it would silence the channel.
  let hostOrigin = ANY_ORIGIN;

  const bridge = createSurfaceBridge({
    send: (message: SurfaceOutboundMessage): void => {
      // The host mediates its own audit/consent path (apps.mdx:487); this only
      // decides the addressee.
      //
      // Semgrep resolves `hostOrigin` back to its `'*'` initializer. That value
      // survives only where no address exists: a `ui://` document cannot know
      // the host's origin before the host speaks (the spec's own transport
      // sketch posts to '*', apps.mdx:432), and an opaque origin reports as
      // "null", which `postMessage` rejects — pinning it would silence the
      // channel instead of protecting it. The one message sent unaddressed by
      // construction is `ui/initialize`, which carries only the surface's name,
      // version and empty capabilities. Once a real origin arrives it is
      // pinned and used, which is what "addresses a dispatched action to the
      // origin the host spoke from" holds in tests/surface-wiring.spec.ts.
      // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration
      win.parent.postMessage(message, hostOrigin);
    },
    surface,
  });

  win.addEventListener('message', (event: SurfaceMessageEvent): void => {
    // A sibling frame, an opener or an embedded third party can post a
    // perfectly well-formed message — even a forged `ui/initialize` result.
    // Only the embedding host may drive the surface.
    if (event.source !== win.parent) {
      return;
    }
    if (hostOrigin === ANY_ORIGIN && event.origin !== '' && event.origin !== OPAQUE_ORIGIN) {
      hostOrigin = event.origin;
    }
    // Every inbound message still crosses the bridge's JSON-RPC validation
    // and lifecycle; a non-protocol message is ignored with no state change (S7).
    bridge.receive(event.data);
  });

  win.observeSize?.((width, height) => {
    bridge.reportSize(width, height);
  });

  // The View speaks first (apps.mdx:1310): the handshake request is what
  // makes a conforming host speak at all.
  bridge.start();

  return bridge;
}
