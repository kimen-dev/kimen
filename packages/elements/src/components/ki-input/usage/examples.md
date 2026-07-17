A labeled field participating in native form submission (`label` is mandatory; it is the accessible name):

```html
<form>
  <ki-input label="Work email" name="email" type="email" required></ki-input>
  <ki-button variant="primary">Subscribe</ki-button>
</form>
```

Read-only and disabled are distinct states — read-only stays focusable and is submitted, disabled is neither:

```html
<ki-input label="Plan" value="Pro" readonly></ki-input>
<ki-input label="Legacy ID" value="A-1042" disabled></ki-input>
```
