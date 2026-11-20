## Search people

When importing custom elements individually, register both
`@kimen/elements/ki-combobox` and `@kimen/elements/ki-option`.

```html
<ki-combobox label="Assignee" name="assignee" placeholder="Search people" required>
  <ki-option value="ana" description="ana@example.com">Ana Ruiz</ki-option>
  <ki-option value="juan" description="juan@example.com">Juan Antón</ki-option>
</ki-combobox>
```

## Pick or create multiple labels

```html
<ki-combobox label="Labels" name="labels" multiple allow-custom value='["bug","search"]'>
  <ki-option>bug</ki-option>
  <ki-option>search</ki-option>
  <ki-option>documentation</ki-option>
</ki-combobox>
```

Assign an array to the JavaScript `value` property to set multiple selections.
Use a JSON array string in HTML or neutral catalog specs. Each selection
submits under the same form name. Read them all with `FormData.getAll`.

## Request server results

Set `filter="none"` to display the options supplied by your application.
Listen for `ki-input` and use `event.detail.value` as the query. Set `loading`
while fetching, replace the field's `ki-option` children with the latest
results, and clear `loading`. Use `change` to respond to a committed selection.
