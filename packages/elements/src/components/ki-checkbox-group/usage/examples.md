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
