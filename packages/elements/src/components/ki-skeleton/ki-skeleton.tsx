import { AttrDeserialize, Component, Element, h, Host, Prop } from '@stencil/core';

import { normalizeSkeletonLines } from './normalize-lines';

/**
 * Decorative placeholder shapes that reserve space for loading content.
 *
 * @whenToUse Reserve the expected layout of a card, list, or assistant reply
 * while it loads. Give the surrounding region an accessible name and set
 * its aria-busy state. Show the skeleton after about 300 ms of waiting.
 * @whenNotToUse For a standalone loading announcement, progress measurement,
 * or interactive control. Put content and loading feedback in the caller's region.
 *
 * @part shape - Each painted text line, circle or rectangle.
 */
// Shadow DOM keeps the decorative drawing separate from the caller's loading region.
@Component({
  tag: 'ki-skeleton',
  styleUrl: 'ki-skeleton.css',
  shadow: true,
})
export class KiSkeleton {
  @Element() private host!: HTMLElement;

  /**
   * Match the placeholder to the expected text, avatar, or rectangular content.
   * @default 'text'
   */
  @Prop() shape: 'text' | 'circle' | 'rect' = 'text';

  /**
   * Number of text lines. Use a whole number from 1 to 20 for the expected
   * paragraph length. Extra lines are ignored for circles and rectangles.
   * @default 1
   * @minimum 1
   * @maximum 20
   */
  @Prop() lines = 1;

  /**
   * CSS length shared by both axes. Use it for circles or square blocks.
   * An axis-specific override takes precedence.
   */
  @Prop() size?: string;

  /**
   * CSS length for the inline axis. Use it to match a fixed content width.
   * Text and rectangles otherwise fill available inline space.
   */
  @Prop() inlineSize?: string;

  /**
   * CSS length for the block axis. For text, this is the height of each line.
   * Use it to reserve the height of the content that will replace the shape.
   */
  @Prop() blockSize?: string;

  /**
   * Sweep a highlight while the user permits motion. Set false to use a static
   * placeholder. Shimmer also stops under reduced motion and forced colours.
   * @default true
   */
  @Prop({ mutable: true }) animated = true;

  @AttrDeserialize('animated')
  protected deserializeAnimated(value: string | null): boolean {
    return value !== 'false';
  }

  componentWillLoad(): void {
    // The external custom-elements runtime skips AttrDeserialize and parses
    // removal as false. Observe the host for its lifetime, including detaches.
    const host = this.host;
    new MutationObserver(() => {
      if (!host.hasAttribute('animated') && !this.animated) {
        this.animated = true;
      }
    }).observe(host, { attributeFilter: ['animated'] });
  }

  render() {
    const shape = this.shape === 'circle' || this.shape === 'rect' ? this.shape : 'text';
    const count = shape === 'text' ? normalizeSkeletonLines(this.lines) : 1;
    const size =
      this.size ?? (shape === 'circle' ? (this.inlineSize ?? this.blockSize) : undefined);
    const inlineSize = this.inlineSize ?? size;
    const blockSize = this.blockSize ?? size;
    const useCircleRatio = shape === 'circle' && inlineSize === blockSize;
    const blockStyle = blockSize === undefined || useCircleRatio ? {} : { 'block-size': blockSize };

    return (
      <Host aria-hidden="true">
        <div
          class={{ shapes: true, [shape]: true, animated: this.animated }}
          style={inlineSize === undefined ? {} : { 'inline-size': inlineSize }}
        >
          {Array.from({ length: count }, (_, index) => (
            <span
              key={index}
              part="shape"
              class={{ short: count > 1 && index === count - 1 }}
              style={blockStyle}
            />
          ))}
        </div>
      </Host>
    );
  }
}
