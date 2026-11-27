import '../../../icons/x.js';
import { Component, Element, Event, h, Method, Prop, State, Watch } from '@stencil/core';
import { focusThroughShadow, shadowFocusTarget } from '../../utils/shadow-focus';
import { isNativePlayer, resolveFocusableTargets } from '../ki-dialog/ki-dialog.focus';
import { isDownwardSwipe } from './ki-drawer.gesture';

export type KiDrawerPlacement = 'start' | 'end' | 'bottom';
export type KiDrawerCloseReason = 'button' | 'escape' | 'method' | 'swipe';

export interface KiDrawerCloseDetail {
  /** The source of the dismissal request. Open-state changes report `method`. */
  reason: KiDrawerCloseReason;
}

interface EventEmitter<T> {
  emit(detail: T): CustomEvent<T>;
}

const FIELD =
  'input:not([type="button"], [type="submit"], [type="reset"], [type="image"]), select, textarea, [contenteditable="true"], [role="combobox"], [role="textbox"]';

/**
 * An edge-aligned sheet for a focused task that keeps the current page in context.
 *
 * @whenToUse Edit an item beside its list or offer a short set of actions in a
 * bottom sheet. Supply a heading and wire slotted actions in the application.
 * Use non-modal mode if people need to interact with the page while editing.
 * @whenNotToUse Menus, hover hints, permanent navigation, or work that needs a
 * full page. For a short interrupting decision in the center, use ki-dialog.
 *
 * @slot - The drawer's content, such as fields or a short list of actions.
 * @slot header-actions - Optional actions between the heading and Close button.
 * @slot footer - Optional actions such as Save. Wire these in the application.
 * @part dialog - The native sheet surface.
 * @part handle - The decorative bottom-sheet swipe handle.
 * @part header - The heading and action layout.
 * @part heading - The visible title that names the sheet.
 * @part close - The built-in Close button.
 * @part body - The scrollable content region.
 * @part footer - The action row, collapsed when empty.
 */
@Component({ tag: 'ki-drawer', styleUrl: 'ki-drawer.css', shadow: true })
export class KiDrawer {
  @Element() private readonly host!: HTMLElement;

  /** Title and accessible name. Provide a heading whenever the drawer opens. */
  @Prop() heading!: string;

  /** Logical edge. Use bottom for an action sheet with a swipe handle. Unknown values use end. */
  @Prop({ reflect: true }) placement: KiDrawerPlacement = 'end';

  /** Reflected live state. Setting it to false requests dismissal and may be vetoed. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Optional CSS length. Overrides the 18rem themed width or bottom height cap. */
  @Prop() size?: string;

  /** Makes the page behind the sheet inert. Set modal="false" for continued page interaction. */
  @Prop({ mutable: true }) modal = true;

  /** Accessible name for the built-in Close button. Translate this for localized interfaces. */
  @Prop({ attribute: 'close-label' }) closeLabel?: string = 'Close';

  /**
   * Requests dismissal before the drawer closes, also on `close()` or a cleared `open`: it
   * can fire without a gesture. Call preventDefault() to keep it open, for example when
   * edits are unsaved. The event carries the reason in detail.reason.
   */
  @Event({ eventName: 'ki-close', bubbles: true, composed: true, cancelable: true })
  private readonly kiClose!: EventEmitter<KiDrawerCloseDetail>;

  @State() private hasFooter = false;

  private dialog: HTMLDialogElement | undefined;
  private closeButton: HTMLButtonElement | undefined;
  private body: HTMLElement | undefined;
  private content: HTMLElement | undefined;
  private bodyObserver?: ResizeObserver;
  private focusFrame: number | undefined;
  private internalOpenWrite = false;
  private requestingClose = false;
  private swipeStart: { pointerId: number; x: number; y: number } | undefined;

  componentWillLoad(): void {
    this.hasFooter = this.host.querySelector(':scope > [slot="footer"]') !== null;
  }

  componentDidLoad(): void {
    this.syncDialog();
  }

  connectedCallback(): void {
    this.syncDialog();
  }

  disconnectedCallback(): void {
    this.releaseOpenEffects();
    // Removing the host took its dialog out of the top layer. On reconnect
    // the public open state still applies, so clear the now-stale native flag.
    this.dialog?.removeAttribute('open');
  }

  @Watch('open')
  protected handleOpenChange(open: boolean): void {
    if (this.internalOpenWrite) return;
    if (!open && this.dialog?.open) {
      // Keep the live state consistent while listeners decide on dismissal.
      this.writeOpen(true);
      this.requestClose('method');
      return;
    }
    this.syncDialog();
  }

