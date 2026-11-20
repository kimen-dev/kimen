import { Component, Prop, h } from '@stencil/core';

export type KiStepState = 'done' | 'current' | 'upcoming' | 'error';

/**
 * One authored step in a Stepper.
 *
 * @whenToUse Place directly inside ki-stepper in task order. Its default slot
 * is the step label and its properties describe the step to the owning list.
 * @whenNotToUse Standalone or with interactive content in the label.
 * A completed step can make the label itself a link.
 * @slot - The visible label. Use text or passive inline markup.
 * @cssprop --ki-step-description-bg - Backing of the description text.
 * @cssprop --ki-step-description-fg - Description ink against its backing surface.
 */
// Shadow DOM preserves the label's slot while the parent owns the list item.
@Component({
  tag: 'ki-step',
  styleUrl: 'ki-step.css',
  shadow: true,
})
export class KiStep {
  /** The step's progress state. Mark the active step as current.
   * @default 'upcoming'
   */
  @Prop({ reflect: true }) state: KiStepState = 'upcoming';

  /** Destination for a completed step. Omit for a passive step.
   * @format url
   */
  @Prop({ reflect: true }) href?: string;

  /** Optional supporting text displayed below the label. */
  @Prop({ reflect: true }) description?: string;

  render() {
    return <slot />;
  }
}
