import { Component, Prop, h } from '@stencil/core';

export type KiFeatureIconTone =
  | 'neutral'
  | 'primary'
  | 'primary-light'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export type KiFeatureIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type KiFeatureIconShape = 'square' | 'circle';

/**
 * A decorative glyph centered on a tinted tile.
 *
 * @whenToUse Place a decorative icon beside the visible heading of a feature,
 * empty state or settings section. The heading carries the meaning.
 * @whenNotToUse For an action (use ki-icon-button), a status (use ki-badge),
 * or the sole label of a section.
 * @slot - One Lucide glyph. Supply an inline SVG using currentColor or a ki-icon with inherited size. Guarded surfaces use a registered ki-icon.
 * @part tile - The painted tile that centers the glyph.
 * @cssprop --ki-feature-icon-size - Tile inline and block size, with the glyph at half that size.
 * @cssprop --ki-feature-icon-radius - Corner radius of the tile.
 * @cssprop --ki-feature-icon-bg - Surface colour.
 * @cssprop --ki-feature-icon-fg - Glyph colour.
 * @cssprop --ki-feature-icon-bg-image - Optional image layered over the surface colour.
 * @cssprop --ki-feature-icon-backdrop-filter - Optional filter applied behind the tile.
 */
@Component({
  tag: 'ki-feature-icon',
  styleUrl: 'ki-feature-icon.css',
  shadow: true,
})
export class KiFeatureIcon {
  /** Colour pair for the tile and its glyph. Unknown values use neutral. */
  @Prop({ reflect: true }) tone: KiFeatureIconTone = 'neutral';

  /** Tile size. At a 16px root, the steps are 24, 32, 40, 48 and 64px. Unknown values use md. */
  @Prop({ reflect: true }) size: KiFeatureIconSize = 'md';

  /** Rounded square or circle. Unknown values use square. */
  @Prop({ reflect: true }) shape: KiFeatureIconShape = 'square';

  render() {
    return (
      <span key="tile" part="tile" aria-hidden="true" inert>
        <slot key="glyph" />
      </span>
    );
  }
}
