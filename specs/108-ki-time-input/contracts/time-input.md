# Public surface

`value` uses `HH:mm` in 24-hour time. `label`, `help-text`, `error-text`, `name`, `required`, and `disabled` follow the shared field conventions. `min` and `max` are inclusive. `step` defaults to 30 minutes and affects only suggestions. The optional `time-zone` identifies the time's context in the help line. `picker` defaults to `list`. Optional label props localize the trigger, suggestions, dial fields and actions, and the fallback validation message.

The list uses an editable combobox with `aria-controls`, `aria-expanded`, and `aria-activedescendant`. Opening and arrow navigation retain focus in the text field. Enter selects an active suggestion. Escape dismisses the overlay while preserving the draft. The touch dial uses a named modal, editable spinbuttons, a localized day-period control where applicable, and a polite localized draft status. The trigger regains focus after dismissing the dial.

`ki-change` carries `{ value: string }` after a changed user commit. Programmatic writes and form reset are silent. Form serialization uses canonical time and disables invalid submission. The `value` attribute declares the reset value.
