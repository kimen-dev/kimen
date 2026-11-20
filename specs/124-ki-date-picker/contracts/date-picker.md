# DatePicker public contract

| Surface | Contract |
| --- | --- |
| Form | `label`, `help-text`, `error-text`, `required`, `disabled`, `name`. A range contributes one entry. Reset restores the initial value. |
| Selection | `mode="single"` or `"range"`, `value` in ISO date or `start/end`, `min` and `max` inclusive, and optional `confirm`. |
| Locale | `locale` is a BCP 47 language tag. `first-day-of-week` runs from Sunday (0) to Saturday (6). |
| Event | `ki-change` bubbles with `{ value: string }` on changed user commits. |
| Catalog | Form and calendar properties are serializable. The component exposes the change action and has no slots. |
| Keyboard | Arrows, Home/End, Page Up/Down, Shift+Page Up/Down, Enter/Space and Escape. Focus can leave the non-modal dialog. |

The TSX JSDoc is the source of truth for public metadata and generated surfaces.
