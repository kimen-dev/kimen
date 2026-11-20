# Menu surface

| Element | Properties | Slots |
| --- | --- | --- |
| `ki-menu` | `anchor` (trigger ID), `open` (false), `placement` (bottom-start, bottom-end, top-start, top-end), `filter-label` (optional), `filter-results-label` (Matching actions: {count}) | Default actions, groups and dividers. Optional `header` for non-interactive content. |
| `ki-menu-item` | `value`, `type` (item, checkbox, radio), `checked` (false), `disabled` (false), `tone` (neutral, danger), `shortcut` (display hint) | Default action name and optional `start` icon or avatar. |
| `ki-menu-group` | `label` | Default items and dividers. |

The trigger and menu share a document or containing shadow root. The menu
reports `ki-select` with `{ value }` for a plain item or `{ value, checked }`
for a checkable item. Only that declared action is available to catalog consumers.
