# ki-segmented-control

> A compact control for one in-place choice among two to five options.

## When to use

apply a chart range, view mode, or another immediate setting.

## When not to use

switching between panels (ki-tabs), submitted form choices
(ki-radio-group), or more than five options (ki-select).

## Examples

# ki-segmented-control examples

## Change a chart range

```html
<ki-segmented-control id="range" label="Chart range" value="week">
  <ki-segment value="day">Day</ki-segment>
  <ki-segment value="week">Week</ki-segment>
  <ki-segment value="month">Month</ki-segment>
</ki-segmented-control>
```

```js
import { defineCustomElement as defineControl } from '@kimen/elements/ki-segmented-control';
import { defineCustomElement as defineSegment } from '@kimen/elements/ki-segment';

defineControl();
defineSegment();

document.querySelector('#range').addEventListener('ki-change', ({ detail }) => {
  updateChartRange(detail.value);
});
```

## Give an icon-only option a name

```html
<ki-segmented-control label="View" size="sm" full-width>
  <ki-segment value="list">List</ki-segment>
  <ki-segment value="board" aria-label="Board">
    <svg slot="start" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 2h4v12H2zm6 0h6v7H8z" fill="currentColor"></path>
    </svg>
  </ki-segment>
</ki-segmented-control>
```

The loader discovers the tooltip in the segment’s shadow root. With direct imports
or framework wrappers, register it before mounting an icon-only option.

```js
import { defineCustomElement as defineTooltip } from '@kimen/elements/ki-tooltip';

defineTooltip();
```

Supply a visible label when space permits. The icon-only option takes its
accessible name and hover or focus tooltip from `aria-label`. Keep slotted
content noninteractive.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-segmented-control`: the default, only the tokens ki-segmented-control needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `full-width` (boolean, default false): Distribute the available inline space evenly among all segments. A label wider than its equal share wraps onto a second line.
- `label` (string, required): Required accessible name of the group. Use a short name for the setting.
- `size` ("md" | "sm" | "xs", default 'md'): Track size. The default heights are 28, 32 and 40 CSS px respectively; surrounding density settings can increase or decrease targets.
- `value` (string, default ''): Resolved selected value. Set it to choose an option programmatically. Omit it to select the first available option. The value is empty when there are no available options. Programmatic changes are silent.

## Slots

- (default): Two to five direct ki-segment children with distinct nonempty values.

## Parts

- `track`: Surface containing the radiogroup and its options.

## Events

- `ki-change` (CustomEvent<{ value: string }>): Emitted once per changed user choice with the new resolved value.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-segment-font-size-xs`: Text size of extra-small segments.
- `--ki-segment-line-height-xs`: Line height of extra-small segments.
- `--ki-segment-padding-inline-xs`: Inline padding of an extra-small segment.
- `--ki-segmented-control-track-size-md`: Medium track height before density adjustment.
- `--ki-segmented-control-track-size-sm`: Small track height before density adjustment.
- `--ki-segmented-control-track-size-xs`: Extra-small track height before density adjustment.
- `--ki-segmented-radius`: Corner radius of the control track.
- `--ki-segmented-track-backdrop-filter`: Complete CSS backdrop filter behind the track.
- `--ki-segmented-track-bg`: Solid surface for the segment track.
- `--ki-segmented-track-bg-image`: Optional image layered over the track surface.
- `--ki-segmented-track-gap`: Gap between adjacent segments.
- `--ki-segmented-track-padding`: Inset between the track and its segments.
- `--ki-typography-family-body`: semantic font family for typography family body.
