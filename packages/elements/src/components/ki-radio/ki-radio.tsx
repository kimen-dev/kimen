import { Component, Element, h, Prop } from '@stencil/core';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';

/* eslint-disable jsx-a11y/label-has-associated-control -- The slotted option label is the accessible text for the native input inside the shadow label. */

/**
 * One option in a token-styled radio group.
 *
 * @whenToUse place inside `ki-radio-group` when a person must choose
 * exactly one of a small visible set.
 * @whenNotToUse `ki-radio` standalone, multiple selection,
 * or authored selection state; set the parent group's `value` instead.
 *
 * @slot - Option label. This is the accessible name and activation surface.
 * @part control - Visual ring and selected dot.
 * @part label - Wrapper around the option label.
 */
@Component({
  tag: 'ki-radio',
  styleUrl: 'ki-radio.css',
  shadow: { delegatesFocus: true },
})
export class KiRadio {
  @Element() private readonly host!: HTMLElement;

  /**
   * Submission value projected by the parent `ki-radio-group` when this option
   * is selected. Omit for native radio parity with value `"on"`.
   * When NOT to use: do not use `value` to author selection; set the group's
   * `value` property or attribute.
   *
   * @default 'on'
   */
  @Prop({ reflect: true }) value = 'on';

  /**
   * Prevents this option from being selected or focused. Disabled options are
   * skipped by group arrow navigation and omitted from form submission when
   * selected before becoming disabled.
   * When NOT to use: do not use disabled as a temporary loading state.
   *
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) disabled = false;

  // Presence semantics: a present `disabled` attribute disables whatever its
  // value. Deliberately NOT a @Watch: Stencil un-reflects a cleared property
  // only at the next render, so a watch re-reading the attribute would undo
  // `disabled = false` assigned by a framework wrapper.
  protected normalizeDisabled(): void {
    this.disabled = booleanFromAttributePresence(this.disabled, this.host.hasAttribute('disabled'));
  }

  private presenceObserver: MutationObserver | undefined;

  connectedCallback(): void {
    // `disabled="false"` written after hydration: Stencil parses it to `false`
    // and would remove the attribute on reflect. The observer runs on attribute
    // mutations alone and reports the attribute only while it is present.
    this.presenceObserver?.disconnect();
    this.presenceObserver = observeAttributePresence(this.host, ['disabled'], () => {
      this.normalizeDisabled();
    });
  }

  componentWillLoad(): void {
    this.normalizeDisabled();
  }

  disconnectedCallback(): void {
    this.presenceObserver?.disconnect();
    this.presenceObserver = undefined;
  }

  render() {
    return (
      <label>
        <input
          type="radio"
          tabIndex={this.disabled ? -1 : 0}
          disabled={this.disabled}
          value={this.value}
        />
        <span part="control" aria-hidden="true"></span>
        <span part="label">
          <slot />
        </span>
      </label>
    );
  }
}
