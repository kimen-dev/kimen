import '../../../icons/chevron-down.js';

import { Component, Element, Event, type EventEmitter, Prop, Watch, h } from '@stencil/core';
import { closeDisclosurePeers, connectDisclosure, reconcileDisclosure } from './accordion-group';

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
  shadow: true,
})
export class KiDetails {
  @Element() private readonly host!: HTMLElement;

  /** Plain label for the control. Supply the summary slot for a rich label. */
  @Prop() summary?: string;

  /** Whether the panel is open. Native changes reflect back to this property. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Nonempty name for exclusive disclosures in the same document or shadow root. */
  @Prop({ reflect: true }) name?: string;

  /** Disables summary activation. The page can still set open. */
  @Prop({ reflect: true }) disabled = false;

  /** Emitted when the native disclosure toggles or an exclusive peer closes it. */
  @Event({ eventName: 'ki-toggle', bubbles: true, composed: true, cancelable: false })
  kiToggle!: EventEmitter<KiDetailsToggleDetail>;

  private panel?: HTMLDetailsElement;
  private pendingGroupClose = false;

  private readonly groupMember = {
    name: () => this.name,
    isOpen: () => this.panel?.open === true,
    close: (initializing: boolean): void => {
      if (!this.panel) return;

      const wasOpen = this.open;
      // Update the property immediately so another write in the same task can
      // reopen this member. Report the closure when the native toggle settles.
      this.open = false;
      this.panel.open = false;
      this.pendingGroupClose = wasOpen && !initializing;
    },
  };

  connectedCallback(): void {
    if (this.panel) connectDisclosure(this.host, this.groupMember, false);
  }

  componentDidRender(): void {
    if (this.panel) return;
    const panel = this.host.shadowRoot?.querySelector('details');
    if (!panel) return;

    this.panel = panel;
    panel.open = this.open;
    connectDisclosure(this.host, this.groupMember, true);
  }

  @Watch('open')
  protected syncOpen(open: boolean): void {
    this.pendingGroupClose = false;
    if (!this.panel) return;

    if (this.panel.open !== open) this.panel.open = open;
    if (open) closeDisclosurePeers(this.host);
  }

  @Watch('name')
  protected syncName(): void {
    reconcileDisclosure(this.host);
  }

  private readonly handleToggle = (): void => {
    if (!this.panel) return;

    const open = this.panel.open;
    const notify = open !== this.open || (!open && this.pendingGroupClose);
    this.pendingGroupClose = false;
    if (!notify) return;

    this.open = open;
    this.kiToggle.emit({ open });
  };

  private readonly handleSummaryClick = (event: MouseEvent): void => {
    if (this.disabled) event.preventDefault();
  };

  render() {
    return (
      <details class="panel" onToggle={this.handleToggle}>
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
