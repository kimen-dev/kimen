# ki-feature-icon

> A decorative glyph centered on a tinted tile.

## When to use

Place a decorative icon beside the visible heading of a feature,
empty state or settings section. The heading carries the meaning.

## When not to use

For an action (use ki-icon-button), a status (use ki-badge),
or the sole label of a section.

## Examples

# Using ki-feature-icon

Load the token core and the sheets of the tags you write, register each
custom element, and import the Lucide glyph you use. Place one glyph with its default inherited size
in the slot, next to the heading that names the section.

```js
import '@kimen/tokens/css/core';
import '@kimen/tokens/css/ki-feature-icon';
import '@kimen/tokens/css/ki-icon';
import '@kimen/elements/icons/shield-check';
import { defineCustomElement as defineFeatureIcon } from '@kimen/elements/ki-feature-icon';
import { defineCustomElement as defineIcon } from '@kimen/elements/ki-icon';

defineFeatureIcon();
defineIcon();
```

```html
<div style="display:flex;align-items:center;gap:var(--ki-space-md)">
  <ki-feature-icon tone="primary-light" size="md">
    <ki-icon name="shield-check"></ki-icon>
  </ki-feature-icon>
  <h2>Security settings</h2>
</div>
```

Choose a circle with `shape="circle"`. For an inline SVG, use `currentColor`
for the glyph's stroke or fill. Keep controls and meaningful labels outside
the tile so they can receive focus and be announced.

A guarded catalog surface supplies the glyph as a `ki-icon` node in the
default slot. The host imports the glyph before rendering the surface.

```json
{
  "version": 1,
  "root": {
    "component": "div",
    "props": { "direction": "row", "align": "center", "gap": "md" },
    "slots": {
      "": [
        {
          "component": "ki-feature-icon",
          "props": { "tone": "primary-light" },
          "slots": {
            "": [{ "component": "ki-icon", "props": { "name": "shield-check" } }]
          }
        },
        { "component": "h2", "slots": { "": ["Security settings"] } }
      ]
    }
  }
}
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-feature-icon`: the default, only the tokens ki-feature-icon needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `shape` ("circle" | "square", default 'square'): Rounded square or circle. Unknown values use square.
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Tile size. At a 16px root, the steps are 24, 32, 40, 48 and 64px. Unknown values use md.
- `tone` ("danger" | "info" | "neutral" | "primary" | "primary-light" | "success" | "warning", default 'neutral'): Colour pair for the tile and its glyph. Unknown values use neutral.

## Slots

- (default): One Lucide glyph. Supply an inline SVG using currentColor or a ki-icon with inherited size. Guarded surfaces use a registered ki-icon.

## Parts

- `tile`: The painted tile that centers the glyph.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-feature-icon-backdrop-filter`: Complete filter applied behind the feature icon tile. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-feature-icon-bg`: Background color of a neutral feature icon tile. Default: `var(--ki-surface-s2)`.
- `--ki-feature-icon-bg-image`: Optional background image painted over the feature icon tile color. Default: `var(--ki-surface-image-none)`.
- `--ki-feature-icon-circle-radius`: Corner radius of a circular feature icon tile. Default: `var(--ki-corner-feature-tile-circle)`.
- `--ki-feature-icon-danger-bg`: Background color of a danger feature icon tile. Default: `var(--ki-surface-danger-tint)`.
- `--ki-feature-icon-danger-fg`: Glyph color of a danger feature icon tile. Default: `var(--ki-text-danger-high-em)`.
- `--ki-feature-icon-fg`: Glyph color of a neutral feature icon tile. Default: `var(--ki-text-high-em)`.
- `--ki-feature-icon-info-bg`: Background color of an info feature icon tile. Default: `var(--ki-surface-info-tint)`.
- `--ki-feature-icon-info-fg`: Glyph color of an info feature icon tile. Default: `var(--ki-text-info-high-em)`.
- `--ki-feature-icon-lg-radius`: Corner radius of a large square feature icon tile. Default: `var(--ki-corner-feature-tile-lg)`.
- `--ki-feature-icon-lg-size`: Edge length of a large feature icon tile. Default: `var(--ki-size-feature-tile-lg)`.
- `--ki-feature-icon-primary-bg`: Background color of a primary feature icon tile. Default: `var(--ki-surface-primary-med-em)`.
- `--ki-feature-icon-primary-fg`: Glyph color of a primary feature icon tile. Default: `var(--ki-text-primary-on-primary)`.
- `--ki-feature-icon-primary-light-bg`: Background color of a primary-light feature icon tile. Default: `var(--ki-surface-primary-low-em)`.
- `--ki-feature-icon-primary-light-fg`: Glyph color of a primary-light feature icon tile. Default: `var(--ki-text-primary-on-primary-light)`.
- `--ki-feature-icon-radius`: Default corner radius of a square feature icon tile. Default: `var(--ki-corner-feature-tile-md)`.
- `--ki-feature-icon-size`: Default edge length of a feature icon tile. Default: `var(--ki-size-feature-tile-md)`.
- `--ki-feature-icon-sm-radius`: Corner radius of a small square feature icon tile. Default: `var(--ki-corner-feature-tile-sm)`.
- `--ki-feature-icon-sm-size`: Edge length of a small feature icon tile. Default: `var(--ki-size-feature-tile-sm)`.
- `--ki-feature-icon-success-bg`: Background color of a success feature icon tile. Default: `var(--ki-surface-success-tint)`.
- `--ki-feature-icon-success-fg`: Glyph color of a success feature icon tile. Default: `var(--ki-text-success-high-em)`.
- `--ki-feature-icon-warning-bg`: Background color of a warning feature icon tile. Default: `var(--ki-surface-warning-tint)`.
- `--ki-feature-icon-warning-fg`: Glyph color of a warning feature icon tile. Default: `var(--ki-text-warning-high-em)`.
- `--ki-feature-icon-xl-radius`: Corner radius of an extra-large square feature icon tile. Default: `var(--ki-corner-feature-tile-xl)`.
- `--ki-feature-icon-xl-size`: Edge length of an extra-large feature icon tile. Default: `var(--ki-size-feature-tile-xl)`.
- `--ki-feature-icon-xs-radius`: Corner radius of an extra-small square feature icon tile. Default: `var(--ki-corner-feature-tile-xs)`.
- `--ki-feature-icon-xs-size`: Edge length of an extra-small feature icon tile. Default: `var(--ki-size-feature-tile-xs)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
