import { Component, Element, Event, Method, Prop, State, Watch, h } from '@stencil/core';
import { isOutsideRect } from './ki-dialog.backdrop';
import { resolveEntryFocusTarget, resolveFocusableTargets } from './ki-dialog.focus';

/** Close reason reported by `ki-close`. */
export type KiDialogCloseReason = 'method' | 'escape' | 'backdrop';

/** Event payload for the post-close `ki-close` notification. */
export interface KiDialogCloseDetail {
  /** `method` for `close()`/open removal, `escape` for Escape, `backdrop` for opt-in backdrop. */
  reason: KiDialogCloseReason;
}

interface EventEmitter<T> {
  emit(detail: T): CustomEvent<T>;
}

/**
 * A modal dialog for one interrupting decision or short focused task.
 *
 * When to use: destructive confirmations, blocking choices, and brief
 * critical input that must be resolved before returning to the page. Always
 * provide a `heading`, place actions in the `footer` slot, wire each footer
 * action to `close()`, and in destructive confirmations put `autofocus` on
 * the least destructive action.
 * When NOT to use: non-blocking feedback (`ki-alert`, future `ki-toast`),
 * supplementary hints (`ki-tooltip`), long forms or multi-step flows
 * (navigate or use a future full-screen variant), menus, or pickers.
 *
 * @slot - Dialog body content.
 * @slot footer - Dialog actions; applications wire every action to `close()`.
 * @part dialog - Internal native dialog surface.
 * @part heading - Visible h2 title, rendered only when `heading` is non-empty.
 * @part body - Scrollable body region.
 * @part footer - Action row, collapsed when empty.
 */
@Component({
  tag: 'ki-dialog',
  styleUrl: 'ki-dialog.css',
  shadow: true,
})
export class KiDialog {
  @Element() private readonly host!: HTMLElement;

  /**
   * Reflected live modal state. Add it or call `show()` to open; remove it or
   * call `close()` to close. When open, the native dialog enters the top layer
   * and the page behind is inert.
   * When to use: bind application state to the dialog's modal lifecycle.
   * When NOT to use: do not set the internal native `<dialog open>` attribute;
   * the host attribute is the only public source of truth.
   *
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) open = false;

  /**
   * Visible dialog title and accessible-name source. Always provide a heading;
   * an empty value intentionally leaves the native dialog unnamed.
   * When to use: name the interrupting decision, for example "Delete
   * account?". When NOT to use: do not omit it for production dialogs; APG
   * modal dialogs require an accessible name.
   */
  @Prop({ reflect: true }) heading?: string;

  /**
   * Opts into backdrop light-dismiss. Omit this attribute for critical
   * confirmations; `close-on-backdrop="false"` still enables it.
   * When to use: low-risk dialogs where an outside click may safely dismiss.
   * When NOT to use: destructive confirmations or decisions that should not be
   * lost to a stray click; omit the attribute entirely rather than setting it
   * to `"false"`.
   *
   * @default false
   */
  @Prop({ reflect: true, attribute: 'close-on-backdrop' }) closeOnBackdrop = false;

  /**
   * Post-close notification for every close path. Footer actions report
   * `method` when they call `close()`, Escape reports `escape`, and opt-in
   * backdrop dismissal reports `backdrop`.
   * When to use: update application state after the dialog is already closed
   * and focus has returned through the native mechanism.
   * When NOT to use: do not expect this event to veto closing; it is not
   * cancelable in v1.
   */
  @Event({ eventName: 'ki-close', bubbles: true, composed: true, cancelable: false })
  private readonly kiClose!: EventEmitter<KiDialogCloseDetail>;

  @State() private footerHasContent = false;

  private dialog: HTMLDialogElement | undefined;
  private backdropArmed = false;
  private openObserver?: MutationObserver;
  private pendingReason: KiDialogCloseReason = 'method';

  @Watch('open')
  protected handleOpenChange(): void {
    this.syncDialogToHost();
  }

  componentDidLoad(): void {
    if (typeof MutationObserver !== 'undefined') {
      this.openObserver = new MutationObserver(this.handleHostMutation);
      this.openObserver.observe(this.host, { attributeFilter: ['open'] });
    }
    document.addEventListener('keydown', this.handleKeyDown, { capture: true });
    this.updateFooterState();
    this.syncDialogToHost();
  }

  disconnectedCallback(): void {
    this.backdropArmed = false;
    this.openObserver?.disconnect();
    document.removeEventListener('keydown', this.handleKeyDown, { capture: true });
  }

  /**
   * Opens the dialog modally. No-op when already open. Equivalent to adding
   * the host `open` attribute.
   * When to use: call from the invoker that should receive focus again after
   * close. When NOT to use: do not call repeatedly to refresh content; update
   * slotted content directly while open.
   */
  @Method()
  show(): Promise<void> {
    if (this.open) {
      return Promise.resolve();
    }

    this.open = true;
    this.host.setAttribute('open', '');
    return Promise.resolve();
  }

