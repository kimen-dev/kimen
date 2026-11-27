# ki-menu

> A popup of actions opened by a button in the same document or shadow root.

## When to use

row actions, account commands, split buttons, and overflow actions.

## When not to use

form values, navigation destinations, or long action lists.

## Examples

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

# When to use Menu

Use Menu for commands on the same object, account actions, split buttons and
overflow actions. Keep destructive actions at the end after a divider. Pick
a select for a form value, links for navigation, or a dialog or page for
long action lists.

Supply a host-authored trigger with an ID in the same DOM tree. Bind the
catalog action on the menu's declared `ki-select` event. Application DOM
listeners can read the selected item's `value` and optional `checked` from
the event detail.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-menu`: the default, only the tokens ki-menu needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `anchor` (string, default '', ID of another element of the same spec): Literal ID of the menu button in the same document or containing shadow root.
- `filter-label` (string, default ''): Accessible name and placeholder of the filter. Omit to hide the field.
- `filter-results-label` (string, default 'Matching actions: {count}'): Polite results message. The menu substitutes the number of matches for `{count}`.
- `open` (boolean, default false): Whether the popup is open. Reflected when the user opens or dismisses it.
- `placement` ("bottom-end" | "bottom-start" | "top-end" | "top-start", default 'bottom-start'): Preferred side and logical alignment. Flips when the opposite side has more room.

## Slots

- (default): Place ki-menu-item, ki-menu-group, and ki-divider here.
- `header`: Informational content above the actions, such as account details.

## Parts

- `filter`: The filter field.
- `header`: The informational header.
- `menu`: The named menu containing the actions.
- `popup`: The anchored surface.

## Events

- `ki-select` (CustomEvent<KiMenuSelectDetail>): Reports the selected action and, for a checkbox or radio, its new checked state.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-menu-backdrop-filter`: Complete backdrop filter applied to the popup.
- `--ki-menu-bg`: Base fill of the popup surface.
- `--ki-menu-bg-image`: Optional image composited over the popup fill.
- `--ki-menu-border`: Popup edge and the filter divider.
- `--ki-menu-border-width`: Thickness of menu border and dividers.
- `--ki-menu-fg`: Text over the popup surface.
- `--ki-menu-filter-icon-size`: Size of the search icon.
- `--ki-menu-focus-color`: Color of a visible keyboard focus outline.
- `--ki-menu-focus-width`: Width of a visible keyboard focus outline.
- `--ki-menu-font-family`: Family for action labels and the filter.
- `--ki-menu-font-size`: Text size for action labels and the filter.
- `--ki-menu-gap`: Inline space between the parts of a row.
- `--ki-menu-inline-padding`: Start and end inset of an action, group label, or filter.
- `--ki-menu-item-height`: Default action row minimum height.
- `--ki-menu-item-radius`: Action row corner radius.
- `--ki-menu-line-height`: Line height for action labels and the filter.
- `--ki-menu-max-block-size`: Maximum popup height, bounded by the viewport.
- `--ki-menu-max-inline-size`: Maximum popup width, bounded by the viewport.
- `--ki-menu-meta-bg`: Background behind shortcut hints and the filter placeholder.
- `--ki-menu-meta-fg`: Foreground for shortcut hints and the filter placeholder.
- `--ki-menu-min-inline-size`: Default minimum popup width, bounded by the viewport.
- `--ki-menu-padding`: Space inside the popup.
- `--ki-menu-radius`: Popup corner radius.
- `--ki-menu-shadow`: Popup elevation shadow.
- `--ki-menu-touch-target`: Minimum action and filter height for coarse pointers.
