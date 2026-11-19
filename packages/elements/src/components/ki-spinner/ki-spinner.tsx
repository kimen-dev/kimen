import { Component, Prop, State, h } from '@stencil/core';

/**
 * A compact status for an indeterminate wait.
 *
 * @whenToUse show brief inline activity such as saving a change or running a
 * tool. Choose typing dots for an assistant that is thinking. Set a localized
 * label that names the activity and mount the spinner when the wait starts.
 * @whenNotToUse use ki-progress for page-level work or a known fraction of
 * a task. Use ki-alert for persistent notices.
 *
 * @part ring - Rotating ring with a track and indicator, in the ring variant.
 * @part dots - Group of three animated dots, in the dots variant.
 * @part label - Activity text, adjacent to the graphic when show-label is set.
 */
// Shadow DOM encapsulates the graphic and keeps the status and its label in
// the same tree for aria-labelledby.
@Component({
  tag: 'ki-spinner',
  styleUrl: 'ki-spinner.css',
  shadow: true,
})
export class KiSpinner {
  /**
   * Localized name of the ongoing activity, such as "Saving changes".
   * Supply a meaningful label for every spinner, even when the text is hidden.
   * Use the activity's name whenever it can be more specific than "Loading".
   */
  @Prop() label!: string;

  /**
   * Use a ring for general inline activity and dots for assistant typing or
   * thinking. Unrecognized values draw a ring.
   *
   * @default 'ring'
   */
  @Prop() variant: 'ring' | 'dots' = 'ring';

  /**
   * Diameter of the ring. Choose the size that fits the surrounding content.
   * Dots use a fixed size. Unrecognized values draw the medium ring.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  /**
   * Display the label beside the graphic when sighted users also need the
   * activity description. The same text names the status in either case.
   *
   * @default false
   */
  @Prop() showLabel = false;

  @State() private liveRegionReady = false;

  componentDidLoad(): void {
    // Give assistive technology a rendering opportunity to observe the empty
    // polite region before its first text update.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.liveRegionReady = true;
      });
    });
  }

  render() {
    const label = this.liveRegionReady && typeof this.label === 'string' ? this.label.trim() : '';
    return (
      <span class="status" role="status" aria-labelledby="label">
        {this.variant === 'dots' ? (
          <span part="dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <span part="ring" aria-hidden="true" />
        )}
        <span id="label" part="label" class={{ 'visually-hidden': !this.showLabel || !label }}>
          {label}
        </span>
      </span>
    );
  }
}
