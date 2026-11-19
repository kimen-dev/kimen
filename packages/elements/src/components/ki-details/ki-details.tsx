import '../../../icons/chevron-down.js';

import { Component, Element, Event, type EventEmitter, Prop, Watch, h } from '@stencil/core';
import { connectDisclosure } from './accordion-group';

/** The resulting open state of a native disclosure. */
export interface KiDetailsToggleDetail {
  open: boolean;
}

/**
 * A native disclosure for supporting information that can stay collapsed.
 *
 * @whenToUse reveal a short explanation, FAQ answer, settings section or tool
 * output on demand. Use ki-accordion for related disclosures.
 * @whenNotToUse hide the primary action or information needed to complete a task.
 * For script-free HTML, author native details and summary directly.
 * @slot summary - Rich summary text or an authored heading, replacing the summary prop.
 * @slot - Content shown when the disclosure is open.
 */
@Component({
  tag: 'ki-details',
  styleUrl: 'ki-details.css',
  // Native name groups span one DOM tree. Each panel stays in its host's
  // light DOM so related panels can participate in the same native group.
  scoped: true,
})
export class KiDetails {
  @Element() private readonly host!: HTMLElement;

  /** Plain label for the control. Supply the summary slot for a rich label. */
  @Prop() summary?: string;

  /** Whether the panel is open. Native changes reflect back to this property. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Disables summary activation. The page can still set open. */
  @Prop({ reflect: true }) disabled = false;

  /** Emitted for a native state change, including an exclusive peer closing. */
  @Event({ eventName: 'ki-toggle', bubbles: true, composed: true, cancelable: false })
  kiToggle!: EventEmitter<KiDetailsToggleDetail>;

  private panel?: HTMLDetailsElement;

  connectedCallback(): void {
    if (this.panel) connectDisclosure(this.host, this.assignGroup, false);
  }

  disconnectedCallback(): void {
    this.panel?.removeAttribute('name');
  }

  componentDidLoad(): void {
    if (!this.panel) return;
    this.panel.open = this.open;
    connectDisclosure(this.host, this.assignGroup, true);
  }

  @Watch('open')
  protected syncOpen(open: boolean): void {
    if (this.panel && this.panel.open !== open) this.panel.open = open;
  }

  private readonly assignGroup = (name: string | undefined, initializing: boolean): void => {
    if (!this.panel) return;
    this.host.toggleAttribute('data-ki-accordion-member', name !== undefined);
    if (name) this.panel.name = name;
    else this.panel.removeAttribute('name');
    if (initializing) this.open = this.panel.open;
  };

  private readonly handleToggle = (): void => {
    // Native toggle is coalesced. A direct prop write already has the
    // requested state, so only a browser-originated change needs reporting.
    if (!this.panel || this.open === this.panel.open) return;
    this.open = this.panel.open;
    this.kiToggle.emit({ open: this.open });
  };

  private readonly handleSummaryClick = (event: MouseEvent): void => {
    if (this.disabled) event.preventDefault();
  };

  render() {
    return (
      <details
        class="panel"
        onToggle={this.handleToggle}
        ref={(panel) => {
          if (panel instanceof HTMLDetailsElement) this.panel = panel;
        }}
      >
        <summary
          class="summary"
          aria-disabled={this.disabled ? 'true' : undefined}
          tabIndex={this.disabled ? -1 : 0}
          onClick={this.handleSummaryClick}
        >
          <slot name="summary">
            <span>{this.summary}</span>
          </slot>
          <ki-icon class="chevron" name="chevron-down" size="md" aria-hidden="true" />
        </summary>
        <div class="body">
          <slot />
        </div>
      </details>
    );
  }
}
