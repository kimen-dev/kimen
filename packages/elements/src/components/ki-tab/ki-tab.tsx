import { Component, Element, Host, Prop, h } from '@stencil/core';

/**
 * One selectable tab inside a `ki-tabs` view switcher.
 *
 * When to use: label one peer content view inside `ki-tabs`, with optional
 * `start` and `end` slot media. When NOT to use: standalone, for form value
 * selection, or for page navigation; use the parent group's `value` instead
 * of authoring `selected`.
 *
 * @slot - Tab label; this is the accessible name source.
 * @slot start - Leading icon or media. Follows writing direction.
 * @slot end - Trailing icon or media. Follows writing direction.
 * @part tab - Tab surface.
 * @part indicator - Decorative selected-tab marker.
 */
@Component({
  tag: 'ki-tab',
  styleUrl: 'ki-tab.css',
  shadow: true,
})
export class KiTab {
  @Element() private readonly host!: HTMLKiTabElement;

  /**
   * Pairing identifier shared with a `ki-tab-panel`. The first tab with a
   * value owns it; later duplicates render but are not selectable.
   *
   * @default ''
   */
  @Prop({ reflect: true }) value = '';

  /**
   * Prevents selection by every modality and exposes the unavailable state.
   * Boolean presence semantics apply: `disabled="false"` is still disabled.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Output-only selected state written by `ki-tabs`. Set the group's `value`
   * to choose an initial tab; author-set `selected` is overwritten.
   *
   * @default false
   */
  @Prop({ reflect: true }) selected = false;

  render() {
    return (
      <Host
        role="tab"
        aria-selected={this.selected ? 'true' : 'false'}
        aria-disabled={this.disabled || this.host.hasAttribute('disabled') ? 'true' : 'false'}
      >
        <span part="tab">
          <slot name="start" />
          <slot />
          <slot name="end" />
        </span>
        <span part="indicator" aria-hidden="true" />
      </Host>
    );
  }
}
