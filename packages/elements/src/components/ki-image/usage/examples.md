# Using ki-image

Give an informative image alt text that describes the detail the reader needs.
An explicit ratio reserves the same frame while the image loads and when the
fallback appears. Add supporting context in the caption slot.

```html
<ki-image src="/hills.jpg" alt="Low green hills under a pale sky" ratio="16:9">
  <span slot="caption">View from the ridge</span>
</ki-image>
```

Use `contain` when the whole image must stay visible. The fallback for this
example is named `Image unavailable: Office floor plan` if the source fails.

```html
<ki-image src="/floor-plan.png" alt="Office floor plan" ratio="4:3" fit="contain"></ki-image>
```

Use `decorative` for ornamentation. The image and fallback stay out of the
accessibility tree.

```html
<ki-image src="/divider.svg" decorative radius="none"></ki-image>
```
