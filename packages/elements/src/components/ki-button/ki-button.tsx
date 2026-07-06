import { Component, Prop, h } from '@stencil/core';

export type KiButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'ghost';
export type KiButtonTone = 'neutral' | 'success' | 'danger';
export type KiButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type KiButtonType = 'submit' | 'reset' | 'button';

/**
 * A token-styled action button with native button semantics.
 *
 * When to use: trigger the single main action of a view, supporting actions
 * in descending hierarchy, or confirming/destructive actions through tone.
 * When NOT to use: navigation, icon-only actions, persistent toggles, or
 * loading/progress semantics.
 *
 * @slot - Label content. This is the accessible name source.
 * @slot start - Leading icon or media. Follows writing direction.
 * @slot end - Trailing icon or media. Follows writing direction.
 * @part button - Internal native button.
 * @part label - Label wrapper around the default slot.
 */
@Component({
  tag: 'ki-button',
  styleUrl: 'ki-button.css',
  shadow: { delegatesFocus: true },
})
export class KiButton {
  /**
   * Visual hierarchy for the action. Use `primary` for the single main action
   * in a view and lower-emphasis variants for supporting actions.
   * When NOT to use: do not use variant to signal success or danger; use
   * `tone` for intent.
   *
   * @default 'secondary'
   */
  @Prop({ reflect: true }) variant: KiButtonVariant = 'secondary';

  /**
   * Semantic intent for the action, independent of hierarchy. Use `success`
   * for confirming actions and `danger` for destructive actions.
   * When NOT to use: do not use tone for visual hierarchy; use `variant`.
   *
   * @default 'neutral'
   */
  @Prop({ reflect: true }) tone: KiButtonTone = 'neutral';

  /**
   * Token-backed button size. Every size keeps at least the minimum pointer
   * target; choose the size that matches the density of the surrounding UI.
   * When NOT to use: do not use `ki-button` for icon-only compact controls.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiButtonSize = 'md';

  /**
   * Native form action type. Full submit/reset behavior is implemented through
   * ElementInternals by the form-participation task.
   * When NOT to use: use `button` when the action must never submit a form.
   *
   * @default 'submit'
   */
  @Prop({ reflect: true }) type: KiButtonType = 'submit';

  /**
   * Form-data key contributed when this button submits its form.
   * When NOT to use: omit when no submitter value should be sent.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Form-data value paired with `name` when this button submits its form.
   * When NOT to use: omit when the default empty submitter value is intended.
   */
  @Prop({ reflect: true }) value?: string;

  /**
   * Prevents activation, removes the button from keyboard reach, and exposes
   * the unavailable state through the internal native button.
   * When NOT to use: do not use disabled for pending/loading semantics.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  private readonly handleClick = (event: MouseEvent): void => {
    if (!this.disabled) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  render() {
    return (
      <button part="button" type="button" disabled={this.disabled} onClick={this.handleClick}>
        <slot name="start" />
        <span part="label">
          <slot />
        </span>
        <slot name="end" />
      </button>
    );
  }
}
