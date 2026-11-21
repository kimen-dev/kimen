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

## Text that is not a number

The field keeps text it cannot read as a number so the person can correct
it, shows its own message (`error-text`, else `invalid-number-message`) once
the person leaves the field or presses Enter, and stays invalid, so its form
cannot submit it. What it reports depends on what it held before:

- If it held a number, leaving the field fires one `change` and `value` is
  `undefined`, exactly as when the field is emptied.
- If it never held a number, it fires no `change`.

The event cannot tell an emptied field from an unreadable one; validity can:
`checkValidity()` answers `false` for unreadable text.

## An error from the application

Set `custom-error` to show the application's verdict on the submitted
number, such as a stock check. The field is invalid, blocks its form and is
announced as invalid at once. The person's next edit or step withdraws the
error. Remove the attribute when a new attempt starts: setting the same text
again while it is still set shows nothing.

```html
<ki-number-input label="Seats" name="seats" value="42" min="1" custom-error="Only 40 seats left."></ki-number-input>
```

## Custom-elements entry point

```ts
import { defineCustomElement } from '@kimen/elements/ki-number-input';

defineCustomElement();
const discount = document.querySelector('ki-number-input[name="discount"]');
if (discount) {
  discount.format = { style: 'percent', maximumFractionDigits: 1 };
}
```
