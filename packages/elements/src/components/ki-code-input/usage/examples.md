# ki-code-input examples

Use `ki-code-input` for fixed one-time codes of four to eight characters. Use
`ki-input` for passwords, longer codes and free text.

## Numeric verification with a resend action

```html
<form id="verification">
  <ki-code-input
    label="Verification code"
    name="otp"
    required
    help-text="We sent a code to ana@example.com. It is valid for ten minutes."
    error-text="Enter all six digits."
  ></ki-code-input>
  <ki-button type="submit">Verify</ki-button>
  <ki-button id="resend-code" type="button" variant="ghost">Resend code</ki-button>
</form>
```

Read `new FormData(form).get('otp')` in the submit handler and send the string
to the verification service. The application knows the expiration time and
owns the resend request. On successful resend, clear the old value and any
custom validity error, update the help text, and focus the field. Offer a
visible and announced status if a request is still pending or fails.

On the custom-elements build, use `field.setCustomValidity(message)` and
`field.reportValidity()` to display a server rejection. Clear the message
with `field.setCustomValidity('')` once the person edits or resends the code.

## Four-character recovery code

```html
<ki-code-input
  label="Recovery code"
  name="recovery"
  type="alphanumeric"
  length="4"
  size="sm"
  help-text="Use the four characters from your verification email."
></ki-code-input>
```

Both `ki-input` and `ki-complete` carry `{ value }`. Listen for
`ki-complete` if filling the last box enables the next step. Leave submission
to the form unless completing the code can safely advance the flow.

## An error from the application

Set `custom-error` to show the server's verdict on the submitted code. The
field is invalid, blocks its form and is announced as invalid at once. The
person's next edit of the code withdraws the error. Remove the attribute when
a new attempt starts: setting the same text again while it is still set
shows nothing.

```html
<ki-code-input label="Verification code" name="code" value="042911" custom-error="This code has expired. Request a new one."></ki-code-input>
```
