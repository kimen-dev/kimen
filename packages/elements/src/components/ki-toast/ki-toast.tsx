import { Component, Element, Event, type EventEmitter, h, Prop, State, Watch } from '@stencil/core';
import { focusThroughShadow } from '../../utils/shadow-focus.js';
import { resolveDismissFocusTarget } from '../ki-alert/ki-alert.focus.js';
import { firstControlOf, focusOriginOf } from '../ki-toaster/ki-toaster.focus.js';
import {
  effectiveDuration,
  type KiToastDismissDetail,
  type KiToastTone,
  liveRoleForTone,
} from './ki-toast.timing.js';

type PauseReason = 'focus' | 'hidden' | 'pointer';
type LeaveReason = KiToastDismissDetail['reason'];

const TOASTER_TAG = 'ki-toaster';

// One glyph per tone (I-6), drawn in the tone's icon ink. Decorative: the
// message carries the meaning, so the icon is hidden from assistive
// technology. Paths on a 20 x 20 grid, even-odd filled.
const TONE_GLYPHS: Record<KiToastTone, string> = {
  neutral: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
  info: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.75 3.5h1.5V7h-1.5V5.5Zm0 3h1.5v6h-1.5v-6Z',
  success:
    'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-1.2 11.4-3.2-3.2 1.06-1.06 2.14 2.14 4.54-4.54 1.06 1.06-5.6 5.6Z',
  warning: 'M10 2.5 1.5 17.5h17L10 2.5Zm-.75 5h1.5v5h-1.5v-5Zm0 6.5h1.5v1.5h-1.5V14Z',
  danger: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.75 4h1.5v5.5h-1.5V6Zm0 7h1.5v1.5h-1.5V13Z',
};

const isTone = (value: string | undefined): value is KiToastTone =>
  value !== undefined && Object.hasOwn(TONE_GLYPHS, value);

/**
 * A short, transient message about something the person just did, shown
 * without blocking the page. It leaves on its own after its time, which stops
 * while the person points at the toaster, works inside it or is away from the
 * page; a toast with an action, or reporting an error, waits for the person.
 *
 * @whenToUse confirm an action that happened elsewhere on screen ("Changes
 * saved", "Link copied"), report a background result ("Export ready"), or
 * offer a quick undo. Raise it into a `ki-toaster`, in markup or with its
 * `show()` method; express urgency with `tone`.
 * @whenNotToUse anything the person must read or act on to continue belongs
 * to `ki-dialog`; form validation belongs to the field's error text; a lasting
 * condition of the page belongs to `ki-alert`, which stays inline.
 *
 * Assistive technology note: a toast announces as it appears, so append it
 * when the event happens; a toast present at initial page load is exposed with
 * its role but its announcement is not guaranteed. The heading and the message
 * are the whole announcement: the icon, the action and the dismiss button
 * stay outside the live region.
 *
 * @slot - Message text. It lives inside the live-region boundary.
 * @slot action - At most one action, as a `ki-button size="sm" variant="ghost"`.
 * Its own click handler runs, then the toast leaves (`reason: "action"`). A
 * toast holding an action never leaves on its own. When NOT to use: a response
 * the person cannot skip belongs in `ki-dialog`.
 * @part toast - The flat surface: fill, image, edge, radius, padding,
 * elevation and backdrop filter.
 * @part icon - The tone icon, drawn by the component in the tone's ink.
 * @part heading - Optional bold first line, rendered only when non-empty.
 * @part message - Message wrapper around the default slot.
 * @part action - Wrapper around the `action` slot, rendered only when it holds content.
 * @part dismiss - The dismiss `ki-icon-button`, rendered only when `dismissible`.
 */
@Component({
  tag: 'ki-toast',
  styleUrl: 'ki-toast.css',
  shadow: true,
})
export class KiToast {
  @Element() private readonly host!: HTMLElement;

