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
    // Content size for `ui/notifications/size-changed` (apps.mdx:1204-1217):
    // the document height at max-content (so a host with a flexible container
    // can grow the frame) and the viewport width, measured like the
    // reference SDK (ext-apps src/app.ts, setupSizeChangedNotifications).
    observeSize: (listener): void => {
      const html = document.documentElement;
      const measure = (): void => {
        const previous = html.style.height;
        html.style.height = 'max-content';
        const height = html.getBoundingClientRect().height;
        html.style.height = previous;
        listener(window.innerWidth, height);
      };
      measure();
      if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(measure);
        observer.observe(html);
        observer.observe(document.body);
      }
    },
    // The real parent, not a wrapper: the inbound check compares a message's
    // `source` against this identity.
    parent: window.parent,
  };

  wireSurface(win, surface);
}

bootstrap();
