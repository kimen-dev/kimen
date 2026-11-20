import '../../../icons/bot.js';
import '../../../icons/chevron-right.js';
import '../../../icons/search.js';

import { Component, Element, Event, type EventEmitter, h, Prop, Watch } from '@stencil/core';
import { getKeyboardIntent, isNavigationIntent } from '../../utils/keyboard-intent';
import { rovingFocusIndex, rovingTabIndex } from '../../utils/roving-focus';
import { replyBranches } from './ki-message.branches';
import { trackReplyOrder } from './ki-message.reply-order';

export type KiMessageRole = 'user' | 'assistant' | 'event';
export type KiMessageFeedback = 'good' | 'bad';

const buttonGroupTag = ['ki', 'button-group'].join('-');
const iconButtonTag = ['ki', 'icon-button'].join('-');
const actionControls = ['button', 'ki-button', iconButtonTag, 'ki-copy-button'].join(',');
const actionAttribute = 'data-message-action';
const branchLabels = {
  previous: 'Previous response',
  next: 'Next response',
  status: 'Response {index} of {count}',
};

const authorLabels: Readonly<Record<KiMessageRole, string>> = {
  user: 'You said',
  assistant: 'Assistant said',
  event: 'System event',
};

/**
 * A user message, assistant reply or event.
 *
 * @whenToUse Display an entry in ki-conversation.
 * @whenNotToUse Prompt input, page alerts or tool execution.
 *
 * @slot - Text or formatted content.
 * @slot avatar - Overrides the decorative assistant avatar.
 * @slot actions - App controls. With actions-label, use direct buttons or a layout-only
 * ki-button-group. Mark regenerate and rating buttons with data-message-action.
 * @part message - Named article.
 * @part avatar - Assistant avatar.
 * @part content - Body and optional event icon.
 * @part actions - Follow-up controls.
 * @part branches - Branch picker and position.
 * @part caret - Decorative streaming marker.
 */
@Component({
  tag: 'ki-message',
  styleUrl: 'ki-message.css',
  shadow: true,
})
export class KiMessage {
  @Element() private readonly host!: HTMLElement;

  /**
   * Trailing user bubble, leading assistant avatar or centered event.
   * @default 'assistant'
   */
  @Prop({ mutable: true, reflect: true }) messageRole?: KiMessageRole;

  /** Show a caret and mark the article busy. */
  @Prop({ reflect: true }) streaming = false;

  /** Accessible article name. Defaults by role. */
  @Prop() author?: string;

  /**
   * Decorative event icon. Search is built in. Import other icons before use.
   */
  @Prop() iconName?: string;

  /** Names and enables the assistant toolbar. */
  @Prop() actionsLabel?: string;

  /**
   * Good or bad rating. Restore it when switching branches.
   */
  @Prop({ mutable: true, reflect: true }) feedback?: KiMessageFeedback;

  /** One-based reply index. Update after accepting a branch request. */
  @Prop() branchIndex?: number = 1;

  /** Total replies. Shows a picker for two or more. */
  @Prop() branchCount?: number = 1;

  /** Previous branch button label. */
  @Prop() previousBranchLabel?: string = branchLabels.previous;

  /** Next branch button label. */
  @Prop() nextBranchLabel?: string = branchLabels.next;

  /** Branch announcement template with {index} and {count}. */
  @Prop() branchStatusLabel?: string = branchLabels.status;

  /** Requests a branch by its one-based index. */
  @Event({ eventName: 'ki-branch-change', cancelable: false })
  branchChange!: EventEmitter<{ index: number }>;

  /** Reports the selected rating. */
  @Event({ eventName: 'ki-feedback', cancelable: false })
  feedbackChange!: EventEmitter<{ value: KiMessageFeedback }>;

  /** Requests a new reply on Regenerate. */
  @Event({ eventName: 'ki-regenerate', cancelable: false })
  regenerate!: EventEmitter<void>;

  private actionSlot: HTMLSlotElement | undefined;
  private actionsObserver?: MutationObserver;
  private stopTrackingOrder: (() => void) | undefined;
  private branchControls: HTMLDivElement | undefined;
  private readonly authoredTabIndexes = new Map<HTMLElement, string | null>();
  private stops: HTMLElement[] = [];
  private activeStop: HTMLElement | undefined;

  connectedCallback(): void {
    this.observeActions();
    this.syncActions();
    this.syncReplyOrder();
  }

  componentDidLoad(): void {
    this.syncActions();
  }

