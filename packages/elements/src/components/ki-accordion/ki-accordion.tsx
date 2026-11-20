import { Component, Element, Prop, Watch, h } from '@stencil/core';

import { syncAccordion } from '../ki-details/accordion-group';

/**
 * A set of native disclosure panels with a shared frame.
 *
 * @whenToUse group related FAQ answers, settings or expandable sections.
 * Enable exclusive when readers benefit from one open section at a time.
 * @whenNotToUse switch between views or make the panels advance a workflow.
 * @slot - Direct ki-details members in reading order.
 * @part group - The frame around the disclosure rows.
 */
@Component({
  tag: 'ki-accordion',
  styleUrl: 'ki-accordion.css',
  shadow: true,
})
export class KiAccordion {
  @Element() private readonly host!: HTMLElement;

  /** Whether the accordion allows at most one direct member to be open. */
  @Prop({ reflect: true }) exclusive = false;

  componentDidLoad(): void {
    syncAccordion(this.host, this.exclusive, true);
  }

  @Watch('exclusive')
  protected syncExclusive(exclusive: boolean): void {
    syncAccordion(this.host, exclusive);
  }

  render() {
    return (
      <div part="group">
        <slot />
      </div>
    );
  }
}
