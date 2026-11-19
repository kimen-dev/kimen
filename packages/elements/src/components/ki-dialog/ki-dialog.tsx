import { Component, Element, Event, h, Listen, Method, Prop, State, Watch } from '@stencil/core';
import { booleanFromAttributePresence } from '../../utils/boolean-presence';
import {
  type DialogCommandEvent,
  hasDialogAncestor,
  isDialogCommand,
} from '../../utils/dialog-invoker';
import { focusThroughShadow } from '../../utils/shadow-focus';
import { isOutsideRect } from './ki-dialog.backdrop';
import {
  isNativePlayer,
  resolveEntryFocusTarget,
  resolveFocusableTargets,
} from './ki-dialog.focus';

/** Close reason reported by `ki-close`. */
export type KiDialogCloseReason = 'method' | 'escape' | 'backdrop' | 'command';

/** Event payload for the post-close `ki-close` notification. */
export interface KiDialogCloseDetail {
  /** Dismissal path: programmatic, Escape, opt-in backdrop, or an invoker command. */
  reason: KiDialogCloseReason;
}

interface EventEmitter<T> {
  emit(detail: T): CustomEvent<T>;
}

/**
 * A modal dialog for one interrupting decision or short focused task.
 *
 * @whenToUse destructive confirmations, blocking choices, and brief
 * critical input that must be resolved before returning to the page. Always
 * provide a `heading`, place actions in the `footer` slot, wire each
 * dismissal to `close()` or a close command, and in destructive confirmations put `autofocus` on
 * the least destructive action.
 * @whenNotToUse non-blocking feedback (`ki-alert`, future `ki-toast`),
 * supplementary hints (`ki-tooltip`), long forms or multi-step flows
 * (navigate or use a future full-screen variant), menus, or pickers.
 *
 * @slot - Dialog body content.
 * @slot footer - Dialog actions. Dismiss using an invoker command or `close()`.
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
  @Prop({ reflect: true }) heading!: string;

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
  @Prop({ reflect: true, mutable: true, attribute: 'close-on-backdrop' }) closeOnBackdrop = false;

  /**
   * Post-close notification for every close path. Footer actions report
   * `method` when they call `close()`, Escape reports `escape`, and opt-in
   * backdrop dismissal reports `backdrop`. Invoker dismissals report `command`.
   * When to use: update application state after the dialog is already closed
   * and focus has returned through the native mechanism.
   * When NOT to use: do not expect this event to veto closing; it is not
   * cancelable in v1.
   */
  @Event({ eventName: 'ki-close', bubbles: true, composed: true, cancelable: false })
  private readonly kiClose!: EventEmitter<KiDialogCloseDetail>;

  @State() private footerHasContent = false;

  private dialog: HTMLDialogElement | undefined;
  private body: HTMLDivElement | undefined;
  private bodyObserver?: ResizeObserver;
  private backdropArmed = false;
  private openObserver?: MutationObserver;
  private pendingReason: KiDialogCloseReason = 'method';
  private commandInvoker: HTMLElement | undefined;

  @Watch('open')
  protected handleOpenChange(): void {
    this.syncDialogToHost();
  }

  componentWillLoad(): void {
    // Boolean presence semantics: any present `close-on-backdrop` attribute
    // (including `close-on-backdrop="false"` or malformed agent output) opts in;
    // omit the attribute to opt out. Stencil parses "false" to `false`, so apply
    // presence here (the observer keeps it true for post-hydration writes).
    this.closeOnBackdrop = booleanFromAttributePresence(
      this.closeOnBackdrop,
      this.host.hasAttribute('close-on-backdrop'),
    );
    // Same for `open`: since Stencil 4.45 reflecting the parsed `false` would
    // remove an authored `open="false"` before the observer below exists.
    this.open = booleanFromAttributePresence(this.open, this.host.hasAttribute('open'));
  }

  connectedCallback(): void {
    // Back in the document after a move or a removal: disconnectedCallback
    // released the observer and the document listener, and the dialog loads
    // only once. On the first connection there is no native dialog yet:
    // componentDidLoad arms it.
    if (this.dialog) {
      this.arm();
    }
  }

  componentDidLoad(): void {
    this.arm();
  }

  disconnectedCallback(): void {
    this.backdropArmed = false;
    this.openObserver?.disconnect();
    this.bodyObserver?.disconnect();
    document.removeEventListener('keydown', this.handleKeyDown, { capture: true });
  }

  /**
   * Everything the dialog holds only while it is in the document, plus the
   * state that may have changed while it was out of it: `open` written on a
   * detached dialog, footer actions added or removed.
   */
  private arm(): void {
    this.openObserver?.disconnect();
    this.openObserver = new MutationObserver(this.handleHostMutation);
    this.openObserver.observe(this.host, { attributeFilter: ['open', 'close-on-backdrop'] });
    document.addEventListener('keydown', this.handleKeyDown, { capture: true });
    this.updateFooterState();
    this.syncDialogToHost();
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
   * close automatically; wire them to this method or an invoker command.
   * When to use: resolve footer actions, programmatic dismissals, and
   * application-controlled cancellation. When NOT to use: do not use for
   * Escape or backdrop bookkeeping; those paths set their own close reasons.
   */
  @Method()
  close(): Promise<void> {
    this.closeWithReason('method');
    return Promise.resolve();
  }

  @Listen('command')
  protected handleCommand(event: DialogCommandEvent): void {
    const { command, source } = event;
    if (event.target !== this.host || event.defaultPrevented || !isDialogCommand(command)) {
      return;
    }

    if (command === 'close') {
      this.closeWithReason('command');
      return;
    }

    if (command === 'request-close') {
      this.requestCommandClose();
      return;
    }

    if (
      this.open ||
      hasDialogAncestor(this.host, false) ||
      (source instanceof HTMLElement && hasDialogAncestor(source, true))
    ) {
      return;
    }
    this.commandInvoker = source instanceof HTMLElement ? source : undefined;
    void this.show();
  }

  private closeWithReason(reason: KiDialogCloseReason): void {
    if (!this.open && !this.dialog?.open) {
      return;
    }

    this.pendingReason = reason;
    this.open = false;
    this.host.removeAttribute('open');
  }

  private requestCommandClose(): void {
    const dialog = this.dialog as (HTMLDialogElement & { requestClose?: () => void }) | undefined;
    if (!dialog?.open) {
      return;
    }

    this.pendingReason = 'command';
    if (typeof dialog.requestClose === 'function') {
      dialog.requestClose();
    } else if (dialog.dispatchEvent(new globalThis.Event('cancel', { cancelable: true }))) {
      dialog.close();
    }

    // The native close event is queued only if the request was accepted.
    if (dialog.hasAttribute('open')) {
      this.pendingReason = 'method';
    }
  }

  private readonly setDialogRef = (dialog?: HTMLDialogElement): void => {
    this.dialog = dialog;
  };

  private readonly setBodyRef = (body?: HTMLDivElement): void => {
    this.body = body;
  };

  private readonly handleCancel = (): void => {
    if (this.pendingReason !== 'command') {
      this.pendingReason = 'escape';
    }
  };

  private readonly handleNativeClose = (): void => {
    const reason = this.pendingReason;
    const invoker = this.commandInvoker;
    this.commandInvoker = undefined;
    this.pendingReason = 'method';
    this.backdropArmed = false;

    if (this.open) {
      this.open = false;
    }
    this.host.removeAttribute('open');

    setTimeout(() => {
      if (invoker?.isConnected && !this.open) {
        focusThroughShadow(invoker);
      } else {
        this.moveHostFallbackFocusToBody();
      }
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

  private readonly handleBodySlotChange = (): void => {
    this.observeBody();
  };

  /**
   * While the body content outgrows the body region, the body is a Tab stop
   * so the native scroll keys (arrows, Page Up/Down, Space, Home/End) reach
   * the clipped content; while everything fits it adds no stop (WCAG 2.1.1,
   * ki-scroller precedent). Written straight to the element, not through a
   * render: the Tab handler re-measures and the stop has to exist before the
   * browser runs that same keystroke's focus navigation. Returns whether the
   * body is a stop right now.
   */
  private readonly syncBodyTabStop = (): boolean => {
    const body = this.body;
    if (!body) {
      return false;
    }
    const overflowing = body.scrollHeight > body.clientHeight;
    if (overflowing) {
      body.tabIndex = 0;
    } else {
      body.removeAttribute('tabindex');
    }
    return overflowing;
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !this.dialog?.open) {
      return;
    }

    const targets = resolveFocusableTargets(this.host);
    // Measured on the keystroke itself: the observer below sees size changes
    // only, so a finished entrance animation or a text edit can leave its
    // last answer stale. The body precedes every slotted action.
    if (this.body && this.syncBodyTabStop()) {
      targets.unshift(this.body);
    }
    if (targets.length === 0) {
      event.preventDefault();
      this.dialog.focus();
      return;
    }

    // Slotted actions are light DOM; the body is focused inside this shadow.
    const active = this.host.shadowRoot?.activeElement ?? document.activeElement;
    const first = targets[0];
    const last = targets[targets.length - 1];
    if (!first || !last) {
      return;
    }

    // Focus on a native player may be on any of its own controls: wrapping
    // from it would skip them, so leaving it is the browser's modal trap's
    // call. The player is still a destination of the wraps below.
    if (active && isNativePlayer(active)) {
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      focusThroughShadow(last);
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      focusThroughShadow(first);
    }
  };

  private readonly handleHostMutation = (): void => {
    const hasOpenAttribute = this.host.hasAttribute('open');
    if (this.open !== hasOpenAttribute) {
      this.open = hasOpenAttribute;
      return;
    }

    // Restore presence semantics for a present-but-falsy `close-on-backdrop`
    // set after hydration. Only that case is corrected: absence and Stencil's
    // own reflect writes already agree with the prop.
    if (this.host.hasAttribute('close-on-backdrop') && !this.closeOnBackdrop) {
      this.closeOnBackdrop = true;
      return;
    }

    this.syncDialogToHost();
  };

  private updateFooterState(): void {
    this.footerHasContent = Boolean(this.host.querySelector('[slot="footer"]'));
  }

  /**
   * Overflow observation only (the ki-scroller mechanism): while the dialog
   * is open, the body box and the slotted elements report every size change,
   * so the stop is already there for whoever reaches the dialog without
   * pressing Tab. Armed on every open (disconnectedCallback releases it, and
   * a dialog can be moved in the document) and on slot changes. Scrolling
   * stays native.
   */
  private observeBody(): void {
    const body = this.body;
    if (!body) {
      return;
    }
    this.bodyObserver ??= new ResizeObserver(this.syncBodyTabStop);
    this.bodyObserver.disconnect();
    this.bodyObserver.observe(body);
    for (const element of body.querySelector('slot')?.assignedElements({ flatten: true }) ?? []) {
      this.bodyObserver.observe(element);
    }
    this.syncBodyTabStop();
  }

  private syncDialogToHost(): void {
    if (!this.dialog || !this.host.isConnected) {
      return;
    }

    if (this.open && !this.dialog.matches(':modal')) {
      // Removal takes a modal dialog out of the top layer and leaves its
      // native `open` attribute behind: back in the document it would sit in
      // the page flow, open and not modal, with the page behind it live.
      // `showModal()` throws on such a dialog, and `close()` would report a
      // close that never happened, so the stale attribute is dropped first.
      this.dialog.removeAttribute('open');
      this.dialog.showModal();
      this.observeBody();
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
    // focus settles asynchronously, so the corrective focus is deferred to
    // win over it (FR-005 / S6: entry focus reaches the action).
    //
    // Deferred over a BOUNDED run of frames, not one: focus() is a silent
    // no-op while the action is not rendered, and a dialog opened within a
    // few frames of mounting hits exactly that window — the footer region
    // unhides one @State re-render after the slot assignment is observed, so
    // the target exists in the tree while its box is still display:none. One
    // retry frame lost that race deterministically; the run keeps correcting
    // until the target actually holds focus or the budget ends.
    const deepActive = (): Element | null => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) {
        active = active.shadowRoot.activeElement;
      }
      return active;
    };
    const apply = (): boolean => {
      const dialog = this.dialog;
      if (!dialog?.open) {
        return true;
      }
      const target = resolveEntryFocusTarget(this.host);
      if (!target) {
        if (deepActive() !== dialog) {
          dialog.focus();
        }
        return false;
      }
      if (deepActive() === target) {
        return true;
      }
      target.focus();
      return deepActive() === target;
    };

    if (apply()) {
      return;
    }
    let remainingFrames = 10;
    const retry = (): void => {
      remainingFrames -= 1;
      if (!apply() && remainingFrames > 0) {
        requestAnimationFrame(retry);
      }
    };
    requestAnimationFrame(retry);
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
    // Required by contract (catalog, typed wrappers), yet hand-written HTML can
    // still omit it: the dialog then renders unnamed instead of throwing.
    const heading = (this.heading as string | undefined)?.trim();

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
        <div part="body" ref={this.setBodyRef}>
          <slot onSlotchange={this.handleBodySlotChange} />
        </div>
        <div part="footer" hidden={!this.footerHasContent}>
          <slot name="footer" onSlotchange={this.handleFooterSlotChange} />
        </div>
      </dialog>
    );
  }
}
