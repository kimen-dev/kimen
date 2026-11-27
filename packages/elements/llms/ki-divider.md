# ki-divider

> A static, decorative rule that visually separates adjacent content.

## When to use

visually separate adjacent content when spacing alone is not
enough: grouped settings sections, toolbar action groups, distinct
regions inside a card — horizontal between stacked content, vertical
between side-by-side content.

## When not to use

between list items (separation is a ki-list theme-token
decision), semantic thematic breaks in running prose (native `<hr>`
carries those semantics — the divider is deliberately decorative and
contributes no role, name or announcement), as a border or outline
substitute (surface/border tokens), or purely decorative flourishes
(prefer white space).

## Examples

A horizontal rule between stacked content; the divider is decorative — no role, no name, no tab stop (semantic thematic breaks belong to native `<hr>`):

```html
<section>Profile</section>
<ki-divider></ki-divider>
<section>Notifications</section>
```

`orientation="vertical"` separates side-by-side content and stretches to the cross size its layout context provides — give the row a height or let flex stretch it:

```html
<div style="display: flex; align-items: stretch">
  <ki-button type="button">Edit</ki-button>
  <ki-divider orientation="vertical"></ki-divider>
  <ki-button type="button">Share</ki-button>
</div>
```

An inset is a per-instance layout decision — use logical margins on the instance; thickness, color, end caps and gutter stay per-theme `--ki-divider-*` tokens, never attributes:

```html
<ki-divider style="margin-inline: 16px"></ki-divider>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-divider`: the default, only the tokens ki-divider needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `orientation` ("horizontal" | "vertical", default 'horizontal'): Layout axis of the rule: `horizontal` spans the available inline size between stacked content; `vertical` stretches to the cross size its layout context provides, between side-by-side content. A structural axis, never appearance — thickness, color, end caps and gutter are per-theme `--ki-divider-*` tokens. An unrecognized value matches no style selector, so the divider keeps the default horizontal rendering (fallback by CSS construction — no validation code).

## Slots

None.

## Parts

- `divider`: The rule itself: thickness, color and end-cap radius.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-divider-color`: color used by the divider component for the rule: Outline/base_em (Black/3 light, White/3 dark), the exact variable bound to every Figma divider variant and the same semantic role ki-list uses for item dividers. Default: onmars `var(--ki-outline-base-em)`, material3 `var(--ki-outline-med-em)`.
- `--ki-divider-radius`: dimension used by the divider component for the end caps: the MarsUI ends axis is a pure-appearance, per-theme choice (FR-006); onmars keeps the rounded hairline (ends=rounded, pill caps). Default: onmars `var(--ki-radius-round)`, material3 `var(--ki-radius-0)`.
- `--ki-divider-spacing`: dimension used by the divider component for the reserved gutter: the 8px MarsUI variant frame with the rule centered inside it (FR-007). Default: onmars `var(--ki-space-md)`, material3 `var(--ki-space-zero)`.
- `--ki-divider-thickness`: dimension used by the divider component for the rule thickness: the MarsUI 1px hairline verified on the Divider_horizontal/Divider_vertical sets (specs/020-ki-divider/design-extraction.md). Default: `var(--ki-size-border-hairline)`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-standard-decelerate`: Utility entrance curve. M3 md.sys.motion.easing.standard-decelerate. onmars: the MarsUI decelerate curve (ki.easing.out). Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
