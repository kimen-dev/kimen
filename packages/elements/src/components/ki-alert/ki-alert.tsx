import { Component, Prop, h } from '@stencil/core';
import { liveExposureForTone, type KiAlertTone } from './ki-alert.tone';

/**
 * A persistent inline status message with token-backed tone semantics.
 *
 * When to use: show a persistent inline message about the state of a page or
 * section, such as a failed save, completed operation, or service notice, that
 * remains until the condition is resolved or the person dismisses it. Express
 * severity with `tone`, never custom styling.
 *
 * When NOT to use: transient confirmations that expire on their own belong to
 * the future `ki-toast`; tiny status descriptors attached to another element
 * belong to `ki-badge`; blocking decisions belong to `ki-dialog`; inline
 * field-level validation belongs to the form control.
 *
 * Assistive technology note: alerts that must be announced should be inserted
 * dynamically, or re-shown by clearing `dismissed`; alerts present at initial
 * page load are exposed with their role but platform announcement is not
 * guaranteed.
 *
 * @slot - Message body. It lives inside the live-region boundary.
 * @part alert - Outer alert surface: tone background, border, radius, and padding.
 * @part heading - Optional emphasized heading, rendered only when non-empty.
 * @part message - Message body wrapper around the default slot.
 * @part dismiss - Native dismiss button, rendered only when dismissible.
 */
@Component({
  tag: 'ki-alert',
  styleUrl: 'ki-alert.css',
  shadow: true,
})
export class KiAlert {
  /**
   * Semantic intent for visual styling and live-region urgency. `danger` and
   * `warning` expose `role="alert"`; `neutral`, `success`, `info`, absent, and
   * unrecognized values expose `role="status"`. Unknown values keep rendering
   * and fall back to the neutral token matrix by CSS construction.
   *
   * When to use: choose the tone that describes the page or section state.
   * When NOT to use: do not use tone for layout, density, or filled-vs-outlined
   * styling; those are token/theme decisions.
   *
   * @default 'neutral'
   */
  @Prop({ reflect: true }) tone: KiAlertTone | (string & {}) = 'neutral';

  /**
   * Optional emphasized text rendered before the message inside the live
   * region. Empty strings render no heading. The heading is a `strong`
   * element, not a document heading, so it never changes page outline.
   *
   * When to use: add a short label when it helps identify the status message.
   * When NOT to use: do not use heading for page structure; use a real heading
   * outside the alert when the document needs one.
   */
  @Prop({ reflect: true }) heading?: string;

  /**
   * Renders one native dismiss button when true. The button sits outside the
   * live-region boundary, so its accessible name is not announced as part of
   * the alert message. When false, the alert adds no tab stop.
   *
   * When to use: allow a person to acknowledge and clear a persistent message.
   * When NOT to use: do not use dismissible for auto-expiring messages; that is
   * future `ki-toast` behavior.
   *
   * @default false
   */
  @Prop({ reflect: true }) dismissible = false;

  /**
   * Accessible name for the dismiss button. Override for localization; the
   * default English string is the component's only built-in user-visible text.
   *
   * When to use: provide a localized action name whenever the document language
   * is not English.
   * When NOT to use: do not put the alert message here; use the default slot.
   *
   * @default 'Dismiss'
   */
  @Prop({ attribute: 'dismiss-label', reflect: true }) dismissLabel = 'Dismiss';

  /**
   * Reflected dismissed state. User dismissal sets it; applications may also
   * set or clear it. While true, the host remains in the document but renders no
   * alert subtree and leaves the accessibility tree. Clearing it re-shows the
   * alert and creates a dynamic live-region appearance.
   *
   * When to use: persist or restore acknowledgement state from application
   * data.
   * When NOT to use: do not listen for programmatic changes as dismissal
   * events; `ki-dismiss` is only for user activation.
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
