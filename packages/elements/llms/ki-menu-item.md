# ki-menu-item

> A pointer and keyboard action within a ki-menu.

## When to use

a command, independent checkbox action, or exclusive radio action in a menu.

## When not to use

standalone controls, navigational links, or form options.

## Examples

# Menu item

Give each item a value and a visible label. Use `type="checkbox"` for independent toggles or `type="radio"` for exclusive choices. Set `disabled` to keep an unavailable action discoverable by keyboard.

```html
<ki-menu anchor="actions">
  <ki-menu-item value="pin" type="checkbox" checked>Pin to sidebar</ki-menu-item>
</ki-menu>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-menu-item`: the default, only the tokens ki-menu-item needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `checked` (boolean, default false): Checked state for checkbox and radio actions.
- `disabled` (boolean, default false): Disabled actions remain discoverable via menu navigation.
- `shortcut` (string, default ''): Display-only keyboard shortcut. Applications own shortcut registration.
- `tone` ("danger" | "neutral", default 'neutral'): Apply the danger tone to a destructive action.
- `type` ("checkbox" | "item" | "radio", default 'item'): Action role. A checkbox stays open. A radio selects one action within its group.
- `value` (string, default ''): Action identifier reported by the parent menu.

## Slots

- (default): The action's visible label.
- `start`: One decorative icon or avatar before the label.

## Parts

- `check`: The indicator of a checked action.
- `item`: The focusable action row.
- `shortcut`: The display-only shortcut hint.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-menu-focus-color`: Color of a visible keyboard focus outline. Default: `var(--ki-focus-ring-color)`.
- `--ki-menu-focus-width`: Width of a visible keyboard focus outline. Default: `var(--ki-focus-ring-width)`.
- `--ki-menu-font-family`: Family for action labels and the filter. Default: `var(--ki-typography-family-body)`.
- `--ki-menu-gap`: Inline space between the parts of a row. Default: `var(--ki-menu-layout-inline-space)`.
- `--ki-menu-inline-padding`: Start and end inset of an action, group label, or filter. Default: `var(--ki-menu-layout-inline-space)`.
- `--ki-menu-item-danger-fg`: Foreground for destructive actions. Default: `var(--ki-text-danger-high-em)`.
- `--ki-menu-item-danger-hover-fg`: Foreground for hovered or keyboard-focused destructive actions. Default: `var(--ki-text-danger-high-em)`.
- `--ki-menu-item-disabled-fg`: Muted ink of disabled actions. Default: `var(--ki-text-base-em)`.
- `--ki-menu-item-fg`: Foreground for resting actions. Default: `var(--ki-text-high-em)`.
- `--ki-menu-item-height`: Default action row minimum height. Default: `var(--ki-menu-layout-row-min)`.
- `--ki-menu-item-hover-bg`: Background behind hovered or keyboard-focused actions. Default: `var(--ki-surface-s3)`.
- `--ki-menu-item-hover-fg`: Foreground for hovered or keyboard-focused actions. Default: `var(--ki-text-high-em)`.
- `--ki-menu-item-icon-size`: Size of an action glyph and the check indicator. Default: `var(--ki-glyph-size-sm)`.
- `--ki-menu-item-padding`: Vertical inset used when an action wraps. Default: `var(--ki-menu-layout-row-block-padding)`.
- `--ki-menu-item-radius`: Action row corner radius. Default: `var(--ki-menu-layout-row-radius)`.
- `--ki-menu-meta-fg`: Foreground for shortcut hints and the filter placeholder. Default: `var(--ki-text-supporting)`.
- `--ki-menu-meta-font-size`: Size of metadata and group labels. Default: `var(--ki-typography-size-caption-2)`.
- `--ki-menu-meta-hover-fg`: Foreground for shortcut hints on a hovered or focused action. Default: `var(--ki-text-supporting)`.
- `--ki-menu-touch-target`: Minimum action and filter height for coarse pointers. Default: `var(--ki-menu-layout-touch-row-min)`.
