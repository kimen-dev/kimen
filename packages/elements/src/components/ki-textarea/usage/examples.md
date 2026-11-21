A labeled multiline field in a form (`label` is mandatory — the visible label and accessible name); `rows` sets the stable visible line count (default `2`, no auto-grow in v1):

```html
<form>
  <ki-textarea label="Comments" name="comments" rows="4"></ki-textarea>
  <ki-button variant="primary">Send</ki-button>
</form>
```

Initial text is declared through the `value` attribute — element text content is ignored — and Enter inserts a line break, never submitting the enclosing form:

```html
<ki-textarea label="Bio" name="bio" value="Web components enthusiast."></ki-textarea>
```

`required` blocks submission while empty, and an `autocomplete` purpose such as `street-address` exposes the entry's meaning to autofill:

```html
<ki-textarea
  label="Shipping address"
  name="address"
  rows="3"
  autocomplete="street-address"
  required
></ki-textarea>
```

Read-only and disabled are distinct states — `readonly` stays focusable, selectable, submitted and validation-exempt; `disabled` is none of those:

```html
<ki-textarea label="Accepted policy" value="Version 2.1, accepted 2026-05-02." readonly></ki-textarea>
<ki-textarea label="Legacy notes" value="Migrated from v1." disabled></ki-textarea>
```

## Appearance and character limits

Set `appearance` to `outlined` for a full border or `filled` for a
tinted surface with a bottom indicator. Both keep the label above the field.
The default appearance follows the theme.

`minlength` uses native minimum-length validation. The textarea keeps edits
past `maxlength` and blocks submission until the value fits. With a maximum,
`show-count` adds the current length to the field description and announces
when the user reaches or exceeds the limit. Use `maxlength-error-text` to
localize the default length error.

```html
<ki-textarea label="Bio" appearance="outlined" minlength="3" maxlength="24" show-count help-text="Keep it short" value="Designer and front-end developer"></ki-textarea>
<ki-textarea label="Short bio" appearance="filled" maxlength="12" show-count help-text="Keep it short" value="Designs generative interfaces."></ki-textarea>
```

## An error from the application

Set `custom-error` to show the application's verdict on the submitted text,
such as a moderation check. The field is invalid, blocks its form and is
announced as invalid at once. The person's next keystroke withdraws the
error. Remove the attribute when a new attempt starts: setting the same text
again while it is still set shows nothing.

```html
<ki-textarea label="Bio" name="bio" value="Call me at 555-0100" custom-error="Remove the phone number from your bio."></ki-textarea>
```
