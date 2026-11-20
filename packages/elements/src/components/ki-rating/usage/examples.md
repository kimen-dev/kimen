# Rating usage

## Display a review average

```html
<ki-rating readonly label="Average review score" value="4.3"></ki-rating>
```

The text reads 4.3. The glyphs fill to 4.5 and assistive technology receives one image named “Rated 4.3 out of 5”.

## Collect answer feedback

```html
<form>
  <ki-rating
    label="How useful was this answer?"
    name="usefulness"
    precision="0.5"
    required
  ></ki-rating>
  <button>Submit feedback</button>
</form>
```

A choice of 2.5 submits as `usefulness=2.5`. A form reset restores the starting value. Subscribe to `ki-change` for a user's changed choice and read its numeric `detail.value`.

## Use a different glyph

```js
import '@kimen/elements/icons/heart';
```

```html
<ki-rating
  label="How much did you enjoy the experience?"
  icon-name="heart"
  option-singular-label="{value} heart"
  option-label="{value} hearts"
></ki-rating>
```
