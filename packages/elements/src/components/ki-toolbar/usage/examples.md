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
