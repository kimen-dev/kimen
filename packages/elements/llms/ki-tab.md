# ki-tab

> One selectable tab inside a `ki-tabs` view switcher.

## When to use

label one peer content view inside `ki-tabs`, with optional
decorative `icon` and `start` or `end` slot media.

## When not to use

standalone, for form value
selection, or for page navigation; use the parent group's `value` instead
of authoring `selected`.

## Examples

A tab's default slot is its label and accessible name source; `value` pairs it with the `ki-tab-panel` sharing the same value inside a `ki-tabs` group:

```html
<ki-tabs label="Settings" value="profile">
  <ki-tab value="profile">Profile</ki-tab>
  <ki-tab value="privacy">Privacy</ki-tab>
  <ki-tab-panel value="profile">Profile settings</ki-tab-panel>
  <ki-tab-panel value="privacy">Privacy settings</ki-tab-panel>
</ki-tabs>
```

The `start` and `end` slots hold leading and trailing icons or media (they follow writing direction); keep decorative media `aria-hidden`:

```html
<ki-tabs label="Inbox views" value="all">
  <ki-tab value="all">
    <span slot="start" aria-hidden="true">✉</span>
    All mail
  </ki-tab>
  <ki-tab value="unread">Unread</ki-tab>
  <ki-tab-panel value="all">Every conversation.</ki-tab-panel>
  <ki-tab-panel value="unread">Unread conversations only.</ki-tab-panel>
</ki-tabs>
```

`disabled` excludes the tab from selection by every modality, and `selected` is output-only state written by the group — set the group's `value` instead of authoring it:

```html
<ki-tabs label="Repository" value="commits">
  <ki-tab value="commits">Commits</ki-tab>
  <ki-tab value="releases" disabled>Releases</ki-tab>
  <ki-tab-panel value="commits">Commit history</ki-tab-panel>
  <ki-tab-panel value="releases">Published releases</ki-tab-panel>
</ki-tabs>
```

For a decorative SVG, use the `icon` slot and give the tab a visible text
label in the default slot. The label names the tab and its linked panel.
The group's `icon-layout` controls whether the icon is above the label or
inline with it.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-tab`: the default, only the tokens ki-tab needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `disabled` (boolean, default false): Prevents selection by every modality and exposes the unavailable state.
- `selected` (boolean, default false): Output-only selected state written by `ki-tabs`. Set the group's `value` to choose an initial tab; author-set `selected` is overwritten.
- `value` (string, default ''): Pairing identifier shared with a `ki-tab-panel`. The first tab with a value owns it; later duplicates render but are not selectable.

## Slots

- (default): Required visible text label and accessible name source.
- `end`: Trailing icon or media. Follows writing direction.
- `icon`: Decorative SVG. Supply visible text in the default slot.
- `start`: Leading icon or media. Follows writing direction.

## Parts

- `indicator`: Decorative selected-tab marker.
- `tab`: Tab surface.

## Events

None.

## Methods

None.

## Other CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-motion-distance-xs`: Motion travel distance xs (2px): hover-lift offsets. Default: `var(--ki-space-xxs)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve. Default: onmars `var(--ki-easing-standard)`, material3 `cubic-bezier(0.2,0,0,1)`.
- `--ki-tab-backdrop-filter`: Complete backdrop filter for a tab surface. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-tab-bg-image`: Optional surface image for a tab. Default: `var(--ki-surface-image-none)`.
- `--ki-tab-font-size`: dimension used by the tab component for font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-tab-font-weight`: font weight used by the tab component for font weight. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-tab-gap`: dimension used by the tab component for gap. Default: `var(--ki-space-xs)`.
- `--ki-tab-icon-inline-gap`: Gap from an inline tab icon to its label. Default: `var(--ki-layout-spacing-md)`.
- `--ki-tab-icon-size`: Inline and block size of a decorative tab icon. Default: `var(--ki-glyph-size-md)`.
- `--ki-tab-indicator-color`: color used by the tab component for indicator color (MarsUI active underline is Outline/inverse_white: black in light, white in dark — the inverse neutral, not primary). Default: onmars `var(--ki-surface-primary-med-em)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-tab-indicator-radius`: dimension used by the tab component for indicator radius (the master underline is a square-ended 2px bottom border). Default: onmars `var(--ki-radius-0)`, material3 `var(--ki-radius-round)`.
- `--ki-tab-indicator-size`: dimension used by the tab component for indicator size. Default: onmars `var(--ki-space-xxs)`, material3 `3px`.
- `--ki-tab-line-height`: dimension used by the tab component for line height. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-tab-min-block-size`: dimension used by the tab component for min block size (MarsUI Tab_nav md bar height 40px: 24px body_1 label + 8px block-end clearance + underline; retargeted from ki.space.7xl per the fidelity audit — material3 pins its own value). Default: onmars `var(--ki-space-12xl)`, material3 `var(--ki-space-7xl)`.
- `--ki-tab-padding-block-end`: dimension used by the tab component for padding block end (MarsUI Tab_nav_item: 8px inset keeping the 2px underline clear of the 13/24 label; formalizes the fallback ki-tab.css already consumes). Default: `var(--ki-space-md)`.
- `--ki-tab-padding-inline`: dimension used by the tab component for padding inline (MarsUI items carry no inline padding: spacing comes from the bar gap and the underline spans the full item width). Default: onmars `var(--ki-space-zero)`, material3 `var(--ki-space-lg)`.
- `--ki-tab-radius`: dimension used by the tab component for radius. Default: `var(--ki-radius-sm)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.

