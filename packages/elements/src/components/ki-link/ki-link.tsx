import { Component, Prop, h } from '@stencil/core';

export type KiLinkVariant = 'primary' | 'neutral';
export type KiLinkUnderline = 'always' | 'hover';

/**
 * A native navigation link with Kimen ink, underline, and focus styles.
 *
 * @whenToUse navigate to a page, section, or resource. Use a descriptive label and keep the default underline in running text. Leave the action binding unset for native navigation.
 * @whenNotToUse perform an action on the current page. Use ki-button variant="ghost" for that.
 * @slot - Descriptive link text. Use phrasing content without nested interactive controls.
 * @part link - The native anchor that renders the link and receives focus.
 */
// Shadow DOM keeps the styling private while the native anchor names itself
// from the default slot and keeps the browser's own navigation behavior.
@Component({
  tag: 'ki-link',
  styleUrl: 'ki-link.css',
  shadow: true,
})
export class KiLink {
  /**
   * Destination URL. Relative URLs and fragments use native anchor resolution.
   * @format url
   */
  @Prop() href!: string;

  /**
   * Ink role. Primary uses accent ink and neutral uses body ink.
   * @default 'primary'
   */
  @Prop({ reflect: true }) variant: KiLinkVariant = 'primary';

  /**
   * Keep the underline in running text. Use hover for standalone navigation,
   * where placement identifies the link and keyboard focus still underlines it.
   * @default 'always'
   */
  @Prop({ reflect: true }) underline: KiLinkUnderline = 'always';

  /**
   * Requests a new tab with noopener and adds an icon and an accessible
   * announcement. An explicit download still follows native download rules.
   * @default false
   */
  @Prop() external = false;

  /**
   * Localizable text appended to the accessible name in external mode.
   * @default '(opens in a new tab)'
   */
  @Prop() externalLabel = '(opens in a new tab)';

  /**
   * Native download attribute. Set it to an empty string to let the browser
   * choose the file name, or supply a suggested file name.
   */
  @Prop() download?: string;

  /**
   * Native browsing-context name. External links use _blank.
   */
  @Prop() target?: string;

  /**
   * Space-separated native link relationships. External links always include noopener.
   */
  @Prop() rel?: string;

  private get externalRel(): string {
    const tokens = this.rel?.split(/[\t\n\f\r ]+/u).filter(Boolean) ?? [];
    if (!tokens.some((token) => token.toLowerCase() === 'noopener')) tokens.push('noopener');
    return tokens.join(' ');
  }

  render() {
    const target = this.external ? '_blank' : this.target;
    const rel = this.external ? this.externalRel : this.rel;
    return (
      <a
        part="link"
        href={this.href}
        {...(this.download !== undefined ? { download: this.download } : {})}
        {...(target !== undefined ? { target } : {})}
        {...(rel !== undefined ? { rel } : {})}
      >
        <slot />
        {this.external && (
          <svg
            class="external-icon"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M11 2h7v7h-2V5.4l-6.3 6.3-1.4-1.4L14.6 4H11V2ZM4 5h5v2H5v8h8v-4h2v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
          </svg>
        )}
        {this.external && <span class="external-label">{` ${this.externalLabel}`}</span>}
      </a>
    );
  }
}
