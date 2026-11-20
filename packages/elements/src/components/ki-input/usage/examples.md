A labeled field participating in native form submission (`label` is mandatory; it is the accessible name):

```html
<form>
  <ki-input label="Work email" name="email" type="email" required></ki-input>
  <ki-button variant="primary">Subscribe</ki-button>
</form>
```

Place a one-field form's only submit action inside the field.

```html
<form role="search">
  <ki-input type="search" name="q" label="Search docs" placeholder="Components, tokens…">
    <ki-button slot="action" size="sm" variant="secondary" type="submit">Search</ki-button>
  </ki-input>
</form>
```

The action has a separate tab stop. Enter in the entry also submits the form.
For an icon-only action, give `ki-icon-button size="sm"` a `label` and call
`form.requestSubmit()` from its click handler.

Read-only and disabled are distinct states — read-only stays focusable and is submitted, disabled is neither:

```html
<ki-input label="Plan" value="Pro" readonly></ki-input>
<ki-input label="Legacy ID" value="A-1042" disabled></ki-input>
```

## Appearance and character limits

Set `appearance` to `outlined` for a full border or `filled` for a
tinted surface with a bottom indicator. Both keep the label above the field.
The default appearance follows the theme.

Set `minlength` and `maxlength` to use the native input limits. With
a maximum, `show-count` adds the current length to the field description
and announces when the user reaches the limit.

```html
<ki-input label="Workspace name" appearance="outlined" minlength="3" maxlength="30" show-count help-text="Shown to members" value="Kimen design"></ki-input>
<ki-input label="Price" appearance="filled" value="49.00"><span slot="start">EUR</span><span slot="end">/ month</span></ki-input>
```
