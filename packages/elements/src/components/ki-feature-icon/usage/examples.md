# Using ki-feature-icon

Load the token core and the sheets of the tags you write, register each
custom element, and import the Lucide glyph you use. Place one glyph with its default inherited size
in the slot, next to the heading that names the section.

```js
import '@kimen/tokens/css/core';
import '@kimen/tokens/css/ki-feature-icon';
import '@kimen/tokens/css/ki-icon';
import '@kimen/elements/icons/shield-check';
import { defineCustomElement as defineFeatureIcon } from '@kimen/elements/ki-feature-icon';
import { defineCustomElement as defineIcon } from '@kimen/elements/ki-icon';

defineFeatureIcon();
defineIcon();
```

```html
<div style="display:flex;align-items:center;gap:var(--ki-space-md)">
  <ki-feature-icon tone="primary-light" size="md">
    <ki-icon name="shield-check"></ki-icon>
  </ki-feature-icon>
  <h2>Security settings</h2>
</div>
```

Choose a circle with `shape="circle"`. For an inline SVG, use `currentColor`
for the glyph's stroke or fill. Keep controls and meaningful labels outside
the tile so they can receive focus and be announced.

A guarded catalog surface supplies the glyph as a `ki-icon` node in the
default slot. The host imports the glyph before rendering the surface.

```json
{
  "version": 1,
  "root": {
    "component": "div",
    "props": { "direction": "row", "align": "center", "gap": "md" },
    "slots": {
      "": [
        {
          "component": "ki-feature-icon",
          "props": { "tone": "primary-light" },
          "slots": {
            "": [{ "component": "ki-icon", "props": { "name": "shield-check" } }]
          }
        },
        { "component": "h2", "slots": { "": ["Security settings"] } }
      ]
    }
  }
}
```
