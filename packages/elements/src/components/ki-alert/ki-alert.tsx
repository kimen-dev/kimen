import { Component, Prop, h } from '@stencil/core';
import { liveExposureForTone, type KiAlertTone } from './ki-alert.tone';

/**
 * A persistent inline status message with token-backed tone semantics.
 *
 * When to use: keep a page or section state visible until the condition is
 * resolved or a person dismisses it.
 * When NOT to use: transient confirmations, tiny status descriptors, blocking
 * decisions, or field-level validation messages.
 *
 * @slot - Message body.
 * @part alert - Alert container.
 * @part heading - Optional emphasized heading.
 * @part message - Message body wrapper around the default slot.
 * @part dismiss - Dismiss button, rendered only when dismissible.
 */
@Component({
  tag: 'ki-alert',
  styleUrl: 'ki-alert.css',
  shadow: true,
})
export class KiAlert {
  /**
   * Semantic tone for visual styling and live-region urgency.
   *
   * @default 'neutral'
   */
  @Prop({ reflect: true }) tone: KiAlertTone | (string & {}) = 'neutral';

  /**
   * Optional emphasized text rendered before the message.
   */
  @Prop({ reflect: true }) heading?: string;

  /**
   * Renders a dismiss control when true.
   *
   * @default false
   */
  @Prop({ reflect: true }) dismissible = false;

  /**
   * Accessible name for the dismiss control.
   *
   * @default 'Dismiss'
   */
  @Prop({ attribute: 'dismiss-label', reflect: true }) dismissLabel = 'Dismiss';

  /**
   * Hides the alert while keeping the host in the document.
   *
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) dismissed = false;

  render() {
    if (this.dismissed) {
      return null;
    }

    const heading = this.heading?.trim();

    return (
      <div part="alert">
        <div class="live" role={liveExposureForTone(this.tone)}>
          {heading ? <strong part="heading">{heading}</strong> : null}
          <div part="message">
            <slot />
          </div>
        </div>
      </div>
    );
  }
}
