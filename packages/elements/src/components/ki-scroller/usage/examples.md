A bounded vertical region; the scroller's size comes entirely from your layout and `label` (required) is the accessible name of the scroll region:

```html
<ki-scroller label="Release notes" style="block-size: 12rem">
  <h3>March</h3>
  <p>Indicator fixes and token updates.</p>
  <h3>February</h3>
  <p>Initial scroller release.</p>
</ki-scroller>
```

`orientation="horizontal"` scrolls the inline axis instead; one axis per instance — the cross axis clips, so wrap or size content on it:

```html
<ki-scroller label="Weekly timeline" orientation="horizontal">
  <div style="display: flex; inline-size: max-content; gap: 1rem">
    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
  </div>
</ki-scroller>
```

Scrolling stays native (wheel, touch, arrows, Page Up/Down, Home/End); the viewport joins the Tab order only while content actually overflows, and slotted content keeps its own semantics:

```html
<ki-scroller label="Chat messages" style="block-size: 16rem">
  <ul>
    <li>Morning! Build is green.</li>
    <li>Shipping the docs today.</li>
  </ul>
</ki-scroller>
```
