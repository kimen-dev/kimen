# ki-format-date

> Displays an ISO date or timestamp in the reader's language.

## When to use

For raw date and timestamp values in tables, records and prose.

## When not to use

For an editable date or an elapsed time that should change as the clock advances.

## Examples

# Format a date

Use a calendar date when the day is the value, and send an offset or `Z` when
the value is a timestamp. Set `lang` on the surrounding document or section.

```html
<section lang="es-ES">
  <ki-format-date date="2026-11-19" date-style="long"></ki-format-date>
  <ki-format-date
    date="2026-11-19T23:41:00Z"
    date-style="long"
    time-style="short"
    time-zone="Europe/Madrid"
  ></ki-format-date>
</section>
```

## Attributes

- `date` (string | undefined): ISO calendar date (YYYY-MM-DD) or ISO date-time. A timestamp without an offset uses local time.
- `date-style` ("full" | "long" | "medium" | "short" | undefined): Date detail. Defaults to medium when neither date style nor time style is supplied.
- `lang` (string | undefined): Language tag for the formatted date. Inherits the nearest HTML lang declaration when omitted.
- `time-style` ("full" | "long" | "medium" | "short" | undefined): Time detail. Omit to show the date alone.
- `time-zone` (string | undefined): IANA time zone for a timestamp. A calendar date keeps its day in every zone.

## Slots

None.

## Parts

None.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-format-date-font-family`: Default body font family for ki-format-date on a bare page.
