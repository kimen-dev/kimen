# Public surface

`value` uses `HH:mm` in 24-hour time. `label`, `help-text`, `error-text`, `name`, `required`, and `disabled` follow the shared field conventions. `min` and `max` are inclusive. `step` defaults to 30 minutes and affects only suggestions. The optional `time-zone` identifies the time's context in the help line. Optional label props localize the trigger, suggestions and fallback validation message.

The list uses an editable combobox with `aria-controls`, `aria-expanded`, and `aria-activedescendant`. Opening and arrow navigation retain focus in the text field. Enter selects an active suggestion. Escape dismisses the overlay while preserving the draft. The editable combobox retains or regains focus after choosing a slot.

`ki-change` carries `{ value: string }` after a changed user commit. The component also dispatches native `change` for form bindings. Programmatic writes and form reset are silent. Form serialization uses canonical time and disables invalid submission. The `value` attribute declares the reset value.
