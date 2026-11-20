import { Component, Element, forceUpdate, Host, h, Prop, Watch } from '@stencil/core';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';

/**
 * One selectable tab inside a `ki-tabs` view switcher.
 *
 * @whenToUse label one peer content view inside `ki-tabs`, with optional
 * decorative `icon` and `start` or `end` slot media.
 * @whenNotToUse standalone, for form value
 * selection, or for page navigation; use the parent group's `value` instead
 * of authoring `selected`.
 *
 * @slot - Required visible text label and accessible name source.
 * @slot icon - Decorative SVG. Supply visible text in the default slot.
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

  private presenceObserver: MutationObserver | undefined;

  connectedCallback(): void {
    // `ki-tabs` reads `disabled` from the host attribute, so presence must
    // survive Stencil's reflection of a parsed `disabled="false"`.
    this.presenceObserver?.disconnect();
    this.presenceObserver = observeAttributePresence(this.host, ['disabled'], () => {
      if (!this.disabled) {
        this.disabled = true;
      }
    });
  }

  componentWillLoad(): void {
    this.disabled = booleanFromAttributePresence(this.disabled, this.host.hasAttribute('disabled'));
  }

  disconnectedCallback(): void {
    this.presenceObserver?.disconnect();
    this.presenceObserver = undefined;
  }

  @Watch('data-ki-tab-with-icon')
  protected updateIcon(): void {
    forceUpdate(this.host);
  }

  render() {
    const hasIcon = this.host.hasAttribute('data-ki-tab-with-icon');
    const indicator = <span part="indicator" aria-hidden="true" />;
    return (
      <Host
        role="tab"
        aria-selected={this.selected ? 'true' : 'false'}
        aria-disabled={this.disabled ? 'true' : 'false'}
      >
        <span part="tab">
          <slot name="start" />
          {hasIcon ? (
            <span class="content">
              <span class="icon" aria-hidden="true" inert>
                <slot name="icon" />
              </span>
              <slot />
              {indicator}
            </span>
          ) : (
            <slot />
          )}
          <slot name="end" />
        </span>
        {!hasIcon && indicator}
      </Host>
    );
  }
}
