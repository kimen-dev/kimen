# ki-option

> A declarative data option rendered by its owning `ki-select` or `ki-combobox`.

## When to use

declare one choice inside a `ki-select` or `ki-combobox`; its text is the
human-facing label and its `value` is the submitted value.

## When not to use

`ki-option` standalone, authoring selection
on an option, or expecting it to paint its own row.

## Examples

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

## Token stylesheets

- `@kimen/tokens/css`: every token, once per page. The default.
- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-option`: the light option, only the tokens ki-option needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.

## Attributes

- `description` (string | undefined): Secondary text shown below the label in a combobox choice row.
- `disabled` (boolean, default false): Makes this option unavailable. Disabled options cannot be selected, are skipped by keyboard highlight, and are exposed unavailable by the select.
- `value` (string | undefined): Submission and selection value for this option. When omitted, the value falls back to the trimmed option text, matching native `<option>` parity. When NOT to use: do not use this as selection state; set `ki-select.value`.

## Slots

- (default): Text label mirrored by the owning choice field.
- `start`: Decorative content shown before the label in a combobox row.

## Parts

None.

## Events

None.

## Methods

None.

## CSS custom properties

None.
