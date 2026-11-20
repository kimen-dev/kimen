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
