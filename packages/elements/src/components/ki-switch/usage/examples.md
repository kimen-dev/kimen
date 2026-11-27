The slotted label provides the accessible name.

```html
<ki-switch checked>Autosave</ki-switch>
<ki-switch>Desktop notifications</ki-switch>
```

While on, a named switch contributes `name`/`value` to native form data (`on` when `value` is omitted, checkbox parity); while off it contributes nothing:

```html
<form>
  <ki-switch name="tracking" value="enabled" checked>Usage analytics</ki-switch>
</form>
```

User toggles dispatch composed `input` and `change` events — apply the setting immediately, a switch never waits for a submit; `disabled` preserves the current state while removing the switch from keyboard reach and form data:

```html
<ki-switch checked disabled>Beta features (unavailable on this plan)</ki-switch>
```

## An error from the application

Set `custom-error` to show the application's verdict on a setting it could
not apply. The switch is invalid, blocks its form and is announced as
invalid at once. Toggling it withdraws the error. Remove the attribute when
a new attempt starts: setting the same text again while it is still set
shows nothing.

```html
<ki-switch name="two-step" checked custom-error="Add a phone number before turning on two-step sign-in.">Two-step sign-in</ki-switch>
```
