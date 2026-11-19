# Combobox contract

The default slot accepts direct `ki-option` children. Their text supplies the
label and their `value` supplies the committed value. An omitted value falls
back to the trimmed label. The optional `description` and `start` content
appear in the corresponding choice row. Each effective option value identifies
one choice. Leading slot content is decorative and has no interactive controls.

The field accepts `label`, `placeholder`, `help-text`, `error-text`,
`required`, `disabled` and `name`. Use the `value` property to read or set
a committed string or, with `multiple`, a string array. An empty selection is
`""` or `[]`. The query remains editable regardless of the current selection.
`filter` accepts `contains` (default), `starts-with` and `none`.
`allow-custom` makes a free entry available and `loading` replaces choices
with a spinner. Labels for custom entry, removal, loading, empty state,
required validation and result count are configurable.

The composed `ki-input` event carries `{ value: string }` after a native
query edit. The composed `ki-change` event carries
`{ value: string | string[] }` after a user changes a committed selection.
Programmatic assignments and form reset synchronize state without emitting
these events. Submit the committed value through ElementInternals, once for a
single choice or as repeated entries for multiple choices. Required validation
uses the committed selection. Disabled fields are out of the tab and
submission order.

The field carries the combobox role. It keeps focus during choice navigation,
references the expanded listbox and its active option, and reports the result
count through a polite status. Enter chooses the active option. Escape closes
then clears. Removing a tag returns focus to the field. The listbox row uses
selection state separately from the active choice indicator.

The A2UI adapter maps ChoicePicker options and initial selection, using
`ki-combobox` with `ki-option` for lists with sixteen or more entries.
