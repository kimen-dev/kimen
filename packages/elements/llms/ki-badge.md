# ki-badge

> A static, non-interactive status pill.

## When to use

annotate an entity with short status text (a state, a
category) whose meaning is carried by the label itself; the tone color
only reinforces the text, it never replaces it.

## When not to use

feedback that must be announced (that is
ki-alert's job — the badge has no live region), an interactive
chip, filter or button, empty content (the label IS the meaning), or a
notification-counter overlay (use ki-counter).

## Examples

The slotted label is the sole carrier of meaning; `tone` only reinforces it with the `--ki-badge-{tone}-*` token colors, and an unrecognized value keeps the neutral appearance:

```html
<ki-badge>Draft</ki-badge>
<ki-badge tone="info">Beta</ki-badge>
<ki-badge tone="success">Active</ki-badge>
<ki-badge tone="warning">Trial ends soon</ki-badge>
<ki-badge tone="danger">Suspended</ki-badge>
```

`size` selects the metric scale (`sm` or `md`, default `md`):

```html
<ki-badge tone="success" size="sm">Synced</ki-badge>
```

A typical placement — trailing status on a list entry:

```html
<ki-list>
  <ki-list-item>
    Production deploy
    <ki-badge slot="end" tone="success">Healthy</ki-badge>
  </ki-list-item>
</ki-list>
```

## Attributes

- `size` ("md" | "sm" | "xs", default 'md'): Metric scale (`--ki-badge-{size}-*` tokens): 20, 24 or 28px tall in onmars, with 12px text at every size. An unrecognized value falls back to the `md` metrics the same way.
- `tone` ("danger" | "info" | "neutral" | "success" | "warning", default 'neutral'): Semantic intent, never appearance: each tone resolves its colors from the `--ki-badge-{tone}-*` tokens. An unrecognized value matches no style selector, so the badge keeps the neutral appearance (fallback by CSS construction — no validation code).

## Slots

- (default): The label: short status text, the sole carrier of meaning.

## Parts

- `badge`: The pill: background, foreground, border, radius, metrics and typography.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-badge-backdrop-filter`: Complete backdrop filter for the neutral badge surface.
- `--ki-badge-border-width`: dimension used by the badge component for border width (MarsUI tone tags carry width 0 in default state; only the neutral type draws its 1px edge via ki.badge.neutral.border-width. material3 keeps its border via its override).
- `--ki-badge-danger-bg`: color used by the badge component for danger background (MarsUI Surface/danger_base_em_alpha: tone-500 at 12% light — the tint composites over any surface and the dark alias adapts automatically).
- `--ki-badge-danger-border`: color used by the badge component for danger border.
- `--ki-badge-danger-fg`: color used by the badge component for danger foreground.
- `--ki-badge-font-family`: font family used by the badge component for font family.
- `--ki-badge-font-weight`: font weight used by the badge component for font weight.
- `--ki-badge-info-bg`: color used by the badge component for info background (MarsUI Surface/info_base_em_alpha: tone-500 at 12% light — the tint composites over any surface and the dark alias adapts automatically).
- `--ki-badge-info-border`: color used by the badge component for info border.
- `--ki-badge-info-fg`: color used by the badge component for info foreground.
- `--ki-badge-md-font-size`: dimension used by the badge component for md font size (MarsUI UI/Caption 2: 12px at both sm and md; only xs drops to Caption 1).
- `--ki-badge-md-height`: dimension used by the badge component for md height (MarsUI Tag md outer height 28px).
- `--ki-badge-md-line-height`: dimension used by the badge component for md line height (MarsUI caption_2 16px).
- `--ki-badge-md-padding-inline`: dimension used by the badge component for md padding inline (MarsUI total text inset 10px; paired with the border-width 0 + border-box change so the badge does not shrink).
- `--ki-badge-md-radius`: dimension used by the badge component for md radius (MarsUI Tag: Radius/component/radius_sm 8px at both sm and md).
- `--ki-badge-neutral-bg`: color used by the badge component for neutral background (MarsUI secondary Tag: Surface/special/secondary_alpha_base, the same fill as ki-button secondary; opaque white in onmars v2, translucent only where a theme turns that back on. material3 keeps the opaque s2 chip via its override).
- `--ki-badge-neutral-border`: color used by the badge component for neutral border (MarsUI secondary Tag edge: Outline/secondary_button_top; drawn at ki.badge.neutral.border-width).
- `--ki-badge-neutral-border-width`: dimension used by the badge component for the neutral border width: MarsUI draws the 1px edge only on this type.
- `--ki-badge-neutral-fg`: color used by the badge component for neutral foreground.
- `--ki-badge-sm-font-size`: dimension used by the badge component for sm font size.
- `--ki-badge-sm-height`: dimension used by the badge component for sm height.
- `--ki-badge-sm-line-height`: dimension used by the badge component for sm line height.
- `--ki-badge-sm-padding-inline`: dimension used by the badge component for sm padding inline (MarsUI total text inset 8px; paired with the border-width 0 + border-box change).
- `--ki-badge-sm-radius`: dimension used by the badge component for sm radius (MarsUI Tag silhouette is an 8px rounded rect — Radius/component/radius_sm — never a pill).
- `--ki-badge-success-bg`: color used by the badge component for success background (MarsUI Surface/success_base_em_alpha: tone-500 at 12% light — the tint composites over any surface and the dark alias adapts automatically).
- `--ki-badge-success-border`: color used by the badge component for success border.
- `--ki-badge-success-fg`: color used by the badge component for success foreground.
- `--ki-badge-warning-bg`: color used by the badge component for warning background (MarsUI Surface/warning_base_em_alpha: tone-500 at 12% light — the tint composites over any surface and the dark alias adapts automatically).
- `--ki-badge-warning-border`: color used by the badge component for warning border.
- `--ki-badge-warning-fg`: color used by the badge component for warning foreground.
- `--ki-badge-xs-font-size`: dimension used by the badge component for xs font size (Tag 10106:4651 xs). Figma draws caption_1, 10px; caption_2, 12px, is the smallest text the library ships (spec 050 D7).
- `--ki-badge-xs-height`: dimension used by the badge component for xs height (Tag 10106:4651 xs: 20px).
- `--ki-badge-xs-line-height`: dimension used by the badge component for xs line height (caption_2 16px, the same height as caption_1).
- `--ki-badge-xs-padding-inline`: dimension used by the badge component for xs padding inline (Tag 10106:4651 xs: Space/xs plus the Text_wrap Space/xxs, 6px).
- `--ki-badge-xs-radius`: dimension used by the badge component for xs radius (Tag 10106:4651 xs binds Radius/small-component/xs).
- `--ki-effect-component-secondary-default-shadow`: MarsUI Component_effect/secondary_default: drop 0/2/1.5/-0.5 plus inner White/3 0/2/3. Pair with --ki-effect-component-backdrop-filter.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-outline-secondary-button-bottom`: semantic color for outline secondary button bottom.
