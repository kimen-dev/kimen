# ki-format-number

> Displays a raw number using local number conventions and tabular figures.

## When to use

For numeric data, currency amounts, ratios and measurements in content.

## When not to use

For numeric input or values that already include localized formatting.

## Examples

# Format a number

Pass raw numbers and let the nearest `lang` declaration select the separators,
spacing and symbols. A percent takes a ratio.

```html
<section lang="es-ES">
  <ki-format-number value="1284.5"></ki-format-number>
  <ki-format-number value="49" currency="EUR"></ki-format-number>
  <ki-format-number value="0.496" format-style="percent" maximum-fraction-digits="1"></ki-format-number>
  <ki-format-number value="23" format-style="unit" unit="celsius"></ki-format-number>
  <ki-format-number value="59320" notation="compact"></ki-format-number>
</section>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-format-number`: the default, only the tokens ki-format-number needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `currency` (string | undefined): ISO 4217 currency code, such as EUR. Selects currency output when format-style is omitted.
- `format-style` ("decimal" | "percent" | "unit" | undefined): Decimal, percent or unit output. Without this option, currency selects currency output and other values use decimal.
- `maximum-fraction-digits` (number | undefined, minimum 0): Maximum number of fraction digits.
- `minimum-fraction-digits` (number | undefined, minimum 0): Minimum number of fraction digits.
- `notation` ("compact" | undefined): Use compact notation for abbreviated large numbers. Omit for standard notation.
- `unit` (string | undefined): Intl unit identifier, such as celsius or kilometer. Use with format-style="unit".
- `value` (number | undefined): Raw finite number. A percent uses a ratio, so 0.49 displays as 49%.

## Slots

None.

## Parts

None.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-format-number-font-family`: Default body font family for ki-format-number on a bare page.
