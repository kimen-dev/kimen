import '../../../icons/chevron-down.js';
import '../../../icons/sparkles.js';

import { Component, Event, type EventEmitter, Prop, Watch, h } from '@stencil/core';

import { formatElapsedTime } from './ki-reasoning.duration';

export type KiReasoningStatus = 'thinking' | 'done';

/** The resulting open state of the disclosure. */
export interface KiReasoningToggleDetail {
  open: boolean;
}

/**
 * A disclosure for the assistant's progress or plan, with a localized summary.
 *
 * @whenToUse present assistant-supplied steps, progress or a completed plan alongside the answer.
 * @whenNotToUse hide the answer or controls the user needs to complete a task. Use a general disclosure for unrelated content.
 * @slot - Supporting content shown when expanded, such as an ordered list of steps supplied by the application.
 * @part summary - The native disclosure control that shows the current status.
 * @part body - The slotted content area with the inline-start rule.
 */
@Component({
  tag: 'ki-reasoning',
  styleUrl: 'ki-reasoning.css',
  // Keep the summary and status region together. Host focus goes to the native summary.
  shadow: { delegatesFocus: true },
})
export class KiReasoning {
  /** Use thinking while steps arrive and done once the assistant finishes. */
  @Prop({ reflect: true }) status: KiReasoningStatus = 'thinking';

  /** Optional elapsed milliseconds. Done displays finite, nonnegative values rounded to seconds. */
  @Prop() duration?: number;

  /** Whether the disclosure shows its steps. Native toggles update this reflected property. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Summary text while the assistant is thinking. */
  @Prop() thinkingLabel = 'Thinking…';

  /** Summary text when done and elapsed time is unavailable. */
  @Prop() doneLabel = 'Thought';

  /** Summary template for one elapsed second. The {seconds} placeholder receives the rounded time. */
  @Prop() singularDurationLabel = 'Thought for {seconds} second';

  /** Summary template for zero or multiple elapsed seconds. The {seconds} placeholder receives the rounded time. */
  @Prop() durationLabel = 'Thought for {seconds} seconds';

  /** Emitted after a native disclosure toggle. Setting open from the application is silent. */
  @Event({ eventName: 'ki-toggle', bubbles: true, composed: true, cancelable: false })
  kiToggle!: EventEmitter<KiReasoningToggleDetail>;

  private details?: HTMLDetailsElement;
  private previousStatus?: KiReasoningStatus;
  private summary = '';
  private announcement = '';

  @Watch('open')
  protected syncOpen(open: boolean): void {
    if (this.details && this.details.open !== open) this.details.open = open;
  }

  componentWillRender(): void {
    const status = this.status === 'done' ? 'done' : 'thinking';
    this.summary =
      status === 'thinking'
        ? this.thinkingLabel
        : formatElapsedTime(this.duration, {
            done: this.doneLabel,
            singular: this.singularDurationLabel,
            plural: this.durationLabel,
          });

    // Keep the live region mounted. Step and duration-only updates leave its text alone.
    if (this.previousStatus !== undefined && this.previousStatus !== status) {
      this.announcement = this.summary;
    }
    this.previousStatus = status;
  }

  private readonly handleToggle = (): void => {
    // A queued native toggle after a property write sees the synchronized open value.
    if (!this.details || this.open === this.details.open) return;
    this.open = this.details.open;
    this.kiToggle.emit({ open: this.open });
  };

  render() {
    const thinking = this.status !== 'done';

    return [
      <details
        open={this.open}
        onToggle={this.handleToggle}
        ref={(details) => {
          if (details instanceof HTMLDetailsElement) this.details = details;
        }}
      >
        <summary part="summary" tabIndex={0}>
          {!thinking && <ki-icon name="sparkles" size="sm" aria-hidden="true" />}
          <span class={{ 'summary-label': true, thinking }}>{this.summary}</span>
          <ki-icon class="chevron" name="chevron-down" size="sm" aria-hidden="true" />
        </summary>
        <div part="body">
          <slot />
        </div>
      </details>,
      <span class="status" role="status" aria-live="polite" aria-atomic="true">
        {this.announcement}
      </span>,
    ];
  }
}
