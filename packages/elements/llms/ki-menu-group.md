# ki-menu-group

> A named group of related actions in a ki-menu.

## When to use

name a set of related actions or scope exclusive radio items in a menu.

## When not to use

standalone sections or nested menus.

## Examples

# Menu group

Provide a group label and place menu items or dividers in its default slot. A group scopes its own exclusive radio selection.

```html
<ki-menu anchor="actions">
  <ki-menu-group label="Edit"><ki-menu-item value="rename">Rename</ki-menu-item></ki-menu-group>
</ki-menu>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-menu-group`: the default, only the tokens ki-menu-group needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `label` (string, default ''): Visible and accessible group name.

## Slots

- (default): The ki-menu-item and ki-divider children of the group.

## Parts

- `label`: The visible group name.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-menu-font-family`: Family for action labels and the filter. Default: `var(--ki-typography-family-body)`.
- `--ki-menu-group-fg`: Foreground for group labels. Default: `var(--ki-text-supporting)`.
- `--ki-menu-group-label-weight`: Weight of group labels. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-menu-inline-padding`: Start and end inset of an action, group label, or filter. Default: `var(--ki-menu-layout-inline-space)`.
- `--ki-menu-meta-font-size`: Size of metadata and group labels. Default: `var(--ki-typography-size-caption-2)`.
- `--ki-menu-meta-line-height`: Line height of metadata and group labels. Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-menu-padding`: Space inside the popup. Default: `var(--ki-menu-layout-surface-padding)`.
