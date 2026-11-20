# ki-segment

> A single choice in a ki-segmented-control.

## When to use

offer one mutually exclusive choice with text or a named icon.

## When not to use

standalone, for navigation, or for form submission.

## Examples

# ki-segment examples

Place each choice directly in a `ki-segmented-control`. Give every choice a
distinct value, and set the selected value on the group.

```html
<ki-segmented-control label="Date range" value="week">
  <ki-segment value="day">Day</ki-segment>
  <ki-segment value="week">Week</ki-segment>
  <ki-segment value="year" disabled>Year</ki-segment>
</ki-segmented-control>
```

Use the `start` slot for a decorative icon. An icon-only option needs
`aria-label`, which also supplies its hover and focus tooltip when enabled.

The all-elements loader registers `ki-tooltip`. When using direct imports or
framework wrappers, register it separately for icon-only options.

## Attributes

- `aria-label` (string | undefined): Accessible name of an icon-only option. An enabled icon-only option also shows this name on focus and hover when ki-tooltip is registered. The all-elements loader includes it. For a text option, use the visible label.
- `disabled` (boolean, default false): Excludes the option from selection and keyboard navigation.
- `value` (string, required): Required nonempty option identifier. Each value must be unique in its group.

## Slots

- (default): Noninteractive visible option label.
- `start`: Decorative leading icon. Supply aria-label for an icon-only option.

## Parts

- `button`: The native option surface with radio semantics.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-segment-font-size`: Text size of medium and small segments.
- `--ki-segment-font-weight`: Font weight of segment labels.
- `--ki-segment-gap`: Gap between the leading icon and label.
- `--ki-segment-icon-size`: Size of leading artwork.
- `--ki-segment-line-height`: Line height of medium and small segments.
- `--ki-segment-padding-inline`: Inline padding of a medium or small segment.
- `--ki-segmented-control-track-size-md`: Medium track height before density adjustment.
- `--ki-segmented-item-backdrop-filter`: Complete CSS backdrop filter behind an unselected segment.
- `--ki-segmented-item-bg`: Resting surface of an unselected segment, matching the track by default.
- `--ki-segmented-item-bg-image`: Optional image layered over an unselected segment surface.
- `--ki-segmented-item-disabled-fg`: Ink of an unavailable segment.
- `--ki-segmented-item-fg`: Resting ink of an unselected segment, strengthened in contrast-more.
- `--ki-segmented-item-radius`: Corner radius of each segment.
- `--ki-segmented-selected-backdrop-filter`: Complete CSS backdrop filter behind the selected segment.
- `--ki-segmented-selected-bg`: Raised selected surface, lighter than the track in both schemes.
- `--ki-segmented-selected-bg-image`: Optional image layered over the selected segment.
- `--ki-segmented-selected-border-color`: High-contrast selection boundary when elevation or surface differences are subtle.
- `--ki-segmented-selected-border-width`: Width of the selection boundary.
- `--ki-segmented-selected-fg`: Ink of the selected segment.
- `--ki-segmented-selected-shadow`: Elevation of the selected segment.
- `--ki-segmented-track-padding`: Inset between the track and its segments.
- `--ki-typography-family-body`: semantic font family for typography family body.