  /**
   * Closes the dialog and reports `method`. No-op when already closed.
   * Equivalent to removing the host `open` attribute. Footer actions never
   * close automatically; wire them to this method.
   * When to use: resolve footer actions, programmatic dismissals, and
   * application-controlled cancellation. When NOT to use: do not use for
   * Escape or backdrop bookkeeping; those paths set their own close reasons.
   */
  @Method()
  close(): Promise<void> {
    if (!this.open && !this.dialog?.open) {
      return Promise.resolve();
    }

    this.pendingReason = 'method';
    this.open = false;
    this.host.removeAttribute('open');
    return Promise.resolve();
  }

  private readonly setDialogRef = (dialog?: HTMLDialogElement): void => {
    this.dialog = dialog;
  };

  private readonly handleCancel = (): void => {
    this.pendingReason = 'escape';
  };

  private readonly handleNativeClose = (): void => {
    const reason = this.pendingReason;
    this.pendingReason = 'method';
    this.backdropArmed = false;

    if (this.open) {
      this.open = false;
    }
    this.host.removeAttribute('open');

    setTimeout(() => {
      this.moveHostFallbackFocusToBody();
      this.kiClose.emit({ reason });
    }, 0);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const dialog = this.dialog;
    if (!this.closeOnBackdrop || !dialog || event.target !== dialog) {
      this.backdropArmed = false;
      return;
    }

    this.backdropArmed = isOutsideRect(
      event.clientX,
      event.clientY,
      dialog.getBoundingClientRect(),
    );
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const dialog = this.dialog;
    if (!this.closeOnBackdrop || !this.backdropArmed || !dialog || event.target !== dialog) {
      this.backdropArmed = false;
      return;
    }

    this.backdropArmed = false;
    if (!isOutsideRect(event.clientX, event.clientY, dialog.getBoundingClientRect())) {
      return;
    }

    this.pendingReason = 'backdrop';
    dialog.close();
  };

  private readonly handleFooterSlotChange = (): void => {
    this.updateFooterState();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !this.dialog?.open) {
      return;
    }

    const targets = resolveFocusableTargets(this.host);
    if (targets.length === 0) {
      event.preventDefault();
      this.dialog.focus();
      return;
    }

    const active = document.activeElement;
    const first = targets[0];
    const last = targets[targets.length - 1];
    if (!first || !last) {
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  private readonly handleHostMutation = (): void => {
    const hasOpenAttribute = this.host.hasAttribute('open');
    if (this.open !== hasOpenAttribute) {
      this.open = hasOpenAttribute;
      return;
    }

    this.syncDialogToHost();
  };

  private updateFooterState(): void {
    this.footerHasContent = Boolean(this.host.querySelector('[slot="footer"]'));
  }

  private syncDialogToHost(): void {
    if (!this.dialog || !this.host.isConnected) {
      return;
    }

    if (this.open && !this.dialog.open) {
      this.dialog.showModal();
      this.assistFocusEntry();
      return;
    }

    if (!this.open && this.dialog.open) {
      this.dialog.close();
    }
  }

  private assistFocusEntry(): void {
    if (!this.dialog) {
      return;
    }

    // Native showModal() focuses the dialog surface when it cannot find a
    // focusable in its flat-tree traversal — which happens for slotted actions
    // whose control lives one shadow deeper (e.g. ki-button). That native
    // focus settles asynchronously, so the corrective focus is deferred one
    // frame to win over it (FR-005 / S6: entry focus reaches the action).
    const apply = (): void => {
      if (!this.dialog?.open) {
        return;
      }
      const target = resolveEntryFocusTarget(this.host);
      if (target) {
        if (document.activeElement !== target && !target.contains(document.activeElement)) {
          target.focus();
        }
        return;
      }
      if (document.activeElement !== this.dialog) {
        this.dialog.focus();
      }
    };

    apply();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(apply);
    }
  }

  private moveHostFallbackFocusToBody(): void {
    if (document.activeElement === this.host) {
      const hadTabindex = document.body.hasAttribute('tabindex');
      const previousTabindex = document.body.getAttribute('tabindex');
      document.body.tabIndex = -1;
      document.body.focus({ preventScroll: true });
      if (hadTabindex && previousTabindex !== null) {
        document.body.setAttribute('tabindex', previousTabindex);
      } else {
        document.body.removeAttribute('tabindex');
      }
    }
  }

  render() {
    const heading = this.heading?.trim();

    return (
      // Native modal <dialog> receives pointer/click events retargeted from
      // ::backdrop; keyboard behavior is the platform close request.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <dialog
        part="dialog"
        ref={this.setDialogRef}
        aria-labelledby={heading ? 'heading' : undefined}
        onCancel={this.handleCancel}
        onClose={this.handleNativeClose}
        onPointerDown={this.handlePointerDown}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        {heading ? (
          <h2 part="heading" id="heading">
            {this.heading}
          </h2>
        ) : null}
        <div part="body">
          <slot />
        </div>
        <div part="footer" hidden={!this.footerHasContent}>
          <slot name="footer" onSlotchange={this.handleFooterSlotChange} />
        </div>
      </dialog>
    );
  }
}
