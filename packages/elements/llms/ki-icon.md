# ki-icon

> A static Lucide glyph selected by name from the application's per-icon imports.

## When to use

show a named glyph next to text, or give a standalone meaningful
glyph an accessible label. Import `@kimen/elements/icons/<name>` before
mounting the component or rendering a guarded surface.

## When not to use

make an icon interactive, accept arbitrary SVG or URLs, or
replace the accessible name of a control. Use the control's own label.

## Examples

# ki-icon examples

Import the exact Lucide names used by your markup before you mount it.

```js
import '@kimen/elements/icons/circle-check';
import '@kimen/elements/icons/triangle-alert';
import { defineCustomElement } from '@kimen/elements/ki-icon';

defineCustomElement();
```

A confirmation has adjacent text, so the glyph is decorative.

```html
<span style="color: var(--ki-text-success-high-em)">
  <ki-icon name="circle-check"></ki-icon> Confirmed
</span>
```

A standalone meaningful glyph takes its accessible name from the label.

```html
<ki-icon name="triangle-alert" size="lg" label="Warning"></ki-icon>
```

For a guarded catalog surface, import the glyph in the host and reference it
by name. The icon has no slots or actions.

```json
{
  "version": 1,
  "root": {
    "component": "ki-icon",
    "props": { "name": "triangle-alert", "size": "lg", "label": "Warning" }
  }
}
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-icon`: the default, only the tokens ki-icon needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `label` (string | undefined): Accessible name for a meaningful glyph. Omit it when nearby text already conveys the meaning.
- `name` (string, required): Lucide name made available by a per-icon import. An unavailable name draws no glyph.
- `size` ("inherit" | "lg" | "md" | "sm", default 'inherit'): Glyph size. Inherit follows the surrounding text at 1em.

## Slots

None.

## Parts

None.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-icon-size-lg`: Large ki-icon with the surrounding text ink.
- `--ki-icon-size-md`: Medium ki-icon with the surrounding text ink.
- `--ki-icon-size-sm`: Small ki-icon with the surrounding text ink.
- `--ki-icon-stroke-width`: Lucide stroke width in viewBox units, scaled with the glyph.
- `--ki-typography-family-body`: semantic font family for typography family body.
