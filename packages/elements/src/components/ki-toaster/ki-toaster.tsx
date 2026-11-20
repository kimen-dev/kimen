import { Component, Element, h, Method, Prop, Watch } from '@stencil/core';
import { focusThroughShadow } from '../../utils/shadow-focus.js';
import { firstControlOf, interactionWithin, rememberFocusOrigin } from './ki-toaster.focus.js';
import { type KiToasterPlacement, normalizeMax, queuedFlags } from './ki-toaster.queue.js';
import type { KiToastShowOptions } from './ki-toaster.show.js';

type ToastChild = HTMLElement & { dismissed?: boolean; queued?: boolean };

// The toaster places toasts and builds them in show(), but does not bundle
// them: Stencil turns any literal component tag in a module into a static
// dependency, and ki-toast with its ki-icon-button, plus the ki-button an
// action uses, would push this element past its size budget. The page defines
// ki-toast (and ki-button for actions), as it must for toasts in markup.
const TOAST_TAG = ['ki', 'toast'].join('-');
const BUTTON_TAG = ['ki', 'button'].join('-');

/**
 * The one place toasts appear: it paints its `ki-toast` children in the top
 * layer at a corner of the viewport, stacks them in arrival order, shows the
 * newest few and queues the older ones, without covering the page beside
 * them.
 *
 * @whenToUse once per page (or once inside a modal `ki-dialog`), as the place
 * every `ki-toast` of the application appears in: append toasts to it, or call
 * `show()`. Choose the corner with `placement`.
 * @whenNotToUse do not put anything but `ki-toast` elements in it; do not use
 * it for persistent content, which belongs in the page or in `ki-alert`.
 *
 * Assistive technology note: while it shows toasts the toaster is a group
 * named by `label`, never a landmark; F6 moves focus into it and Escape on a
 * toast returns focus to where it was. An empty toaster exposes nothing and
 * covers nothing.
 *
 * @slot - The `ki-toast` elements, in arrival order. Other children are not
 * counted, queued or placed.
 * @part stack - The stack in the top layer: placement, edge distance, gap
 * between toasts and width.
 */
@Component({
  tag: 'ki-toaster',
  styleUrl: 'ki-toaster.css',
  shadow: true,
})
export class KiToaster {
  @Element() private readonly host!: HTMLElement;

  /**
   * Corner or edge of the viewport the stack sits against; `end` follows the
   * writing direction. On a coarse pointer and a viewport narrower than 40rem
   * the stack always sits at the bottom center. Unknown values place the stack
   * at the bottom end.
   *
   * When to use: keep toasts away from where the page's own controls live.
   * When NOT to use: do not change it per toast; one toaster keeps one place.
   *
   * @default 'bottom-end'
   */
  @Prop({ reflect: true }) placement: KiToasterPlacement | (string & {}) = 'bottom-end';

  /**
   * How many toasts show at once: the newest ones. Older toasts wait, and come
   * back with their full time as shown ones leave. A toast holding focus keeps
   * its place until focus leaves the toaster; the oldest other one waits
   * instead. A value below 1 or not a whole number shows 3.
   *
   * When to use: lower it on small screens or busy applications.
   * When NOT to use: do not raise it to show every toast; a tall stack covers
   * the page.
   *
   * @default 3
   * @minimum 1
   */
  @Prop({ reflect: true }) max = 3;

  /**
   * Accessible name of the group the toaster exposes while it shows toasts.
   * Override for localization.
   *
   * When to use: provide the name in the document language.
   * When NOT to use: do not put a message here.
   *
   * @default 'Notifications'
   */
  @Prop({ reflect: true }) label = 'Notifications';

  private stackEl: HTMLElement | undefined;

  private observer: MutationObserver | undefined;

  private showing = false;

  @Watch('max')
  protected maxChanged(): void {
    this.arrange();
  }

  /**
   * Raises a toast: creates a `ki-toast` from `tone`, `title` (its heading),
   * `message`, `duration`, `dismissible` and `action` (a ghost
   * `ki-button size="sm"` in its `action` slot that calls `onClick`), appends
   * it to the toaster and resolves with it. Once the toast has left it is
   * removed from the page. The toaster does not bundle `ki-toast` or
   * `ki-button`: define them, as for toasts written in markup.
   * When to use: raise a toast from script without writing its markup.
   * When NOT to use: a toast written in markup stays the page's own: append
   * it instead, and it is never removed.
   */
  @Method()
  show(options: KiToastShowOptions): Promise<HTMLElement> {
    const toast = document.createElement(TOAST_TAG);
    if (options.tone !== undefined) {
      toast.setAttribute('tone', options.tone);
    }
    if (options.title !== undefined) {
      toast.setAttribute('heading', options.title);
    }
    if (options.duration !== undefined) {
      toast.setAttribute('duration', String(options.duration));
    }
    if (options.dismissible === false) {
      toast.setAttribute('dismissible', 'false');
    }
    toast.append(document.createTextNode(options.message));
    if (options.action !== undefined) {
      const action = document.createElement(BUTTON_TAG);
      action.setAttribute('slot', 'action');
      // Never the default submit: a toaster inside a form must not submit it.
      action.setAttribute('type', 'button');
      action.setAttribute('size', 'sm');
      action.setAttribute('variant', 'ghost');
      action.textContent = options.action.label;
      const onClick = options.action.onClick;
      if (onClick !== undefined) {
        action.addEventListener('click', onClick);
      }
      toast.append(action);
    }
    toast.addEventListener('ki-dismiss', () => {
      toast.remove();
    });
    this.host.append(toast);
    return Promise.resolve(toast);
  }

