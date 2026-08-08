A labeled multiline field in a form (`label` is mandatory — the visible label and accessible name); `rows` sets the stable visible line count (default `2`, no auto-grow in v1):

```html
<form>
  <ki-textarea label="Comments" name="comments" rows="4"></ki-textarea>
  <ki-button variant="primary">Send</ki-button>
</form>
```

Initial text is declared through the `value` attribute — element text content is ignored — and Enter inserts a line break, never submitting the enclosing form:

```html
<ki-textarea label="Bio" name="bio" value="Web components enthusiast."></ki-textarea>
```

`required` blocks submission while empty, and an `autocomplete` purpose such as `street-address` exposes the entry's meaning to autofill:

```html
<ki-textarea
  label="Shipping address"
  name="address"
  rows="3"
  autocomplete="street-address"
  required
></ki-textarea>
```

Read-only and disabled are distinct states — `readonly` stays focusable, selectable, submitted and validation-exempt; `disabled` is none of those:

```html
<ki-textarea label="Accepted policy" value="Version 2.1, accepted 2026-05-02." readonly></ki-textarea>
<ki-textarea label="Legacy notes" value="Migrated from v1." disabled></ki-textarea>
```