  @Watch('modal')
  protected handleModalChange(): void {
    this.syncDialog();
  }

  /** Opens the sheet. A focused invoker receives focus again after modal dismissal. */
  @Method()
  show(): Promise<void> {
    this.writeOpen(true);
    this.syncDialog();
    return Promise.resolve();
  }

  /** Requests dismissal. An application can veto it by canceling ki-close. */
  @Method()
  close(): Promise<void> {
    this.requestClose('method');
    return Promise.resolve();
  }

  private writeOpen(open: boolean): void {
    this.internalOpenWrite = true;
    this.open = open;
    this.host.toggleAttribute('open', open);
    this.internalOpenWrite = false;
  }

  private requestClose(reason: KiDrawerCloseReason): void {
    if (!this.open || this.requestingClose) return;

    this.requestingClose = true;
    const request = this.kiClose.emit({ reason });
    this.requestingClose = false;
    if (request.defaultPrevented) return;

    this.writeOpen(false);
    this.syncDialog();
  }

  private syncDialog(): void {
    const dialog = this.dialog;
    if (!dialog || !this.host.isConnected) return;

    if (!this.open) {
      this.releaseOpenEffects();
      if (dialog.open) dialog.close();
      return;
    }

    if (dialog.open && dialog.matches(':modal') === this.modal) return;
    if (dialog.open) {
      this.releaseOpenEffects();
      dialog.close();
    }
    if (this.modal) dialog.showModal();
    else dialog.show();
    this.observeBody();
    this.focusEntry();
  }

  private releaseOpenEffects(): void {
    this.bodyObserver?.disconnect();
    this.swipeStart = undefined;
    if (this.focusFrame !== undefined) {
      cancelAnimationFrame(this.focusFrame);
      this.focusFrame = undefined;
    }
  }

  private readonly handleNativeClose = (): void => {
    // A close from inside the native dialog may arrive after a newer open.
    if (this.open && this.host.isConnected && !this.dialog?.open) {
      this.writeOpen(false);
      this.releaseOpenEffects();
    }
  };

  private readonly handleCancel = (event: Event): void => {
    event.preventDefault();
    this.requestClose('escape');
  };

  private readonly handleCloseButton = (): void => {
    this.requestClose('button');
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !this.dialog?.open) return;
    const path = event.composedPath();
    const nearestDialog = path.find((target) => target instanceof HTMLDialogElement);
    if (nearestDialog !== this.dialog) return;

    if (event.key === 'Escape' && !this.dialog.matches(':modal')) {
      event.preventDefault();
      this.requestClose('escape');
      return;
    }
    if (event.key !== 'Tab' || !this.dialog.matches(':modal') || !this.closeButton) return;

    const { header, body, footer } = this.slottedTargets();
    const scrollStop = this.syncBodyTabStop() && this.body ? [this.body] : [];
    const first = header[0] ?? this.closeButton;
    const last = footer.at(-1) ?? body.at(-1) ?? scrollStop[0] ?? this.closeButton;
    const boundary = event.shiftKey ? first : last;

