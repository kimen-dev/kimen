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
