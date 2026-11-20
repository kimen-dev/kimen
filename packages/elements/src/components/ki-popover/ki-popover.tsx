import {
  AttrDeserialize,
  Component,
  Element,
  Event,
  type EventEmitter,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import { anchoredOverlayPosition } from '../../utils/anchored-overlay-layout';
import type { OverlayPlacement } from '../../utils/anchored-overlay-position';
import { AnchoredOverlay, resolveOverlayAnchor } from '../../utils/anchored-overlay';
import { focusThroughShadow, shadowFocusTarget } from '../../utils/shadow-focus';
import { resolvePopoverFocus } from './ki-popover.focus';
import { normalizePopoverPlacement } from './ki-popover.placement';

export type KiPopoverPlacement = OverlayPlacement;
export type KiPopoverKind = 'dialog' | 'toggletip';
export type KiPopoverAppearance = 'default' | 'rich';

interface TriggerState {
  element: HTMLElement;
  expanded: string | null;
  hasPopup: string | null;
}

function captureTrigger(element: HTMLElement): TriggerState {
  return {
    element,
    expanded: element.ariaExpanded,
    hasPopup: element.ariaHasPopup,
  };
}

function restoreTrigger(state: TriggerState): void {
  state.element.ariaExpanded = state.expanded;
  state.element.ariaHasPopup = state.hasPopup;
}

/**
 * A non-modal popover anchored to a button.
 *
 * @whenToUse Show filters, details, a small form, or an explanation opened by click. Use a rich toggletip for a short explanation with actions.
 * @whenNotToUse Use ki-dialog for required decisions and ki-tooltip for hover or focus hints.
 * @slot - Dialog content or toggletip text. A rich toggletip also accepts actions.
 * @part surface - The popover panel.
 * @part arrow - The decorative arrow.
 */
@Component({
  tag: 'ki-popover',
  styleUrl: 'ki-popover.css',
  shadow: true,
})
export class KiPopover {
  @Element() private host!: HTMLElement;

  /** ID of the button in the same document or shadow tree. */
  @Prop() for?: string;

  /** Preferred side and logical alignment. Flips when room is limited. */
  @Prop() placement: KiPopoverPlacement = 'bottom-start';

  /** Visibility. Reflects activation and native dismissal. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Accessible name of a dialog popover. */
  @Prop() label: string | undefined = 'Popover';

  /** Shows the arrow toward the trigger. */
  @Prop({ mutable: true }) arrow = true;

  @AttrDeserialize('arrow')
  protected deserializeArrow(value: string | null): boolean {
    return value !== 'false';
  }

  /** Use dialog for controls or toggletip for supplemental information. Rich toggletips can contain actions. */
  @Prop() kind: KiPopoverKind = 'dialog';

  /**
   * Rich shares the tooltip's raised surface, body and heading styles. With
   * `kind="toggletip"` it enables actions and moves focus inside on open.
   */
  @Prop() appearance: KiPopoverAppearance = 'default';

  /** Emitted when the popover opens. */
  @Event({ eventName: 'ki-open', cancelable: false }) kiOpen!: EventEmitter<void>;

  /** Emitted when the popover closes. */
  @Event({ eventName: 'ki-close', cancelable: false }) kiClose!: EventEmitter<void>;

  @State() private announcement = '';

  private overlay = new AnchoredOverlay();
  private popup: HTMLDivElement | undefined;
  private trigger: HTMLElement | undefined;
  private control: TriggerState | undefined;
  private readonly treeObserver = new MutationObserver(() => {
    this.bindTrigger();
  });
  private controlObserver?: MutationObserver;
  private triggerListeners: AbortController | undefined;
  private dismissListeners: AbortController | undefined;
  private escape: KeyboardEvent | undefined;
  private pressedWhileOpen = false;
  private shown = false;

  connectedCallback(): void {
    if (this.popup) {
      this.connect();
    }
  }

  componentWillLoad(): void {
    // The external custom-elements runtime skips AttrDeserialize and treats
    // removal as false. Observe the host for its lifetime, including detaches.
    const host = this.host;
    new MutationObserver(() => {
      if (!host.hasAttribute('arrow') && !this.arrow) {
        this.arrow = true;
      }
    }).observe(host, { attributeFilter: ['arrow'] });
  }

  componentDidLoad(): void {
    this.popup?.addEventListener('toggle', this.syncVisibility);
    this.connect();
  }

  disconnectedCallback(): void {
    this.treeObserver.disconnect();
    this.unbindTrigger();
    this.stopDismissTracking();
    this.shown = false;
    this.announcement = '';
    this.overlay.hide();
  }

  @Watch('for')
  updateAnchor(): void {
    if (this.popup?.isConnected) {
      this.bindTrigger();
    }
  }

  @Watch('open')
  updateOpen(): void {
    if (!this.popup?.isConnected) {
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
  @Watch('appearance')
  updateKind(): void {
    this.updateTrigger();
    this.updateAnnouncement();
  }

  private get isTextToggletip(): boolean {
    return this.kind === 'toggletip' && this.appearance !== 'rich';
  }

  private get isRichToggletip(): boolean {
    return this.kind === 'toggletip' && this.appearance === 'rich';
  }

  private connect(): void {
    this.treeObserver.observe(this.host.getRootNode(), {
      childList: true,
      subtree: true,
      attributeFilter: ['id'],
    });
    this.bindTrigger();
    this.updateOpen();
  }

  private bindTrigger(): void {
    const anchor = this.for ? resolveOverlayAnchor(this.host, this.for) : null;
    if ((anchor ?? undefined) === this.trigger) {
      return;
    }
    if (this.shown) {
      this.close();
    }
    this.unbindTrigger();
    if (!(anchor instanceof HTMLElement) || anchor === this.host || this.host.contains(anchor)) {
      return;
    }
    this.trigger = anchor;
    this.triggerListeners = new AbortController();
    const options = { signal: this.triggerListeners.signal };
    anchor.addEventListener('click', this.handleActivation, options);
    anchor.addEventListener(
      'pointerdown',
      () => {
        this.pressedWhileOpen = this.shown;
      },
      options,
    );
    this.observeControl(anchor);
    if (anchor.localName.includes('-') && !customElements.get(anchor.localName)) {
      void customElements.whenDefined(anchor.localName).then(() => {
        if (this.trigger === anchor) {
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
        attributeFilter: ['tabindex'],
      });
    }
    this.bindControl();
  }

  private bindControl = (): void => {
    const trigger = this.trigger;
    // ARIA belongs to the button exposed to assistive technology. Kimen's
    // focus-delegating host has no button role of its own.
    const target = trigger?.matches('button, input[type="button"], [role="button"]')
      ? trigger
      : trigger && shadowFocusTarget(trigger);
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
    this.triggerListeners?.abort();
    if (this.control) {
      restoreTrigger(this.control);
    }
    this.trigger = undefined;
    this.control = undefined;
    this.pressedWhileOpen = false;
  }

  private updateTrigger(): void {
    const state = this.control;
    if (state) {
      state.element.ariaExpanded = String(this.shown);
      state.element.ariaHasPopup = this.isTextToggletip ? state.hasPopup : 'dialog';
    }
  }

  private handleActivation = (event: MouseEvent): void => {
    const trigger = this.control?.element ?? this.trigger;
    // Some engines dismiss on pointerup before delivering a click to an
    // external trigger. That click still means close if the press began open.
    const dismiss = this.shown || (event.detail > 0 && this.pressedWhileOpen);
    this.pressedWhileOpen = false;
    if (event.defaultPrevented || trigger?.matches(':disabled, [aria-disabled="true"]')) {
      return;
    }
    this.open = !dismiss;
  };

  private show(): void {
    const trigger = this.trigger;
    const popup = this.popup;
    if (!trigger || !popup) {
      return;
    }
    const source = this.control?.element ?? trigger;
    this.overlay.show(popup, trigger, {
      source,
      position: anchoredOverlayPosition({
        placement: normalizePopoverPlacement(this.placement),
        offset: (panel) => Number.parseFloat(getComputedStyle(panel).scrollMarginBlockStart) || 0,
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
      onDismiss: this.syncVisibility,
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
    this.announcement =
      this.shown && this.isTextToggletip ? (content.textContent?.trim() ?? '') : '';
  }

  private syncVisibility = (): void => {
    const visible = this.popup?.matches(':popover-open') === true;
    const changed = this.shown !== visible;
    const restore = !visible && this.escape?.defaultPrevented === false;
    this.shown = visible;
    if (this.open !== visible) {
      this.open = visible;
    }
    if (!changed) {
      return;
    }
    this.updateTrigger();
    this.updateAnnouncement();
    if (visible) {
      this.trackNativeDismiss();
      if (!this.isTextToggletip) {
        const focusTarget =
          resolvePopoverFocus(this.host) ?? (this.isRichToggletip ? this.popup : undefined);
        focusTarget?.focus();
      }
      this.kiOpen.emit();
    } else {
      this.stopDismissTracking();
      this.overlay.hide();
      if (restore && this.trigger?.isConnected) {
        focusThroughShadow(this.trigger);
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

  private stopDismissTracking(): void {
    this.dismissListeners?.abort();
    this.dismissListeners = undefined;
    this.escape = undefined;
  }

  render() {
    const toggletip = this.isTextToggletip;
    const label = this.label?.trim() ?? '';
    return [
      <div
        class={{ popup: true, rich: this.appearance === 'rich' }}
        part="surface"
        popover="auto"
        role={toggletip ? 'presentation' : 'dialog'}
        aria-label={toggletip ? undefined : label || 'Popover'}
        {...(this.isRichToggletip ? { tabIndex: -1 } : {})}
        ref={(element) => {
          this.popup = element;
        }}
      >
        <div class="content" inert={toggletip}>
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
