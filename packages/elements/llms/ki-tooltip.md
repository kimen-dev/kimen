# ki-tooltip

> A transient, text-only description bubble for one slotted trigger.

## When to use

add a brief clarifying hint for an icon-only, abbreviated, or
otherwise ambiguous control when the same information is discoverable
elsewhere in the interface.

## When not to use

essential or unique information in a tooltip; interactive
or rich content in a tooltip; form validation messages, disabled controls,
or touch-primary flows. Use visible layout text or a future `ki-popover`
pattern for those cases.

## Examples

`label` is the entire tooltip content, reflected to the slotted trigger's accessible description; the trigger must already carry its own accessible name:

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

## Attributes

- `label` (string, default ''): The entire tooltip content. The string is reflected to the slotted trigger's accessible description without changing its name. Empty or whitespace-only labels render no tooltip and expose no description. When to use: a short hint that clarifies the slotted trigger. When NOT to use: never use `label` for essential information, rich content, interactive content, validation messages, or information attached to disabled controls; put that content in visible UI or a future popover.
- `placement` ("bottom" | "end" | "start" | "top", default 'top'): Preferred placement for the tooltip. The component may flip or clamp the rendered placement to keep the bubble inside the viewport; unknown runtime values fall back to `top`. When NOT to use: do not depend on placement for meaning or reading order.

## Slots

- (default): Exactly one interactive trigger. The component reflects `label` to the trigger's `aria-description`.

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
- `--ki-tooltip-arrow-radius`: dimension used by the tooltip component for the rounding of the arrow tip (Tooltip master pointer: 1.5px, nearest radius step).
- `--ki-tooltip-arrow-size`: dimension used by the tooltip component for the depth of the arrow that points at the trigger; it is twice as wide (Tooltip master 12089:7621 pointer: 16x8). Zero removes it. Equal to offset, so the tip meets the trigger.
- `--ki-tooltip-backdrop-filter`: Complete backdrop filter behind the tooltip bubble.
- `--ki-tooltip-bg`: color used by the tooltip component for background (flat fallback of the MarsUI glass card gradient; the v1 inverse bubble predates the master — specs/013 correction block. material3 keeps the inverse bubble via its override).
- `--ki-tooltip-bg-end`: color used by the tooltip component for the glass gradient end (MarsUI Surface/special/light-s0_dark-s2).
- `--ki-tooltip-bg-start`: color used by the tooltip component for the glass gradient start (MarsUI Surface/special/blur_base_light White/80; dark Dark/700 blur base). Paint background: linear-gradient(180deg, var(--ki-tooltip-bg-start), var(--ki-tooltip-bg-end)).
- `--ki-tooltip-border-color`: color used by the tooltip component for its edge (MarsUI hairline bevel, Outline/secondary_button_top); one token so a mode or a theme can strengthen it.
- `--ki-tooltip-border-width`: dimension used by the tooltip component for the bevel outline width (MarsUI glass card 1px Outline/secondary_button_top stroke; replaces the 1px literal ki-tooltip.css shipped while the token was pending).
- `--ki-tooltip-fg`: color used by the tooltip component for foreground (MarsUI title row Text/high_em; lands together with the glass background — white-on-glass would break contrast).
- `--ki-tooltip-font-size`: dimension used by the tooltip component for font size (MarsUI Heading_top style UI/Para/medium: body_1 13px).
- `--ki-tooltip-font-weight`: font weight used by the tooltip component for font weight.
- `--ki-tooltip-line-height`: dimension used by the tooltip component for line height (MarsUI line_height/para 20px).
- `--ki-tooltip-max-inline-size`: dimension used by the tooltip component for max inline size (288px; the master card is fixed 280px wide in its rich variants — the 8px divergence is a documented text-only reduction).
- `--ki-tooltip-offset`: dimension used by the tooltip component for offset (MarsUI caret depth 8px with zero extra gap = trigger-to-card distance).
- `--ki-tooltip-padding-block`: dimension used by the tooltip component for padding block (MarsUI card padding Space/xl 12px on all sides).
- `--ki-tooltip-padding-inline`: dimension used by the tooltip component for padding inline (MarsUI card padding Space/xl 12px on all sides).
- `--ki-tooltip-radius`: dimension used by the tooltip component for radius (MarsUI Tooltip master 12089:7621 List_wrap: Radius/big_component/radius_xs 16px).
- `--ki-tooltip-shadow`: shadow used by the tooltip component for shadow (MarsUI Elevation/e4 on the master wrap).
- `--ki-typography-family-body`: semantic font family for typography family body.
