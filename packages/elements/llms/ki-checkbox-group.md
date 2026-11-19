# ki-checkbox-group

> A form-associated group of independently selectable checkboxes.

## When to use

people may select several visible options that share a question,
form field, and optional selection limits.

## When not to use

mutually exclusive choices (use `ki-radio-group`) or an
immediate on/off setting (use `ki-switch`). Provide a group label.

## Examples

# Checkbox group examples

## Submit several selections

```html
<form id="settings">
  <ki-checkbox-group
    id="regions"
    label="Regions"
    name="regions"
    min="1"
    help-text="Choose the regions you serve."
    error-text="Choose at least one region."
  >
    <ki-checkbox value="eu" checked>Europe</ki-checkbox>
    <ki-checkbox value="am">Americas</ki-checkbox>
    <ki-checkbox value="apac">Asia-Pacific</ki-checkbox>
  </ki-checkbox-group>
  <button type="submit">Save regions</button>
</form>
```

Reading `new FormData(form).getAll('regions')` returns each checked value
in option order. Keep individual option labels visible and give each option
a distinct value when you need to select it independently from JavaScript.

## Read and update selection

```js
import { defineCustomElement as defineCheckbox } from '@kimen/elements/ki-checkbox';
import { defineCustomElement as defineCheckboxGroup } from '@kimen/elements/ki-checkbox-group';

defineCheckbox();
defineCheckboxGroup();

const group = document.querySelector('#regions');
group.value = ['eu', 'apac'];

group.addEventListener('ki-change', (event) => {
  const selectedRegions = event.detail.value;
  console.log(selectedRegions);
});
```

## Horizontal choices

```html
<ki-checkbox-group label="Notifications" orientation="horizontal">
  <ki-checkbox value="mentions">Mentions</ki-checkbox>
  <ki-checkbox value="reviews">Review requests</ki-checkbox>
</ki-checkbox-group>
```

## Attributes

- `disabled` (boolean, default false): Makes the group unavailable and excludes it from form submission.
- `error-text` (string | undefined): Localized message displayed for a failing selection limit.
- `help-text` (string | undefined): One line of guidance displayed under the choices.
- `label` (string, required): Visible legend and accessible name for these choices.
- `max` (number | undefined): Maximum number of checked options, as a nonnegative integer.
- `min` (number | undefined): Minimum number of checked options, as a nonnegative integer.
- `name` (string | undefined): Form-data key repeated for each selected option.
- `orientation` ("horizontal" | "vertical", default 'vertical'): Lays choices out vertically or in a wrapping horizontal row.

## Slots

- (default): Direct `ki-checkbox` options, each with its own visible label and value. Put form naming and constraints on the group.

## Parts

- `error`: Polite error message shown in place of the help.
- `help`: Guidance below the options and the group's accessible description.
- `label`: Legend that names the group.

## Events

- `ki-change` (CustomEvent<KiCheckboxGroupChangeDetail>): Fires once for a committed user toggle with a copy of the current selection.

## Methods

None.

## CSS custom properties

- `--ki-checkbox-group-gap`: Space between checkbox options and the group label and messages.
- `--ki-radio-group-label-font-size`: dimension used by the radio group component for label font size.
- `--ki-radio-group-label-font-weight`: font weight used by the radio group component for label font weight.
- `--ki-radio-group-label-line-height`: dimension used by the radio group component for label line height (closest measured analogue: Radio_label sm 13/20; no group-title master exists — low-confidence refinement).
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-high-em`: semantic color for text high em.
- `--ki-text-med-em`: semantic color for text med em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
