# ki-combobox

> An editable, form-associated combobox with local or remote filtering, single or multiple selection, and optional free entry.

## When to use

choose from a long list of options, let people search an option
source, or allow multiple selections that remain visible as tags.

## When not to use

use a select-only control for a short closed set or a plain
text field for unrestricted input with no choices.

## Examples

## Search people

When importing custom elements individually, register both
`@kimen/elements/ki-combobox` and `@kimen/elements/ki-option`.

```html
<ki-combobox label="Assignee" name="assignee" placeholder="Search people" required>
  <ki-option value="ana" description="ana@example.com">Ana Ruiz</ki-option>
  <ki-option value="juan" description="juan@example.com">Juan Antón</ki-option>
</ki-combobox>
```

## Pick or create multiple labels

```html
<ki-combobox label="Labels" name="labels" multiple allow-custom value='["bug","search"]'>
  <ki-option>bug</ki-option>
  <ki-option>search</ki-option>
  <ki-option>documentation</ki-option>
</ki-combobox>
```

Assign an array to the JavaScript `value` property to set multiple selections.
Use a JSON array string in HTML or neutral catalog specs. Each selection
submits under the same form name. Read them all with `FormData.getAll`.

## Request server results

Set `filter="none"` to display the options supplied by your application.
Listen for `ki-input` and use `event.detail.value` as the query. Set `loading`
while fetching, replace the field's `ki-option` children with the latest
results, and clear `loading`. Use `change` to respond to a committed selection.

## Attributes

- `add-label` (string, default 'Add “{text}”'): Localizable free-entry offer. {text} is replaced by the trimmed query.
- `allow-custom` (boolean, default false): Offers to add trimmed query text when no known or selected choice already matches it.
- `disabled` (boolean, default false): Disables editing, navigation and form submission.
- `empty-label` (string, default 'No results'): Localizable status when there are no choices to display.
- `error-text` (string | undefined): Message used when a required selection is missing, in place of the browser's message.
- `filter` ("contains" | "none" | "starts-with", default 'contains'): Filters by label. Set to none when the application provides results from a remote search.
- `help-text` (string | undefined): Guidance shown below the field and read as its description.
- `label` (string, required): Visible label and accessible name. Supply it even when placeholder text is also set.
- `loading` (boolean, default false): Replaces visible options with a loading indicator while a search is pending.
- `loading-label` (string, default 'Loading results'): Localizable status while waiting for a result set.
- `multiple` (boolean, default false): Enables ordered multiple selection and renders selected values as tags.
- `name` (string | undefined): Form-data key. Multiple choices contribute one entry each under this name.
- `placeholder` (string, default ''): Hint shown in the text input when it is empty.
- `remove-label` (string, default 'Remove {label}'): Localizable removal button label. {label} is replaced by the selected label.
- `required` (boolean, default false): Requires a committed choice to submit the form.
- `result-count-label` (string, default '{count} results'): Localizable status for several choices. {count} is replaced by the result count.
- `result-one-label` (string, default '1 result'): Localizable status for one available choice.
- `value` (string | string[], default ''): Committed value. Use a string for single selection and an array of strings for multiple selection. In HTML and catalog specs, encode multiple values as a JSON array string in the value attribute, or supply one literal value. Assign a new array to change multiple selections programmatically.

## Slots

- (default): Declarative ki-option children. Supply unique values and a human-readable label.

## Parts

- `description`: An option's secondary text.
- `error`: Polite error message shown after failed validation.
- `field`: Container for the text input and selected tags.
- `help`: Help below the field.
- `input`: Native text input with the combobox role.
- `label`: Visible label of the field and its listbox.
- `listbox`: Floating listbox surface.
- `option`: A mirrored choice row.
- `remove`: A native button that removes a selected tag.
- `tag`: A selected value in multiple mode.

## Events

- `ki-input` (CustomEvent<{ value: string }>): Reports a raw text edit in `detail.value`. Listen to it to request remote results.
- `change` (Event): Composed event after a user changes the committed selection. Read the committed value from the host.

## Methods

None.

## CSS custom properties

- `--ki-combobox-field-bg`: Fill for the editable field.
- `--ki-combobox-field-border`: Outline around the editable field.
- `--ki-combobox-field-fg`: Text on the editable field.
- `--ki-combobox-field-height`: Resting minimum block size of the field.
- `--ki-combobox-icon-size`: Size of search, selection and remove glyphs.
- `--ki-combobox-input-basis`: Preferred text-entry width before a row of tags wraps.
- `--ki-combobox-input-touch-font-size`: Minimum editable text size for coarse-pointer input.
- `--ki-combobox-listbox-backdrop-filter`: Complete backdrop filter for the floating listbox.
- `--ki-combobox-listbox-bg`: Fill for the floating listbox.
- `--ki-combobox-listbox-bg-image`: Optional image layered over the floating listbox.
- `--ki-combobox-listbox-border`: Outline around the floating listbox.
- `--ki-combobox-listbox-fg`: Text on the floating listbox.
- `--ki-combobox-listbox-max-block-size`: Maximum listbox block size before options scroll.
- `--ki-combobox-listbox-shadow`: Elevation of the floating listbox.
- `--ki-combobox-match-fg`: Foreground of the first bolded query match.
- `--ki-combobox-option-active-bg`: Fill for the active option.
- `--ki-combobox-option-active-fg`: Text on the active option.
- `--ki-combobox-tag-bg`: Fill for the selected tag.
- `--ki-combobox-tag-fg`: Text on the selected tag.
- `--ki-corner-field-item`: Corner radius for choices and tokens inside an editable field.
- `--ki-corner-field-surface`: Corner radius for an editable field and its floating choice surface.
- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap.
- `--ki-layout-spacing-xxs`: The xxs spacing step for a stack or grid gap.
- `--ki-outline-danger-high-em`: semantic color for outline danger high em.
- `--ki-outline-hairline-width`: Width of a hairline component surface edge.
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-high-em`: semantic color for text high em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology.
- `--ki-typography-weight-body-bold`: semantic font weight for typography weight body bold.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
