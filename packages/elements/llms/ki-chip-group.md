# ki-chip-group

> A named collection of filter, input or assist chips, with optional ordering.

## When to use

label related chips or let people change their reading order.

## When not to use

choose exactly one option or submit a form value.

## Examples

# Chip group examples

A labelled group lets the user reorder direct chips with a drag handle,
two pointer activations on the handles, or Alt+Left/Right. The order is
announced on each move. Listen for `ki-reorder` to persist the new order.

```html
<ki-chip-group label="Recipients" type="input" reorderable focus-target="recipient">
  <ki-chip value="ana" removable>Ana García</ki-chip>
  <ki-chip value="luis" removable>Luis</ki-chip>
</ki-chip-group>
<input id="recipient" aria-label="Add recipient">
```

## Attributes

- `focus-target` (string | undefined): ID of the entry field in the same document or shadow root for focus after the last chip.
- `label` (string, default ''): Accessible name for the group or list.
- `reorder-announcement` (string, default '{label} moved to position {position} of {total}.'): Localized polite message using {label}, {position} and {total}. Position is one-based.
- `reorderable` (boolean, default false): Enables dragging, pointer pick-and-place and Alt+Left/Right to move chips.
- `type` ("assist" | "filter" | "input", default 'filter'): Shared chip kind and collection semantics. Input chips are presented as a list.

## Slots

- (default): Direct ki-chip children in reading order.

## Parts

- `group`: The wrapping chip layout.

## Events

- `ki-reorder` (CustomEvent<KiChipReorderDetail>): Emitted after moving a chip. Indices are zero-based positions in the visible chip collection.

## Methods

None.

## CSS custom properties

- `--ki-chip-group-font-family`: Font family inherited by chip group content.
- `--ki-chip-group-gap`: Gap between adjacent chips and rows.
- `--ki-chip-height-sm`: Small height of a compact pill.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
