# InputAction API

| Surface | Contract |
| --- | --- |
| `ki-input` slot `action` | One small `ki-button` or `ki-icon-button` inside the field, after `end`. The action has its own accessible name and tab stop. |
| `--ki-input-action-gap` | Gap between the action and the element before it. Defaults to `var(--ki-space-xs)`. |
| `--ki-input-action-padding-end` | Space between the action and the inside edge of the field border. Defaults to `var(--ki-space-xs)`. |

For a search landmark, use `<form role="search">` with a search input. Use
`<ki-button slot="action" type="submit" size="sm">` for form submission. An
icon-only button requires a `label` and a click handler that requests form
submission. Pressing Enter in the entry uses the normal ki-input submit path.
The catalog exposes `action` as a named slot.
