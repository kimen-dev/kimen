import { setOverlayOpen } from '../../utils/anchored-overlay.js';

interface PositionSession {
  update: () => void;
  cleanup: () => void;
}

export interface TooltipOverlayOptions {
  position: (
    popup: HTMLElement,
    trigger: Element,
    view: Window,
    onMove: () => void,
  ) => PositionSession;
}

interface ActiveTooltip {
  popup: HTMLElement;
  trigger: Element;
  options: TooltipOverlayOptions | undefined;
  position: PositionSession | undefined;
  cleanup: () => void;
}

/** Own the Escape listener and positioning for one manual tooltip popover. */
export class TooltipOverlay {
  private active: ActiveTooltip | undefined;

  constructor(private readonly dismiss: () => void) {}

  show(popup: HTMLElement | undefined, trigger: Element, options?: TooltipOverlayOptions): boolean {
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

    const active = this.active;
    if (active?.popup === popup) {
      if (active.trigger === trigger && active.options === options) {
        this.reposition();
        return true;
      }
      // Refresh the positioning session without closing the same popover.
      active.cleanup();
    } else {
      this.hide();
    }

    const events = new AbortController();
    doc.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        this.dismiss();
      },
      { capture: true, signal: events.signal },
    );
    const position = options?.position(popup, trigger, view, () => {
      this.reposition();
    });
    this.active = {
      popup,
      trigger,
      options,
      position,
      cleanup: () => {
        events.abort();
        position?.cleanup();
      },
    };

    this.reposition();
    return true;
  }

  reposition(): void {
    const active = this.active;
    if (!active?.popup.isConnected) return;
    setOverlayOpen(active.popup, true);
    active.position?.update();
  }

  hide(): void {
    const active = this.active;
    if (!active) return;
    this.active = undefined;
    active.cleanup();
    setOverlayOpen(active.popup, false);
  }
}
