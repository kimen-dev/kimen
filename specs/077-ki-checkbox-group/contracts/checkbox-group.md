# CheckboxGroup public contract

| Member | Contract |
| --- | --- |
| `label` | Required visible group name. |
| `name` | Key repeated once per selected option in form data. |
| `help-text`, `error-text` | Shared guidance or validation message. |
| `disabled` | Boolean presence. Makes options unavailable and omits the group from submission. |
| `value` | JavaScript `string[]` of checked values in slot order, initially empty with no checked options. Assign a fresh array to update selection. |
| `min`, `max` | Optional nonnegative integer constraints. Fail with `valueMissing` or `rangeOverflow`. |
| `orientation` | `vertical` by default or `horizontal`. |
| Default slot | Direct `ki-checkbox` options with individual labels and Tab stops. |
| `ki-change` | Bubbling, composed event with `{ value: string[] }` on a committed user toggle. |
| CSS parts | `label`, `help`, `error`. |
| Theme token | `--ki-checkbox-group-gap`, with a semantic medium-spacing default. |

Set field-level constraints and the form name on the group. A2UI
`ChoicePicker` with `multipleSelection` uses checked checkbox options, while
`mutuallyExclusive` uses the existing radio composition.
