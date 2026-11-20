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
