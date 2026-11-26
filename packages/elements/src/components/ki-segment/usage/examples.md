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