## CSS custom properties by variant and state

| Variant | Tone | State | Token | Default | Description |
| --- | --- | --- | --- | --- | --- |
| — | — | focus | `--ki-tab-focus-ring-color` | `var(--ki-focus-ring-color)` | color used by the tab component for focus ring color. |
| — | — | focus | `--ki-tab-focus-ring-offset` | `var(--ki-focus-ring-offset)` | dimension used by the tab component for focus ring offset. |
| — | — | focus | `--ki-tab-focus-ring-shadow` | `var(--ki-focus-primary)` | shadow used by the tab component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator). |
| — | — | focus | `--ki-tab-focus-ring-width` | `var(--ki-focus-ring-width)` | dimension used by the tab component for focus ring width. |
| — | — | selected-active | `--ki-tab-selected-active-bg` | onmars `var(--ki-transparent-inverse)`, material3 `var(--ki-surface-primary-low-em-alpha)` | color used by the tab component for selected active background (MarsUI Tab_nav is transparent_inverse in every state; background pills are Switcher language). |
| — | — | selected-active | `--ki-tab-selected-active-fg` | onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)` | color used by the tab component for selected active foreground (MarsUI active tab label is neutral Text/high_em — never the accent; master 10048:1240). |
| — | — | selected-disabled | `--ki-tab-selected-disabled-bg` | onmars `var(--ki-transparent-inverse)`, material3 `var(--ki-surface-disabled-base-em)` | color used by the tab component for selected disabled background (no disabled variant exists in Tab_nav; disabled must be quieter than rest, not a filled pill). |
| — | — | selected-disabled | `--ki-tab-selected-disabled-fg` | onmars `var(--ki-surface-disabled-high-em)`, material3 `var(--ki-text-muted)` | color used by the tab component for selected disabled foreground (MarsUI disabled ladder: Gray/500 light / White-32 dark, the value ki-status and ki-switch already use for disabled glyphs). |
| — | — | selected-hover | `--ki-tab-selected-hover-bg` | onmars `var(--ki-transparent-inverse)`, material3 `var(--ki-surface-primary-base-em-alpha)` | color used by the tab component for selected hover background (MarsUI Tab_nav is transparent_inverse in every state; background pills are Switcher language). |
| — | — | selected-hover | `--ki-tab-selected-hover-fg` | onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)` | color used by the tab component for selected hover foreground (MarsUI active tab label is neutral Text/high_em — never the accent; master 10048:1240). |
| — | — | selected-rest | `--ki-tab-selected-rest-bg` | onmars `var(--ki-transparent-inverse)`, material3 `var(--ki-surface-s0)` | color used by the tab component for selected rest background (MarsUI Tab_nav is transparent_inverse in every state; background pills are Switcher language). |
| — | — | selected-rest | `--ki-tab-selected-rest-fg` | onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)` | color used by the tab component for selected rest foreground (MarsUI active tab label is neutral Text/high_em — never the accent; master 10048:1240). |
| — | — | unselected-active | `--ki-tab-unselected-active-bg` | onmars `var(--ki-transparent-inverse)`, material3 `var(--ki-surface-s2)` | color used by the tab component for unselected active background (MarsUI Tab_nav is transparent_inverse in every state). |
| — | — | unselected-active | `--ki-tab-unselected-active-fg` | `var(--ki-text-high-em)` | color used by the tab component for unselected active foreground (mirrors hover; MarsUI defines no pressed variant). |
| — | — | unselected-disabled | `--ki-tab-unselected-disabled-bg` | onmars `var(--ki-transparent-inverse)`, material3 `var(--ki-surface-disabled-base-em)` | color used by the tab component for unselected disabled background (no disabled variant exists in Tab_nav; disabled must be quieter than rest, not a filled pill). |
| — | — | unselected-disabled | `--ki-tab-unselected-disabled-fg` | onmars `var(--ki-surface-disabled-high-em)`, material3 `var(--ki-text-muted)` | color used by the tab component for unselected disabled foreground (MarsUI disabled ladder: Gray/500 light / White-32 dark, the value ki-status and ki-switch already use for disabled glyphs). |
| — | — | unselected-hover | `--ki-tab-unselected-hover-bg` | onmars `var(--ki-transparent-inverse)`, material3 `var(--ki-surface-s1)` | color used by the tab component for unselected hover background (MarsUI Tab_nav is transparent_inverse in every state). |
| — | — | unselected-hover | `--ki-tab-unselected-hover-fg` | `var(--ki-text-high-em)` | color used by the tab component for unselected hover foreground (with rest at med_em, hover darkens one em step, preserving the master rest-to-hover direction). |
| — | — | unselected-rest | `--ki-tab-unselected-rest-bg` | onmars `var(--ki-transparent-inverse)`, material3 `var(--ki-surface-s0)` | color used by the tab component for unselected rest background (MarsUI Tab_nav is transparent_inverse in every state). |
| — | — | unselected-rest | `--ki-tab-unselected-rest-fg` | onmars `var(--ki-text-supporting)`, material3 `var(--ki-text-high-em)` | color used by the tab component for unselected rest foreground (Figma inactive is Text/low_em, which fails the 4.5:1 text gate at 13px; med_em is the gate-compliant rest value — declared deviation). |
