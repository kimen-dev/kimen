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

## Name the group from the page

When the question is already written on the page, point the host's
`aria-labelledby` at it and omit `label`. The group takes its accessible name
from the heading, so the question is shown and read once. `label-hidden`
instead keeps a `label` as the name while hiding it from view and from
reading order.

```html
<h2 id="shipping-question">Where do you ship?</h2>
<ki-checkbox-group aria-labelledby="shipping-question" name="regions">
  <ki-checkbox value="eu">Europe</ki-checkbox>
  <ki-checkbox value="am">Americas</ki-checkbox>
</ki-checkbox-group>
```

## An error from the application

Set `custom-error` to show the application's verdict on the submitted
selection. The group is invalid, blocks its form and is announced as invalid
at once. Toggling any option withdraws the error. Remove the attribute when
a new attempt starts: setting the same text again while it is still set
shows nothing.

```html
<ki-checkbox-group label="Regions" name="regions" custom-error="We do not deliver to the Americas yet.">
  <ki-checkbox value="eu" checked>Europe</ki-checkbox>
  <ki-checkbox value="am" checked>Americas</ki-checkbox>
</ki-checkbox-group>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-checkbox-group`: the default, only the tokens ki-checkbox-group needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted selection ("Pick regions we deliver to"). While it holds text the group is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting when the person toggles an option, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text` and an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for the `min` and `max` limits the group enforces itself; `error-text` words those. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Makes the group unavailable and excludes it from form submission.
- `error-text` (string | undefined): Localized message displayed for a failing selection limit.
- `help-text` (string | undefined): One line of guidance displayed under the choices.
- `label` (string, required): Visible legend and accessible name for these choices. When NOT to use: do not omit it unless the host's `aria-labelledby` names the group from the page. Naming from the page: set `aria-labelledby` on the host to the ids of elements in the same document or shadow root, such as the heading that already asks the question. The group then takes its name from them, followed by its own `label` when set. The ids are read when the group renders and whenever the attribute changes. When to use: the question is written on the page above the options; omit `label` so the question is not shown, or read, twice. When NOT to use: do not reference elements inside another component's shadow root, which an id reference cannot reach.
- `label-hidden` (boolean, default false): Hides the legend from view and from reading order while it stays the group's accessible name, so a screen reader announces it once, as the group's name. When to use: the layout already makes the question obvious to sighted people but the group still needs a name of its own. When NOT to use: do not hide a legend that repeats a question already on the page; point `aria-labelledby` at that question instead.
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

- `--ki-checkbox-group-gap`: Space between checkbox options and the group label and messages. Default: `var(--ki-space-md)`.
- `--ki-radio-group-label-font-size`: dimension used by the radio group component for label font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-radio-group-label-font-weight`: font weight used by the radio group component for label font weight. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-radio-group-label-line-height`: dimension used by the radio group component for label line height (closest measured analogue: Radio_label sm 13/20; no group-title master exists — low-confidence refinement). Default: `var(--ki-typography-line-height-para)`.
- `--ki-text-danger-high-em`: semantic color for text danger high em. Default: onmars `light-dark(#c21a45,var(--ki-color-danger-300))`, material3 `light-dark(#8c1d18,#f2b8b5)`.
- `--ki-text-high-em`: semantic color for text high em. Default: onmars `light-dark(var(--ki-color-gray-950),#edebe7)`, material3 `light-dark(#1d1b20,#e6e0e9)`.
- `--ki-text-med-em`: semantic color for text med em. Default: onmars `light-dark(#5e5953,#bfbcb6)`, material3 `light-dark(#49454f,#cac4d0)`.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted). Default: `var(--ki-text-med-em)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal. Default: `var(--ki-font-weight-body-normal)`.
