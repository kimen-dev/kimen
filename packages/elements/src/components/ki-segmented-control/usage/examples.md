# ki-segmented-control examples

## Change a chart range

```html
<ki-segmented-control id="range" label="Chart range" value="week">
  <ki-segment value="day">Day</ki-segment>
  <ki-segment value="week">Week</ki-segment>
  <ki-segment value="month">Month</ki-segment>
</ki-segmented-control>
```

```js
import { defineCustomElement as defineControl } from '@kimen/elements/ki-segmented-control';
import { defineCustomElement as defineSegment } from '@kimen/elements/ki-segment';

defineControl();
defineSegment();

document.querySelector('#range').addEventListener('ki-change', ({ detail }) => {
  updateChartRange(detail.value);
});
```

## Give an icon-only option a name

```html
<ki-segmented-control label="View" size="sm" full-width>
  <ki-segment value="list">List</ki-segment>
  <ki-segment value="board" aria-label="Board">
    <svg slot="start" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 2h4v12H2zm6 0h6v7H8z" fill="currentColor"></path>
    </svg>
  </ki-segment>
</ki-segmented-control>
```

The loader discovers the tooltip in the segment’s shadow root. With direct imports
or framework wrappers, register it before mounting an icon-only option.

```js
import { defineCustomElement as defineTooltip } from '@kimen/elements/ki-tooltip';

defineTooltip();
```

Supply a visible label when space permits. The icon-only option takes its
accessible name and hover or focus tooltip from `aria-label`. Keep slotted
content noninteractive.
