# Number input contract

| Surface | Contract |
| --- | --- |
| `label`, `help-text`, `error-text` | Visible label, contextual help and optional validation message. |
| `name`, `required`, `disabled` | Native form key, constraint and disabled state. |
| `value`, `min`, `max`, `step` | Finite numbers. Omit `value` for an empty control and omit bounds for an unbounded control. Step defaults to 1. |
| `steppers` | Shows the decrease and increase buttons when true. |
| `unit` | Visible suffix and part of the accessible description. |
| `format` | `Intl.NumberFormatOptions` as a property or a JSON object as an HTML attribute. |
| `decrease-label`, `increase-label` | Button names. `{label}` inserts the visible field label. |
| `minimum-message`, `maximum-message`, `invalid-number-message` | Localizable feedback. `{value}` inserts the formatted bound for the first two messages. |
| `input`, `change` | Native edit and composed commit notifications. The live `value` property provides the number. |
| Parts | `label`, `field`, `input`, `unit`, `decrease`, `increase`, `help`, `error`, `status`. |

The field has no slots. The catalog exposes props and declares no agent actions.
