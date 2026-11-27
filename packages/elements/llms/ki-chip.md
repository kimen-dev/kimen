# ki-chip

> A compact filter toggle, removable picked value, or contextual action.

## When to use

apply independent filters, represent values selected in an entry
field, or offer a small contextual action alongside content.

## When not to use

static status (ki-badge), primary actions (ki-button), suggested
prompts, or mutually exclusive choices (ki-radio-group).

## Examples

# Chip examples

Use a filter group for independent toggles. Read `ki-change.detail.selected` to
update the results. The chip's `value` identifies the filter.

```html
<ki-chip-group label="Team" type="filter">
  <ki-chip value="design" selected>Design</ki-chip>
  <ki-chip value="eng">Engineering</ki-chip>
</ki-chip-group>
```

Use an input group for picked values. Link the entry field by ID so focus
returns to it after the last chip. Listen to `ki-remove` to update your
collection. If a framework owns these nodes, cancel the event and let it
apply the DOM change, then focus the next chip or the linked field.

```html
<ki-chip-group label="Recipients" type="input" focus-target="recipient">
  <ki-chip value="ana" removable>
    <ki-avatar slot="start" size="xxs" initials="AG" label="Ana García"></ki-avatar>
    Ana García
  </ki-chip>
  <ki-chip value="luis" removable>Luis</ki-chip>
</ki-chip-group>
<input id="recipient" aria-label="Add recipient">
```

Use assist for a contextual action. Handle `ki-activate` in application code.

```html
<ki-chip type="assist" value="calendar">
  <svg slot="start" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="5" width="18" height="16" rx="2"/>
    <path d="M3 10h18M8 2v6m8-6v6"/>
  </svg>
  Add to calendar
</ki-chip>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-chip`: the default, only the tokens ki-chip needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `disabled` (boolean, default false): Prevents activation, removal and moving the chip.
- `removable` (boolean, default false): Gives an input chip a trailing remove button and keyboard deletion.
- `remove-label` (string, default 'Remove'): Localized action prefix in the remove button's accessible name, followed by the chip label.
- `selected` (boolean, default false): The pressed state of a filter chip. The user can toggle it in place.
- `size` ("md" | "sm", default 'md'): Visual size of the pill, 24 CSS px for sm and 32 CSS px for md at standard text spacing.
- `type` ("assist" | "filter" | "input" | undefined): Chip kind. Inherits the immediate chip group's type when omitted. Standalone chips default to filter.
- `value` (string, default ''): Value sent with removal, contextual activation and reorder events.

## Slots

- (default): The visible text label. Use text or non-interactive markup.
- `start`: One decorative glyph or extra-extra-small avatar. A filter check replaces it when selected. Do not slot controls.

## Parts

- `chip`: The painted pill.
- `drag-handle`: The grip enabled by a reorderable parent group.
- `label`: The text wrapper around the default slot.
- `remove`: The native remove button on a removable input chip.
- `selection-icon`: The selected filter check.
- `start`: The decorative leading content.

## Events

- `ki-activate` (CustomEvent<{
    value: string;
  }>): Emitted by an assist chip when its native button is activated.
- `ki-change` (CustomEvent<{
    selected: boolean;
  }>): Emitted after a filter chip changes its pressed state.
- `ki-remove` (CustomEvent<{ value: string }>): Remove request for an input chip. Cancel it to keep application ownership of the chip.

## Methods

None.

## Other CSS custom properties

