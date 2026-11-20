# Stat

Use one stat for one key number. Choose the preference for the metric. Here,
the render time went down and the change is favorable.

```html
<ki-stat
  label="Median render time"
  value="84"
  unit="ms"
  delta="-9"
  delta-label="vs last week"
  direction="lower-is-better"
></ki-stat>
```

For a percentage comparison beside a count, set `deltaFormat` as a property.
Percent formatting takes a fraction, so 0.12 reads as 12%.

```html
<ki-stat id="active-surfaces" label="Active surfaces" value="1284" delta="0.12" delta-label="vs last week"></ki-stat>
```

```js
document.querySelector('#active-surfaces').deltaFormat = { style: 'percent' };
```

With no `delta`, the card shows the current value alone. For a trend that carries
no judgment, use `direction="neutral"`. For an informative sparkline, give the
chart a text equivalent through its own HTML semantics.

```html
<ki-stat label="Sales" value="750">
  <svg slot="chart" role="img" aria-label="Sales rose from 680 to 750 this week" viewBox="0 0 80 20" width="80" height="20">
    <path d="M1 17 L13 11 L27 14 L39 4 L52 8 L67 5 L79 1" fill="none" stroke="currentColor"></path>
  </svg>
</ki-stat>
```
