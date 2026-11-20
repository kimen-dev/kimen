# Chip examples

Use a filter group for independent toggles. Read `ki-change.detail.selected` to
update the results. The chip's `value` identifies the filter.

```html
<ki-chip-group label="Team" type="filter">
  <ki-chip value="design" selected>Design</ki-chip>
  <ki-chip value="eng">Engineering</ki-chip>
</ki-chip-group>
```

Use an input group for picked values. Link the entry field by ID so focus
returns to it after the last chip. Listen to `ki-remove` to update your
collection. If a framework owns these nodes, cancel the event and let it
apply the DOM change, then focus the next chip or the linked field.

```html
<ki-chip-group label="Recipients" type="input" focus-target="recipient">
  <ki-chip value="ana" removable>
    <ki-avatar slot="start" size="xxs" initials="AG" label="Ana García"></ki-avatar>
    Ana García
  </ki-chip>
  <ki-chip value="luis" removable>Luis</ki-chip>
</ki-chip-group>
<input id="recipient" aria-label="Add recipient">
```

Use assist for a contextual action. Handle `ki-activate` in application code.

```html
<ki-chip type="assist" value="calendar">
  <svg slot="start" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="5" width="18" height="16" rx="2"/>
    <path d="M3 10h18M8 2v6m8-6v6"/>
  </svg>
  Add to calendar
</ki-chip>
```
