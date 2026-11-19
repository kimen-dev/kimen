# ki-skeleton

> Decorative placeholder shapes that reserve space for loading content.

## When to use

Reserve the expected layout of a card, list, or assistant reply
while it loads. Give the surrounding region an accessible name and set
its aria-busy state. Show the skeleton after about 300 ms of waiting.

## When not to use

For a standalone loading announcement, progress measurement,
or interactive control. Put content and loading feedback in the caller's region.

## Examples

# Using ki-skeleton

Define the component when using direct imports.

```js
import { defineCustomElement } from '@kimen/elements/ki-skeleton';
defineCustomElement();
```

## Match the expected layout

```html
<section aria-label="Assistant is writing" aria-busy="true">
  <ki-skeleton lines="3"></ki-skeleton>
</section>

<section aria-label="Loading project" aria-busy="true">
  <ki-skeleton shape="circle" size="2.5rem"></ki-skeleton>
  <ki-skeleton shape="rect" block-size="6rem"></ki-skeleton>
</section>
```

The last of multiple text lines is shorter. Use `inline-size` and `block-size` to match the dimensions of the incoming content. Set `animated="false"` to use a static fill.

## Skip the flash on fast loads

Reserve the expected block size immediately. Use `hidden` until the request has been pending for about 300 ms.

```html
<section id="project" aria-label="Loading project" aria-busy="true" style="min-block-size:6rem">
  <ki-skeleton hidden shape="rect" block-size="6rem"></ki-skeleton>
</section>
```

```js
const region = document.querySelector('#project');
const placeholder = region.querySelector('ki-skeleton');
const reveal = setTimeout(() => {
  placeholder.hidden = false;
}, 300);

try {
  const project = await new Promise((resolve) => {
    setTimeout(() => resolve({ name: 'Roadmap' }), 900);
  });
  region.textContent = project.name;
} finally {
  clearTimeout(reveal);
  placeholder.remove();
  region.setAttribute('aria-busy', 'false');
  region.setAttribute('aria-label', 'Project');
}
```

Use this script in a module after the section is mounted. Change the simulated request to 150 ms to see the fast path. In an application, use the real request and show its error state in the same region.

## Attributes

- `animated` (boolean, default true): Sweep a highlight while the user permits motion. Set false to use a static placeholder. Shimmer also stops under reduced motion and forced colours.
- `block-size` (string | undefined): CSS length for the block axis. For text, this is the height of each line. Use it to reserve the height of the content that will replace the shape.
- `inline-size` (string | undefined): CSS length for the inline axis. Use it to match a fixed content width. Text and rectangles otherwise fill available inline space.
- `lines` (number, default 1, minimum 1, maximum 20): Number of text lines. Use a whole number from 1 to 20 for the expected paragraph length. Extra lines are ignored for circles and rectangles.
- `shape` ("circle" | "rect" | "text", default 'text'): Match the placeholder to the expected text, avatar, or rectangular content.
- `size` (string | undefined): CSS length shared by both axes. Use it for circles or square blocks. An axis-specific override takes precedence.

## Slots

None.

## Parts

- `shape`: Each painted text line, circle or rectangle.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-skeleton-backdrop-filter`: Complete backdrop filter behind a loading shape. Defaults to none.
- `--ki-skeleton-bg`: Base fill of the decorative loading shapes.
- `--ki-skeleton-bg-image`: Optional image layered over the static fill. Defaults to none.
- `--ki-skeleton-circle-radius`: Proportional corner radius of the circular shape.
- `--ki-skeleton-circle-size`: Default diameter of the circle.
- `--ki-skeleton-highlight`: Peak colour of the animated loading highlight.
- `--ki-skeleton-last-line-scale`: Fraction of the usual line width occupied by the final line in multiline text.
- `--ki-skeleton-line-gap`: Block-axis space between text lines.
- `--ki-skeleton-line-size`: Default height of each text line.
- `--ki-skeleton-radius`: Corner radius of text lines and rectangles.
- `--ki-skeleton-rect-size`: Default block size of the rectangle.
- `--ki-skeleton-shimmer-duration`: Duration of a shimmer sweep.
- `--ki-skeleton-shimmer-easing`: Easing of the shimmer sweep.
- `--ki-skeleton-shimmer-image`: Image of the moving highlight. Use currentColor to inherit the highlight colour.
