# DatePicker examples

## Choose a departure date

```html
<ki-date-picker label="Departure" name="departure" locale="en-GB" required
  help-text="Enter a date in DD/MM/YYYY format." min="2026-11-10">
</ki-date-picker>
```

Typing `20/11/2026` and pressing Enter emits
`ki-change` with `{ "value": "2026-11-20" }`.

## Apply a stay range

```html
<ki-date-picker label="Stay" name="stay" mode="range" confirm
  value="2026-11-12/2026-11-16" locale="en-GB"
  min="2026-11-10" max="2026-11-30">
</ki-date-picker>
```

Pick two endpoints and activate Apply to save the range. The form receives
one `stay` entry with the date pair.

## Text that is not a date

The field keeps text it cannot read as a date within its bounds so the
person can correct it, shows its own message (`error-text`, else
`invalid-date-label`) once the person leaves the field or presses Enter, and
stays invalid, so its form cannot submit it. It fires no `ki-change`, and
`value` keeps the last date it saved. Clearing a saved date is a change: it
fires `ki-change` with `{ "value": "" }`.

## An error from the application

Set `custom-error` to show the application's verdict on the submitted date,
such as an availability check. The field is invalid, blocks its form and is
announced as invalid at once. The person's next edit of the text or pick of
another date withdraws the error. Remove the attribute when a new attempt
starts: setting the same text again while it is still set shows nothing.

```html
<ki-date-picker label="Departure" name="departure" locale="en-GB" value="2026-12-24"
  custom-error="No flights on that day.">
</ki-date-picker>
```
