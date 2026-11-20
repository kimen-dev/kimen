# ki-code-input public contract

| Prop | Attribute | Default | Behavior |
| --- | --- | --- | --- |
| `label` | `label` | Required for use | Visible and accessible name |
| `helpText` | `help-text` | Unset | Delivery instructions and code validity period |
| `errorText` | `error-text` | Browser message | Overrides the constraint error shown after validation |
| `name` | `name` | Unset | Form-data key |
| `required` | `required` | `false` | Requires a code |
| `disabled` | `disabled` | `false` | Disables editing and form participation |
| `length` | `length` | `6` | Integer from 4 to 8 |
| `type` | `type` | `numeric` | ASCII digits or ASCII letters and digits, with a matching input mode |
| `size` | `size` | `md` | Medium or small cell metrics, composed with density |
| `value` | `value` | Empty string | Normalized live code and declared reset value |

`ki-input` and `ki-complete` are bubbling, composed user-edit events with detail `{ value: string }`. Completion follows the input event for a full code. The component participates in native form validation and submits one string. It exposes `label`, `field`, `input`, `cell`, `help` and `error` parts.