  /**
   * Picks the icon and its ink, and the live-region urgency: `danger` exposes
   * `role="alert"` and never leaves on its own; `neutral`, `info`, `success`,
   * `warning`, absent and unrecognized values expose `role="status"`. The
   * surface and the text look the same in every tone. Unknown values render
   * neutral.
   *
   * When to use: choose the tone that describes what happened.
   * When NOT to use: do not use tone for emphasis; a lasting failure belongs
   * in `ki-alert`.
   *
   * @default 'neutral'
   */
  @Prop({ reflect: true }) tone: KiToastTone | (string & {}) = 'neutral';

  /**
   * Optional bold first line, inside the live region. Empty strings render no
   * heading. It is a `strong` element, never a document heading.
   *
   * When to use: a short label for the event ("Changes saved").
   * When NOT to use: do not use it for page structure.
   */
  @Prop({ reflect: true }) heading?: string;

  /**
   * How long the toast stays, in milliseconds, before it leaves on its own;
   * `0` keeps it until it is dismissed. Ignored (treated as `0`) when the toast
   * holds an action or its tone is `danger`. Unset, or not a finite number of
   * zero or more, it is 5000. The time stops while the pointer rests on the
   * toaster, while focus is inside it, or while the page is hidden, and
   * continues with what was left. Changing it restarts the time.
   *
   * When to use: give a longer message more time.
   * When NOT to use: do not shorten it below what a person needs to read the
   * message.
   *
   * @minimum 0
   */
  @Prop() duration?: number;

  /**
   * Shows the dismiss button, a ghost `ki-icon-button` named by
   * `dismiss-label`. Escape still dismisses a focused toast without it.
   *
   * When to use: keep it on unless the toast leaves on its own and the page
   * offers no other way to read it again.
   * When NOT to use: do not turn it off on a toast that waits for the person.
   *
   * @default true
   */
  @Prop({ reflect: true }) dismissible = true;

  /**
   * Accessible name of the dismiss button. Override for localization; the
   * default English word is the component's only built-in text.
   *
   * When to use: whenever the document language is not English.
   * When NOT to use: do not put the message here; use the default slot.
   *
   * @default 'Dismiss'
   */
  @Prop({ attribute: 'dismiss-label', reflect: true }) dismissLabel = 'Dismiss';

  /**
   * Reflected state: true once the toast has left. The timer, the dismiss
   * button, Escape and the action set it; the page may set or clear it.
   * While true the host stays in the document but renders nothing and leaves
   * the accessibility tree. Clearing it shows the toast again with its full
   * time.
   *
   * When to use: show a toast again, or close it from the page.
   * When NOT to use: do not read programmatic changes as dismissals;
   * `ki-dismiss` reports only the timer and the person.
   *
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) dismissed = false;

  /**
   * Output-only state written by an enclosing `ki-toaster`: true while the
   * toast waits for a place. A queued toast renders nothing, is absent from
   * the accessibility tree and its time does not run. Authors do not set it;
   * the toaster overwrites it.
   *
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) queued = false;

  /**
   * Fired once when the toast leaves because its time ran out
   * (`reason: "timeout"`), the person used the dismiss button (`"button"`),
   * pressed Escape inside it (`"escape"`) or activated its action
   * (`"action"`), after it is hidden and focus has been handed on. Not
   * cancelable. When to use: remove the element, or record that the message
   * was seen. When NOT to use: do not expect it for programmatic `dismissed`
   * changes.
   */
  @Event({ eventName: 'ki-dismiss', bubbles: true, composed: true, cancelable: false })
  private readonly kiDismiss!: EventEmitter<KiToastDismissDetail>;

  @State() private hasAction = false;

  /** Milliseconds left while the time is held. */
  private remainingMs = 0;

  /** When the time runs out, while it runs; null while held or waiting. */
  private deadline: number | null = null;

  /** The effective duration of the current appearance; null = waits. */
  private total: number | null = null;

  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly pauses = new Set<PauseReason>();

  private scope: HTMLElement | null = null;

  private loaded = false;

  @Watch('dismissed')
  protected dismissedChanged(dismissed: boolean): void {
    if (dismissed) {
      // Focus inside goes on before the subtree does (FR-011).
      this.handOffFocus();
      this.stop();
      return;
    }
    this.restart();
  }

  @Watch('queued')
  @Watch('duration')
  @Watch('tone')
  protected timingChanged(): void {
    this.restart();
  }

