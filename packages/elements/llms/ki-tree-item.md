# ki-tree-item

> An item or expandable branch inside a ki-tree.

## When to use

label a file, category or destination in a hierarchy. Nest more
ki-tree-item children for a branch.

## When not to use

standalone controls, form checkboxes, or a row with other
interactive descendants.

## Examples

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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-tree-item`: the default, only the tokens ki-tree-item needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `disabled` (boolean, default false): Keep the row discoverable by keyboard while preventing user activation.
- `expanded` (boolean, default false): Whether a branch reveals its children. Has no visible effect on a leaf.
- `href` (string | undefined, URL): Native destination of the row. Prefer selection="none" for navigation trees.
- `icon-name` (string | undefined): Optional decorative icon. Import the named Kimen glyph before mounting the tree.
- `lazy` (boolean, default false): Request children on the first empty expansion. Clear it to finish an empty load.
- `loading-label` (string, default 'Loading'): Localized text for the spinner status during an outstanding lazy request.
- `selected` (boolean, default false): Selected state. The tree keeps it in sync with single selection or fully checked branches.

## Slots

- (default): The row label and directly nested ki-tree-item children.

## Parts

- `checkbox`: Check-state indicator and hit area in multiple selection.
- `disclosure`: Leading hit area and direction indicator of a branch.
- `group`: The region containing the expanded child items.
- `label`: Visible row text or native destination link.
- `row`: The painted and focus-highlighted item row.

## Events

- `ki-collapse` (CustomEvent<{ item: HTMLKiTreeItemElement }>): Emitted when an existing branch collapses, also when `expanded` is cleared: it can fire without a gesture.
- `ki-expand` (CustomEvent<{ item: HTMLKiTreeItemElement }>): Emitted when an existing branch expands, also when `expanded` is set: it can fire without a gesture.
- `ki-load` (CustomEvent<{ item: HTMLKiTreeItemElement }>): Emitted once when an empty lazy branch first opens, also one rendered expanded: it can fire without a gesture. The listener supplies the children.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-tree-disclosure-duration`: Disclosure turn duration.
- `--ki-tree-disclosure-easing`: Disclosure turn easing.
- `--ki-tree-edge-width`: Width of the surface and checkbox outlines.
- `--ki-tree-focus-ring-color`: Ink of the focused row outline.
- `--ki-tree-focus-ring-width`: Width of the focused row outline.
- `--ki-tree-hover-bg`: Fill of an unselected row hovered by a fine pointer.
- `--ki-tree-hover-fg`: Text of an unselected row hovered by a fine pointer.
- `--ki-tree-icon-fg`: Default ink of the decorative row icons.
- `--ki-tree-indent`: Inline indentation per hierarchy level.
- `--ki-tree-item-box-radius`: Rounding of the visual checkbox indicator.
- `--ki-tree-item-box-size`: Size of the visual checkbox indicator.
- `--ki-tree-item-gap`: Space between an optional item icon and its label.
- `--ki-tree-item-padding`: Inline-end inset of an item row.
- `--ki-tree-item-radius`: Rounding of a highlighted item row.
- `--ki-tree-item-target`: Minimum inline target of a disclosure or checkbox.
- `--ki-tree-row-height`: Minimum block size before density adjustment.
- `--ki-tree-selected-bg`: Fill of a selected or checked row.
- `--ki-tree-selected-fg`: Text and glyph ink on a selected row.
- `--ki-tree-touch-row-min`: Minimum row block size on a coarse pointer.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
