# Menu examples

## Row actions

Register `ki-button`, `ki-menu`, `ki-menu-item`, `ki-menu-group`, and
`ki-divider` when using the elements individually.

```html
<ki-button id="row-actions" type="button">Actions</ki-button>
<ki-menu id="row-menu" anchor="row-actions" filter-label="Filter actions">
  <ki-menu-group label="Edit">
    <ki-menu-item value="rename" shortcut="F2">Rename</ki-menu-item>
    <ki-menu-item value="duplicate">Duplicate</ki-menu-item>
    <ki-menu-item value="move" disabled>Move to…</ki-menu-item>
    <ki-menu-item value="pin" type="checkbox" checked>Pin to sidebar</ki-menu-item>
  </ki-menu-group>
  <ki-divider></ki-divider>
  <ki-menu-item value="delete" tone="danger">Delete</ki-menu-item>
</ki-menu>
```

```js
const menu = document.getElementById('row-menu');
menu.addEventListener('ki-select', ({ detail: { value, checked } }) => {
  dispatchRowAction(value, checked);
});
```

A plain action emits its value and closes the popup. A checkbox also emits its
new checked state and keeps the popup open. A radio selection emits
`checked: true`, clears its peer radios and closes the popup. Place independent
radio sets in distinct groups.

## Account menu

```html
<button id="account" type="button" aria-label="Account for Ana García">AG</button>
<ki-menu anchor="account" placement="bottom-end">
  <p slot="header">Ana García<br />ana@example.com</p>
  <ki-divider></ki-divider>
  <ki-menu-item value="profile">Profile</ki-menu-item>
  <ki-menu-item value="sign-out">Sign out</ki-menu-item>
</ki-menu>
```

Give a glyph-only trigger an accessible name. Keep header content informational
and put actions in `ki-menu-item`. A `start` slot can hold a decorative SVG or
avatar. The application owns the shortcuts displayed by `shortcut`.

With a filter, supply `filter-label` and optionally localize
`filter-results-label`, retaining `{count}` where the number should appear.