    // Native media controls hold their own sequence inside this single target.
    if (path.includes(boundary) && !isNativePlayer(boundary)) {
      event.preventDefault();
      focusThroughShadow(event.shiftKey ? last : first);
    }
  };

  private slottedTargets(): { header: HTMLElement[]; body: HTMLElement[]; footer: HTMLElement[] } {
    const groups = {
      header: [] as HTMLElement[],
      body: [] as HTMLElement[],
      footer: [] as HTMLElement[],
    };
    for (const target of resolveFocusableTargets(this.host)) {
      if (
        !target.getClientRects().length ||
        target.matches(':disabled') ||
        target.closest('[inert], [aria-hidden="true"]') ||
        getComputedStyle(target).visibility !== 'visible'
      ) {
        continue;
      }
      let root = target;
      while (root.parentElement && root.parentElement !== this.host) root = root.parentElement;
      const slot = root.assignedSlot;
      if (!slot) continue;
      if (slot.name === 'header-actions') groups.header.push(target);
      else if (slot.name === 'footer') groups.footer.push(target);
      else if (slot.name === '') groups.body.push(target);
    }
    return groups;
  }

  private focusEntry(): void {
    const { closeButton } = this;
    if (!closeButton) return;
    const choose = (): HTMLElement => {
      const { header, body, footer } = this.slottedTargets();
      const all = [...header, ...body, ...footer];
      return (
        all.find(
          (target) =>
            target.hasAttribute('autofocus') ||
            shadowFocusTarget(target)?.hasAttribute('autofocus'),
        ) ??
        body.find((target) => (shadowFocusTarget(target) ?? target).matches(FIELD)) ??
        body[0] ??
        header[0] ??
        footer[0] ??
        closeButton
      );
    };

    const target = choose();
    focusThroughShadow(target);

    // Slotted controls can hydrate just after the sheet opens. Retry briefly
    // while the built-in button still holds the focus we placed there.
    if (target !== closeButton || this.host.childElementCount === 0) return;
    let remaining = 10;
    const retry = (): void => {
      this.focusFrame = undefined;
      if (this.host.shadowRoot?.activeElement !== this.closeButton) return;
      const ready = choose();
      if (ready !== target) focusThroughShadow(ready);
      else if (--remaining > 0) this.focusFrame = requestAnimationFrame(retry);
    };
    this.focusFrame = requestAnimationFrame(retry);
  }

  private readonly syncBodyTabStop = (): boolean => {
    const body = this.body;
    if (!body) return false;
    const overflowing = body.scrollHeight > body.clientHeight;
    if (overflowing) body.tabIndex = 0;
    else body.removeAttribute('tabindex');
    return overflowing;
  };

  private observeBody(): void {
    if (!this.body || !this.content) return;
    this.bodyObserver ??= new ResizeObserver(this.syncBodyTabStop);
    this.bodyObserver.observe(this.body);
    this.bodyObserver.observe(this.content);
    this.syncBodyTabStop();
  }

  private readonly startSwipe = (event: PointerEvent): void => {
    if (!event.isPrimary || event.pointerType !== 'touch') return;
    this.swipeStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  private readonly endSwipe = (event: PointerEvent): void => {
    const start = this.swipeStart;
    if (start?.pointerId !== event.pointerId) return;
    this.swipeStart = undefined;
    if (
      this.placement === 'bottom' &&
      isDownwardSwipe(event.clientX - start.x, event.clientY - start.y)
    ) {
      this.requestClose('swipe');
    }
  };

  private readonly cancelSwipe = (event: PointerEvent): void => {
    if (this.swipeStart?.pointerId === event.pointerId) this.swipeStart = undefined;
  };

  private readonly updateFooter = (event: Event): void => {
    this.hasFooter = (event.target as HTMLSlotElement).assignedElements().length > 0;
  };

  render() {
    const heading = (this.heading as string | undefined)?.trim();
    const closeLabel = this.closeLabel?.trim() ?? '';
    const bottom = this.placement === 'bottom';
    const size = this.size ? `min(${this.size}, 100%)` : undefined;
    return (
      <dialog
        key="drawer"
        ref={(element) => {
          this.dialog = element;
        }}
        part="dialog"
        style={bottom ? { maxBlockSize: size } : { inlineSize: size }}
        aria-labelledby={heading ? 'drawer-heading' : undefined}
        aria-modal={this.modal ? 'true' : undefined}
        onCancel={this.handleCancel}
        onClose={this.handleNativeClose}
        onKeyDown={this.handleKeyDown}
      >
        {bottom && (
          <div
            part="handle"
            aria-hidden="true"
            onPointerDown={this.startSwipe}
            onPointerUp={this.endSwipe}
            onPointerCancel={this.cancelSwipe}
            onLostPointerCapture={this.cancelSwipe}
          />
        )}
        <div part="header">
          {heading && (
            <h2 id="drawer-heading" part="heading">
              {heading}
            </h2>
          )}
          <slot name="header-actions" />
          <button
            key="close"
            ref={(element) => {
              this.closeButton = element;
            }}
            part="close"
            type="button"
            tabIndex={0}
            aria-label={closeLabel.length === 0 ? 'Close' : closeLabel}
            onClick={this.handleCloseButton}
          >
            <ki-icon name="x" size="md" />
          </button>
        </div>
        <div
          key="body"
          part="body"
          ref={(element) => {
            this.body = element;
          }}
        >
          <div
            ref={(element) => {
              this.content = element;
            }}
          >
            <slot />
          </div>
        </div>
        <div part="footer" hidden={!this.hasFooter}>
          <slot name="footer" onSlotchange={this.updateFooter} />
        </div>
      </dialog>
    );
  }
}
