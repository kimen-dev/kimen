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
import '@kimen/elements/ki-checkbox';
import '@kimen/elements/ki-checkbox-group';

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
