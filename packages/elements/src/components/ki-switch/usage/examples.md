The slotted label is the accessible name source, and boolean presence semantics apply to `checked` — any present attribute means on, omit it for off:

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
