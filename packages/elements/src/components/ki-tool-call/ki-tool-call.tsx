import {
  AttrDeserialize,
  Component,
  Element,
  Event,
  type EventEmitter,
  h,
  Prop,
  State,
  Watch,
} from '@stencil/core';

import '../../../icons/chevron-down.js';
import '../../../icons/wrench.js';

import { formatToolCallDuration } from './ki-tool-call.duration';

export type KiToolCallStatus = 'pending' | 'running' | 'done' | 'failed' | 'approval';

const tones = {
  pending: 'neutral',
  running: 'info',
  done: 'success',
  failed: 'danger',
  approval: 'warning',
} as const satisfies Record<KiToolCallStatus, string>;

function visibleStatus(status: KiToolCallStatus): KiToolCallStatus {
  return Object.hasOwn(tones, status) ? status : 'pending';
}

/**
 * A disclosure for one assistant tool call, with a status and optional payloads.
 *
 * @whenToUse show which tool ran, its state and duration, and let the reader
 * inspect the supplied input, output or error. Use a conversation log for status updates.
 * @whenNotToUse collecting approval, running or configuring tools. Pair with a
 * separate confirmation control for an approval decision.
 * @slot input - Arguments supplied to the tool. Use ki-code-block for structured text.
 * @slot output - Result returned by the tool. Use ki-code-block for structured text.
 * @slot error - A failure message or a consumer-owned retry control, visible on failed calls.
 * @part disclosure - Native details surface.
 * @part summary - Native disclosure control and its status row.
 * @part name - Monospaced tool identifier.
 * @part status - Badge that contains the status text and completed duration.
 * @part body - Content disclosed by opening the call.
 * @part input - Input section with its caption and payload.
 * @part output - Output section with its caption and payload.
 * @part payload - Surface for the input and output content.
 * @part error - Error section for failed calls.
 * @part retry - Opt-in action button for failed calls.
 */
@Component({ tag: 'ki-tool-call', styleUrl: 'ki-tool-call.css', shadow: true })
export class KiToolCall {
  @Element() private readonly host!: HTMLElement;

  /** Tool identifier, such as search_docs, displayed in monospace. */
  @Prop() name!: string;

  /** Optional human-readable label displayed beside the identifier. */
  @Prop({ attribute: 'title', reflect: true }) toolTitle?: string;

  /** Lifecycle status. Unknown values display Pending. */
  @Prop() status: KiToolCallStatus = 'pending';

  /**
   * Non-negative elapsed time in milliseconds. Displayed only for Done.
   * @minimum 0
   */
  @Prop() duration?: number;

  /**
   * Override the disclosure state. Without an override, failed calls are open
   * and other calls are closed. Set open="false" for an explicit collapse.
   * Using the summary sets the property to the reader's choice.
   */
  @Prop({ mutable: true }) open: boolean | undefined;

  /** Language tag used to format the completed duration. Defaults to English. */
  @Prop() locale = 'en';

  /** Offer the built-in Retry button when the call fails. */
  @Prop() retryable = false;

  /** Status text for a call waiting to run. */
  @Prop() pendingLabel = 'Pending';

  /** Status text for a call in progress. */
  @Prop() runningLabel = 'Running';

  /** Status text for a successful call. */
  @Prop() doneLabel = 'Done';

  /** Status text for a failed call. */
  @Prop() failedLabel = 'Failed';

  /** Status text for a call waiting on an approval decision. */
  @Prop() approvalLabel = 'Needs approval';

  /** Caption for the input slot. */
  @Prop() inputLabel = 'Input';

  /** Caption for the output slot. */
  @Prop() outputLabel = 'Output';

  /** Caption for the error slot. */
  @Prop() errorLabel = 'Error';

  /** Visible and accessible label for the built-in retry control. */
  @Prop() retryLabel = 'Retry';

  /** Once per status transition after initialization. Append one entry to the conversation log. */
  @Event({ eventName: 'ki-tool-status-change', bubbles: true, composed: true, cancelable: false })
  kiToolStatusChange!: EventEmitter<{ name: string; status: KiToolCallStatus; label: string }>;

  /** A request to retry this tool call. Bind a declared surface action to handle it. */
  @Event({ eventName: 'ki-tool-retry', bubbles: true, composed: true, cancelable: false })
  kiToolRetry!: EventEmitter<{ name: string }>;

