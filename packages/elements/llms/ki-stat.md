# ki-stat

> A key metric with an optional comparison against a reference period.

## When to use

Summarize one numeric metric in a dashboard or report. Set
direction to lower-is-better for metrics such as latency and neutral for
changes that carry no favorable or unfavorable meaning.

## When not to use

Present a sequence of readings or inspect multiple data
points. Use a chart or table with a text equivalent for that data.

## Examples

# Stat

Use one stat for one key number. Choose the preference for the metric. Here,
the render time went down and the change is favorable.

```html
<ki-stat
  label="Median render time"
  value="84"
  unit="ms"
  delta="-9"
  delta-label="vs last week"
  direction="lower-is-better"
></ki-stat>
```

For a percentage comparison beside a count, set `deltaFormat` as a property.
Percent formatting takes a fraction, so 0.12 reads as 12%.

```html
<ki-stat id="active-surfaces" label="Active surfaces" value="1284" delta="0.12" delta-label="vs last week"></ki-stat>
```

```js
document.querySelector('#active-surfaces').deltaFormat = { style: 'percent' };
```

With no `delta`, the card shows the current value alone. For a trend that carries
no judgment, use `direction="neutral"`. For an informative sparkline, give the
chart a text equivalent through its own HTML semantics.

```html
<ki-stat label="Sales" value="750">
  <svg slot="chart" role="img" aria-label="Sales rose from 680 to 750 this week" viewBox="0 0 80 20" width="80" height="20">
    <path d="M1 17 L13 11 L27 14 L39 4 L52 8 L67 5 L79 1" fill="none" stroke="currentColor"></path>
  </svg>
</ki-stat>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-stat`: the default, only the tokens ki-stat needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `delta` (number | undefined): Optional finite change. Its sign determines the trend and its magnitude is displayed.
- `delta-label` (string | undefined): Localized comparison period, such as "vs last week".
- `direction` ("higher-is-better" | "lower-is-better" | "neutral", default 'higher-is-better'): Which direction is favorable for this metric. Use neutral to avoid a judgment.
- `down-label` (string, default 'down'): Localized spoken direction for a negative delta.
- `label` (string, required): Localized name of the metric, such as "Median render time".
- `unit` (string | undefined): Literal suffix for decimal readings, such as "ms".
- `up-label` (string, default 'up'): Localized spoken direction for a positive delta.
- `value` (number, required): Current finite reading.

## Slots

- `chart`: An optional sparkline after the summary. Give informative charts a textual equivalent, and hide charts that repeat the summary.

## Parts

- `card`: The surface containing the metric and chart.
- `comparison`: The optional row with delta and reference period.
- `delta`: The trend glyph and formatted comparison magnitude.
- `label`: The visible metric label.
- `reference`: The visible comparison period.
- `trend`: The decorative rising or falling trend glyph.
- `value`: The formatted current reading and its unit.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-stat-backdrop-filter`: Complete optional filter behind the metric surface.
- `--ki-stat-bg`: Raised surface of the metric card.
- `--ki-stat-bg-image`: Optional image layered over the metric surface.
- `--ki-stat-border`: Subtle metric card outline.
- `--ki-stat-border-width`: Width of the metric card outline.
- `--ki-stat-delta-danger-fg`: Ink of an unfavorable comparison.
- `--ki-stat-delta-line-height`: Line height of the comparison.
- `--ki-stat-delta-neutral-fg`: Ink of an unchanged or ungraded comparison.
- `--ki-stat-delta-size`: Text size of the comparison.
- `--ki-stat-delta-success-fg`: Ink of a favorable comparison.
- `--ki-stat-emphasis-weight`: Weight of the main reading and comparison magnitude.
- `--ki-stat-gap`: Space between the reading and comparison or chart.
- `--ki-stat-label-fg`: Ink of the metric label and comparison period.
- `--ki-stat-label-line-height`: Line height of the metric label.
- `--ki-stat-label-size`: Text size of the metric label.
- `--ki-stat-padding`: Insets around the metric and chart.
- `--ki-stat-radius`: Corner radius of the metric card.
- `--ki-stat-trend-gap`: Space between the trend glyph and comparison magnitude.
- `--ki-stat-trend-size`: Size of the rising or falling trend glyph.
- `--ki-stat-value-fg`: Ink of the main reading.
- `--ki-stat-value-font-family`: Typeface of the main reading.
- `--ki-stat-value-letter-spacing`: Spacing between digits in the main reading.
- `--ki-stat-value-line-height`: Line height of the main reading.
- `--ki-stat-value-size`: Size of the main reading.
- `--ki-typography-family-body`: semantic font family for typography family body.
