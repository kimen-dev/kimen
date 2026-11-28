# ki-tooltip

> A transient, text-only hint with an optional heading.

## When to use

add a brief clarifying hint for an icon-only, abbreviated, or
otherwise ambiguous control when the same information is discoverable
elsewhere in the interface.

## When not to use

essential or unique information in a tooltip; interactive
content in a tooltip; form validation messages, disabled controls, or
touch-primary flows. Use visible layout text or a rich `ki-popover` with
`kind="toggletip"` when the content includes actions.

## Examples

`label` is the entire plain tooltip content, reflected to the slotted trigger's accessible description; the trigger must already carry its own accessible name:

```html
<ki-tooltip label="Copies a shareable link to the clipboard">
  <ki-button type="button">Copy link</ki-button>
</ki-tooltip>
```

`placement` (default `top`; also `bottom`, `start`, `end`) is a preference — the component flips or clamps it to keep the bubble inside the viewport:

```html
<ki-tooltip label="Downloads the report as PDF" placement="bottom">
  <ki-button type="button">Export</ki-button>
</ki-tooltip>
```

An empty or whitespace-only `label` renders no tooltip and exposes no description — useful for conditional hints; never put essential or unique information in a tooltip:

```html
<ki-tooltip label="">
  <ki-button type="button">No hint here</ki-button>
</ki-tooltip>
```

Use a heading and direct text when the explanation needs more structure.
The external trigger must be in the same document or shadow tree.

```html
<button id="retention-info" type="button">Retention</button>
<ki-tooltip for="retention-info" heading="Grace period">
  Deleted projects stay restorable for 30 days.
</ki-tooltip>
```