  componentDidRender(): void {
    this.observeActions();
    this.syncActions();
    this.syncReplyOrder();
  }

  disconnectedCallback(): void {
    this.actionsObserver?.disconnect();
    this.releaseTabStops([]);
    this.releaseReplyOrder();
  }

  componentWillLoad(): void {
    // The message kind in the proposal used HTML's ARIA role attribute.
    this.consumeRoleAlias(this.host.getAttribute('role'), this.messageRole === undefined);
  }

  @Watch('role')
  protected roleAttributeChanged(value: string | null): void {
    this.consumeRoleAlias(value, true);
  }

  private consumeRoleAlias(value: string | null, apply: boolean): void {
    if (value !== 'user' && value !== 'assistant' && value !== 'event') return;

    this.host.removeAttribute('role');
    if (apply) this.messageRole = value;
  }

  private get role(): KiMessageRole {
    return this.messageRole === 'user' || this.messageRole === 'event'
      ? this.messageRole
      : 'assistant';
  }

  private get toolbarLabel(): string | undefined {
    const label = this.actionsLabel?.trim();
    return this.role === 'assistant' && label ? label : undefined;
  }

  private get branches() {
    if (this.role === 'assistant')
      return replyBranches(this.branchIndex ?? 1, this.branchCount ?? 1);
    return undefined;
  }

  private syncReplyOrder(): void {
    if (this.toolbarLabel ?? this.branches) {
      this.stopTrackingOrder ??= trackReplyOrder(this.host);
    } else {
      this.releaseReplyOrder();
    }
  }

  private releaseReplyOrder(): void {
    this.stopTrackingOrder?.();
    this.stopTrackingOrder = undefined;
  }

  private observeActions(): void {
    if (!this.toolbarLabel) {
      this.actionsObserver?.disconnect();
      return;
    }
    this.actionsObserver ??= new MutationObserver(this.syncActions);
    this.actionsObserver.observe(this.host, {
      childList: true,
      subtree: true,
      attributeFilter: ['data-message-action', 'disabled', 'hidden', 'inert', 'loading', 'slot'],
    });
  }

