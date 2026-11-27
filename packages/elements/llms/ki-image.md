# ki-image

> Displays one accessible image in a reserved frame, with an optional caption and a fallback if the source is refused or fails to load.

## When to use

to show a photo, illustration, or diagram with a predictable
layout. Supply task-relevant alt text, or mark purely decorative media as
decorative. Set an explicit ratio when the layout must stay fixed.

## When not to use

for a background decoration, a video, or an interactive
control. Use a separate control to open or otherwise act on an image.

## Examples

# Using ki-image

Give an informative image alt text that describes the detail the reader needs.
An explicit ratio reserves the same frame while the image loads and when the
fallback appears. Add supporting context in the caption slot.

```html
<ki-image src="/hills.jpg" alt="Low green hills under a pale sky" ratio="16:9">
  <span slot="caption">View from the ridge</span>
</ki-image>
```

Use `contain` when the whole image must stay visible. The fallback for this
example is named `Image unavailable: Office floor plan` if the source fails.

```html
<ki-image src="/floor-plan.png" alt="Office floor plan" ratio="4:3" fit="contain"></ki-image>
```

Use `decorative` for ornamentation. The image and fallback stay out of the
accessibility tree.

```html
<ki-image src="/divider.svg" decorative radius="none"></ki-image>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-image`: the default, only the tokens ki-image needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `alt` (string | undefined): Describe what the image shows for the task at hand. Required and nonblank for an informative image. Omit it for a decorative image.
- `decorative` (boolean, default false): Hide the media from assistive technology when it conveys no information.
- `fallback-label` (string, default 'Image unavailable'): Localizable fallback label. An informative fallback appends the image's description, when available, to this label.
- `fit` ("contain" | "cover", default 'cover'): Cover fills the frame. Contain preserves the whole image in it.
- `loading` ("eager" | "lazy", default 'lazy'): Native loading hint. Use eager for a critical image above the fold.
- `radius` ("lg" | "md" | "none", default 'lg'): Corner radius of the media frame.
- `ratio` ("16:9" | "1:1" | "3:2" | "4:3" | "auto", default 'auto'): An explicit ratio reserves the same frame before load and on failure. Auto reserves 16:9 first and uses the intrinsic ratio after load.
- `src` (string, required, URL): Relative or HTTP(S) image URL. Refused sources are left unloaded.

## Slots

- `caption`: Optional visible context displayed below the media in a figcaption.

## Parts

- `caption`: The figcaption carrying the slotted caption.
- `fallback`: The unavailable-image indicator inside the frame.
- `figure`: The figure containing the frame and optional caption.
- `frame`: The reserved media box and its shape and backing surface.
- `image`: The native image and its fit within the frame.

## Events

- `ki-error` (CustomEvent<void>): Reports a load failure or rejected URL once per source attempt. Bubbles and crosses shadow boundaries so consumers can observe it on a surface.

## Methods

None.

## CSS custom properties

- `--ki-image-caption-fg`: Text colour of the visible caption.
- `--ki-image-caption-font-family`: Typeface of the visible caption.
- `--ki-image-caption-font-size`: Type size of the visible caption.
- `--ki-image-caption-gap`: Space between the image frame and its caption.
- `--ki-image-caption-line-height`: Line height of the visible caption.
- `--ki-image-fallback-backdrop-filter`: Complete filter applied behind the media surface.
- `--ki-image-fallback-bg`: Solid fill behind the image and fallback symbol.
- `--ki-image-fallback-bg-image`: Optional background image over the media fill.
- `--ki-image-fallback-fg`: Foreground of the fallback symbol.
- `--ki-image-fallback-icon-size`: Inline and block size of the unavailable-image symbol.
- `--ki-image-fallback-icon-stroke-width`: Stroke width of the unavailable-image symbol.
- `--ki-image-radius`: Corner radius of the default media frame.
- `--ki-image-radius-md`: Corner radius of the medium media frame.
- `--ki-typography-family-body`: semantic font family for typography family body.
