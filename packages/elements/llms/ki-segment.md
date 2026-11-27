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

The loader defines `ki-tooltip` when it appears in a segment’s shadow root. When using direct imports or
framework wrappers, register it separately for icon-only options.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-segment`: the default, only the tokens ki-segment needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `aria-label` (string | undefined): Accessible name of an icon-only option. An enabled icon-only option also shows this name on focus and hover when ki-tooltip is registered. The loader defines the tooltip when the segment draws it. For a text option, use the visible label.
- `disabled` (boolean, default false): Excludes the option from selection and keyboard navigation.
- `value` (string, required): Required nonempty option identifier. Each value must be unique in its group.

## Slots

- (default): Noninteractive visible option label. A label wider than its share of the row wraps onto a second line and every option of the row keeps one height; text that would need a third line ends with an ellipsis, and the full text stays the option's accessible name. Keep it to a few words.
- `start`: Decorative leading icon. Supply aria-label for an icon-only option.

## Parts

- `button`: The native option surface with radio semantics.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-segment-font-size`: Text size of medium and small segments. Default: `var(--ki-typography-size-body-1)`.
- `--ki-segment-font-weight`: Font weight of segment labels. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-segment-gap`: Gap between the leading icon and label. Default: `var(--ki-control-icon-gap)`.
- `--ki-segment-icon-size`: Size of leading artwork. Default: `var(--ki-glyph-size-sm)`.
- `--ki-segment-line-height`: Line height of medium and small segments. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-segment-padding-inline`: Inline padding of a medium or small segment. Default: `var(--ki-spacing-block)`.
- `--ki-segmented-control-track-size-md`: Medium track height before density adjustment. Default: `var(--ki-control-size-md)`.
- `--ki-segmented-item-backdrop-filter`: Complete CSS backdrop filter behind an unselected segment. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-segmented-item-bg`: Resting surface of an unselected segment, matching the track by default. Default: `var(--ki-surface-s2)`.
- `--ki-segmented-item-bg-image`: Optional image layered over an unselected segment surface. Default: `var(--ki-surface-image-none)`.
- `--ki-segmented-item-disabled-fg`: Ink of an unavailable segment. Default: onmars `var(--ki-text-low-em)`, material3 `var(--ki-outline-strong)`.
- `--ki-segmented-item-fg`: Resting ink of an unselected segment, strengthened in contrast-more. Default: `var(--ki-text-supporting)`.
- `--ki-segmented-item-radius`: Corner radius of each segment. Default: `var(--ki-control-radius-item)`.
- `--ki-segmented-selected-backdrop-filter`: Complete CSS backdrop filter behind the selected segment. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-segmented-selected-bg`: Raised selected surface, lighter than the track in both schemes. Default: `var(--ki-surface-special-light-s0-dark-s4)`.
- `--ki-segmented-selected-bg-image`: Optional image layered over the selected segment. Default: `var(--ki-surface-image-none)`.
- `--ki-segmented-selected-border-color`: High-contrast selection boundary when elevation or surface differences are subtle. Default: `var(--ki-outline-strong)`.
- `--ki-segmented-selected-border-width`: Width of the selection boundary. Default: `var(--ki-control-border-width)`.
- `--ki-segmented-selected-fg`: Ink of the selected segment. Default: `var(--ki-text-high-em)`.
- `--ki-segmented-selected-shadow`: Elevation of the selected segment. Default: `var(--ki-elevation-e1)`.
- `--ki-segmented-track-padding`: Inset between the track and its segments. Default: `var(--ki-control-track-inset)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
