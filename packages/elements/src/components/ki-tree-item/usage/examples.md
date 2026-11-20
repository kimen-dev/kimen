# Tree item examples

Place each item directly in a `ki-tree` or another `ki-tree-item`. Put the
label text before the child items. A disabled item stays in the tree's
arrow-key sequence and cannot be activated.

```html
<ki-tree label="Project files">
  <ki-tree-item expanded>
    src
    <ki-tree-item selected>ki-dialog.ts</ki-tree-item>
    <ki-tree-item disabled>Archived code</ki-tree-item>
  </ki-tree-item>
</ki-tree>
```

Import the decorative glyph before the tree mounts if you set `icon-name`.

```js
import '@kimen/elements/icons/file-code';
```

```html
<ki-tree label="Project files">
  <ki-tree-item icon-name="file-code">ki-dialog.ts</ki-tree-item>
</ki-tree>
```
