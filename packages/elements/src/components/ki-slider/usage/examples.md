# Slider examples

Import the element, the token core and the slider's token sheet before
mounting the examples.

```js
import '@kimen/tokens/css/core';
import '@kimen/tokens/css/ki-slider';
import { defineCustomElement } from '@kimen/elements/ki-slider';

defineCustomElement();
```

```html
<form>
  <ki-slider label="Volume" name="volume" help-text="Playback level"
    min="0" max="100" step="1" value="60" marks="5" format="percent"></ki-slider>
  <ki-slider label="Price per night" name="price" range
    value="20,80" format="currency" currency="EUR"></ki-slider>
  <button type="reset">Reset</button>
</form>

<ki-slider label="Exposure" centered min="-50" max="50" value="-20"></ki-slider>
<ki-slider label="Bass" orientation="vertical" max="10" value="4"></ki-slider>
```

A named slider contributes one form entry. The form above starts with
`volume=60` and `price=20,80`. Range values always run from lower to upper.
The closest `lang` controls the display format. Localize the thumb suffixes
through `minimum-label` and `maximum-label`.

```js
const volume = document.querySelector('ki-slider[name="volume"]');
volume.addEventListener('input', () => previewVolume(volume.value));
volume.addEventListener('change', () => saveVolume(volume.value));
```

The neutral catalog exposes the `change` action event. Bind it to a declared
action to receive the current value on commit.