  @State() private populatedSlots = new Set<string>();
  private renderedOpen = false;

  componentWillLoad(): void {
    // The external custom-elements runtime reads removal of a Boolean attribute
    // as false. Restore the automatic state when an explicit attribute is removed.
    new MutationObserver(() => {
      if (this.open === false && !this.host.hasAttribute('open')) this.open = undefined;
    }).observe(this.host, { attributeFilter: ['open'] });
  }

  @AttrDeserialize('open')
  protected deserializeOpen(value: string | null): boolean | undefined {
    return value === null ? undefined : value !== 'false';
  }

  @Watch('status')
  protected statusChanged(value: KiToolCallStatus, previous: KiToolCallStatus): void {
    const status = visibleStatus(value);
    if (status !== visibleStatus(previous)) {
      this.kiToolStatusChange.emit({ name: this.name, status, label: this.labelFor(status) });
    }
  }

  private get expanded(): boolean {
    return this.open ?? this.status === 'failed';
  }

  private labelFor(status: KiToolCallStatus): string {
    const labels = {
      pending: this.pendingLabel,
      running: this.runningLabel,
      done: this.doneLabel,
      failed: this.failedLabel,
      approval: this.approvalLabel,
    };
    return labels[status];
  }

  private readonly captureToggle = (event: Event): void => {
    const details = event.currentTarget as HTMLDetailsElement;
    if (details.open !== this.renderedOpen) this.open = details.open;
  };

  private readonly syncSlot = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    const occupied = slot.assignedElements().length > 0;
    if (occupied === this.populatedSlots.has(slot.name)) return;

    const slots = new Set(this.populatedSlots);
    if (occupied) slots.add(slot.name);
    else slots.delete(slot.name);
    this.populatedSlots = slots;
  };

  private readonly requestRetry = (): void => {
    if (this.status === 'failed' && this.retryable) this.kiToolRetry.emit({ name: this.name });
  };

  private renderPayload(name: 'input' | 'output', label: string) {
    return (
      <div key={name} part={name} hidden={!this.populatedSlots.has(name)}>
        <div class="caption">{label}</div>
        <div part="payload">
          <slot name={name} onSlotchange={this.syncSlot} />
        </div>
      </div>
    );
  }

  render() {
    const status = visibleStatus(this.status);
    const label = this.labelFor(status);
    const elapsed =
      status === 'done' ? formatToolCallDuration(this.duration, this.locale) : undefined;
    const showError = status === 'failed' && this.populatedSlots.has('error');
    const showRetry = status === 'failed' && this.retryable;
    const hasPayload = this.populatedSlots.has('input') || this.populatedSlots.has('output');
    this.renderedOpen = this.expanded;
    return (
      <details
        key="disclosure"
        part="disclosure"
        open={this.renderedOpen}
        onToggle={this.captureToggle}
      >
        <summary key="summary" part="summary" tabindex="0">
          <ki-icon key="wrench" class="glyph" name="wrench" />
          <span key="identity" class="identity">
            {this.toolTitle && <bdi>{this.toolTitle}</bdi>}
            <code part="name">
              <bdi>{this.name}</bdi>
            </code>
          </span>
          <span key="state" class="state">
            {status === 'running' && <ki-spinner size="sm" label={label} aria-hidden="true" />}
            <ki-badge part="status" size="sm" tone={tones[status]}>
              {elapsed ? [label, elapsed].join(' · ') : label}
            </ki-badge>
          </span>
          <ki-icon key="chevron" class="glyph chevron" name="chevron-down" />
        </summary>
        <div key="body" part="body" hidden={!hasPayload && !showError && !showRetry}>
          {this.renderPayload('input', this.inputLabel)}
          {this.renderPayload('output', this.outputLabel)}
          <div key="error" part="error" hidden={!showError}>
            <div class="caption">{this.errorLabel}</div>
            <slot name="error" onSlotchange={this.syncSlot} />
          </div>
          {showRetry && (
            <button key="retry" part="retry" type="button" tabindex="0" onClick={this.requestRetry}>
              {this.retryLabel}
            </button>
          )}
        </div>
      </details>
    );
  }
}
