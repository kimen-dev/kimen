# ki-icon examples

Import the exact Lucide names used by your markup before you mount it.

```js
import '@kimen/elements/icons/circle-check';
import '@kimen/elements/icons/triangle-alert';
import { defineCustomElement } from '@kimen/elements/ki-icon';

defineCustomElement();
```

A confirmation has adjacent text, so the glyph is decorative.

```html
<span style="color: var(--ki-text-success-high-em)">
  <ki-icon name="circle-check"></ki-icon> Confirmed
</span>
```

A standalone meaningful glyph takes its accessible name from the label.

```html
<ki-icon name="triangle-alert" size="lg" label="Warning"></ki-icon>
```

For a guarded catalog surface, import the glyph in the host and reference it
by name. The icon has no slots or actions.

```json
{
  "version": 1,
  "root": {
    "component": "ki-icon",
    "props": { "name": "triangle-alert", "size": "lg", "label": "Warning" }
  }
}
```
