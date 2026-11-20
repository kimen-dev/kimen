# ki-number-input examples

## Quantity with bounds

```html
<ki-number-input label="Seats" name="seats" value="3" min="1" max="50" steppers required></ki-number-input>
```

## Plain field with a unit

```html
<ki-number-input label="Timeout" name="timeout" value="30" unit="seconds" min="0"></ki-number-input>
```

The form submits `timeout=30`.

## Percentage with localized editing

```html
<ki-number-input
  lang="de-DE"
  label="Discount"
  name="discount"
  min="0"
  max="1"
  step="0.005"
  value="0.125"
  format='{"style":"percent","maximumFractionDigits":1}'
></ki-number-input>
```

The editor displays `12,5` while focused and formats it as a percentage on
blur. The form submits `discount=0.125`.

## Custom-elements entry point

```ts
import { defineCustomElement } from '@kimen/elements/ki-number-input';

defineCustomElement();
const discount = document.querySelector('ki-number-input[name="discount"]');
if (discount) {
  discount.format = { style: 'percent', maximumFractionDigits: 1 };
}
```
