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

## Attributes

- `datetime` (string | undefined): ISO date or date-time. Invalid or missing dates have no time label.
- `details-label` (string | undefined, default 'Details'): Label of the details control when the details slot is populated.
- `icon-name` (string | undefined): Decorative Lucide icon name, registered by the caller's per-icon import.
- `tone` ("danger" | "neutral" | "primary" | "success" | "warning", default 'neutral'): Marker tone. The event text carries the meaning.

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

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap.
- `--ki-layout-spacing-xxs`: The xxs spacing step for a stack or grid gap.
- `--ki-timeline-dot-backdrop-filter`: Complete backdrop filter behind a timeline marker, off by default.
- `--ki-timeline-dot-bg`: Fill of the neutral timeline marker.
- `--ki-timeline-dot-bg-image`: Optional decorative image over the timeline marker fill.
- `--ki-timeline-dot-danger-bg`: Fill of the danger timeline marker.
- `--ki-timeline-dot-danger-fg`: Glyph color on the danger timeline marker.
- `--ki-timeline-dot-fg`: Glyph color on the neutral timeline marker.
- `--ki-timeline-dot-icon-size`: Size of the decorative glyph inside the timeline marker.
- `--ki-timeline-dot-primary-bg`: Fill of the primary timeline marker.
- `--ki-timeline-dot-primary-fg`: Glyph color on the primary timeline marker.
- `--ki-timeline-dot-radius`: Round corners of the timeline marker.
- `--ki-timeline-dot-size`: Diameter of the timeline marker.
- `--ki-timeline-dot-success-bg`: Fill of the success timeline marker.
- `--ki-timeline-dot-success-fg`: Glyph color on the success timeline marker.
- `--ki-timeline-dot-warning-bg`: Fill of the warning timeline marker.
- `--ki-timeline-dot-warning-fg`: Glyph color on the warning timeline marker.
- `--ki-timeline-gap`: Space between marker and text and between timeline entries.
- `--ki-timeline-item-fg`: Text color of the event summary and details.
- `--ki-timeline-line-width`: Hairline width of the timeline connector.
- `--ki-timeline-time-bg`: The timestamp shows the surrounding surface through its transparent background.
- `--ki-timeline-time-fg`: Text color of the timeline timestamp.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
