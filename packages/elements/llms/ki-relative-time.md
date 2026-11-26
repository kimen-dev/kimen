# ki-relative-time

> Displays the elapsed or remaining time for a timestamp in the reader's language.

## When to use

For timestamps whose distance from the present matters, such as timeline entries or recent changes.

## When not to use

For an interactive countdown or a date that should always show an absolute value.

## Examples

# Format a relative timestamp

Use `sync` to update the visible wording as time passes. A threshold of
86,400 seconds switches to the formatted timestamp at one day's distance.
Assistive technology and the tooltip expose the absolute timestamp throughout.

```html
<ki-relative-time date="2026-11-19T08:41:00Z" sync threshold="86400"></ki-relative-time>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-relative-time`: the default, only the tokens ki-relative-time needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `date` (string | undefined): ISO calendar date or date-time. A timestamp without an offset uses local time.
- `numeric` ("always" | "auto", default 'auto'): Auto can show words such as yesterday. Always uses a number.
- `sync` (boolean, default false): Refresh the visible wording as the clock crosses a formatting boundary.
- `threshold` (number | undefined, minimum 0): Display an absolute timestamp when the distance reaches this many seconds. Omit to keep relative wording at any distance.

## Slots

None.

## Parts

None.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-relative-time-font-family`: Default body font family for ki-relative-time on a bare page.
