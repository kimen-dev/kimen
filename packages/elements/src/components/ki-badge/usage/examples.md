The slotted label is the sole carrier of meaning; `tone` only reinforces it with the `--ki-badge-{tone}-*` token colors, and an unrecognized value keeps the neutral appearance:

```html
<ki-badge>Draft</ki-badge>
<ki-badge tone="info">Beta</ki-badge>
<ki-badge tone="success">Active</ki-badge>
<ki-badge tone="warning">Trial ends soon</ki-badge>
<ki-badge tone="danger">Suspended</ki-badge>
```

`size` selects the metric scale (`sm` or `md`, default `md`):

```html
<ki-badge tone="success" size="sm">Synced</ki-badge>
```

A typical placement — trailing status on a list entry:

```html
<ki-list>
  <ki-list-item>
    Production deploy
    <ki-badge slot="end" tone="success">Healthy</ki-badge>
  </ki-list-item>
</ki-list>
```
