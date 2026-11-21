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
