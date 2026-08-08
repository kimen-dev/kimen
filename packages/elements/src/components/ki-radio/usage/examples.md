Each option is a `ki-radio` child of a `ki-radio-group`; the slotted text is the option's accessible name and activation surface, and `value` is what the group submits when the option is selected:

```html
<ki-radio-group label="Delivery speed" name="delivery">
  <ki-radio value="standard">Standard (3–5 days)</ki-radio>
  <ki-radio value="express">Express (1–2 days)</ki-radio>
</ki-radio-group>
```

A disabled option cannot be selected or focused, and group arrow navigation skips it:

```html
<ki-radio-group label="Plan" name="plan" value="pro">
  <ki-radio value="free">Free</ki-radio>
  <ki-radio value="pro">Pro</ki-radio>
  <ki-radio value="enterprise" disabled>Enterprise (contact sales)</ki-radio>
</ki-radio-group>
```

Selection is never authored on the option — the parent group's `value` selects the matching option:

```html
<ki-radio-group label="Theme" name="theme" value="dark">
  <ki-radio value="light">Light</ki-radio>
  <ki-radio value="dark">Dark</ki-radio>
  <ki-radio value="system">Match system</ki-radio>
</ki-radio-group>
```
