# Chip public contract

| Tag | API | Default or effect |
| --- | --- | --- |
| `ki-chip` | `type="filter\|input\|assist"` | Inherits group type, otherwise filter |
| `ki-chip` | `value`, `selected`, `removable`, `disabled` | Empty value and false flags |
| `ki-chip` | `size="sm\|md"` | md |
| `ki-chip` | `remove-label` | Remove |
| `ki-chip` | Default slot, `start` | Text label and decorative icon or avatar |
| `ki-chip` | `ki-change` | `{ selected }` for a filter |
| `ki-chip` | `ki-remove` | Cancelable, `{ value }` for removable input |
| `ki-chip` | `ki-activate` | Assist activation, `{ value }` |
| `ki-chip-group` | `label`, `type`, `reorderable` | Label required in use, filter and false by default |
| `ki-chip-group` | `focus-target` | ID of the field in the same tree |
| `ki-chip-group` | `reorder-announcement` | `{label} moved to position {position} of {total}.` |
| `ki-chip-group` | `ki-reorder` | `{ value, fromIndex, toIndex }` after a move |

A group slots direct chips. Its order is the DOM order and event indices are zero-based.
