# ki-stack

> A passive flex layout for content on one axis.

## When to use

arrange content in a vertical sequence or a horizontal row with
consistent token spacing.

## When not to use

for page shells, painted grouping (use ki-card), or tabular data.

## Examples

# Stack examples

A vertical sequence uses the default direction and the medium spacing step.

```html
<ki-stack>
  <h2>Account</h2>
  <p>Review the settings for your workspace.</p>
  <ki-button variant="secondary">Edit settings</ki-button>
</ki-stack>
```

A toolbar keeps its source order with a horizontal axis, wrapping and a
growing label. Place `data-grow` on a direct child to give it a share of the
available free space.

```html
<ki-stack direction="row" gap="sm" justify="between" align="center" wrap>
  <strong data-grow>Order summary</strong>
  <ki-button variant="secondary">Cancel</ki-button>
  <ki-button variant="primary">Save</ki-button>
</ki-stack>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-stack`: the default, only the tokens ki-stack needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `align` ("baseline" | "center" | "end" | "start" | "stretch", default 'stretch'): Cross-axis alignment, stretch by default.
- `direction` ("column" | "row", default 'column'): Main axis, column by default.
- `gap` ("10xl" | "11xl" | "12xl" | "13xl" | "14xl" | "15xl" | "16xl" | "17xl" | "18xl" | "19xl" | "20xl" | "21xl" | "22xl" | "23xl" | "24xl" | "25xl" | "26xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "8xl" | "9xl" | "lg" | "md" | "sm" | "xl" | "xs" | "xxs" | "zero", default 'md'): Kimen spacing step, md by default. Unsupported values keep the default gap.
- `justify` ("between" | "center" | "end" | "start", default 'start'): Main-axis distribution, start by default. Use between to distribute spare space.
- `wrap` (boolean, default false): Allow items to continue on a new line. Defaults to false.

## Slots

- (default): The content in reading order. A direct child with data-grow takes a share of free space.

## Parts

- `stack`: The flex layout containing the slotted content.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap. Default: `var(--ki-space-md)`.
- `--ki-stack-gap`: Default gap of a stack. Default: `var(--ki-layout-spacing-md)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
