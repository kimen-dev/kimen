# ki-grid

> A passive responsive grid for content items.

## When to use

lay out items on responsive tracks with consistent token spacing.

## When not to use

for page shells, painted grouping (use ki-card), or a data grid.

## Examples

# Grid examples

An automatic grid fills its available space with tracks at least as wide as
`min-column` where room allows. Here the summary takes two tracks when
possible.

```html
<ki-grid min-column="8rem" gap="xl">
  <ki-card data-span="2">Overview</ki-card>
  <ki-card>Orders</ki-card>
  <ki-card>Inventory</ki-card>
  <ki-card>Customers</ki-card>
</ki-grid>
```

For a fixed count, set `columns`. The grid switches to one column when its
own available inline size drops below 30rem.

```html
<ki-grid columns="3" gap="sm">
  <ki-card>Orders</ki-card>
  <ki-card>Inventory</ki-card>
  <ki-card>Customers</ki-card>
</ki-grid>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-grid`: the default, only the tokens ki-grid needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `columns` (number | undefined, minimum 1): Positive whole track count. Below 30rem of available inline size the fixed grid uses one column. Omit columns for automatic tracks.
- `gap` ("10xl" | "11xl" | "12xl" | "13xl" | "14xl" | "15xl" | "16xl" | "17xl" | "18xl" | "19xl" | "20xl" | "21xl" | "22xl" | "23xl" | "24xl" | "25xl" | "26xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "8xl" | "9xl" | "lg" | "md" | "sm" | "xl" | "xs" | "xxs" | "zero", default 'xl'): Kimen spacing step, xl by default. Unsupported values keep the default gap.
- `min-column` (string, default '15rem'): Minimum automatic track size as a CSS length. Defaults to 15rem and is ignored with fixed columns.

## Slots

- (default): The content in reading order. A direct child with data-span="2" spans two tracks when they fit.

## Parts

- `grid`: The grid layout containing the slotted content.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-grid-gap`: Default gap between grid tracks. Default: `var(--ki-layout-spacing-xl)`.
- `--ki-grid-min`: Default minimum size of an automatic grid track. Default: `var(--ki-layout-grid-min)`.
- `--ki-layout-grid-fixed-breakpoint`: Minimum available inline size for a fixed grid to use multiple tracks. Default: `var(--ki-size-layout-grid-fixed-breakpoint)`.
- `--ki-layout-grid-min`: Default minimum inline size of an automatic grid track. Default: `var(--ki-size-layout-grid-min)`.
- `--ki-layout-spacing-xl`: The xl spacing step for a stack or grid gap. Default: `var(--ki-space-xl)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