  connectedCallback(): void {
    // Toasts already inside learn their place before they first render, so a
    // queued toast never starts its time.
    this.arrange();
    this.observer?.disconnect();
    this.observer = new MutationObserver(() => {
      this.arrange();
    });
    this.observer.observe(this.host, {
      attributeFilter: ['dismissed'],
      attributes: true,
      childList: true,
      subtree: true,
    });
    this.host.addEventListener('focusin', this.handleFocusIn);
    this.host.addEventListener('focusout', this.handleFocusOut);
    document.addEventListener('keydown', this.handleDocumentKeyDown);
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.host.removeEventListener('focusin', this.handleFocusIn);
    this.host.removeEventListener('focusout', this.handleFocusOut);
    document.removeEventListener('keydown', this.handleDocumentKeyDown);
  }

  componentDidLoad(): void {
    this.arrange();
  }

  private toasts(): ToastChild[] {
    return [...this.host.children].filter(
      (element): element is ToastChild => element.localName === TOAST_TAG,
    );
  }

  private static hasLeft(toast: ToastChild): boolean {
    return toast.dismissed === true || toast.hasAttribute('dismissed');
  }

  /** Write each toast's place in the queue and open the stack when it shows one. */
  private arrange(): void {
    const toasts = this.toasts();
    const left = toasts.map((toast) => KiToaster.hasLeft(toast));
    const focused = toasts.findIndex((toast) => toast.matches(':focus-within'));
    const queued = queuedFlags(left, normalizeMax(this.max), focused);
    toasts.forEach((toast, index) => {
      const next = queued[index] === true;
      if (toast.queued !== next) {
        toast.queued = next;
      }
    });
    this.showing = left.some((hasLeft, index) => !hasLeft && queued[index] !== true);
    this.syncPopover();
  }

  // The stack is a manual popover: shown, it is painted in the top layer, so
  // no ancestor's overflow clip or stacking context reaches it. Hidden, it
  // generates no box: nothing in the way of the page and no group exposed.
  private syncPopover(): void {
    const stack = this.stackEl;
    if (!stack?.isConnected || typeof stack.showPopover !== 'function') {
      return;
    }
    const open = stack.matches(':popover-open');
    if (this.showing && !open) {
      stack.showPopover();
    } else if (!this.showing && open) {
      stack.hidePopover();
    }
  }

  private readonly handleFocusIn = (event: FocusEvent): void => {
    rememberFocusOrigin(this.host, event.relatedTarget);
  };

  // A toast kept its place while it held focus (I-12): once focus leaves the
  // toaster the newest toasts show again. Arranged after the focus change
  // settles, when no toast matches :focus-within any more.
  private readonly handleFocusOut = (event: FocusEvent): void => {
    const to = event.relatedTarget;
    if (to instanceof Node && this.host.contains(to)) {
      return;
    }
    queueMicrotask(() => {
      this.arrange();
    });
  };

  // F6 moves focus to the first control of the newest shown toast (I-3),
  // remembering where it was, so Escape can return it there.
  private readonly handleDocumentKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key !== 'F6' ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !this.showing ||
      interactionWithin(this.host, ':focus-within')
    ) {
      return;
    }
    const newest = this.toasts()
      .filter((toast) => !KiToaster.hasLeft(toast) && toast.queued !== true)
      .at(-1);
    const target = newest ? firstControlOf(newest) : null;
    if (target === null) {
      return;
    }
    event.preventDefault();
    rememberFocusOrigin(this.host, document.activeElement);
    focusThroughShadow(target);
  };

  private readonly handleSlotChange = (): void => {
    this.arrange();
  };

  render() {
    return (
      <div
        ref={(element) => {
          this.stackEl = element;
          this.syncPopover();
        }}
        part="stack"
        popover="manual"
        role="group"
        aria-label={this.label}
      >
        <slot onSlotchange={this.handleSlotChange} />
      </div>
    );
  }
}
