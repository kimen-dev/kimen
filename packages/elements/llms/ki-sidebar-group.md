# ki-sidebar-group

> A named list of routes within sidebar navigation.

## When to use

give related sidebar destinations a common heading.

## When not to use

as a destination or outside ki-sidebar.

## Examples

# Sidebar group example

```html
<ki-sidebar label="Project">
  <ki-sidebar-group label="Workspace">
    <ki-sidebar-item href="/members">Members</ki-sidebar-item>
    <ki-sidebar-item href="/settings" current>Settings</ki-sidebar-item>
  </ki-sidebar-group>
</ki-sidebar>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-sidebar-group`: the default, only the tokens ki-sidebar-group needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `label` (string, required): Visible group heading and accessible name of the nested list.

## Slots

- (default): One or more ki-sidebar-item routes.

## Parts

- `heading`: Group heading, visually hidden in the rail.
- `list`: List named by the group heading.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-sidebar-font-family`: Typeface of sidebar controls and copy.
- `--ki-sidebar-group-backdrop-filter`: Complete backdrop filter behind the group heading.
- `--ki-sidebar-group-bg`: Group heading background.
- `--ki-sidebar-group-bg-image`: Optional image over the heading background.
- `--ki-sidebar-group-fg`: Group heading ink, with contrast-more support.
- `--ki-sidebar-group-font-family`: Group heading typeface.
- `--ki-sidebar-group-font-size`: Group heading font size.
- `--ki-sidebar-group-gap`: Space before a group of routes.
- `--ki-sidebar-group-line-height`: Group heading line height.
- `--ki-sidebar-item-gap`: Gap between rows.
- `--ki-sidebar-item-padding`: Inline inset of an expanded row.
- `--ki-sidebar-item-weight`: Weight of the navigation label.
