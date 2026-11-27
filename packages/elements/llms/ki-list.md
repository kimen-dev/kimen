# ki-list

> A vertical list of read-only entries, navigation links, settings controls, or options in a single- or multiple-selection listbox.

## When to use

settings, contacts, results, navigation or visible choices composed
from primary text, supporting text and optional media. Name interactive lists.

## When not to use

popup action menus, tabular data, or rows with several actions.

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

```html
<ki-list label="Settings">
  <ki-list-item href="/settings/account">
    Account
    <span slot="secondary">Name, email, password</span>
  </ki-list-item>
</ki-list>
```

```html
<ki-list label="Reviewers" selection="multiple" name="reviewers" required>
  <ki-list-item value="ana" selected>Ana Garcia</ki-list-item>
  <ki-list-item value="luis">Luis Perez</ki-list-item>
</ki-list>
```

```html
<ki-list label="Notifications">
  <ki-list-item>
    Email digest
    <span slot="secondary">Every Monday</span>
    <ki-switch slot="end" checked></ki-switch>
  </ki-list-item>
</ki-list>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-list`: the default, only the tokens ki-list needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `label` (string | undefined): Accessible name for a list with links, options or trailing controls.
- `name` (string | undefined): Form field name. Multiple selection submits repeated entries under this name.
- `required` (boolean, default false): Requires at least one enabled choice in a selection list.
- `selection` ("multiple" | "none" | "single", default 'none'): Enables single or multiple selection. The default supports static, link and control rows.

## Slots

- (default): Direct `ki-list-item` children.

## Parts

- `list`: List surface that owns background, padding, gap and dividers.

## Events

- `ki-change` (CustomEvent<KiListChangeDetail>): Fires once per user selection change, after updating the form value.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-list-bg`: color used by the list component for background. Default: `var(--ki-surface-s0)`.
- `--ki-list-gap`: dimension used by the list component for gap (MarsUI compositions stack rows contiguously; --ki-list-gap stays as the theme hook). Default: `var(--ki-space-zero)`.
- `--ki-list-item-divider-color`: color used by the list component for item divider color. Default: onmars `var(--ki-outline-base-em)`, material3 `var(--ki-outline-med-em)`.
- `--ki-list-item-divider-width`: dimension used by the list component for item divider width (no divider renders in any master variant; the color hook ki.list.item.divider-color stays so consumers can opt hairlines back in). Default: onmars `var(--ki-space-zero)`, material3 `0.0625rem`.
- `--ki-list-padding`: dimension used by the list component for padding. Default: `var(--ki-space-zero)`.
- `--ki-motion-distance-xs`: Motion travel distance xs (2px): hover-lift offsets. Default: `var(--ki-space-xxs)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base). Default: onmars `var(--ki-duration-moderate)`, material3 `250ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
