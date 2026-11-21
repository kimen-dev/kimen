# ki-date-picker

> A locale-aware date field with an anchored keyboard-operable calendar.

## When to use

Choose a nearby date or date range when the weekday matters, such as
a booking, a deadline or a schedule.

## When not to use

Enter a known distant date, such as a birth date, or choose a time.

## Examples

# DatePicker examples

## Choose a departure date

```html
<ki-date-picker label="Departure" name="departure" locale="en-GB" required
  help-text="Enter a date in DD/MM/YYYY format." min="2026-11-10">
</ki-date-picker>
```

Typing `20/11/2026` and pressing Enter emits
`ki-change` with `{ "value": "2026-11-20" }`.

## Apply a stay range

```html
<ki-date-picker label="Stay" name="stay" mode="range" confirm
  value="2026-11-12/2026-11-16" locale="en-GB"
  min="2026-11-10" max="2026-11-30">
</ki-date-picker>
```

Pick two endpoints and activate Apply to save the range. The form receives
one `stay` entry with the date pair.

## Text that is not a date

The field keeps text it cannot read as a date within its bounds so the
person can correct it, shows its own message (`error-text`, else
`invalid-date-label`) once the person leaves the field or presses Enter, and
stays invalid, so its form cannot submit it. It fires no `ki-change`, and
`value` keeps the last date it saved. Clearing a saved date is a change: it
fires `ki-change` with `{ "value": "" }`.

## An error from the application

Set `custom-error` to show the application's verdict on the submitted date,
such as an availability check. The field is invalid, blocks its form and is
announced as invalid at once. The person's next edit of the text or pick of
another date withdraws the error. Remove the attribute when a new attempt
starts: setting the same text again while it is still set shows nothing.

```html
<ki-date-picker label="Departure" name="departure" locale="en-GB" value="2026-12-24"
  custom-error="No flights on that day.">
</ki-date-picker>
```

## Attributes

- `apply-label` (string, default 'Apply'): Localized label of the confirmation button that saves a complete draft.
- `cancel-label` (string, default 'Cancel'): Localized label of the confirmation button that discards a draft.
- `change-label` (string, default 'Change date, {date}'): Localized name of the trigger when a date is saved. Use {date} for the current selection.
- `choose-label` (string, default 'Choose date'): Localized name of the calendar dialog and of the trigger when no date is saved.
- `confirm` (boolean, default false): Require Apply before saving picks made in the calendar.
- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted date ("No flights on that day"). While it holds text the field is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting at the person's next edit of the text or pick of another date, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for a missing, unreadable or out-of-bounds date, which the field reports itself; `error-text` words those. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Disables the text entry and calendar button and excludes the field from form data.
- `error-text` (string | undefined): Overrides the message shown when a date is missing, invalid or outside the bounds. A `custom-error` outranks it.
- `first-day-of-week` (number | undefined, minimum 0, maximum 6): First weekday, where Sunday is 0 and Saturday is 6. Defaults to the locale's week start.
- `help-text` (string | undefined): A format hint or explanation read with the field. It is replaced by a visible error.
- `invalid-date-label` (string, default 'Enter a valid date within the allowed range.'): Localized fallback message for an impossible, incomplete or out-of-bounds date.
- `label` (string, required): Visible text and accessible name of the date field. Provide a label for every field.
- `locale` (string | undefined): BCP 47 language tag for localized dates and weekday order. Defaults to the page language.
- `max` (string | undefined): Latest selectable date, inclusive. Use YYYY-MM-DD.
- `min` (string | undefined): Earliest selectable date, inclusive. Use YYYY-MM-DD.
- `mode` ("range" | "single", default 'single'): Select one date or a range with a start and an end date.
- `name` (string | undefined): Form-data key. A range is submitted as a single value.
- `next-month-label` (string, default 'Next month'): Localized accessible name of the next-month button.
- `previous-month-label` (string, default 'Previous month'): Localized accessible name of the previous-month button.
- `required` (boolean, default false): Requires a complete date or pair of dates for native form submission.
- `value` (string, default ''): Current ISO date, ISO start/end pair or empty string. The value attribute is the reset default.

