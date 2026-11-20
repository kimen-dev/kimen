# Tree examples

Give the tree a label and put the item text before any nested items. Set
`expanded` to show a branch's children and `selected` to mark the initial
selection. The tree defaults to single selection.

```html
<ki-tree label="Project files">
  <ki-tree-item expanded>
    src
    <ki-tree-item selected>ki-dialog.ts</ki-tree-item>
    <ki-tree-item>ki-menu.ts</ki-tree-item>
  </ki-tree-item>
  <ki-tree-item>README.md</ki-tree-item>
</ki-tree>
```

Set `selection="multiple"` to show checkboxes. The Reports branch starts
mixed because Summary is the only checked child. Toggling Reports also
updates its enabled descendants. The `ki-selection-change` event reports
the committed selection in `detail.selectedItems`, including fully checked
branches.

```html
<ki-tree label="Export files" selection="multiple">
  <ki-tree-item expanded>
    Reports
    <ki-tree-item selected>Summary</ki-tree-item>
    <ki-tree-item>Appendix</ki-tree-item>
    <ki-tree-item disabled>Draft</ki-tree-item>
  </ki-tree-item>
</ki-tree>
```

Use `selection="none"` with `href` to build a navigation tree.

```html
<ki-tree label="Documentation" selection="none">
  <ki-tree-item expanded>
    Guides
    <ki-tree-item href="./quick-start/">Quick start</ki-tree-item>
    <ki-tree-item href="./theming/">Theming</ki-tree-item>
  </ki-tree-item>
</ki-tree>
```

A lazy branch emits `ki-load` the first time it opens. Append its child
items to `event.detail.item` to replace the spinner. Set `item.lazy = false`
to finish the wait if there are no children.

```html
<ki-tree label="Project files">
  <ki-tree-item lazy loading-label="Loading tokens">tokens</ki-tree-item>
</ki-tree>
```

```js
document.querySelector('ki-tree')?.addEventListener('ki-load', ({ detail: { item } }) => {
  const child = document.createElement('ki-tree-item');
  child.textContent = 'palette.tokens.json';
  item.append(child);
});
```
