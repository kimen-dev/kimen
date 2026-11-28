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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-carousel-item`: the default, only the tokens ki-carousel-item needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

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

- `--ki-carousel-item-backdrop-filter`: Complete optional backdrop filter for the slide surface. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-carousel-item-bg`: Surface for carousel slide content and its decorative preview. Default: `var(--ki-surface-s2)`.
- `--ki-carousel-item-bg-image`: Optional image layered over the slide background color. Default: `var(--ki-surface-image-none)`.
- `--ki-carousel-item-fg`: Text on the carousel slide surface. Default: `var(--ki-text-high-em)`.
- `--ki-carousel-item-min-block-size`: Minimum block size of a full slide. Default: `var(--ki-space-22xl)`.
- `--ki-carousel-item-padding`: Inset of full slide content. Default: `var(--ki-space-3xl)`.
- `--ki-carousel-radius`: Corner radius shared by the carousel viewport and slide surfaces. Default: `var(--ki-radius-big-component-xs)`.
- `--ki-control-border-width`: Stroke width of the boundary of a compact control. Default: `var(--ki-size-border-hairline)`.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
