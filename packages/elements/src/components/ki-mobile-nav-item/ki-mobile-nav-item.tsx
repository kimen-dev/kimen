import { Component, Prop, h } from '@stencil/core';
import { formatCount } from '../ki-counter/ki-counter.count';

/**
 * An icon and visible label for one mobile navigation destination.
 *
 * @whenToUse Place directly in ki-mobile-nav. Register a decorative icon and supply a short visible text label. Leave the catalog click action unset for native navigation.
 * @whenNotToUse For a command on the current page, use a button. For inline navigation outside a bottom bar, use ki-link.
 * @slot - Visible destination text. Use plain text or noninteractive phrasing content.
 * @part link - The native anchor and focus target.
 * @part indicator - The icon well painted on the current destination.
 * @part label - The always-visible destination label.
 */
@Component({
  tag: 'ki-mobile-nav-item',
  styleUrl: 'ki-mobile-nav-item.css',
  shadow: true,
})
export class KiMobileNavItem {
  /**
   * Destination URL. Relative paths and fragments use native anchor resolution.
   * @format url
   */
  @Prop() href!: string;

  /** Registered icon name. The visible destination text supplies the link name. */
  @Prop() iconName!: string;

  /**
   * Marks this link as the current page.
   * @default false
   */
  @Prop({ reflect: true }) current = false;

  /**
   * Optional count of new items. Only finite counts of at least one are shown.
   * The painted count is abbreviated above 99.
   * @default undefined
   */
  @Prop() count?: number;

  /**
   * Localized suffix for the link name. Use {count} for the full rounded count.
   * @default '{count} new'
   */
  @Prop() countLabel = '{count} new';

  render() {
    const value = this.count;
    const count = formatCount(value, Number.MAX_VALUE);

    return (
      <a part="link" href={this.href} tabindex={0} aria-current={this.current ? 'page' : undefined}>
        <span part="indicator" aria-hidden="true">
          <ki-icon name={this.iconName} />
          {value !== undefined && count !== undefined && <ki-counter value={value} />}
        </span>
        <span part="label">
          <slot />
          {count !== undefined && (
            <span class="count-announcement">{`, ${this.countLabel.replace('{count}', count)}`}</span>
          )}
        </span>
      </a>
    );
  }
}
