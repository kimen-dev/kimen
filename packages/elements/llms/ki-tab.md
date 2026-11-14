# ki-tab

> One selectable tab inside a `ki-tabs` view switcher.

## When to use

label one peer content view inside `ki-tabs`, with optional
`start` and `end` slot media.

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

## Attributes

- `disabled` (boolean, default false): Prevents selection by every modality and exposes the unavailable state. Boolean presence semantics apply: `disabled="false"` is still disabled.
- `selected` (boolean, default false): Output-only selected state written by `ki-tabs`. Set the group's `value` to choose an initial tab; author-set `selected` is overwritten.
- `value` (string, default ''): Pairing identifier shared with a `ki-tab-panel`. The first tab with a value owns it; later duplicates render but are not selectable.

## Slots

- (default): Tab label; this is the accessible name source.
- `end`: Trailing icon or media. Follows writing direction.
- `start`: Leading icon or media. Follows writing direction.

## Parts

- `indicator`: Decorative selected-tab marker.
- `tab`: Tab surface.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-motion-distance-xs`: Motion travel distance xs (2px): hover-lift offsets.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-tab-focus-ring-color`: color used by the tab component for focus ring color.
- `--ki-tab-focus-ring-offset`: dimension used by the tab component for focus ring offset.
- `--ki-tab-focus-ring-shadow`: shadow used by the tab component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-tab-focus-ring-width`: dimension used by the tab component for focus ring width.
- `--ki-tab-font-size`: dimension used by the tab component for font size.
- `--ki-tab-font-weight`: font weight used by the tab component for font weight.
- `--ki-tab-gap`: dimension used by the tab component for gap.
- `--ki-tab-indicator-color`: color used by the tab component for indicator color (MarsUI active underline is Outline/inverse_white: black in light, white in dark — the inverse neutral, not primary).
- `--ki-tab-indicator-radius`: dimension used by the tab component for indicator radius (the master underline is a square-ended 2px bottom border).
- `--ki-tab-indicator-size`: dimension used by the tab component for indicator size.
- `--ki-tab-line-height`: dimension used by the tab component for line height.
- `--ki-tab-min-block-size`: dimension used by the tab component for min block size (MarsUI Tab_nav md bar height 40px: 24px body_1 label + 8px block-end clearance + underline; retargeted from ki.space.7xl per the fidelity audit — material3 pins its own value).
- `--ki-tab-padding-block-end`: dimension used by the tab component for padding block end (MarsUI Tab_nav_item: 8px inset keeping the 2px underline clear of the 13/24 label; formalizes the fallback ki-tab.css already consumes).
- `--ki-tab-padding-inline`: dimension used by the tab component for padding inline (MarsUI items carry no inline padding: spacing comes from the bar gap and the underline spans the full item width).
- `--ki-tab-radius`: dimension used by the tab component for radius.
- `--ki-tab-selected-active-bg`: color used by the tab component for selected active background (MarsUI Tab_nav is transparent_inverse in every state; background pills are Switcher language).
- `--ki-tab-selected-active-fg`: color used by the tab component for selected active foreground (MarsUI active tab label is neutral Text/high_em — never purple; master 10048:1240).
- `--ki-tab-selected-disabled-bg`: color used by the tab component for selected disabled background (no disabled variant exists in Tab_nav; disabled must be quieter than rest, not a filled pill).
- `--ki-tab-selected-disabled-fg`: color used by the tab component for selected disabled foreground (MarsUI disabled ladder: Gray/500 light / White-32 dark, the value ki-status and ki-switch already use for disabled glyphs).
- `--ki-tab-selected-hover-bg`: color used by the tab component for selected hover background (MarsUI Tab_nav is transparent_inverse in every state; background pills are Switcher language).
- `--ki-tab-selected-hover-fg`: color used by the tab component for selected hover foreground (MarsUI active tab label is neutral Text/high_em — never purple; master 10048:1240).
- `--ki-tab-selected-rest-bg`: color used by the tab component for selected rest background (MarsUI Tab_nav is transparent_inverse in every state; background pills are Switcher language).
- `--ki-tab-selected-rest-fg`: color used by the tab component for selected rest foreground (MarsUI active tab label is neutral Text/high_em — never purple; master 10048:1240).
- `--ki-tab-unselected-active-bg`: color used by the tab component for unselected active background (MarsUI Tab_nav is transparent_inverse in every state).
- `--ki-tab-unselected-active-fg`: color used by the tab component for unselected active foreground (mirrors hover; MarsUI defines no pressed variant).
- `--ki-tab-unselected-disabled-bg`: color used by the tab component for unselected disabled background (no disabled variant exists in Tab_nav; disabled must be quieter than rest, not a filled pill).
- `--ki-tab-unselected-disabled-fg`: color used by the tab component for unselected disabled foreground (MarsUI disabled ladder: Gray/500 light / White-32 dark, the value ki-status and ki-switch already use for disabled glyphs).
- `--ki-tab-unselected-hover-bg`: color used by the tab component for unselected hover background (MarsUI Tab_nav is transparent_inverse in every state).
- `--ki-tab-unselected-hover-fg`: color used by the tab component for unselected hover foreground (with rest at med_em, hover darkens one em step, preserving the master rest-to-hover direction).
- `--ki-tab-unselected-rest-bg`: color used by the tab component for unselected rest background (MarsUI Tab_nav is transparent_inverse in every state).
- `--ki-tab-unselected-rest-fg`: color used by the tab component for unselected rest foreground (Figma inactive is Text/low_em, which fails the 4.5:1 text gate at 13px; med_em is the gate-compliant rest value — declared deviation).
- `--ki-typography-family-body`: semantic font family for typography family body.
