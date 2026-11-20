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

- `--ki-menu-font-family`: Family for action labels and the filter.
- `--ki-menu-group-fg`: Foreground for group labels.
- `--ki-menu-group-label-weight`: Weight of group labels.
- `--ki-menu-inline-padding`: Start and end inset of an action, group label, or filter.
- `--ki-menu-meta-font-size`: Size of metadata and group labels.
- `--ki-menu-meta-line-height`: Line height of metadata and group labels.
- `--ki-menu-padding`: Space inside the popup.