  connectedCallback(): void {
    // Escape and the action's click reach the host from the shadow tree and
    // from slotted content alike.
    this.host.addEventListener('keydown', this.handleKeyDown);
    this.host.addEventListener('click', this.handleClick);
    this.attachScope();
    document.addEventListener('visibilitychange', this.handleVisibility);
    if (this.loaded) {
      this.restart();
    }
  }

  disconnectedCallback(): void {
    this.host.removeEventListener('keydown', this.handleKeyDown);
    this.host.removeEventListener('click', this.handleClick);
    this.detachScope();
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.stop();
  }

  componentWillLoad(): void {
    // Children parsed before the element upgraded are already assigned; the
    // slotchange listener catches the ones that arrive later.
    this.hasAction = this.host.querySelector(':scope > [slot="action"]') !== null;
  }

  componentDidLoad(): void {
    this.loaded = true;
    this.restart();
  }

  private get shown(): boolean {
    return this.host.isConnected && !this.dismissed && !this.queued;
  }

  /** The whole time again, under the current tone, duration and action. */
  private restart(): void {
    this.stop();
    this.total = effectiveDuration(this.duration, this.tone, this.hasAction);
    this.remainingMs = this.total ?? 0;
    if (!this.loaded || !this.shown || this.total === null) {
      return;
    }
    this.syncPauses();
    this.run();
  }

  private run(): void {
    if (!this.shown || this.total === null || this.pauses.size > 0 || this.deadline !== null) {
      return;
    }
    this.deadline = Date.now() + this.remainingMs;
    this.expiryTimer = setTimeout(() => {
      this.leave('timeout');
    }, this.remainingMs);
  }

  private hold(): void {
    if (this.deadline === null) {
      return;
    }
    this.remainingMs = Math.max(0, this.deadline - Date.now());
    this.stop();
  }

  private stop(): void {
    this.deadline = null;
    clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
  }

  private leave(reason: LeaveReason): void {
    if (this.dismissed) {
      return;
    }
    this.stop();
    this.leaveReason = reason;
    this.dismissed = true;
    this.leaveReason = undefined;
    this.kiDismiss.emit({ reason });
  }

  /** Why the toast is leaving, while the dismissed watcher hands focus on. */
  private leaveReason: LeaveReason | undefined;

  private pause(reason: PauseReason): void {
    this.pauses.add(reason);
    this.hold();
  }

  private resume(reason: PauseReason): void {
    this.pauses.delete(reason);
    this.run();
  }

  /** The state of the world when the time starts: no event says so. */
  private syncPauses(): void {
    this.pauses.clear();
    const scope = this.scope ?? this.host;
    if (scope.matches(':hover')) {
      this.pauses.add('pointer');
    }
    if (scope.matches(':focus-within')) {
      this.pauses.add('focus');
    }
    if (document.visibilityState === 'hidden') {
      this.pauses.add('hidden');
    }
  }

  // Inside a toaster, the pointer or the focus on any toast holds every toast
  // of that toaster: one leaving under a reader would reflow the stack.
  private attachScope(): void {
    this.detachScope();
    const parent = this.host.parentElement;
    this.scope = parent?.localName === TOASTER_TAG ? parent : this.host;
    this.scope.addEventListener('pointerover', this.handlePointerOver);
    this.scope.addEventListener('pointerout', this.handlePointerOut);
    this.scope.addEventListener('focusin', this.handleFocusIn);
    this.scope.addEventListener('focusout', this.handleFocusOut);
  }

  private detachScope(): void {
    this.scope?.removeEventListener('pointerover', this.handlePointerOver);
    this.scope?.removeEventListener('pointerout', this.handlePointerOut);
    this.scope?.removeEventListener('focusin', this.handleFocusIn);
    this.scope?.removeEventListener('focusout', this.handleFocusOut);
    this.scope = null;
  }

  /** Whether an event's related target stays inside the pause scope. */
  private staysInScope(event: FocusEvent | PointerEvent): boolean {
    const to = event.relatedTarget;
    return to instanceof Node && (this.scope?.contains(to) ?? false);
  }

  private readonly handlePointerOver = (): void => {
    this.pause('pointer');
  };