For an explanation with controls, use `ki-popover` with
`kind="toggletip"` and `appearance="rich"`.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-tooltip`: the default, only the tokens ki-tooltip needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `for` (string | undefined, ID of another element of the same spec): ID of the rich tooltip's external trigger in the same document or shadow tree.
- `heading` (string | undefined): Rich tooltip heading. Pair it with `for` and optional direct text in the default slot.
- `label` (string, default ''): The entire plain tooltip content. The string is reflected to the slotted trigger's accessible description without changing its name. Empty or whitespace-only labels render no tooltip and expose no description. When to use: a short hint that clarifies the slotted trigger. When NOT to use: never use `label` for essential information, rich content, interactive content, validation messages, or information attached to disabled controls; put that content in visible UI or a popover.
- `placement` ("bottom" | "end" | "start" | "top", default 'top'): Preferred placement for the tooltip. The component may flip or clamp the rendered placement to keep the bubble inside the viewport; unknown runtime values fall back to `top`. When NOT to use: do not depend on placement for meaning or reading order.

## Slots

- (default): One trigger for a plain tooltip, or direct explanatory text when `for` and `heading` are provided. Rich tooltips accept text only.

## Parts

- `tooltip`: The non-focusable tooltip bubble.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-effect-component-secondary-default-shadow`: MarsUI Component_effect/secondary_default: drop 0/2/1.5/-0.5 plus inner White/3 0/2/3. Pair with --ki-effect-component-backdrop-filter. Default: onmars `0 0 rgba(0,0,0,0)`, material3 `0px 1px 2px 0px rgba(0,0,0,0.3),0px 1px 3px 1px rgba(0,0,0,0.15)`.
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets. Default: `var(--ki-space-xs)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-duration-instant`: Zero-duration step: transitions that must complete immediately (reduced-motion fallbacks, instant handoffs). Default: `var(--ki-duration-instant)`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-motion-easing-standard-accelerate`: Utility exit curve. M3 md.sys.motion.easing.standard-accelerate. onmars: the MarsUI accelerate curve (ki.easing.in). Default: onmars `var(--ki-easing-in)`, material3 `cubic-bezier(0.3,0,1,1)`.
- `--ki-surface-image-tooltip-arrow-end`: End-edge arrow color for a themed tooltip surface. Default: onmars `initial`, material3 `var(--ki-surface-inverse-white)`.
- `--ki-surface-image-tooltip-arrow-start`: Start-edge arrow color for a themed tooltip surface. Default: onmars `initial`, material3 `var(--ki-surface-inverse-white)`.
- `--ki-tooltip-arrow-radius`: dimension used by the tooltip component for the rounding of the arrow tip (Tooltip master pointer: 1.5px, nearest radius step). Default: `var(--ki-radius-xxs)`.
- `--ki-tooltip-arrow-size`: dimension used by the tooltip component for the depth of the arrow that points at the trigger; it is twice as wide (Tooltip master 12089:7621 pointer: 16x8). Zero removes it. Equal to offset, so the tip meets the trigger. Default: onmars `var(--ki-space-md)`, material3 `var(--ki-space-zero)`.
- `--ki-tooltip-backdrop-filter`: Complete backdrop filter behind the tooltip bubble. Default: `var(--ki-effect-component-backdrop-filter)`.
- `--ki-tooltip-bg`: Base background color of the tooltip. Onmars v1 used a transparent backing beneath its translucent image. Default: onmars `var(--ki-surface-tooltip-inverse)`, material3 `var(--ki-surface-inverse-white)`.
- `--ki-tooltip-bg-image`: Optional CSS background image layered over the tooltip fill. Use none for a solid fill. Default: `var(--ki-surface-image-tooltip)`.
- `--ki-tooltip-border-color`: color used by the tooltip component for its edge (MarsUI hairline, Outline/secondary_button_top); one token so a mode or a theme can strengthen it. Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-secondary-button-top)`.
- `--ki-tooltip-border-width`: dimension used by the tooltip component for the outline width (MarsUI card 1px Outline/secondary_button_top stroke; replaces the 1px literal ki-tooltip.css shipped while the token was pending). Default: `var(--ki-size-border-hairline)`.
- `--ki-tooltip-fg`: color used by the tooltip component for foreground (MarsUI title row Text/high_em; onmars v2 sets the inverse tooltip ink). Default: onmars `var(--ki-text-tooltip-inverse)`, material3 `var(--ki-text-inverse-black)`.
- `--ki-tooltip-font-size`: dimension used by the tooltip component for font size (MarsUI Heading_top style UI/Para/medium: body_1 13px). Default: onmars `var(--ki-typography-size-caption-2)`, material3 `var(--ki-font-size-caption-2)`.
- `--ki-tooltip-font-weight`: font weight used by the tooltip component for font weight. Default: `var(--ki-font-weight-body-medium)`.
- `--ki-tooltip-hide-delay`: duration used by the tooltip component for tooltip hide delay. Default: `100ms`.
- `--ki-tooltip-line-height`: dimension used by the tooltip component for line height (MarsUI line_height/para 20px). Default: onmars `var(--ki-font-line-height-para)`, material3 `var(--ki-font-line-height-caption-2)`.
- `--ki-tooltip-max-inline-size`: dimension used by the tooltip component for max inline size (288px; the master card is fixed 280px wide in its rich variants — the 8px divergence is a documented text-only reduction). Default: `var(--ki-size-surface-xxs)`.
- `--ki-tooltip-offset`: dimension used by the tooltip component for offset (MarsUI caret depth 8px with zero extra gap = trigger-to-card distance). Default: onmars `var(--ki-space-md)`, material3 `var(--ki-space-xs)`.
- `--ki-tooltip-padding-block`: dimension used by the tooltip component for padding block (MarsUI card padding Space/xl 12px on all sides). Default: onmars `var(--ki-space-sm)`, material3 `var(--ki-space-xs)`.
- `--ki-tooltip-padding-inline`: dimension used by the tooltip component for padding inline (MarsUI card padding Space/xl 12px on all sides). Default: onmars `var(--ki-space-lg)`, material3 `var(--ki-space-md)`.
- `--ki-tooltip-radius`: dimension used by the tooltip component for radius (MarsUI Tooltip master 12089:7621 List_wrap: Radius/big_component/radius_xs 16px). Default: onmars `var(--ki-radius-component-sm)`, material3 `var(--ki-radius-component-xs)`.
- `--ki-tooltip-rich-backdrop-filter`: Complete backdrop filter of the rich surface. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-tooltip-rich-bg`: Fill of the rich tooltip or rich popover. Default: `var(--ki-surface-raised)`.
- `--ki-tooltip-rich-bg-image`: Optional image layer over the rich surface fill. Default: `var(--ki-surface-image-none)`.
- `--ki-tooltip-rich-border-color`: Outline ink of the rich surface. Default: `var(--ki-outline-low-em)`.
- `--ki-tooltip-rich-border-width`: Outline thickness of the rich surface. Default: `var(--ki-anchored-surface-border-width)`.
- `--ki-tooltip-rich-fg`: Ink of the rich surface body text. Default: `var(--ki-text-supporting)`.
- `--ki-tooltip-rich-font-size`: Body text size of the rich surface. Default: `var(--ki-typography-size-body-1)`.
- `--ki-tooltip-rich-font-weight`: Body text weight of the rich surface. Default: `var(--ki-typography-weight-body-normal)`.
- `--ki-tooltip-rich-heading-family`: Typeface of the rich surface heading. Default: `var(--ki-typography-family-heading)`.
- `--ki-tooltip-rich-heading-fg`: Ink of the rich surface heading over the shared fill. Default: `var(--ki-text-high-em)`.
- `--ki-tooltip-rich-heading-gap`: Distance between the rich heading and its body. Default: `var(--ki-layout-spacing-xxs)`.
- `--ki-tooltip-rich-heading-size`: Text size of the rich surface heading. Default: `var(--ki-typography-size-title-1)`.
- `--ki-tooltip-rich-heading-weight`: Text weight of the rich surface heading. Default: `var(--ki-typography-weight-body-semibold)`.
- `--ki-tooltip-rich-line-height`: Body text line height of the rich surface. Default: `var(--ki-typography-line-height-para)`.
- `--ki-tooltip-rich-max-width`: Maximum inline size of the rich surface. Default: `var(--ki-anchored-surface-rich-max-width)`.
- `--ki-tooltip-rich-padding-block`: Block-axis inset of the rich surface, before density scaling. Default: `var(--ki-anchored-surface-padding)`.
- `--ki-tooltip-rich-padding-inline`: Inline-axis inset of the rich surface, before density scaling. Default: `var(--ki-layout-spacing-3xl)`.
- `--ki-tooltip-rich-radius`: Corner radius of the rich surface. Default: `var(--ki-anchored-surface-radius)`.
- `--ki-tooltip-rich-shadow`: Raised elevation of the rich surface. Default: `var(--ki-elevation-e2)`.
- `--ki-tooltip-shadow`: shadow used by the tooltip component for shadow (MarsUI Elevation/e4 on the master wrap). Default: onmars `var(--ki-elevation-e3)`, material3 `0 0 0 0 var(--ki-color-transparent-black)`.
- `--ki-tooltip-show-delay`: duration used by the tooltip component for tooltip show delay. Default: `500ms`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
