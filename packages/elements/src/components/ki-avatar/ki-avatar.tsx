import { Component, Host, Prop, State, Watch, h } from '@stencil/core';

export type KiAvatarSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * A static identity visual that shows a person or entity at a glance through
 * a fallback chain: portrait, then initials, then a built-in generic figure.
 *
 * @whenToUse a compact identity visual for a person or entity — a comment
 * author, a contact list item, a project member. Set `label` whenever the
 * avatar is the only carrier of the identity (no adjacent visible name);
 * compose several into `ki-avatar-group` for a compact "who is involved"
 * stack with overflow.
 * @whenNotToUse as a clickable control (compose the avatar inside an
 * interactive host such as ki-button), for logos or arbitrary illustrations
 * (plain `img`), for presence/verification adornments overlaid on the corner
 * (a future overlay concern shared with the nav badge), or unlabeled when no
 * adjacent text names the identity.
 *
 * @part avatar - The avatar box: size, shape, surface, border and typography.
 * @part image - The portrait image when `src` is set and loads.
 * @part initials - The verbatim initials text of the second fallback step.
 * @part icon - The built-in generic person figure of the last fallback step.
 */
@Component({
  tag: 'ki-avatar',
  styleUrl: 'ki-avatar.css',
  shadow: true,
})
export class KiAvatar {
  // A portrait that fails to load falls silently down the chain (FR-001):
  // no error, no component event, no broken-image artifact.
  @State() private portraitFailed = false;

  /**
   * Accessible name for the identity ("Ana García"). With a label the avatar
   * is exposed as a named non-interactive image (role `img`) in every content
   * mode — the portrait never carries a second alternative text of its own.
   * Without a label the avatar is decorative and contributes nothing to the
   * accessibility tree; the identity must then live in adjacent visible text
   * (FR-002).
   * @default undefined
   */
  @Prop() label?: string;

  /**
   * Portrait URL, the first step of the fallback chain. When it fails to
   * load — initially or at runtime — the avatar silently falls back to the
   * initials (or the generic figure) with no error, no layout change and no
   * event (FR-001). Loading policy follows the platform image defaults.
   * @default undefined
   */
  @Prop() src?: string;

  /**
   * Initials rendered verbatim as the second fallback step — never derived
   * from the label, never truncated (FR-003). Catalog guidance: one to two
   * characters. With a label present the initials are presentational;
   * assistive technology receives the label alone.
   * @default undefined
   */
  @Prop() initials?: string;

  /**
   * Size step over the shared scale; per-size metrics (box, initials font,
   * figure glyph) are per-theme component tokens, never hardcoded (FR-004).
   * An unrecognized value matches no style selector, so the avatar keeps the
   * default medium metrics (fallback by CSS construction, FR-007).
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiAvatarSize = 'md';

  @Watch('src')
  protected handleSrcChange(): void {
    this.portraitFailed = false;
  }

  private readonly handlePortraitError = (): void => {
    this.portraitFailed = true;
  };

  render() {
    // The label/decoration duality (FR-002): a named non-interactive image
    // when labeled (initials and figure become presentational descendants),
    // full accessibility-tree transparency when not.
    const semantics = this.label
      ? { role: 'img', 'aria-label': this.label }
      : { 'aria-hidden': 'true' };
    const portraitSrc = this.src && !this.portraitFailed ? this.src : null;
    const showInitials = portraitSrc === null && Boolean(this.initials);
    return (
      <Host {...semantics}>
        <span part="avatar" class={{ 'has-portrait': portraitSrc !== null }}>
          {portraitSrc !== null && (
            <img part="image" src={portraitSrc} alt="" onError={this.handlePortraitError} />
          )}
          {showInitials && <span part="initials">{this.initials}</span>}
          {portraitSrc === null && !showInitials && (
            // The exact MarsUI Icon/User glyph (design-extraction decision 1):
            // built-in so the last fallback step never depends on a network.
            <svg part="icon" viewBox="0 0 20 20" aria-hidden="true">
              <g transform="translate(2.0833 1.6667)" fill="currentColor">
                <path d="M8.22103 8.75C9.3726 8.75 10.5141 8.96704 11.5853 9.38965L12.1785 9.62402L12.4292 9.729C13.0087 9.98746 13.5457 10.3333 14.021 10.7552L14.117 10.8407L14.3335 11.0441C14.5439 11.254 14.7354 11.4825 14.9064 11.7261L15.0163 11.8888C15.5488 12.7132 15.8333 13.6749 15.8333 14.659C15.8333 15.7678 14.9345 16.6667 13.8257 16.6667H2.00765C0.898877 16.6667 0 15.7678 0 14.659C0 13.6093 0.323853 12.5853 0.926921 11.7261L1.10433 11.4876C1.28893 11.2547 1.49377 11.0382 1.71631 10.8407L1.81234 10.7552L2.01986 10.5794C2.51229 10.1795 3.06366 9.85723 3.65479 9.62402L4.24805 9.38965L4.65332 9.24072C5.60505 8.91614 6.60479 8.75 7.6123 8.75H8.22103Z" />
                <path d="M7.91667 0C9.98773 0 11.6667 1.67893 11.6667 3.75C11.6667 5.82107 9.98773 7.5 7.91667 7.5C5.8456 7.5 4.16667 5.82107 4.16667 3.75C4.16667 1.67893 5.8456 0 7.91667 0Z" />
              </g>
            </svg>
          )}
        </span>
      </Host>
    );
  }
}
