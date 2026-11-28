The default slot is the visible label — the accessible name and a native activation surface; when checked, `name` and `value` pair into the submitted form data:

```html
<form>
  <ki-checkbox name="channels" value="email" checked>Email</ki-checkbox>
  <ki-checkbox name="channels" value="sms">SMS</ki-checkbox>
  <ki-button variant="primary">Save preferences</ki-button>
</form>
```

Without `value` a checked box submits `on`. Unchecked boxes contribute no form entry.

```html
<ki-checkbox name="newsletter" checked>Send me the weekly digest</ki-checkbox>
```

`required` blocks submission while unchecked (the invalid appearance appears only after a blocked attempt or an invalidating toggle, never on initial render), and `disabled` removes the checkbox from keyboard reach and form data:

```html
<form>
  <ki-checkbox name="terms" required>I accept the terms of service</ki-checkbox>
  <ki-checkbox name="fax" disabled>Notify me by fax</ki-checkbox>
  <ki-button variant="primary">Create account</ki-button>
</form>
```

`indeterminate` presents the mixed state of a "select all" parent — presentation-only, exposed to assistive technology as mixed, cleared by any user toggle, and never submitted (model data stays binary through `checked`):

```html
<ki-checkbox indeterminate>Select all rows</ki-checkbox>
```

## An error from the application

Set `custom-error` to show the application's verdict on the submitted
answer. The checkbox is invalid, blocks its form and is announced as invalid
at once. Toggling it withdraws the error. Remove the attribute when a new
attempt starts: setting the same text again while it is still set shows
nothing. Inside a `ki-checkbox-group`, set it on the group.

```html
<ki-checkbox name="newsletter" checked custom-error="Confirm your email address before subscribing.">Send me the newsletter</ki-checkbox>
```
