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
