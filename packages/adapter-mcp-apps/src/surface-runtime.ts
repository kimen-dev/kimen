/**
 * The in-document surface runtime (spec 030): the browser entry esbuild bundles
 * into the self-contained `ui://` resource. It resolves the surface element and
 * hands the real window to `wireSurface`, which owns the host channel. No code
 * path here parses markup or evaluates data; the only render path is
 * `renderUiSpec` via the bridge.
 *
 * This module is never part of the adapter's importable API (it targets the
 * document, not Node); it exists only to be bundled into the surface document.
 */
import type { SurfaceWindow } from './surface-wiring.js';
import { wireSurface } from './surface-wiring.js';

function bootstrap(): void {
  const surface = document.getElementById('kimen-surface') ?? document.body;
  const win: SurfaceWindow = {
    addEventListener: (type, listener): void => {
      window.addEventListener(type, (event: MessageEvent): void => {
        listener(event);
      });
    },
    // The real parent, not a wrapper: the inbound check compares a message's
    // `source` against this identity.
    parent: window.parent,
  };

  wireSurface(win, surface);
}

bootstrap();