  private getActionControls(): HTMLElement[] {
    const controls = this.actionSlot
      ?.assignedElements()
      .flatMap((element) =>
        element.localName === buttonGroupTag ? [...element.children] : [element],
      );
    return (controls ?? []).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element.matches(actionControls),
    );
  }

  private releaseTabStops(stops: HTMLElement[]): void {
    for (const [element, previous] of this.authoredTabIndexes) {
      if (stops.includes(element)) continue;
      if (previous === null) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', previous);
      this.authoredTabIndexes.delete(element);
    }
  }

  private readonly syncActions = (): void => {
    const controls = this.toolbarLabel ? this.getActionControls() : [];
    const branchButtons = this.toolbarLabel
      ? [...(this.branchControls?.querySelectorAll('button') ?? [])]
      : [];
    this.stops = [...controls, ...branchButtons];
    this.releaseTabStops(this.stops);
    for (const control of controls) {
      const action = control.getAttribute(actionAttribute);
      if (action !== 'good' && action !== 'bad') continue;
      const pressed = String(this.feedback === action);
      if (control.localName === iconButtonTag) {
        control.setAttribute('pressed', pressed);
        // The stacked Conversation build precedes IconButton's controlled pressed prop.
        if (!('pressed' in control)) {
          control.shadowRoot
            ?.querySelector('[part~="button"]')
            ?.setAttribute('aria-pressed', pressed);
        }
      } else {
        control.setAttribute('aria-pressed', pressed);
      }
    }
    this.syncTabStops();
  };

  private canFocus(control: HTMLElement): boolean {
    return !control.closest('[hidden], [inert]') && !control.matches('[disabled], :disabled');
  }

  private syncTabStops(preferred = this.activeStop): void {
    this.activeStop =
      preferred && this.stops.includes(preferred) && this.canFocus(preferred)
        ? preferred
        : this.stops.find((control) => this.canFocus(control));
    const activeIndex = this.activeStop ? this.stops.indexOf(this.activeStop) : -1;
    this.stops.forEach((control, index) => {
      if (!this.authoredTabIndexes.has(control)) {
        this.authoredTabIndexes.set(control, control.getAttribute('tabindex'));
      }
      const tabIndex = String(rovingTabIndex(index, activeIndex));
      if (control.getAttribute('tabindex') !== tabIndex) control.setAttribute('tabindex', tabIndex);
    });
  }

  private eventStop(event: globalThis.Event): HTMLElement | undefined {
    const path = event.composedPath();
    return this.stops.find((control) => path.includes(control));
  }

  private readonly onActionFocus = (event: FocusEvent): void => {
    const focused = this.eventStop(event);
    if (focused) this.syncTabStops(focused);
  };

  private readonly onActionKeyDown = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    const current = this.eventStop(event);
    if (!current) return;
    const dir = getComputedStyle(this.host).direction === 'rtl' ? 'rtl' : 'ltr';
    const intent = getKeyboardIntent(event.key, 'horizontal', dir);
    if (!isNavigationIntent(intent)) return;
    const index = rovingFocusIndex(this.stops, this.stops.indexOf(current), intent, {
      isFocusable: (control) => this.canFocus(control),
      wrap: true,
    });
    const target = index === null ? undefined : this.stops[index];
    if (!target) return;
    event.preventDefault();
    this.syncTabStops(target);
    target.focus();
  };

  private readonly onActionClick = (event: MouseEvent): void => {
    const control = this.eventStop(event);
    if (
      !control ||
      event.defaultPrevented ||
      !this.canFocus(control) ||
      control.matches('[loading], [aria-disabled="true"]')
    ) {
      return;
    }
    const action = control.getAttribute(actionAttribute);
    if (action === 'regenerate') this.regenerate.emit();
    if (action === 'good' || action === 'bad') {
      this.feedback = action;
      this.feedbackChange.emit({ value: action });
    }
  };

  private branchButton(direction: 'previous' | 'next', target: number, unavailable: boolean) {
    const previous = direction === 'previous';
    return (
      <button
        key={direction}
        type="button"
        class="branch-button"
        aria-disabled={unavailable ? 'true' : undefined}
        aria-label={
          (previous ? this.previousBranchLabel : this.nextBranchLabel) ?? branchLabels[direction]
        }
        tabIndex={0}
        onClick={() => {
          if (!unavailable) this.branchChange.emit({ index: target });
        }}
      >
        <ki-icon key="branch-icon" name="chevron-right" />
      </button>
    );
  }

  render() {
    const role = this.role;
    const toolbarLabel = this.toolbarLabel;
    const branches = this.branches;
    const branchStatus = branches
      ? (this.branchStatusLabel ?? branchLabels.status)
          .replaceAll('{index}', String(branches.index))
          .replaceAll('{count}', String(branches.count))
      : '';
    const author = this.author?.trim() ?? '';
    const hasReplyActions = Boolean(toolbarLabel ?? branches);

    return (
      <article
        key="message"
        part="message"
        class={role}
        aria-label={author.length > 0 ? author : authorLabels[role]}
        aria-busy={this.streaming ? 'true' : undefined}
        aria-atomic="true"
      >
        {role === 'assistant' && (
          <div key="avatar" part="avatar">
            <slot key="avatar-slot" name="avatar">
              <span key="default-avatar" class="default-avatar" aria-hidden="true">
                <ki-icon key="default-avatar-icon" name="bot" />
              </span>
            </slot>
          </div>
        )}
        <div key="body" class="body">
          <div key="content" part="content">
            {role === 'event' && this.iconName && <ki-icon key="event-icon" name={this.iconName} />}
            <div key="text" class="text">
              <slot key="content-slot" />
              {this.streaming && <span key="caret" part="caret" aria-hidden="true" />}
            </div>
          </div>
          <div
            key="actions"
            part="actions"
            class={{ 'reply-actions': hasReplyActions }}
            {...(toolbarLabel
              ? {
                  role: 'toolbar',
                  'aria-label': toolbarLabel,
                  onClick: this.onActionClick,
                  onFocusin: this.onActionFocus,
                  onKeyDown: this.onActionKeyDown,
                }
              : {})}
          >
            <slot
              key="actions-slot"
              name="actions"
              onSlotchange={this.syncActions}
              ref={(slot) => {
                this.actionSlot = slot;
              }}
            />
            {branches && (
              <div
                key="branches"
                part="branches"
                ref={(element) => {
                  this.branchControls = element;
                }}
              >
                {this.branchButton('previous', branches.index - 1, branches.index === 1)}
                <span key="branch-position" aria-hidden="true">
                  {branches.index} / {branches.count}
                </span>
                {this.branchButton('next', branches.index + 1, branches.index === branches.count)}
              </div>
            )}
            {hasReplyActions && (
              <span key="branch-status" class="branch-status" role="status" aria-atomic="true">
                {branchStatus}
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }
}