## Slots

None.

## Parts

- `day`: Date button in the calendar grid.
- `error`: Live constraint message replacing help when the field is invalid.
- `field`: Enclosure of the text field and calendar button.
- `grid`: Calendar grid with localized weekdays and date buttons.
- `help`: Help text associated with the input.
- `input`: Native text entry for a localized date or range.
- `label`: Visible label and accessible name of the text field.
- `month`: Live month and year heading.
- `popup`: Anchored non-modal calendar dialog.
- `trigger`: Button that opens and closes the calendar.

## Events

- `ki-change` (CustomEvent<DatePickerChangeDetail>): Reports a changed, committed value in canonical ISO form. Use this for calendar and typed changes.

## Methods

None.

## CSS custom properties

- `--ki-control-border-width`: Stroke width of the boundary of a compact control.
- `--ki-control-radius-track`: Corner radius of a track containing adjacent controls.
- `--ki-control-size-sm`: Small control track height, 32 CSS px at the default root size.
- `--ki-control-size-touch`: Touch target size for controls on a coarse pointer.
- `--ki-date-picker-backdrop-filter`: Complete filter behind the calendar.
- `--ki-date-picker-bg`: Fill of the calendar dialog.
- `--ki-date-picker-bg-image`: Optional image layered over the calendar fill.
- `--ki-date-picker-border`: Calendar surface edge.
- `--ki-date-picker-day-hover-bg`: Hover fill of an available unselected day.
- `--ki-date-picker-day-hover-fg`: Ink on the hover fill.
- `--ki-date-picker-day-radius`: Radius of a day and the ends of a range.
- `--ki-date-picker-day-size`: Default size of a day target.
- `--ki-date-picker-fg`: Default calendar text.
- `--ki-date-picker-field-bg`: Fill of the text field.
- `--ki-date-picker-field-fg`: Text, icon and caret of the field.
- `--ki-date-picker-heading-family`: Family of the calendar month heading.
- `--ki-date-picker-outside-bg`: Fill behind dates in neighboring months.
- `--ki-date-picker-outside-fg`: Ink of dates in neighboring months.
- `--ki-date-picker-radius`: Calendar popup corner radius.
- `--ki-date-picker-range-bg`: Fill of the span between selected endpoints.
- `--ki-date-picker-range-fg`: Text of dates within the span.
- `--ki-date-picker-selected-bg`: Fill of a chosen day or range endpoint.
- `--ki-date-picker-selected-fg`: Text of a chosen day or range endpoint.
- `--ki-date-picker-shadow`: Calendar popup elevation.
- `--ki-date-picker-today-border`: Outline of the current date.
- `--ki-date-picker-weekday-bg`: Fill behind weekday names.
- `--ki-date-picker-weekday-fg`: Ink of weekday names.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-glyph-size-md`: Medium glyph for body content (20px at the default root size).
- `--ki-layout-spacing-3xl`: The 3xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-lg`: The lg spacing step for a stack or grid gap.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap.
- `--ki-layout-spacing-xl`: The xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap.
- `--ki-outline-control`: The boundary of a control that can be EMPTY — field, checkbox, radio, switch. Such a control carries no label inside its own box, so the box IS what identifies it and must clear WCAG 1.4.11's 3:1 against every surface it can sit on (s0-s2). Pinned to an accessibility floor, NOT to a position in the emphasis ramp: rebalancing outline.base/low/med/high must never silently erase a control's edge. MarsUI draws Outline/Black-8 here, but as an edge over a filled cell on a fixed canvas — transcribed literally it measured 1.19:1 against a fill identical to the page (audit 2026-07-25). Declared deviation.
- `--ki-outline-danger-high-em`: semantic color for outline danger high em.
- `--ki-surface-transparent`: Transparent surface backing for a background image that carries its own opacity.
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-high-em`: semantic color for text high em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold.
