import { Component, Element, Event, type EventEmitter, Prop, State, Watch, h } from '@stencil/core';
import { anchoredOverlayPosition } from '../../utils/anchored-overlay-layout';
import type { OverlayPlacement } from '../../utils/anchored-overlay-position';
import { AnchoredOverlay, resolveOverlayAnchor } from '../../utils/anchored-overlay';
import { focusThroughShadow, shadowFocusTarget } from '../../utils/shadow-focus';
import { resolvePopoverFocus } from './ki-popover.focus';
import { normalizePopoverPlacement } from './ki-popover.placement';

export type KiPopoverPlacement = OverlayPlacement;
export type KiPopoverKind = 'dialog' | 'toggletip';

interface TriggerState {
  element: HTMLElement;
  expanded: string | null;
  hasPopup: string | null;
}

function captureTrigger(element: HTMLElement): TriggerState {
  return {
    element,
    expanded: element.getAttribute('aria-expanded'),
    hasPopup: element.getAttribute('aria-haspopup'),
  };
}

function setAttribute(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
}

function restoreTrigger(state: TriggerState): void {
  setAttribute(state.element, 'aria-expanded', state.expanded);
  setAttribute(state.element, 'aria-haspopup', state.hasPopup);
}

/**
 * A non-modal surface anchored to a button. Both kinds use the native
 * popover top layer and support outside click and Escape dismissal.
 *
 * @whenToUse Present related filters, details, a small form, or supplemental text near a button.
 * @whenNotToUse Use ki-dialog for decisions that require a response and ki-tooltip for a short hover or focus hint.
 * @slot - Dialog content or supplemental text for the toggletip kind.
 * @part surface - The positioned and styled popover panel.
 * @part arrow - The optional decorative pointer on the trigger-facing edge.
 */
@Component({
  tag: 'ki-popover',
  styleUrl: 'ki-popover.css',
  shadow: true,
})
export class KiPopover {
  @Element() private host!: HTMLElement;

  /** Literal ID of the button in the same document or shadow tree. */
  @Prop() for?: string;

  /** Preferred side and optional logical alignment. Flips when the opposite side has more room. */
  @Prop() placement: KiPopoverPlacement = 'bottom-start';

  /** Whether the popover is visible. Updates on activation and native dismissal. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Accessible name for the dialog kind. Give each dialog a meaningful name. */
  @Prop() label: string | undefined = 'Popover';

  /** Shows the decorative arrow pointing at the trigger. */
  @Prop() arrow = true;

  /** Dialog content can contain controls. A toggletip announces supplemental text. */
  @Prop() kind: KiPopoverKind = 'dialog';

  /** Emitted when the popover opens. */
  @Event({ eventName: 'ki-open', cancelable: false }) kiOpen!: EventEmitter<void>;

  /** Emitted when the popover closes. */
  @Event({ eventName: 'ki-close', cancelable: false }) kiClose!: EventEmitter<void>;

  @State() private announcement = '';

  private overlay = new AnchoredOverlay();
  private popup: HTMLDivElement | undefined;
  private trigger: TriggerState | undefined;
  private control: TriggerState | undefined;
  private treeObserver?: MutationObserver;
  private controlObserver?: MutationObserver;
  private dismissListeners: AbortController | undefined;
  private escape: KeyboardEvent | undefined;
  private restoreOnClose = false;
  private pressedWhileOpen = false;
  private shown = false;
  private loaded = false;

  connectedCallback(): void {
    if (this.loaded) {
      this.connect();
    }
  }

  componentDidLoad(): void {
    this.loaded = true;
    this.popup?.addEventListener('beforetoggle', this.handleBeforeToggle);
    this.popup?.addEventListener('toggle', this.syncVisibility);
    this.connect();
  }

  disconnectedCallback(): void {
    this.treeObserver?.disconnect();
    this.unbindTrigger();
    this.stopDismissTracking();
    this.shown = false;
    this.announcement = '';
    this.overlay.hide();
  }

  @Watch('for')
  updateAnchor(): void {
    if (this.loaded && this.host.isConnected) {
      this.bindTrigger();
      this.updateOpen();
    }
  }

