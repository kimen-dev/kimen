# ki-list

> A non-interactive vertical list container for read-only collections of similar entries composed with `ki-list-item` children.

## When to use

settings, contacts, results or activity feeds where each item
composes leading media, primary text, optional secondary text and trailing
meta or a slotted control.

## When not to use

menus, selectable option lists, tabular data, navigation,
whole-item clickable rows or lone items outside a list.

## Examples

The list accepts only `ki-list-item` children (other children are unsupported); each item's default slot is the primary text line:

```html
<ki-list>
  <ki-list-item>Ada Lovelace</ki-list-item>
  <ki-list-item>Grace Hopper</ki-list-item>
  <ki-list-item>Margaret Hamilton</ki-list-item>
</ki-list>
```

Full item composition — `start` for leading media (decorative beside the visible name, so the avatar carries no `label`), `secondary` for supporting text and `end` for trailing meta:

```html
<ki-list>
  <ki-list-item>
    <ki-avatar slot="start" initials="AL" size="sm"></ki-avatar>
    Ada Lovelace
    <span slot="secondary">Analytical engine programs</span>
    <ki-badge slot="end" tone="success">Active</ki-badge>
  </ki-list-item>
  <ki-list-item>
    <ki-avatar slot="start" initials="GH" size="sm"></ki-avatar>
    Grace Hopper
    <span slot="secondary">Compilers and COBOL</span>
    <span slot="end">1906–1992</span>
  </ki-list-item>
</ki-list>
```

Rows are never click targets; interactivity lives in controls slotted into a region, which keep their own semantics and focus behavior:

```html
<ki-list>
  <ki-list-item>
    Two-factor authentication
    <span slot="secondary">Enabled via authenticator app</span>
    <ki-button slot="end" size="sm" variant="secondary" type="button">Manage</ki-button>
  </ki-list-item>
</ki-list>
```

## Attributes

None.

## Slots

- (default): `ki-list-item` children. Other children are unsupported.

## Parts

- `list`: List surface that owns background, padding, item gap and between-item divider styling.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-list-bg`: color used by the list component for background.
- `--ki-list-gap`: dimension used by the list component for gap (MarsUI compositions stack rows contiguously; --ki-list-gap stays as the theme hook).
- `--ki-list-item-divider-color`: color used by the list component for item divider color.
- `--ki-list-item-divider-width`: dimension used by the list component for item divider width (no divider renders in any master variant; the color hook ki.list.item.divider-color stays so consumers can opt hairlines back in).
- `--ki-list-padding`: dimension used by the list component for padding.
- `--ki-motion-distance-xs`: Motion travel distance xs (2px): hover-lift offsets.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-typography-family-body`: semantic font family for typography family body.
