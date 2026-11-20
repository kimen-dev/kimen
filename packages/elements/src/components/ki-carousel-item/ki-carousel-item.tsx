import { Component, h } from '@stencil/core';

/**
 * A slide in an ordered ki-carousel sequence.
 *
 * @whenToUse supply a single slide to a ki-carousel. Put the full slide in the
 * default slot and optional decorative preview media in the preview slot.
 * @whenNotToUse present a standalone card or a layout container outside a carousel.
 * @slot - The full slide content, including any links and controls.
 * @slot preview - Decorative, noninteractive media shown when the item is a reduced preview.
 * @part content - Surface that holds the full slide.
 * @part preview - Decorative surface used in small or partly shown previews.
 */
@Component({
  tag: 'ki-carousel-item',
  styleUrl: 'ki-carousel-item.css',
  shadow: true,
})
export class KiCarouselItem {
  render() {
    return [
      <div key="content" part="content">
        <slot />
      </div>,
      <div key="preview" part="preview" aria-hidden="true" inert>
        <slot name="preview" />
      </div>,
    ];
  }
}
