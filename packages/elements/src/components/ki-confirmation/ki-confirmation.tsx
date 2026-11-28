import {
  Component,
  Element,
  type EventEmitter,
  Event,
  h,
  Method,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import {
  hasText,
  isDecisionAvailable,
  warnIfDecisionLabelsMissing,
} from './ki-confirmation.request';

export type KiConfirmationState = 'pending' | 'approved' | 'denied' | 'expired';
export type KiConfirmationTone = 'neutral' | 'danger';

function stopClick(event: Event): void {
  event.stopPropagation();
}

/**
 * An inline prompt for a decision about a proposed assistant action.
 *
 * @whenToUse Show the exact action and the details a person needs before
 * granting permission. A trusted host maps the two decision events to its
 * declared actions and records the outcome in state.
 * @whenNotToUse Report a completed action without a preceding request, or
 * block the rest of the interface with a modal decision (use ki-dialog).
 * The displayed action identifier is text and carries no execution authority.
 *
 * @slot - Details the person needs to make the decision. Use readable text or
 * semantic markup such as a description list.
 * @part group - The painted, labelled prompt or outcome surface.
 * @part heading - The pending question.
 * @part remember - The label of the conversation preference checkbox.
 * @part decisions - The row of decision controls.
 * @part summary - The resolved row.
 */
@Component({ tag: 'ki-confirmation', styleUrl: 'ki-confirmation.css', shadow: true })
export class KiConfirmation {
  @Element() private readonly host!: HTMLElement;

  /** Question naming the proposed action. Provide it before asking for a decision. */
  @Prop() heading!: string;

  /**
   * Tool identifier shown to the person and available for reporting by the host.
   * @format text
   */
  @Prop() action!: string;

  /** Approval text, such as "Send email". Required for pending HTML and all generated specs. */
  @Prop() approveLabel!: string;

  /** Refusal text, such as "Keep draft". Required for pending HTML and all generated specs. */
  @Prop() denyLabel!: string;

  /** Use danger when approval is destructive. Unknown values use neutral. */
  @Prop() tone: KiConfirmationTone = 'neutral';

  /** Cost or irreversible effect to read before deciding, displayed as a warning note. */
  @Prop() consequence?: string;

  /** Offers an unchecked preference limited to this action in the current conversation. */
  @Prop() remember = false;

  /** Localized conversation permission label. Name the specific permission when possible. */
  @Prop() rememberLabel = 'Allow this action for the rest of this conversation';

  /** Host-controlled outcome. Resolve after recording a decision or expiring the request. */
  @Prop() state: KiConfirmationState = 'pending';

  /** Localized outcome text when the host marks the request approved. */
  @Prop() approvedLabel = 'Approved';

  /** Localized outcome text when the host marks the request denied. */
  @Prop() deniedLabel = 'Denied';

  /** Localized outcome text when the host marks the request expired. */
  @Prop() expiredLabel = 'Expired';

  /** Display-ready name of the person or service that resolved the request, if known. */
  @Prop() resolvedBy?: string;

  /** Display-ready, localized resolution time from the host, if known. */
  @Prop() resolvedAt?: string;

  /** Explicit approval, with the conversation preference at the time of the decision. */
  @Event({ eventName: 'ki-approve', bubbles: true, composed: true, cancelable: false })
  kiApprove!: EventEmitter<{ remember: boolean }>;

  /** Explicit refusal of the pending request. */
  @Event({ eventName: 'ki-deny', bubbles: true, composed: true, cancelable: false })
  kiDeny!: EventEmitter<void>;

  @State() private decided = false;

  #revision = 0;
  #surface: HTMLElement | undefined;
  #status: HTMLElement | undefined;

  get #outcome(): string | undefined {
    switch (this.state) {
      case 'approved':
        return this.approvedLabel;
      case 'denied':
        return this.deniedLabel;
      case 'expired':
        return this.expiredLabel;
      default:
        return undefined;
    }
  }

  @Watch('action')
  @Watch('state')
  protected resetDecision(): void {
    this.#revision += 1;
    this.decided = false;
    if (this.#status) this.#status.textContent = '';
  }

  /**
   * Moves focus to the pending group and reports success. Call only when the
   * host knows the person was waiting for this request. A focused editor keeps
   * its focus, including editors inside open shadow roots.
   */
  @Method()
  focusPrompt(): Promise<boolean> {
    const surface = this.#surface;
    let active = this.host.ownerDocument.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const editing =
      active instanceof HTMLElement &&
      (active.matches('input, textarea, [role="textbox"]') || active.isContentEditable);

    let focused = false;
    if (surface && !editing && !this.decided && isDecisionAvailable(this)) {
      surface.focus();
      focused = surface.matches(':focus');
    }
    return Promise.resolve(focused);
  }

  componentDidRender(): void {
    const status = this.#status;
    if (!status) return;

    // Give assistive technology a frame to register the empty live region.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const text = this.#outcome ?? this.heading;
        if (status.isConnected && status.textContent !== text) status.textContent = text;
      });
    });
  }

  #report(event: MouseEvent, revision: number, approved: boolean): void {
    // Only the named decision event may reach an enclosing action listener.
    event.stopPropagation();
    if (revision !== this.#revision || this.decided || !isDecisionAvailable(this)) return;

    this.decided = true;
    if (approved) {
      const remember = this.remember && this.#surface?.querySelector('input')?.checked === true;
      this.kiApprove.emit({ remember });
    } else {
      this.kiDeny.emit();
    }

    // Keep a keyboard user's place when the controls become disabled.
    if (this.host.shadowRoot?.activeElement) this.#surface?.focus({ preventScroll: true });
  }

  #renderDecisions() {
    // Ignore events from an old control while the replacement is rendering.
    const revision = this.#revision;
    return [
      this.remember && (
        <label
          key={revision}
          part="remember"
          ref={(label) => {
            // Contain the label's click as well as the input's activation.
            label?.addEventListener('click', stopClick);
          }}
        >
          <input type="checkbox" tabIndex={0} disabled={this.decided} />
          {this.rememberLabel}
        </label>
      ),
      <div key="decisions" part="decisions">
        {(['secondary', 'primary'] as const).map((variant) => {
          const approved = variant === 'primary';
          return (
            <ki-button
              key={variant}
              variant={variant}
              type="button"
              tone={approved && this.tone === 'danger' ? 'danger' : 'neutral'}
              disabled={this.decided}
              onClick={(event) => {
                this.#report(event, revision, approved);
              }}
            >
              {approved ? this.approveLabel : this.denyLabel}
            </ki-button>
          );
        })}
      </div>,
    ];
  }

  #renderAction() {
    return (
      <code key="action" dir="auto">
        {this.action}
      </code>
    );
  }

  #renderSummary(outcome: string) {
    return (
      <div key="summary" part="summary">
        <span>{outcome}</span>
        {this.#renderAction()}
        {this.resolvedBy && <span>{this.resolvedBy}</span>}
        {this.resolvedAt && <span>{this.resolvedAt}</span>}
      </div>
    );
  }

  #renderPrompt() {
    return [
      <h3 key="heading" part="heading">
        {this.heading}
      </h3>,
      this.action && this.#renderAction(),
      <slot key="details" />,
      this.consequence && (
        <ki-note key="consequence" tone="warning">
          {this.consequence}
        </ki-note>
      ),
      isDecisionAvailable(this) && this.#renderDecisions(),
    ];
  }

  render() {
    warnIfDecisionLabelsMissing(this);
    if (!hasText(this.heading)) return null;
    const outcome = this.#outcome;

    return (
      <section
        part="group"
        role="group"
        tabIndex={-1}
        aria-label={this.heading}
        ref={(element) => {
          this.#surface = element;
        }}
      >
        {outcome === undefined ? this.#renderPrompt() : this.#renderSummary(outcome)}
        <div
          key="status"
          role="status"
          ref={(element) => {
            this.#status = element;
          }}
        />
      </section>
    );
  }
}
