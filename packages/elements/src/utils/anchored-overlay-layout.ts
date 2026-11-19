import type { OverlayPositioner } from './anchored-overlay';
import { type OverlayPlacement, resolveOverlayPosition } from './anchored-overlay-position';

type AnchorName = `--${string}`;

interface OverlayPositionOptions {
  placement: OverlayPlacement;
  /** Resolved gap in CSS pixels. */
  offset?: number;
  /** Optional CSS anchor-name supplied by the component. */
  anchorName?: AnchorName;
}

/**
 * Measure the CSS anchor box in the top layer. Firefox can omit an ancestor's
 * transform from this box. An unavailable or out-of-scope anchor gives no box.
 */
export function measureCssAnchor(popup: HTMLElement, name: AnchorName): DOMRect | null {
  if (
    typeof CSS === 'undefined' ||
    !CSS.supports('top', 'anchor(top)') ||
    !CSS.supports('width', 'anchor-size(width)')
  ) {
    return null;
  }

  const probe = popup.ownerDocument.createElement('div');
  if (!popup.parentNode || typeof probe.showPopover !== 'function') {
    return null;
  }

  probe.setAttribute('popover', 'manual');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = [
    'position:fixed',
    `position-anchor:${name}`,
    'inset:auto',
    'left:anchor(left)',
    'top:anchor(top)',
    'width:anchor-size(width)',
    'height:anchor-size(height)',
    'margin:0',
    'padding:0',
    'border:0',
    'box-sizing:border-box',
    'overflow:hidden',
    'visibility:hidden',
    'pointer-events:none',
  ].join(';');

  popup.parentNode.appendChild(probe);
  try {
    probe.showPopover();
    const rect = probe.getBoundingClientRect();
    probe.hidePopover();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  } finally {
    probe.remove();
  }
}

function movePopup(
  popup: HTMLElement,
  anchor: Element,
  viewport: Window,
  options: OverlayPositionOptions,
): void {
  const { x, y } = resolveOverlayPosition({
    placement: options.placement,
    offset: options.offset ?? 0,
    dir: viewport.getComputedStyle(anchor).direction === 'rtl' ? 'rtl' : 'ltr',
    triggerRect: anchor.getBoundingClientRect(),
    popupRect: popup.getBoundingClientRect(),
    viewport: { width: viewport.innerWidth, height: viewport.innerHeight },
  });
  const name = options.anchorName;
  const cssAnchor = name ? measureCssAnchor(popup, name) : null;
  if (name && cssAnchor) {
    popup.style.left = `calc(anchor(${name} left) + ${String(x - cssAnchor.left)}px)`;
    popup.style.top = `calc(anchor(${name} top) + ${String(y - cssAnchor.top)}px)`;
  } else {
    popup.style.left = `${String(x)}px`;
    popup.style.top = `${String(y)}px`;
  }
}

function addAncestors(element: Element, nodes: Set<Node>): void {
  let node: Node | null = element;
  while (node && !nodes.has(node)) {
    nodes.add(node);
    if (node instanceof Element && node.assignedSlot) {
      addAncestors(node.assignedSlot, nodes);
    }
    node = node instanceof ShadowRoot ? node.host : node.parentNode;
  }
}

/** Watch the two ancestor chains so moving an external trigger also repositions the popup. */
function trackPosition(
  popup: HTMLElement,
  trigger: Element,
  view: Window,
  update: () => void,
  detached: () => void,
): () => void {
  let frame: number | undefined;
  function schedule(): void {
    frame ??= view.requestAnimationFrame(() => {
      frame = undefined;
      update();
    });
  }

  const sizes = new ResizeObserver(schedule);
  sizes.observe(trigger);
  sizes.observe(popup);
  view.addEventListener('resize', schedule);
  view.addEventListener('scroll', schedule, { capture: true, passive: true });

  let ancestors = new Set<Node>();
  const tree = new MutationObserver((records) => {
    // A probe, a changing option list or another sibling is not a reparent.
    const moved = records.some((record) =>
      Array.from(record.removedNodes).some((node) => ancestors.has(node)),
    );
    if (!moved) {
      return;
    }
    if (
      !trigger.isConnected ||
      !popup.isConnected ||
      trigger.ownerDocument !== popup.ownerDocument
    ) {
      detached();
      return;
    }
    watchAncestors();
    update();
  });

  function unwatchAncestors(): void {
    tree.disconnect();
    for (const node of ancestors) {
      if (node instanceof ShadowRoot) {
        node.removeEventListener('scroll', schedule, true);
      }
    }
  }

  function watchAncestors(): void {
    unwatchAncestors();
    ancestors = new Set();
    addAncestors(trigger, ancestors);
    addAncestors(popup, ancestors);
    for (const node of ancestors) {
      // Scroll doesn't compose out of a shadow root.
      if (node instanceof ShadowRoot) {
        node.addEventListener('scroll', schedule, { capture: true, passive: true });
      }
      tree.observe(node, { childList: true });
    }
  }

  watchAncestors();
  return () => {
    unwatchAncestors();
    sizes.disconnect();
    view.removeEventListener('resize', schedule);
    view.removeEventListener('scroll', schedule, true);
    if (frame !== undefined) {
      view.cancelAnimationFrame(frame);
    }
  };
}

/** Bind measured placement only for surfaces that need it. */
export function anchoredOverlayPosition(options: OverlayPositionOptions): OverlayPositioner {
  return (popup, trigger, view, onMove, onDisconnect) => {
    const originalLeft = popup.style.left;
    const originalTop = popup.style.top;
    const stop = trackPosition(popup, trigger, view, onMove, onDisconnect);
    return {
      update() {
        movePopup(popup, trigger, view, options);
      },
      cleanup() {
        stop();
        popup.style.left = originalLeft;
        popup.style.top = originalTop;
      },
    };
  };
}
