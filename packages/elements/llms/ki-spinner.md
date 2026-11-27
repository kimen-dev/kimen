# ki-spinner

> A compact status for an indeterminate wait.

## When to use

show brief inline activity such as saving a change or running a
tool. Choose typing dots for an assistant that is thinking. Set a localized
label that names the activity and mount the spinner when the wait starts.

## When not to use

use ki-progress for page-level work or a known fraction of
a task. Use ki-alert for persistent notices.

## Examples

# ki-spinner examples

## Inline save status

Insert the spinner when the save begins. Remove it when the save ends.

```html
<ki-spinner size="sm" label="Saving changes…" show-label></ki-spinner>
```

## Assistant status

Use a visually hidden label when the surrounding UI already describes the
activity.

```html
<ki-spinner variant="dots" label="Assistant is thinking"></ki-spinner>
```

## Custom-elements entry point

```ts
import { defineCustomElement } from '@kimen/elements/ki-spinner';

defineCustomElement();
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-spinner`: the default, only the tokens ki-spinner needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `label` (string, required): Localized name of the ongoing activity, such as "Saving changes". Supply a meaningful label for every spinner, even when the text is hidden. Use the activity's name whenever it can be more specific than "Loading".
- `show-label` (boolean, default false): Display the label beside the graphic when sighted users also need the activity description. The same text names the status in either case.
- `size` ("lg" | "md" | "sm", default 'md'): Diameter of the ring. Choose the size that fits the surrounding content. Dots use a fixed size. Unrecognized values draw the medium ring.
- `variant` ("dots" | "ring", default 'ring'): Use a ring for general inline activity and dots for assistant typing or thinking. Unrecognized values draw a ring.

## Slots

None.

## Parts

- `dots`: Group of three animated dots, in the dots variant.
- `label`: Activity text, adjacent to the graphic when show-label is set.
- `ring`: Rotating ring with a track and indicator, in the ring variant.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-spinner-dot-delay`: Delay between consecutive typing dots. Default: `var(--ki-motion-duration-activity-stagger)`.
- `--ki-spinner-dot-duration`: Typing pulse period. Default: `var(--ki-motion-duration-activity-pulse)`.
- `--ki-spinner-dot-easing`: Easing of the typing pulse. Default: `var(--ki-motion-easing-activity-pulse)`.
- `--ki-spinner-dot-gap`: Gap between dots. Default: `var(--ki-spacing-activity-dot-gap)`.
- `--ki-spinner-dot-scale-min`: Smallest scale of a dot during the pulse. Default: `var(--ki-motion-scale-activity-pulse-min)`.
- `--ki-spinner-dot-size`: Diameter of each dot at full size. Default: `var(--ki-activity-size-dot)`.
- `--ki-spinner-indicator`: Ink of the revolving ring segment. Default: onmars `var(--ki-surface-primary-high-em)`, material3 `var(--ki-surface-inverse-white)`.
- `--ki-spinner-label-bg`: Background of the inline activity label. Default: `var(--ki-surface-transparent)`.
- `--ki-spinner-label-fg`: Ink of the visible label and the typing dots. Default: `var(--ki-text-supporting)`.
- `--ki-spinner-label-font-family`: Font family of the visible label. Default: `var(--ki-typography-family-body)`.
- `--ki-spinner-label-font-size`: Font size of the visible label. Default: `var(--ki-typography-size-body-1)`.
- `--ki-spinner-label-gap`: Gap between the graphic and the visible label. Default: `var(--ki-spacing-activity-label-gap)`.
- `--ki-spinner-label-line-height`: Line height of the visible label. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-spinner-radius`: Round corners of the ring and dots. Default: `var(--ki-corner-activity-mark)`.
- `--ki-spinner-ring-duration`: Standard ring rotation period. Default: `var(--ki-motion-duration-activity-rotation)`.
- `--ki-spinner-ring-duration-reduced`: Ring rotation period when reduced motion is requested. Default: `var(--ki-motion-duration-activity-rotation-reduced)`.
- `--ki-spinner-ring-easing`: Easing for ring rotation. Default: `var(--ki-motion-easing-activity-rotation)`.
- `--ki-spinner-size`: Default ring diameter. Default: `var(--ki-activity-size-ring-md)`.
- `--ki-spinner-size-lg`: Large ring diameter. Default: `var(--ki-activity-size-ring-lg)`.
- `--ki-spinner-size-sm`: Small ring diameter. Default: `var(--ki-activity-size-ring-sm)`.
- `--ki-spinner-stroke`: Stroke width of the small and medium rings. Default: `var(--ki-activity-size-stroke)`.
- `--ki-spinner-stroke-lg`: Stroke width of the large ring. Default: `var(--ki-activity-size-stroke-lg)`.
- `--ki-spinner-track`: Ink of the ring track. Default: `var(--ki-outline-strong)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