- `--ki-chip-assist-icon-fg`: Decorative glyph in an assist chip. Default: `var(--ki-text-primary-high-em)`.
- `--ki-chip-backdrop-filter`: Default compact pill surface leaves the backdrop unfiltered. Default: `var(--ki-control-compact-pill-backdrop-filter)`.
- `--ki-chip-bg`: Resting filter and assist surface. Default: `var(--ki-surface-transparent)`.
- `--ki-chip-bg-image`: Default compact pill surface uses a solid color. Default: `var(--ki-control-compact-pill-bg-image)`.
- `--ki-chip-border`: Outline of an unselected filter or assist chip. Default: `var(--ki-outline-control)`.
- `--ki-chip-border-width`: Default thickness of a compact pill border. Default: `var(--ki-control-compact-pill-border-width)`.
- `--ki-chip-fg`: Resting filter and assist label. Default: `var(--ki-text-high-em)`.
- `--ki-chip-font-family`: Font family for the visible chip label. Default: `var(--ki-typography-family-body)`.
- `--ki-chip-font-size`: Default chip label size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-chip-font-size-sm`: Small chip label size. Default: `var(--ki-typography-size-caption-2)`.
- `--ki-chip-font-weight`: Weight for a chip label. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-chip-gap`: Gap between content in a compact pill. Default: `var(--ki-control-compact-pill-gap)`.
- `--ki-chip-height`: Default height of a compact pill. Default: `var(--ki-control-compact-pill-height)`.
- `--ki-chip-height-sm`: Small height of a compact pill. Default: `var(--ki-control-compact-pill-height-sm)`.
- `--ki-chip-icon-size`: Icon size inside a compact pill. Default: `var(--ki-control-compact-pill-icon-size)`.
- `--ki-chip-input-bg`: Surface of a picked value. Default: `var(--ki-surface-s2)`.
- `--ki-chip-input-fg`: Label of a picked value. Default: `var(--ki-text-high-em)`.
- `--ki-chip-inset`: Default inline padding of a compact pill. Default: `var(--ki-control-compact-pill-inset)`.
- `--ki-chip-inset-action`: Trailing inset beside a pill action. Default: `var(--ki-control-compact-pill-inset-action)`.
- `--ki-chip-inset-sm`: Small inline padding of a compact pill. Default: `var(--ki-control-compact-pill-inset-sm)`.
- `--ki-chip-line-height`: Default line height of the chip label. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-chip-line-height-sm`: Small line height of the chip label. Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-chip-radius`: Fully rounded compact pill shape. Default: `var(--ki-control-compact-pill-radius)`.
- `--ki-chip-remove-bg`: Remove button surface inside an input chip. Default: `var(--ki-surface-s2)`.
- `--ki-chip-remove-fg`: Resting remove glyph. Default: `var(--ki-text-supporting)`.
- `--ki-chip-remove-hover-bg`: Remove button hover surface. Default: `var(--ki-surface-s4)`.
- `--ki-chip-remove-hover-fg`: Remove glyph over the hover surface. Default: `var(--ki-text-high-em)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.

## CSS custom properties by variant and state

| Variant | Tone | State | Token | Default | Description |
| --- | --- | --- | --- | --- | --- |
| — | — | disabled | `--ki-chip-disabled-border` | `var(--ki-outline-low-em)` | Outline of a disabled chip. |
| — | — | disabled | `--ki-chip-disabled-ink` | `var(--ki-text-base-em)` | Label on a disabled chip. |
| — | — | hover | `--ki-chip-hover-bg` | `var(--ki-surface-s2)` | Surface under the hovering pointer. |
| — | — | hover | `--ki-chip-hover-fg` | `var(--ki-text-high-em)` | Label over the hover surface. |
| — | — | pressed | `--ki-chip-pressed-bg` | `var(--ki-surface-s3)` | Surface while the activation is held. |
| — | — | pressed | `--ki-chip-pressed-fg` | `var(--ki-text-high-em)` | Label while the activation is held. |
| — | — | selected | `--ki-chip-selected-bg` | `var(--ki-surface-primary-low-em)` | Selected filter surface. |
| — | — | selected | `--ki-chip-selected-border` | `var(--ki-outline-primary-high-em)` | Accessible boundary of a selected filter. |
| — | — | selected | `--ki-chip-selected-fg` | `var(--ki-text-primary-on-primary-light)` | Selected filter label and check. |
