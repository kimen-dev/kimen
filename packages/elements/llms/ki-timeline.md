# ki-timeline

> A chronological list of activity, audit records, or steps from a run.

## When to use

present chronological events with independently readable summaries,
optional times and details, including new entries in a live feed.

## When not to use

offer a selectable command list, control the current step of a
task, or represent progress toward completion.

## Examples

# ki-timeline examples

## Show deployment activity

```html
<ki-timeline id="activity" label="Deployment activity">
  <ki-timeline-item icon-name="git-merge" tone="primary" datetime="2024-11-19T10:41:00Z">
    Luis Perez merged fix/search-index
  </ki-timeline-item>
  <ki-timeline-item icon-name="circle-alert" tone="danger" datetime="2024-11-19T10:20:00Z">
    Preview deploy failed
  </ki-timeline-item>
</ki-timeline>
```

```js
import '@kimen/elements/icons/circle-alert';
import '@kimen/elements/icons/git-merge';
import { defineCustomElement as defineTimeline } from '@kimen/elements/ki-timeline';
import { defineCustomElement as defineTimelineItem } from '@kimen/elements/ki-timeline-item';

defineTimeline();
defineTimelineItem();
```

Give the list a short name, and describe each event in words. The timeline
sorts its direct items by `datetime`. The default is newest first. Set
`order="oldest-first"` for a history that starts at the beginning.

## Add an event to a live feed

```js
const activity = document.querySelector('#activity');
const item = document.createElement('ki-timeline-item');
item.setAttribute('datetime', new Date().toISOString());
item.textContent = 'Preview deployment completed';
activity.append(item);
```

The list updates its order and announces nearby additions together. The
message comes from the event's default slot.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-timeline`: the default, only the tokens ki-timeline needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `label` (string | undefined): Accessible name of the ordered list.
- `order` ("newest-first" | "oldest-first", default 'newest-first'): Chronological order of valid dates. Ties and undated entries retain source order. Undated entries follow valid dates in either direction.

## Slots

- (default): Direct ki-timeline-item children.

## Parts

- `announcements`: Polite region for batches of new event summaries.
- `item`: Native list entry including the connector to the next event.
- `list`: Named native ordered list.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-timeline-dot-size`: Diameter of the timeline marker. Default: `var(--ki-layout-spacing-9xl)`.
- `--ki-timeline-gap`: Space between marker and text and between timeline entries. Default: `var(--ki-layout-spacing-xl)`.
- `--ki-timeline-item-fg`: Text color of the event summary and details. Default: `var(--ki-text-high-em)`.
- `--ki-timeline-line`: Color of the decorative line connecting timeline markers. Default: `var(--ki-outline-low-em)`.
- `--ki-timeline-line-width`: Hairline width of the timeline connector. Default: `var(--ki-control-border-width)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology. Default: `var(--ki-size-border-hairline)`.
