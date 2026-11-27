# ki-toolbar

> Brings frequent page actions together in a floating pill or docked surface.

## When to use

group a small set of related page actions, such as text
formatting or the commands on a compact message screen.

## When not to use

for site navigation, mutually exclusive choices, or a docked
bar on a screen already using MobileNav.

## Examples

# Toolbar examples

## Formatting controls

```html
<ki-toolbar label="Formatting">
  <ki-button variant="ghost">Bold</ki-button>
  <ki-divider orientation="vertical"></ki-divider>
  <ki-button variant="ghost">Insert link</ki-button>
</ki-toolbar>
```

Give icon-only actions their own label. With ToggleIconButton available, a
`ki-icon-button` with `toggle`, `selected` and `label="Bold"` owns the
pressed state and activation of the Bold command.

## Docked message actions

```html
<ki-toolbar label="Message actions" variant="docked" tone="vibrant" hide-on-scroll>
  <ki-button variant="ghost">Archive</ki-button>
  <ki-button variant="ghost">Mark unread</ki-button>
</ki-toolbar>
```

Reserve the bottom edge for the toolbar and leave space for its minimum
height plus `env(safe-area-inset-bottom, 0px)` below page content. Use this
variant on compact pages without MobileNav.

## Floating with a FAB

When `ki-fab` is available, register it alongside the toolbar and buttons
when using direct imports. Give the FAB a label and use its named slot.

```html
<ki-toolbar label="Message actions" tone="vibrant">
  <ki-button variant="ghost">Archive</ki-button>
  <ki-fab slot="fab" label="Reply"></ki-fab>
</ki-toolbar>
```

This companion action follows the pill in the Tab sequence. Handle actions
on the slotted controls. The toolbar coordinates navigation and placement.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-toolbar`: the default, only the tokens ki-toolbar needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `hide-on-scroll` (boolean, default false): Hides on downward page scroll and reveals on upward scroll or when an action receives focus. Use for secondary actions where content needs room.
- `label` (string, required): Accessible name for the group, such as "Formatting". Supply it in the page's language.
- `orientation` ("horizontal" | "vertical", default 'horizontal'): Layout and keyboard axis. Set vertical for a floating column. Docked is always horizontal.
- `tone` ("standard" | "vibrant", default 'standard'): Surface palette. Use vibrant to emphasize the toolbar with an accent tint.
- `variant` ("docked" | "floating", default 'floating'): Floating leaves placement to the page. Docked fixes the surface to the viewport's bottom edge. Reserve space below the content when docking.

## Slots

- (default): Direct ki-button, ki-icon-button (including toggles), native button and ki-divider children. Give every icon-only action an accessible name.
- `fab`: A companion ki-fab for the floating variant. It follows the toolbar and has its own Tab stop.

## Parts

- `toolbar`: The named surface containing the grouped actions.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-toolbar-backdrop-filter`: Complete backdrop filter behind the surface.
- `--ki-toolbar-bg`: Background of the standard toolbar.
- `--ki-toolbar-bg-image`: Optional image above the solid surface color.
- `--ki-toolbar-docked-padding-inline`: Inline insets for docked actions.
- `--ki-toolbar-docked-radius`: Corner radius of the docked toolbar.
- `--ki-toolbar-fab-gap`: Gap between a floating pill and its companion FAB.
- `--ki-toolbar-fg`: Foreground of the standard toolbar.
- `--ki-toolbar-gap`: Gap between toolbar actions.
- `--ki-toolbar-height`: Minimum height of the docked toolbar before its safe area.
- `--ki-toolbar-padding`: Toolbar surface padding.
- `--ki-toolbar-radius`: Radius of the floating pill.
- `--ki-toolbar-scroll-duration`: Duration of the scroll visibility transition.
- `--ki-toolbar-scroll-easing`: Easing of the scroll visibility transition.
- `--ki-toolbar-shadow`: Resting elevation of the floating pill.
- `--ki-toolbar-vibrant-bg`: Accent background of the vibrant toolbar.
- `--ki-toolbar-vibrant-fg`: Foreground on the vibrant toolbar.
- `--ki-typography-family-body`: semantic font family for typography family body.
