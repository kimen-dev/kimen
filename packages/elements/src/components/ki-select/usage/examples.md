Options are declared as `ki-option` children; the option text is the visible label and `value` is the submitted value:

```html
<ki-select label="Country" name="country" placeholder="Choose a country">
  <ki-option value="es">Spain</ki-option>
  <ki-option value="fr">France</ki-option>
  <ki-option value="pt">Portugal</ki-option>
</ki-select>
```

An option without `value` submits its trimmed label text, and `required` blocks submission while empty:

```html
<form>
  <ki-select label="Team size" name="size" required>
    <ki-option>1-10</ki-option>
    <ki-option>11-50</ki-option>
    <ki-option disabled>51+</ki-option>
  </ki-select>
  <ki-button variant="primary">Continue</ki-button>
</form>
```

## An error from the application

Set `custom-error` to show the application's verdict on the submitted
choice, such as a server-side check. The select is invalid, blocks its form
and is announced as invalid at once. Choosing another option withdraws the
error. Remove the attribute when a new attempt starts: setting the same text
again while it is still set shows nothing.

```html
<ki-select label="Country" name="country" value="ch" custom-error="We do not ship to Switzerland yet.">
  <ki-option value="es">Spain</ki-option>
  <ki-option value="ch">Switzerland</ki-option>
</ki-select>
```
