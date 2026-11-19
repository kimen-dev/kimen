# Segmented control consumer contract

```html
<ki-segmented-control label="Range" value="week" size="md">
  <ki-segment value="day">Day</ki-segment>
  <ki-segment value="week">Week</ki-segment>
  <ki-segment value="month">Month</ki-segment>
</ki-segmented-control>
```

The group exposes `label`, `value`, `size` and `full-width`, along with the default slot and the `track` part. Its `value` property reads the resolved selection. Listen for `ki-change` to apply the range. The event carries `{ value: string }` and fires once for a changed user choice.

Each child exposes `value`, `disabled` and `aria-label`, the default and `start` slots, and the `button` part. Slot noninteractive text or artwork. Icon-only choices need `aria-label` and a decorative icon in the `start` slot. Hover or focus reveals the enabled icon-only choice's tooltip.

The catalog can compose the group with segment children and bind the group's declared `ki-change` action. Direct imports and React, Vue and Angular wrappers expose both elements.