  private readonly handlePointerOut = (event: PointerEvent): void => {
    if (!this.staysInScope(event)) {
      this.resume('pointer');
    }
  };

  private readonly handleFocusIn = (): void => {
    this.pause('focus');
  };

  private readonly handleFocusOut = (event: FocusEvent): void => {
    if (!this.staysInScope(event)) {
      this.resume('focus');
    }
  };

  private readonly handleVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      this.pause('hidden');
    } else {
      this.resume('hidden');
    }
  };

  private get toaster(): HTMLElement | null {
    const parent = this.host.parentElement;
    return parent?.localName === TOASTER_TAG ? parent : null;
  }

  /**
   * Where focus goes when the toast leaves with focus inside it. Escape
   * returns it to where it was before it entered the toaster (FR-008); every
   * other way out hands it to the next shown toast, else the previous one,
   * else where it came from, else the next focusable element after the toast
   * (I-8).
   */
  private handOffFocus(): void {
    if (!this.host.matches(':focus-within')) {
      return;
    }
    const toaster = this.toaster;
    const origin = toaster ? focusOriginOf(toaster) : null;
    const target =
      this.leaveReason === 'escape' && origin
        ? origin
        : ((toaster ? this.neighbourControl(toaster) : null) ??
          origin ??
          resolveDismissFocusTarget(this.host));
    if (target) {
      focusThroughShadow(target);
    }
  }

  private neighbourControl(toaster: HTMLElement): HTMLElement | null {
    const others = [...toaster.children].filter(
      (element): element is HTMLElement =>
        element !== this.host &&
        element.localName === 'ki-toast' &&
        !element.hasAttribute('dismissed') &&
        !element.hasAttribute('queued'),
    );
    const following = others.find(
      (element) => this.host.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const toast = following ?? others.at(-1);
    return toast ? firstControlOf(toast) : null;
  }

  private readonly handleDismiss = (): void => {
    this.leave('button');
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      this.leave('escape');
    }
  };

  // The action's own handlers run first (target phase), then the toast
  // leaves; the host listener sits after them on the bubbling path.
  private readonly handleClick = (event: MouseEvent): void => {
    const action = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.parentElement === this.host && node.slot === 'action',
      );
    if (action !== undefined) {
      this.leave('action');
    }
  };

  private readonly syncSlotState = (): void => {
    const slot = this.host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="action"]');
    const hadAction = this.hasAction;
    this.hasAction = slotHoldsContent(slot);
    if (hadAction !== this.hasAction) {
      this.restart();
    }
  };

  render() {
    if (this.dismissed || this.queued) {
      return null;
    }

    const heading = this.heading?.trim();
    const glyph = TONE_GLYPHS[isTone(this.tone) ? this.tone : 'neutral'];

    // DOM order is reading order (I-5, C27): icon, text, action, dismiss.
    return (
      <div part="toast" class={{ 'has-action': this.hasAction }}>
        <span part="icon" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path fill="currentColor" fill-rule="evenodd" d={glyph} />
          </svg>
        </span>
        <div class="live" role={liveRoleForTone(this.tone)}>
          {heading ? <strong part="heading">{heading}</strong> : null}
          <div part="message">
            <slot />
          </div>
        </div>
        <div part="action">
          <slot name="action" onSlotchange={this.syncSlotState} />
        </div>
        {this.dismissible ? (
          <ki-icon-button
            part="dismiss"
            size="xs"
            variant="ghost"
            label={this.dismissLabel}
            onClick={this.handleDismiss}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path
                fill="currentColor"
                d="M3.3 2.3 8 7l4.7-4.7 1 1L9 8l4.7 4.7-1 1L8 9l-4.7 4.7-1-1L7 8 2.3 3.3z"
              />
            </svg>
          </ki-icon-button>
        ) : null}
      </div>
    );
  }
}

/** A slot holding only whitespace counts as empty. */
function slotHoldsContent(slot: HTMLSlotElement | null | undefined): boolean {
  return (
    slot?.assignedNodes({ flatten: true }).some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return true;
      }
      return (node.textContent ?? '').trim().length > 0;
    }) ?? false
  );
}
