`tone` declares semantic intent and `label` exposes the dot as a named non-interactive image; an unrecognized tone keeps the neutral appearance:

```html
<ki-status tone="success" label="Online"></ki-status>
<ki-status tone="danger" label="Build failing"></ki-status>
```

Without a `label` the dot is decorative and contributes nothing to the accessibility tree — adjacent visible text must then carry the meaning (color is never the only carrier, WCAG 1.4.1):

```html
<p><ki-status tone="success"></ki-status> Online</p>
```

`ring` keeps the dot distinguishable over media; positioning the overlay is the consumer's layout concern, and the ring never shifts layout:

```html
<div style="position: relative">
  <img src="avatar.png" alt="" />
  <ki-status
    tone="success"
    ring
    label="Online"
    style="position: absolute; inset-block-end: 0; inset-inline-end: 0"
  ></ki-status>
</div>
```
