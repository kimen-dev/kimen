# ki-carousel-item

> A slide in an ordered ki-carousel sequence.

## When to use

supply a single slide to a ki-carousel. Put the full slide in the
default slot and optional decorative preview media in the preview slot.

## When not to use

present a standalone card or a layout container outside a carousel.

## Examples

# Carousel item example

```html
<ki-carousel label="Getting started" layout="hero">
  <ki-carousel-item><a href="/guide">Read the guide</a></ki-carousel-item>
  <ki-carousel-item>
    <img slot="preview" src="/cover.jpg" alt="">
    <a href="/themes">Explore themes</a>
  </ki-carousel-item>
</ki-carousel>
```

## Attributes

None.

## Slots

- (default): The full slide content, including any links and controls.
- `preview`: Decorative, noninteractive media shown when the item is a reduced preview.

## Parts

- `content`: Surface that holds the full slide.
- `preview`: Decorative surface used in small or partly shown previews.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-carousel-item-backdrop-filter`: Complete optional backdrop filter for the slide surface.
- `--ki-carousel-item-bg`: Surface for carousel slide content and its decorative preview.
- `--ki-carousel-item-bg-image`: Optional image layered over the slide background color.
- `--ki-carousel-item-fg`: Text on the carousel slide surface.
- `--ki-carousel-item-min-block-size`: Minimum block size of a full slide.
- `--ki-carousel-item-padding`: Inset of full slide content.
- `--ki-carousel-radius`: Corner radius shared by the carousel viewport and slide surfaces.
- `--ki-control-border-width`: Stroke width of the boundary of a compact control.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-typography-family-body`: semantic font family for typography family body.
