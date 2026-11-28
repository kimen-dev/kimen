# ki-timeline-item

> One event in a timeline, with an optional time and details disclosure.

## When to use

describe an activity, audit, or run event inside a ki-timeline.

## When not to use

convey the outcome only through marker colour, or use the marker
as a control. Put actions in the event content or details.

## Examples

# ki-timeline-item examples

## Add an avatar and expandable details

```html
<ki-timeline label="Order updates" order="oldest-first">
  <ki-timeline-item datetime="2024-11-19">
    <ki-avatar slot="start" initials="ML" size="xs"></ki-avatar>
    Mina Lee packed the order
  </ki-timeline-item>
  <ki-timeline-item datetime="2024-11-20T11:45:00Z" details-label="Carrier details">
    Dispatch confirmed
    <div slot="details">The parcel is with the carrier.</div>
  </ki-timeline-item>
</ki-timeline>
```

Keep identity and status in the event text. Use the decorative `start`
slot for an avatar or use `icon-name` with an imported Lucide glyph. If you
use direct imports, register `ki-avatar` when you use it in the slot.

Use `details-label` to localize or describe the disclosure. The control
appears only when the event supplies details. The main event text stays
visible while details are collapsed.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-timeline-item`: the default, only the tokens ki-timeline-item needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `datetime` (string | undefined): ISO date or date-time. Invalid or missing dates have no time label.
- `details-label` (string | undefined, default 'Details'): Label of the details control when the details slot is populated.
- `icon-name` (string | undefined): Decorative Lucide icon name, registered by the caller's per-icon import.
- `tone` ("danger" | "neutral" | "primary" | "success" | "warning", default 'neutral'): Marker tone. The event text carries the meaning. Without an icon, a non-neutral tone draws a solid dot in its ink.

## Slots

- (default): Event summary. Include important status information in the text.
- `details`: Additional event information in a native details disclosure.
- `start`: Decorative avatar or other noninteractive marker in place of the icon.

## Parts

- `content`: Event summary, time and disclosure container.
- `details`: Native details disclosure.
- `dot`: Decorative event marker.
- `summary`: Keyboard-accessible details control.
- `time`: Native time element for a valid ISO date.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap. Default: `var(--ki-space-md)`.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap. Default: `var(--ki-space-xs)`.
- `--ki-layout-spacing-xxs`: The xxs spacing step for a stack or grid gap. Default: `var(--ki-space-xxs)`.
- `--ki-timeline-dot-backdrop-filter`: Complete backdrop filter behind a timeline marker, off by default. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-timeline-dot-bg`: Fill of the neutral timeline marker. Default: `var(--ki-surface-s2)`.
- `--ki-timeline-dot-bg-image`: Optional decorative image over the timeline marker fill. Default: `var(--ki-surface-image-none)`.
- `--ki-timeline-dot-danger-bg`: Fill of the danger timeline marker. Default: onmars `var(--ki-surface-danger-tint)`, material3 `var(--ki-surface-danger-base-em)`.
- `--ki-timeline-dot-danger-fg`: Glyph color on the danger timeline marker. Default: `var(--ki-text-danger-high-em)`.
- `--ki-timeline-dot-fg`: Glyph color on the neutral timeline marker. Default: `var(--ki-text-med-em)`.
- `--ki-timeline-dot-icon-size`: Size of the decorative glyph inside the timeline marker. Default: `var(--ki-layout-spacing-2xl)`.
- `--ki-timeline-dot-primary-bg`: Fill of the primary timeline marker. Default: `var(--ki-surface-primary-low-em)`.
- `--ki-timeline-dot-primary-fg`: Glyph color on the primary timeline marker. Default: `var(--ki-text-primary-on-primary-light)`.
- `--ki-timeline-dot-radius`: Round corners of the timeline marker. Default: `var(--ki-corner-activity-mark)`.
- `--ki-timeline-dot-size`: Diameter of the timeline marker. Default: `var(--ki-layout-spacing-9xl)`.
- `--ki-timeline-dot-success-bg`: Fill of the success timeline marker. Default: onmars `var(--ki-surface-success-tint)`, material3 `var(--ki-surface-success-base-em)`.
- `--ki-timeline-dot-success-fg`: Glyph color on the success timeline marker. Default: `var(--ki-text-success-high-em)`.
- `--ki-timeline-dot-warning-bg`: Fill of the warning timeline marker. Default: onmars `var(--ki-surface-warning-tint)`, material3 `var(--ki-surface-warning-base-em)`.
- `--ki-timeline-dot-warning-fg`: Glyph color on the warning timeline marker. Default: `var(--ki-text-warning-high-em)`.
- `--ki-timeline-gap`: Space between marker and text and between timeline entries. Default: `var(--ki-layout-spacing-xl)`.
- `--ki-timeline-item-fg`: Text color of the event summary and details. Default: `var(--ki-text-high-em)`.
- `--ki-timeline-line-width`: Hairline width of the timeline connector. Default: `var(--ki-control-border-width)`.
- `--ki-timeline-time-bg`: The timestamp shows the surrounding surface through its transparent background. Default: `var(--ki-surface-transparent)`.
- `--ki-timeline-time-fg`: Text color of the timeline timestamp. Default: `var(--ki-text-med-em)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para. Default: `var(--ki-font-line-height-para)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
