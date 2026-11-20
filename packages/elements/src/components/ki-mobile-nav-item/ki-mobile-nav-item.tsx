import { Component, Element, Prop, State, h } from '@stencil/core';
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
  @Element() private readonly host!: HTMLElement;
  @State() private labelText = '';

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

  private observer?: MutationObserver;

  connectedCallback(): void {
    this.readLabel();
    if (typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver(() => {
      this.readLabel();
    });
    this.observer.observe(this.host, { childList: true, characterData: true, subtree: true });
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }

  private readLabel(): void {
    const host: Node = this.host;
    this.labelText = (host.textContent ?? '').replace(/\s+/gu, ' ').trim();
  }

  render() {
    const value = this.count;
    const count = formatCount(value, Number.MAX_VALUE);
    const name =
      count && this.labelText
        ? `${this.labelText}, ${this.countLabel.replace('{count}', count)}`
        : undefined;

    return (
      <a
        part="link"
        href={this.href}
        tabindex={0}
        aria-current={this.current ? 'page' : undefined}
        aria-label={name}
      >
        <span part="indicator" aria-hidden="true">
          <ki-icon name={this.iconName} />
          {value !== undefined && count !== undefined && <ki-counter value={value} />}
        </span>
        <span part="label">
          <slot />
        </span>
      </a>
    );
  }
}
