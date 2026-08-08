An option is meaningful only inside `ki-select`: it does not paint itself — the trimmed text is the visible label the select mirrors into its popup listbox, and `value` is what the form submits:

```html
<ki-select label="Language" name="language" placeholder="Choose a language">
  <ki-option value="en">English</ki-option>
  <ki-option value="es">Spanish</ki-option>
  <ki-option value="pt">Portuguese</ki-option>
</ki-select>
```

Omitting `value` submits the trimmed option text (native `<option>` parity); `disabled` options cannot be selected, are skipped by keyboard highlight, and are exposed unavailable by the select:

```html
<ki-select label="Priority" name="priority">
  <ki-option>Low</ki-option>
  <ki-option>Medium</ki-option>
  <ki-option disabled>Urgent</ki-option>
</ki-select>
```

Never author selection on the option — assign `ki-select.value` and the first matching option is selected silently:

```html
<ki-select id="language" label="Language" name="language">
  <ki-option value="en">English</ki-option>
  <ki-option value="es">Spanish</ki-option>
</ki-select>

<script type="module">
  document.getElementById('language').value = 'es';
</script>
```
