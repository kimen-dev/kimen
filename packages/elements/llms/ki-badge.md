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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-badge`: the default, only the tokens ki-badge needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

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

- `--ki-badge-backdrop-filter`: Complete backdrop filter for the neutral badge surface. Default: `var(--ki-effect-component-backdrop-filter)`.
- `--ki-badge-border-width`: dimension used by the badge component for border width (MarsUI tone tags carry width 0 in default state; only the neutral type draws its 1px edge via ki.badge.neutral.border-width. material3 keeps its border via its override). Default: onmars `var(--ki-space-zero)`, material3 `0.0625rem`.
- `--ki-badge-danger-bg`: color used by the badge component for danger background (MarsUI Surface/danger_base_em_alpha: tone-500 at 12% light — the tint composites over any surface and the dark alias adapts automatically). Default: onmars `var(--ki-surface-danger-tint)`, material3 `var(--ki-surface-danger-base-em)`.
- `--ki-badge-danger-border`: color used by the badge component for danger border. Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-danger-low-em)`.
- `--ki-badge-danger-fg`: color used by the badge component for danger foreground. Default: `var(--ki-text-danger-high-em)`.
- `--ki-badge-font-family`: font family used by the badge component for font family. Default: `var(--ki-typography-family-body)`.
- `--ki-badge-font-weight`: font weight used by the badge component for font weight. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-badge-info-bg`: color used by the badge component for info background (MarsUI Surface/info_base_em_alpha: tone-500 at 12% light — the tint composites over any surface and the dark alias adapts automatically). Default: onmars `var(--ki-surface-info-tint)`, material3 `var(--ki-surface-info-base-em)`.
- `--ki-badge-info-border`: color used by the badge component for info border. Default: `var(--ki-outline-none)`.
- `--ki-badge-info-fg`: color used by the badge component for info foreground. Default: `var(--ki-text-info-high-em)`.
- `--ki-badge-md-font-size`: dimension used by the badge component for md font size (MarsUI UI/Caption 2: 12px at both sm and md; only xs drops to Caption 1). Default: `var(--ki-typography-size-caption-2)`.
- `--ki-badge-md-height`: dimension used by the badge component for md height (MarsUI Tag md outer height 28px). Default: `var(--ki-space-9xl)`.
- `--ki-badge-md-line-height`: dimension used by the badge component for md line height (MarsUI caption_2 16px). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-badge-md-padding-inline`: dimension used by the badge component for md padding inline (MarsUI total text inset 10px; paired with the border-width 0 + border-box change so the badge does not shrink). Default: `var(--ki-space-lg)`.
- `--ki-badge-md-radius`: dimension used by the badge component for md radius (MarsUI Tag: Radius/component/radius_sm 8px at both sm and md). Default: onmars `var(--ki-radius-component-sm)`, material3 `var(--ki-radius-round)`.
- `--ki-badge-neutral-bg`: color used by the badge component for neutral background (MarsUI secondary Tag: Surface/special/secondary_alpha_base, the same fill as ki-button secondary; opaque white in onmars v2, translucent only where a theme turns that back on. material3 keeps the opaque s2 chip via its override). Default: onmars `var(--ki-surface-s3)`, material3 `var(--ki-surface-s2)`.
- `--ki-badge-neutral-border`: color used by the badge component for neutral border (MarsUI secondary Tag edge: Outline/secondary_button_top; drawn at ki.badge.neutral.border-width). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-low-em)`.
- `--ki-badge-neutral-border-width`: dimension used by the badge component for the neutral border width: MarsUI draws the 1px edge only on this type. Default: onmars `var(--ki-size-border-hairline)`, material3 `0.0625rem`.
- `--ki-badge-neutral-fg`: color used by the badge component for neutral foreground. Default: `var(--ki-text-high-em)`.
- `--ki-badge-sm-font-size`: dimension used by the badge component for sm font size. Default: `var(--ki-typography-size-caption-2)`.
- `--ki-badge-sm-height`: dimension used by the badge component for sm height. Default: `var(--ki-space-7xl)`.
- `--ki-badge-sm-line-height`: dimension used by the badge component for sm line height. Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-badge-sm-padding-inline`: dimension used by the badge component for sm padding inline (MarsUI total text inset 8px; paired with the border-width 0 + border-box change). Default: `var(--ki-space-md)`.
- `--ki-badge-sm-radius`: dimension used by the badge component for sm radius (MarsUI Tag silhouette is an 8px rounded rect — Radius/component/radius_sm — never a pill). Default: onmars `var(--ki-radius-component-sm)`, material3 `var(--ki-radius-round)`.
- `--ki-badge-success-bg`: color used by the badge component for success background (MarsUI Surface/success_base_em_alpha: tone-500 at 12% light — the tint composites over any surface and the dark alias adapts automatically). Default: onmars `var(--ki-surface-success-tint)`, material3 `var(--ki-surface-success-base-em)`.
- `--ki-badge-success-border`: color used by the badge component for success border. Default: onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-success-low-em)`.
- `--ki-badge-success-fg`: color used by the badge component for success foreground. Default: `var(--ki-text-success-high-em)`.
- `--ki-badge-warning-bg`: color used by the badge component for warning background (MarsUI Surface/warning_base_em_alpha: tone-500 at 12% light — the tint composites over any surface and the dark alias adapts automatically). Default: onmars `var(--ki-surface-warning-tint)`, material3 `var(--ki-surface-warning-base-em)`.
- `--ki-badge-warning-border`: color used by the badge component for warning border. Default: `var(--ki-outline-none)`.
- `--ki-badge-warning-fg`: color used by the badge component for warning foreground. Default: `var(--ki-text-warning-high-em)`.
- `--ki-badge-xs-font-size`: dimension used by the badge component for xs font size (Tag 10106:4651 xs). Figma draws caption_1, 10px; caption_2, 12px, is the smallest text the library ships (spec 050 D7). Default: `var(--ki-typography-size-caption-2)`.
- `--ki-badge-xs-height`: dimension used by the badge component for xs height (Tag 10106:4651 xs: 20px). Default: `var(--ki-space-5xl)`.
- `--ki-badge-xs-line-height`: dimension used by the badge component for xs line height (caption_2 16px, the same height as caption_1). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-badge-xs-padding-inline`: dimension used by the badge component for xs padding inline (Tag 10106:4651 xs: Space/xs plus the Text_wrap Space/xxs, 6px). Default: `var(--ki-space-sm)`.
- `--ki-badge-xs-radius`: dimension used by the badge component for xs radius (Tag 10106:4651 xs binds Radius/small-component/xs). Default: onmars `var(--ki-radius-component-xs)`, material3 `var(--ki-radius-round)`.
- `--ki-effect-component-secondary-default-shadow`: MarsUI Component_effect/secondary_default: drop 0/2/1.5/-0.5 plus inner White/3 0/2/3. Pair with --ki-effect-component-backdrop-filter. Default: onmars `0 0 rgba(0,0,0,0)`, material3 `0px 1px 2px 0px rgba(0,0,0,0.3),0px 1px 3px 1px rgba(0,0,0,0.15)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-outline-secondary-button-bottom`: semantic color for outline secondary button bottom. Default: onmars `light-dark(rgba(24,22,19,0.14),rgba(255,250,240,0.14))`, material3 `light-dark(var(--ki-color-black-8),var(--ki-color-white-12))`.
