import '../../../icons/circle-check.js';
import '../../../icons/info.js';
import '../../../icons/octagon-alert.js';
import '../../../icons/triangle-alert.js';

import { Component, Element, Event, type EventEmitter, h, Prop, State, Watch } from '@stencil/core';
import {
  endKeyboardPress,
  releaseKeyboardPress,
  startKeyboardPress,
} from '../../utils/keyboard-press.js';
import { focusThroughShadow } from '../../utils/shadow-focus.js';
import { resolveDismissFocusTarget } from './ki-alert.focus.js';
import { defaultGlyphForTone, type KiAlertTone, liveExposureForTone } from './ki-alert.tone.js';

/**
 * A persistent inline status message with token-backed tone semantics.
 *
 * @whenToUse show a persistent inline message about the state of a page or
 * section, such as a failed save, completed operation, or service notice, that
 * remains until the condition is resolved or the person dismisses it. Express
 * severity with `tone`, never custom styling.
 * @whenNotToUse transient confirmations that expire on their own belong to
 * `ki-toast`, raised into a `ki-toaster`; tiny status descriptors attached to
 * another element belong to `ki-badge`; blocking decisions belong to
 * `ki-dialog`; inline field-level validation belongs to the form control.
 *
 * Assistive technology note: alerts that must be announced should be inserted
 * dynamically, or re-shown by clearing `dismissed`; alerts present at initial
 * page load are exposed with their role but platform announcement is not
 * guaranteed.
 *
 * Every non-neutral alert draws its tone's glyph in the icon frame (`info`,
 * `circle-check`, `triangle-alert`, `octagon-alert`) unless an icon is slotted.
 *
 * @slot - Message body. It lives inside the live-region boundary.
 * @slot icon - Optional decorative glyph shown in a round frame at the top of
 * the card, in the tone's colors. Hidden from assistive technology: it never
 * carries meaning the heading and message lack. Without one, a non-neutral
 * alert draws its tone's default glyph. When to use: replace the default
 * glyph, or give a neutral alert one. When NOT to use: never as the only cue
 * for the message.
 * @slot actions - Optional responses to this message, in a row at the bottom
 * of the card, outside the live region. Slot `size="sm"` buttons. The alert
 * never activates them and an action does not dismiss the alert; the
 * application does, by setting `dismissed`. When NOT to use: a response the
 * person cannot skip belongs in `ki-dialog`.
 * @part alert - Outer shell around the card: padding, radius, wash and blur.
 * @part card - Card holding the icon, text, actions and dismiss control: tone
 * background, border, radius, padding and elevation.
 * @part icon - Round frame around the `icon` slot, rendered when it holds content
 * or the tone draws a default glyph.
 * @part heading - Optional emphasized heading, rendered only when non-empty.
 * @part message - Message body wrapper around the default slot.
 * @part actions - Row around the `actions` slot, rendered only when it holds content.
 * @part dismiss - Native dismiss button, rendered only when dismissible.
 */
@Component({
  tag: 'ki-alert',
  styleUrl: 'ki-alert.css',
  shadow: true,
})
export class KiAlert {
  @Element() private readonly host!: HTMLElement;

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
   * When NOT to use: do not use dismissible for auto-expiring messages; those
   * belong to `ki-toast`.
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

  /**
   * Fired once after the user dismisses the alert — emitted after the alert is
   * hidden and focus has been handed to the next control. `detail` is `null`
   * and the event is not cancelable (the alert is already gone when it runs).
   * When to use: record acknowledgement, or advance an application flow after a
   * user closes the alert.
   * When NOT to use: do not treat it as a veto point, and do not expect it for
   * programmatic `dismissed` changes — it fires only for user activation.
   */
  @Event({ eventName: 'ki-dismiss', bubbles: true, composed: true, cancelable: false })
  private readonly kiDismiss!: EventEmitter<null>;

  @State() private hasIcon = false;

  @State() private hasActions = false;

  /**
   * However the alert stops displaying — the dismiss control or the
   * application setting `dismissed` from a slotted action — focus inside it
   * is handed on before the subtree goes (FR-019). The watcher runs when the
   * property changes, before the re-render hides the host.
   */
  @Watch('dismissed')
  protected dismissedChanged(dismissed: boolean): void {
    if (!dismissed) {
      return;
    }
    const focusTarget = resolveDismissFocusTarget(this.host);
    if (focusTarget) {
      focusThroughShadow(focusTarget);
    }
  }

  componentWillLoad(): void {
    // Children parsed before the element upgraded are already assigned; the
    // slotchange listeners below catch the ones that arrive later.
    this.hasIcon = this.host.querySelector(':scope > [slot="icon"]') !== null;
    this.hasActions = this.host.querySelector(':scope > [slot="actions"]') !== null;
  }

  private readonly syncSlotState = (): void => {
    const root = this.host.shadowRoot;
    this.hasIcon = slotHoldsContent(root?.querySelector('slot[name="icon"]'));
    this.hasActions = slotHoldsContent(root?.querySelector('slot[name="actions"]'));
  };

  private readonly handleDismiss = (): void => {
    this.dismissed = true;
    this.kiDismiss.emit(null);
  };

  render() {
    if (this.dismissed) {
      return null;
    }

    const heading = this.heading?.trim();
    // A2: the tone's own glyph stands in until the consumer slots one.
    const glyph = this.hasIcon ? undefined : defaultGlyphForTone(this.tone);

    // DOM order is reading order (FR-018): text, then the dismiss control in
    // the card's top corner, then the actions at its bottom.
    return (
      <div part="alert">
        <div
          part="card"
          class={{
            'has-icon': this.hasIcon || glyph !== undefined,
            'has-actions': this.hasActions,
          }}
        >
          <span part="icon" aria-hidden="true">
            <slot name="icon" onSlotchange={this.syncSlotState}>
              {glyph === undefined ? null : <ki-icon name={glyph} />}
            </slot>
          </span>
          <div class="live" role={liveExposureForTone(this.tone)}>
            {heading ? <strong part="heading">{heading}</strong> : null}
            <div part="message">
              <slot />
            </div>
          </div>
          {this.dismissible ? (
            <button
              type="button"
              tabIndex={0}
              part="dismiss"
              aria-label={this.dismissLabel}
              onClick={this.handleDismiss}
              onKeyDown={startKeyboardPress}
              onKeyUp={releaseKeyboardPress}
              onBlur={endKeyboardPress}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path
                  fill="currentColor"
                  d="M3.3 2.3 8 7l4.7-4.7 1 1L9 8l4.7 4.7-1 1L8 9l-4.7 4.7-1-1L7 8 2.3 3.3z"
                />
              </svg>
            </button>
          ) : null}
          <div part="actions">
            <slot name="actions" onSlotchange={this.syncSlotState} />
          </div>
        </div>
      </div>
    );
  }
}

/**
 * A slot holding only whitespace counts as empty. Its fallback content (the
 * tone's default glyph) is not slotted content: a flattened read returns the
 * fallback when nothing is assigned, so an empty slot is decided first.
 */
function slotHoldsContent(slot: HTMLSlotElement | null | undefined): boolean {
  if (!slot || slot.assignedNodes().length === 0) {
    return false;
  }
  return slot.assignedNodes({ flatten: true }).some((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      return true;
    }
    return (node.textContent ?? '').trim().length > 0;
  });
}
