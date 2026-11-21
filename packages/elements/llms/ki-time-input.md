# ki-time-input

> A time-of-day field with locale-aware typing and suggested slots. The shadow root keeps the combobox and listbox in the same accessibility ID scope. The host owns native form participation.

## When to use

collect an exact time of day or offer regular appointment slots.
Provide a visible label and set bounding times when the schedule is limited.

## When not to use

durations, dates or timestamps. Pair with a date field when
the day matters. Timezone conversion belongs to the application.

## Examples

Display 12-hour time for a US English form and keep the value in canonical
24-hour form. The person can type any time from 08:00 through 18:00, including
minutes between the half-hour suggestions.

```html
<ki-time-input
  lang="en-US"
  label="Pickup time"
  name="pickup"
  required
  value="09:30"
  min="08:00"
  max="18:00"
  step="30"
  help-text="Store hours"
  time-zone="America/New_York"
  error-text="Choose a pickup time between 8:00 AM and 6:00 PM."
></ki-time-input>
```

Set the language on a surrounding element to localize the time, and pass
translated labels for the suggestion controls. Touch density increases the
field and suggestion hit areas.

```html
<div lang="es-ES" data-ki-density="touch">
  <ki-time-input
    label="Hora de la cita"
    picker-label="Elige una hora"
    list-label="Horas sugeridas"
    error-text="Introduce una hora válida."
  ></ki-time-input>
</div>
```

## Attributes

- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted time ("That slot was just booked"). While it holds text the field is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting at the person's next edit or pick of a time, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text` and an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for `required`, the bounds or unreadable text, which the field reports itself; `error-text` words those. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Disables typing, suggestions and form participation.
- `error-text` (string | undefined): Validation message to show after blur or a blocked form submission. A `custom-error` outranks it.
- `help-text` (string | undefined): Guidance read with the field until a validation error replaces it.
- `invalid-time-text` (string, default 'Enter a valid time within the allowed range.'): Fallback validation message for invalid time syntax or bounds.
- `label` (string, required): Visible text naming the time field. Provide it for every use.
- `list-label` (string, default 'Suggested times'): Accessible name of the suggestion listbox.
- `max` (string | undefined): Latest allowed wall-clock time in HH:mm, inclusive.
- `min` (string | undefined): Earliest allowed wall-clock time in HH:mm, inclusive.
- `name` (string | undefined): Name under which the canonical time is submitted.
- `picker-label` (string, default 'Choose time'): Accessible name of the button that opens suggestions.
- `required` (boolean, default false): Empty values block form submission when true.
- `step` (number, default 30): Suggested slot interval in whole minutes. Typed times keep their exact minutes.
- `time-zone` (string | undefined): IANA timezone shown alongside help. Does not change wall-clock values.
- `value` (string, default ''): Committed wall-clock time in HH:mm, or empty. The attribute sets the form reset value.

## Slots

- `start`: Optional leading adornment, outside the input's accessible name.

## Parts

- `error`: Polite validation message that replaces help.
- `field`: Field enclosure and anchor for the suggestions.
- `help`: Help and timezone describing the field.
- `input`: Editable text combobox.
- `label`: Visible label naming the editable combobox.
- `listbox`: Scrollable list of suggested times.
- `option`: Individual suggested time.
- `trigger`: Button that opens suggested times.

## Events

- `ki-change` (CustomEvent<KiTimeInputChangeDetail>): Emitted when a person commits a different canonical time or clears it.
- `change` (Event): Native-style composed event for a changed user commit.

## Methods

None.

## CSS custom properties

- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-input-border-block-end-width`: dimension used by the input component for border block end width.
- `--ki-input-border-block-start-width`: dimension used by the input component for border block start width.
- `--ki-input-border-inline-end-width`: dimension used by the input component for border inline end width.
- `--ki-input-border-inline-start-width`: dimension used by the input component for border inline start width.
- `--ki-input-disabled-bg`: color used by the input component for disabled background.
- `--ki-input-disabled-border`: color used by the input component for disabled border.
- `--ki-input-disabled-fg`: color used by the input component for disabled foreground (MarsUI disabled text Text/base_em; disabled cells are exempt from the contrast sweep).
- `--ki-input-disabled-label-fg`: color used by the input component for disabled label foreground.
- `--ki-input-focus-bg`: color used by the input component for focus background (MarsUI active state switches the fill to Surface/Special white / dark s2 — modeled with the scheme ladder s0).
- `--ki-input-focus-fg`: color used by the input component for focus foreground.
- `--ki-input-focus-label-fg`: color used by the input component for focus label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-input-focus-ring-color`: color used by the input component for focus ring color.
- `--ki-input-focus-ring-offset`: dimension used by the input component for focus ring offset.
- `--ki-input-focus-ring-shadow`: shadow used by the input component for the focus ring glow (MarsUI Focus/primary: 3px spread ring at 20% — see ki.focus.primary. specs/002-ki-button/design-extraction.md §2.5 recorded 40%, having read the alpha off the Dark canvas mode, same double mechanism as ki-button: glow plus the opaque indicator).
- `--ki-input-focus-ring-width`: dimension used by the input component for focus ring width.
- `--ki-input-font-size`: dimension used by the input component for font size.
- `--ki-input-font-size-touch`: dimension used by the input component for the text a person types under a coarse primary pointer: 16px, under which Safari on iOS zooms the page into the focused field (spec 048). The onmars type scale has no 16px step.
- `--ki-input-font-weight`: font weight used by the input component for font weight.
- `--ki-input-gap`: dimension used by the input component for gap.
- `--ki-input-height`: dimension used by the input component for height (MarsUI Input_field md cell: min-height 40px; consume as min-block-size so the field can grow).
- `--ki-input-hover-bg`: color used by the input component for hover background (MarsUI hover = s2 + Black/3 overlay; s3 is the nearest token).
- `--ki-input-hover-border`: color used by the input component for hover border.
- `--ki-input-hover-fg`: color used by the input component for hover foreground.
- `--ki-input-hover-label-fg`: color used by the input component for hover label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-input-icon-size`: dimension used by the input component for icon size.
- `--ki-input-invalid-bg`: color used by the input component for invalid background (MarsUI danger state keeps the white active fill; the ring and hint carry the signal).
- `--ki-input-invalid-border`: color used by the input component for invalid border.
- `--ki-input-invalid-fg`: color used by the input component for invalid foreground.
- `--ki-input-invalid-label-fg`: color used by the input component for invalid label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-input-invalid-ring`: shadow used by the input component for the persistent invalid ring (MarsUI Focus/danger: 3px danger-500 alpha spread; applied as box-shadow while :state(user-invalid)).
- `--ki-input-label-font-size`: dimension used by the input component for label font size (MarsUI UI/Para/medium: body_1 13px).
- `--ki-input-label-font-weight`: font weight used by the input component for label font weight.
- `--ki-input-label-gap`: dimension used by the input component for label gap.
- `--ki-input-label-line-height`: dimension used by the input component for label line height (MarsUI line_height/para 20px).
- `--ki-input-label-padding-inline`: dimension used by the input component for label padding inline (MarsUI Input_label row 2px inset aligning the label ink with the cell radius).
- `--ki-input-line-height`: dimension used by the input component for line height.
- `--ki-input-padding-inline`: dimension used by the input component for padding inline.
- `--ki-input-radius`: dimension used by the input component for radius (MarsUI Radius/component/radius_md 10px, the md Input_cell binding; component ramp so personality modes reach it).
- `--ki-input-rest-bg`: color used by the input component for rest background (MarsUI Input_field rest fill Surface/s2: the fill identifies the field, not the outline).
- `--ki-input-rest-border`: color used by the input component for rest border.
- `--ki-input-rest-fg`: color used by the input component for rest foreground.
- `--ki-input-rest-label-fg`: color used by the input component for rest label foreground (MarsUI label is Text/med_em in every non-disabled state — active and danger included; the danger signal lives in the hint).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
- `--ki-time-input-field-backdrop-filter`: Complete filter applied behind the surface.
- `--ki-time-input-field-bg-image`: Image painted over the surface background.
- `--ki-time-input-list-backdrop-filter`: Complete filter applied behind the surface.
- `--ki-time-input-list-bg`: Background of the suggested times list.
- `--ki-time-input-list-bg-image`: Image painted over the surface background.
- `--ki-time-input-list-border-color`: Border colour of the suggested times list.
- `--ki-time-input-list-border-width`: Border width of the suggested times list.
- `--ki-time-input-list-fg`: Text colour of the suggested times list.
- `--ki-time-input-list-max-height`: Maximum block size of the scrolling suggestions.
- `--ki-time-input-list-padding`: Padding on the inside edge of the suggested times list.
- `--ki-time-input-list-radius`: Corner radius of the suggested times list.
- `--ki-time-input-list-shadow`: Elevation of the suggested times list.
- `--ki-time-input-option-height`: Minimum block size of a suggestion at standard density.
- `--ki-time-input-option-hover-bg`: Background of a hovered suggestion.
- `--ki-time-input-option-hover-fg`: Text colour of a hovered suggestion.
- `--ki-time-input-option-padding-inline`: Inline padding of a suggestion.
- `--ki-time-input-option-radius`: Corner radius of a suggestion.
- `--ki-time-input-selected-bg`: Background of the committed suggestion.
- `--ki-time-input-selected-fg`: Text and check mark of the committed suggestion.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