  @Watch('open')
  updateOpen(): void {
    if (!this.loaded || !this.host.isConnected) {
      return;
    }
    if (this.open && this.trigger) {
      this.show();
    } else {
      this.close();
    }
  }

  @Watch('placement')
  updatePlacement(): void {
    if (this.popup?.matches(':popover-open')) {
      this.show();
    }
  }

  @Watch('kind')
  updateKind(): void {
    this.updateTrigger();
    this.updateAnnouncement();
  }

  private get isToggletip(): boolean {
    return this.kind === 'toggletip';
  }

  private connect(): void {
    this.treeObserver = new MutationObserver(() => {
      this.bindTrigger();
    });
    this.treeObserver.observe(this.host.getRootNode(), {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id'],
    });
    this.bindTrigger();
    this.updateOpen();
  }

  private bindTrigger(): void {
    const anchor = this.for ? resolveOverlayAnchor(this.host, this.for) : null;
    if ((anchor ?? undefined) === this.trigger?.element) {
      return;
    }
    if (this.shown) {
      this.close();
    }
    this.unbindTrigger();
    if (!(anchor instanceof HTMLElement) || anchor === this.host || this.host.contains(anchor)) {
      return;
    }
    this.trigger = captureTrigger(anchor);
    anchor.addEventListener('click', this.handleActivation);
    anchor.addEventListener('pointerdown', this.handleTriggerPointer);
    anchor.addEventListener('pointercancel', this.clearTriggerPointer);
    this.observeControl(anchor);
    if (anchor.localName.includes('-') && !customElements.get(anchor.localName)) {
      void customElements.whenDefined(anchor.localName).then(() => {
        if (this.trigger?.element === anchor) {
          this.observeControl(anchor);
        }
      });
    }
  }

