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

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-effect-component-secondary-default-shadow`: MarsUI Component_effect/secondary_default: drop 0/2/1.5/-0.5 plus inner White/3 0/2/3. Pair with --ki-effect-component-backdrop-filter.
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-duration-instant`: Zero-duration step: transitions that must complete immediately (reduced-motion fallbacks, instant handoffs).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard-accelerate`: Utility exit curve. M3 md.sys.motion.easing.standard-accelerate. onmars: the MarsUI accelerate curve (ki.easing.in).
- `--ki-surface-image-tooltip-arrow-end`: End-edge arrow color for a themed tooltip surface.
- `--ki-surface-image-tooltip-arrow-start`: Start-edge arrow color for a themed tooltip surface.
- `--ki-tooltip-arrow-radius`: dimension used by the tooltip component for the rounding of the arrow tip (Tooltip master pointer: 1.5px, nearest radius step).
- `--ki-tooltip-arrow-size`: dimension used by the tooltip component for the depth of the arrow that points at the trigger; it is twice as wide (Tooltip master 12089:7621 pointer: 16x8). Zero removes it. Equal to offset, so the tip meets the trigger.
- `--ki-tooltip-backdrop-filter`: Complete backdrop filter behind the tooltip bubble.
- `--ki-tooltip-bg`: Base background color of the tooltip. Onmars v1 used a transparent backing beneath its translucent image.
- `--ki-tooltip-bg-image`: Optional CSS background image layered over the tooltip fill. Use none for a solid fill.
- `--ki-tooltip-border-color`: color used by the tooltip component for its edge (MarsUI hairline, Outline/secondary_button_top); one token so a mode or a theme can strengthen it.
- `--ki-tooltip-border-width`: dimension used by the tooltip component for the outline width (MarsUI card 1px Outline/secondary_button_top stroke; replaces the 1px literal ki-tooltip.css shipped while the token was pending).
- `--ki-tooltip-fg`: color used by the tooltip component for foreground (MarsUI title row Text/high_em; onmars v2 sets the inverse tooltip ink).
- `--ki-tooltip-font-size`: dimension used by the tooltip component for font size (MarsUI Heading_top style UI/Para/medium: body_1 13px).
- `--ki-tooltip-font-weight`: font weight used by the tooltip component for font weight.
- `--ki-tooltip-line-height`: dimension used by the tooltip component for line height (MarsUI line_height/para 20px).
- `--ki-tooltip-max-inline-size`: dimension used by the tooltip component for max inline size (288px; the master card is fixed 280px wide in its rich variants — the 8px divergence is a documented text-only reduction).
- `--ki-tooltip-offset`: dimension used by the tooltip component for offset (MarsUI caret depth 8px with zero extra gap = trigger-to-card distance).
- `--ki-tooltip-padding-block`: dimension used by the tooltip component for padding block (MarsUI card padding Space/xl 12px on all sides).
- `--ki-tooltip-padding-inline`: dimension used by the tooltip component for padding inline (MarsUI card padding Space/xl 12px on all sides).
- `--ki-tooltip-radius`: dimension used by the tooltip component for radius (MarsUI Tooltip master 12089:7621 List_wrap: Radius/big_component/radius_xs 16px).
- `--ki-tooltip-rich-backdrop-filter`: Complete backdrop filter of the rich surface.
- `--ki-tooltip-rich-bg`: Fill of the rich tooltip or rich popover.
- `--ki-tooltip-rich-bg-image`: Optional image layer over the rich surface fill.
- `--ki-tooltip-rich-border-color`: Outline ink of the rich surface.
- `--ki-tooltip-rich-border-width`: Outline thickness of the rich surface.
- `--ki-tooltip-rich-fg`: Ink of the rich surface body text.
- `--ki-tooltip-rich-font-size`: Body text size of the rich surface.
- `--ki-tooltip-rich-font-weight`: Body text weight of the rich surface.
- `--ki-tooltip-rich-heading-family`: Typeface of the rich surface heading.
- `--ki-tooltip-rich-heading-fg`: Ink of the rich surface heading over the shared fill.
- `--ki-tooltip-rich-heading-gap`: Distance between the rich heading and its body.
- `--ki-tooltip-rich-heading-size`: Text size of the rich surface heading.
- `--ki-tooltip-rich-heading-weight`: Text weight of the rich surface heading.
- `--ki-tooltip-rich-line-height`: Body text line height of the rich surface.
- `--ki-tooltip-rich-max-width`: Maximum inline size of the rich surface.
- `--ki-tooltip-rich-padding-block`: Block-axis inset of the rich surface, before density scaling.
- `--ki-tooltip-rich-padding-inline`: Inline-axis inset of the rich surface, before density scaling.
- `--ki-tooltip-rich-radius`: Corner radius of the rich surface.
- `--ki-tooltip-rich-shadow`: Raised elevation of the rich surface.
- `--ki-tooltip-shadow`: shadow used by the tooltip component for shadow (MarsUI Elevation/e4 on the master wrap).
- `--ki-typography-family-body`: semantic font family for typography family body.
