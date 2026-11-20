# Interactive list contract

| Element | API | Meaning |
| --- | --- | --- |
| `ki-list` | `selection` | `none`, `single`, or `multiple` |
| `ki-list` | `label` | Accessible name for an interactive list |
| `ki-list` | `name`, `required` | Submission key and selection constraint |
| `ki-list` | `value` | Selected value or null in single mode, ordered array in multiple mode |
| `ki-list-item` | `href` | Native whole-row link outside selection mode |
| `ki-list-item` | `value`, `selected`, `disabled` | Option value, selected state and availability |

The list emits `ki-change` with a `{ value }` detail from a user selection.
Author updates and form resets update state silently. In multiple mode the
form includes one entry per selected enabled row in source order. In single
mode it includes the selected enabled row. A required list with no selected
enabled option is invalid.

The selection list follows the listbox pattern with roving focus. A
navigation list retains list and listitem semantics. A control row has
structural listitem semantics and only its trailing control takes focus.
