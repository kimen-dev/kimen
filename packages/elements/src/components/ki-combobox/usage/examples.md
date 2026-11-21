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

## An error from the application

Set `custom-error` to show the application's verdict on the committed
choice. The field is invalid, blocks its form and is announced as invalid at
once. Choosing, removing or clearing a choice withdraws the error; typing
filter text does not. Remove the attribute when a new attempt starts:
setting the same text again while it is still set shows nothing.

```html
<ki-combobox label="Assignee" name="assignee" value="ana" custom-error="Ana is on leave this week.">
  <ki-option value="ana">Ana Ruiz</ki-option>
  <ki-option value="juan">Juan Antón</ki-option>
</ki-combobox>
```