  private observeControl(anchor: HTMLElement): void {
    this.controlObserver?.disconnect();
    if (anchor.shadowRoot) {
      this.controlObserver = new MutationObserver(this.bindControl);
      this.controlObserver.observe(anchor.shadowRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['tabindex'],
      });
    }
    this.bindControl();
  }

  private bindControl = (): void => {
    const trigger = this.trigger?.element;
    const target = trigger ? shadowFocusTarget(trigger) : null;
    if ((target ?? undefined) !== this.control?.element) {
      if (this.control) {
        restoreTrigger(this.control);
      }
      this.control = target ? captureTrigger(target) : undefined;
    }
    this.updateTrigger();
  };

  private unbindTrigger(): void {
    this.controlObserver?.disconnect();
    if (this.trigger) {
      const { element } = this.trigger;
      element.removeEventListener('click', this.handleActivation);
      element.removeEventListener('pointerdown', this.handleTriggerPointer);
      element.removeEventListener('pointercancel', this.clearTriggerPointer);
      restoreTrigger(this.trigger);
    }
    if (this.control) {
      restoreTrigger(this.control);
    }
    this.trigger = undefined;
    this.control = undefined;
    this.clearTriggerPointer();
  }

  private updateTrigger(): void {
    for (const state of [this.trigger, this.control]) {
      if (state) {
        setAttribute(state.element, 'aria-expanded', String(this.shown));
        setAttribute(state.element, 'aria-haspopup', this.isToggletip ? state.hasPopup : 'dialog');
      }
    }
  }

  private handleTriggerPointer = (): void => {
    this.pressedWhileOpen = this.shown;
  };

  private clearTriggerPointer = (): void => {
    this.pressedWhileOpen = false;
  };

  private handleActivation = (event: MouseEvent): void => {
    const trigger = this.control?.element ?? this.trigger?.element;
    // Some engines dismiss on pointerup before delivering a click to an
    // external trigger. That click still means close if the press began open.
    const dismiss = this.shown || (event.detail > 0 && this.pressedWhileOpen);
    this.clearTriggerPointer();
    if (event.defaultPrevented || trigger?.matches(':disabled, [aria-disabled="true"]')) {
      return;
    }
    this.open = !dismiss;
  };

  private show(): void {
    const trigger = this.trigger?.element;
    const popup = this.popup;
    if (!trigger || !popup) {
      return;
    }
    const source = this.control?.element ?? trigger;
    const gap = Number.parseFloat(getComputedStyle(popup).scrollMarginBlockStart);
    this.overlay.show(popup, trigger, {
      source,
      position: anchoredOverlayPosition({
        placement: normalizePopoverPlacement(this.placement),
        offset: Number.isFinite(gap) ? gap : 0,
        source,
        onPosition: (placement, inlineCenter, blockCenter) => {
          let side = placement.split('-')[0] ?? 'bottom';
          const vertical = side === 'top' || side === 'bottom';
          if (
            !vertical &&
            getComputedStyle(popup).direction !== getComputedStyle(trigger).direction
          ) {
            side = side === 'start' ? 'end' : 'start';
          }
          popup.setAttribute('data-side', side);
          const center = vertical ? inlineCenter : blockCenter;
          popup.style.setProperty('--_ki-popover-arrow-center', `${String(center)}px`);
        },
      }),
      onDismiss: () => {
        this.syncVisibility();
      },
    });
    this.syncVisibility();
  }

  private close(): void {
    this.escape = undefined;
    this.overlay.hide();
    this.syncVisibility();
  }

  private updateAnnouncement(): void {
    const content: Node = this.host;
    this.announcement = this.shown && this.isToggletip ? (content.textContent?.trim() ?? '') : '';
  }

  private syncVisibility = (): void => {
    const visible = this.popup?.matches(':popover-open') === true;
    if (this.shown === visible) {
      if (this.open !== visible) {
        this.open = visible;
      }
      return;
    }
    this.shown = visible;
    if (this.open !== visible) {
      this.open = visible;
    }
    this.updateTrigger();
    this.updateAnnouncement();
    if (visible) {
      this.trackNativeDismiss();
      if (!this.isToggletip) {
        resolvePopoverFocus(this.host)?.focus();
      }
      this.kiOpen.emit();
    } else {
      const restore = this.restoreOnClose;
      this.stopDismissTracking();
      this.overlay.hide();
      if (restore && this.trigger?.element.isConnected) {
        focusThroughShadow(this.trigger.element);
      }
      this.kiClose.emit();
    }
  };

  private trackNativeDismiss(): void {
    const events = new AbortController();
    this.dismissListeners = events;
    const doc = this.host.ownerDocument;
    const options = { capture: true, signal: events.signal };
    // Let the browser dismiss the auto popover. Observe its initiating
    // keyboard event so Escape can return focus even after a scripted open.
    const trackEscape = (event: KeyboardEvent): void => {
      this.escape = event.key === 'Escape' ? event : undefined;
    };
    doc.addEventListener('keydown', trackEscape, options);
    doc.addEventListener('keyup', trackEscape, options);
    doc.addEventListener(
      'pointerdown',
      () => {
        this.escape = undefined;
      },
      options,
    );
  }

  private handleBeforeToggle = (event: Event): void => {
    if ((event as ToggleEvent).newState === 'closed') {
      this.restoreOnClose = this.escape?.defaultPrevented === false;
      this.escape = undefined;
    }
  };

  private stopDismissTracking(): void {
    this.dismissListeners?.abort();
    this.dismissListeners = undefined;
    this.escape = undefined;
    this.restoreOnClose = false;
  }

  render() {
    const toggletip = this.isToggletip;
    const label = this.label?.trim() ?? '';
    return [
      <div
        class="popup"
        part="surface"
        popover="auto"
        role={toggletip ? 'presentation' : 'dialog'}
        aria-label={toggletip ? undefined : label || 'Popover'}
        ref={(element) => {
          this.popup = element;
        }}
      >
        <div class="content" inert={toggletip} aria-hidden={toggletip ? 'true' : undefined}>
          <slot />
        </div>
        {this.arrow ? <span part="arrow" class="arrow" aria-hidden="true" /> : null}
      </div>,
      toggletip ? (
        <span class="status" role="status">
          {this.announcement}
        </span>
      ) : null,
    ];
  }
}
