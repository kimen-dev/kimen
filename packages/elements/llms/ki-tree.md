# ki-tree

> A named hierarchy with collapsible branches and independent keyboard focus.

## When to use

browse nested files, categories or an outline, select items in
a hierarchy, or navigate through linked destinations.

## When not to use

flat lists of peers, menus of commands, or submitted form values.

## Examples

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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-tree`: the default, only the tokens ki-tree needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `label` (string, default 'Tree'): Accessible name of the hierarchy. Localize it and make it distinct among nearby trees.
- `selection` ("multiple" | "none" | "single", default 'single'): Use none for navigation, single for one selected item, or multiple for checkable branches.

## Slots

- (default): Direct ki-tree-item children in reading order.

## Parts

- `base`: The surface around the hierarchy.

## Events

- `ki-selection-change` (CustomEvent<{ selectedItems: HTMLKiTreeItemElement[] }>): Emitted after a user selection changes. Selected items are in tree order.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-tree-backdrop-filter`: Complete backdrop filter behind the surface. Default: `var(--ki-effect-no-backdrop-filter)`.
- `--ki-tree-bg`: Base surface of the hierarchy. Default: `var(--ki-surface-s0)`.
- `--ki-tree-bg-image`: Optional image layered over the tree surface. Default: `var(--ki-surface-image-none)`.
- `--ki-tree-edge`: Perimeter color of the hierarchy surface. Default: `var(--ki-outline-low-em)`.
- `--ki-tree-edge-width`: Width of the surface and checkbox outlines. Default: `var(--ki-menu-layout-edge-width)`.
- `--ki-tree-fg`: Text on the base surface. Default: `var(--ki-text-high-em)`.
- `--ki-tree-padding`: Interior padding of the hierarchy surface. Default: `var(--ki-spacing-action-inset)`.
- `--ki-tree-radius`: Rounding of the hierarchy surface. Default: onmars `var(--ki-tree-layout-surface-radius)`, material3 `var(--ki-corner-action-frame)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1. Default: `var(--ki-font-line-height-body-1)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
