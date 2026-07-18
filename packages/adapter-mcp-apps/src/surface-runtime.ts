/**
 * The in-document surface runtime (spec 030): the browser entry esbuild
 * bundles into the self-contained `ui://` resource. It wires the surface
 * bridge to the real host channel — inbound host messages arrive as
 * `postMessage`, outbound declared actions leave as `postMessage` to the host
 * — and to the real guarded renderer. No code path here parses markup or
 * evaluates data; the only render path is `renderUiSpec` via the bridge.
 *
 * This module is never part of the adapter's importable API (it targets the
 * document, not Node); it exists only to be bundled into the surface document.
 */
import { createSurfaceBridge } from './bridge.js';
import type { ActionMessage } from './protocol.js';

function bootstrap(): void {
  const surface = document.getElementById('kimen-surface') ?? document.body;
  const bridge = createSurfaceBridge({
    send: (message: ActionMessage): void => {
      // A declared action leaves over the host channel (mediated by the host,
      // which applies its own audit/consent path — SEP-1865).
      window.parent.postMessage(message, '*');
    },
    surface,
  });

  window.addEventListener('message', (event: MessageEvent): void => {
    // Every inbound message crosses the bridge's envelope validation; a
    // non-protocol message is ignored with no state change (S7).
    bridge.receive(event.data);
  });

  // Signal readiness to the host so it may deliver the first tool result.
  window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/ready', params: {} }, '*');
}

bootstrap();
