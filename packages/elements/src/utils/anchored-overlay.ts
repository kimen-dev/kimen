import { focusThroughShadow } from './shadow-focus';

type DismissReason = 'outside-pointer' | 'escape' | 'disconnect';

interface PositionSession {
  update: () => void;
  cleanup: () => void;
}

export type OverlayPositioner = (
  popup: HTMLElement,
  trigger: Element,
  view: Window,
  onMove: () => void,
  onDisconnect: () => void,
) => PositionSession;

interface AnchoredOverlayOptions {
  /** Omit to let component CSS own placement (including its sizing and flip policy). */
  position?: OverlayPositioner;
  /** Native auto popovers use an invoker and can close independently of this session. */
  source?: HTMLElement;
  /** An optional additional boundary treated as inside for outside pointer events. */
  outsidePointer?: true | Element;
  escape?: 'bubble' | 'capture';
  onDismiss?: (reason: DismissReason) => void;
}

/** Resolve a literal ID in the host's tree, including a containing shadow root. */
export function resolveOverlayAnchor(host: Element, anchor: Element | string): Element | null {
  if (typeof anchor !== 'string') {
    return anchor;
  }
  const root = host.getRootNode();
  return root instanceof Document || root instanceof DocumentFragment
    ? root.getElementById(anchor)
    : null;
}

/** Stencil's DOM declarations predate the Popover API's source option. */
export function showOverlayPopover(popup: HTMLElement, source?: HTMLElement): void {
  if (source) {
    (popup as HTMLElement & { showPopover(options: { source: HTMLElement }): void }).showPopover({
      source,
    });
  } else {
    popup.showPopover();
  }
}

/** Mirror component state into a connected manual popover. */
export function setOverlayOpen(popup: HTMLElement | undefined, open: boolean): void {
  if (
    !popup?.isConnected ||
    typeof popup.showPopover !== 'function' ||
    popup.matches(':popover-open') === open
  ) {
    return;
  }
  if (open) {
    popup.showPopover();
    return;
  }
  popup.hidePopover();
}

export function isOutsideOverlay(event: PointerEvent, boundary: Element): boolean {
  return !event.composedPath().includes(boundary);
}

/** Dismiss on a bubbling pointerdown outside every supplied element boundary. */
function watchOverlayOutsidePointer(
  boundary: Element,
  dismiss: () => void,
  ...inside: Element[]
): () => void {
  const doc = boundary.ownerDocument;
  function pointerDown(event: PointerEvent): void {
    if (
      isOutsideOverlay(event, boundary) &&
      inside.every((element) => isOutsideOverlay(event, element))
    ) {
      dismiss();
    }
  }
  doc.addEventListener('pointerdown', pointerDown);
  return () => {
    doc.removeEventListener('pointerdown', pointerDown);
  };
}

interface ActiveOverlay {
  popup: HTMLElement;
  trigger: Element;
  options: AnchoredOverlayOptions;
  position: PositionSession | undefined;
  cleanup: () => void;
}

const DEFAULT_OPTIONS: AnchoredOverlayOptions = {};

/** One positioning and dismissal session for an anchored popover. */
export class AnchoredOverlay {
  private active: ActiveOverlay | undefined;

  show(popup: HTMLElement | undefined, trigger: Element, options = DEFAULT_OPTIONS): boolean {
    const doc = trigger.ownerDocument;
    const view = doc.defaultView;
    if (
      !popup?.isConnected ||
      !trigger.isConnected ||
      popup.ownerDocument !== doc ||
      !view ||
      typeof popup.showPopover !== 'function'
    ) {
      return false;
    }

    if (
      this.active?.popup === popup &&
      this.active.trigger === trigger &&
      this.active.options === options
    ) {
      this.reposition();
      return true;
    }
    if (this.active?.popup === popup) {
      this.active.cleanup();
    } else {
      this.hide();
    }

    const events = new AbortController();
    const onDismiss = options.onDismiss;
    const boundary = options.outsidePointer === true ? trigger : options.outsidePointer;
    const stopOutsidePointer =
      boundary && onDismiss
        ? watchOverlayOutsidePointer(
            boundary,
            () => {
              onDismiss('outside-pointer');
            },
            trigger,
            popup,
          )
        : undefined;

    if (options.escape && onDismiss) {
      const capture = options.escape === 'capture';
      doc.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Escape' && (capture || !event.defaultPrevented)) {
            event.preventDefault();
            event.stopPropagation();
            onDismiss('escape');
          }
        },
        { capture, signal: events.signal },
      );
    }

    const position = options.position?.(
      popup,
      trigger,
      view,
      () => {
        this.reposition();
      },
      () => {
        this.hide();
        onDismiss?.('disconnect');
      },
    );

    this.active = {
      popup,
      trigger,
      options,
      position,
      cleanup: () => {
        events.abort();
        stopOutsidePointer?.();
        position?.cleanup();
      },
    };
    if (options.source && !popup.matches(':popover-open')) {
      showOverlayPopover(popup, options.source);
    }
    this.reposition();
    return true;
  }

  /** Open the top layer if necessary and refresh managed geometry. */
  reposition(): void {
    const active = this.active;
    if (!active?.popup.isConnected) {
      return;
    }
    // Native light dismissal may close the surface before its toggle event
    // tears down this session. A queued layout update must leave it closed.
    if (active.options.source) {
      if (!active.popup.matches(':popover-open')) {
        return;
      }
    } else {
      setOverlayOpen(active.popup, true);
    }
    active.position?.update();
  }

  /** Close without stealing focus unless the component requests a destination. */
  hide(focusTarget?: HTMLElement | true): void {
    const active = this.active;
    if (!active) {
      return;
    }
    this.active = undefined;
    active.cleanup();
    setOverlayOpen(active.popup, false);
    if (focusTarget) {
      const target = focusTarget === true ? active.trigger : focusTarget;
      if (target instanceof HTMLElement && target.isConnected) {
        focusThroughShadow(target);
      }
    }
  }
}
