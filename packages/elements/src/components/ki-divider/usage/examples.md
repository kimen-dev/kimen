A horizontal rule between stacked content; the divider is decorative — no role, no name, no tab stop (semantic thematic breaks belong to native `<hr>`):

```html
<section>Profile</section>
<ki-divider></ki-divider>
<section>Notifications</section>
```

`orientation="vertical"` separates side-by-side content and stretches to the cross size its layout context provides — give the row a height or let flex stretch it:

```html
<div style="display: flex; align-items: stretch">
  <ki-button type="button">Edit</ki-button>
  <ki-divider orientation="vertical"></ki-divider>
  <ki-button type="button">Share</ki-button>
</div>
```

An inset is a per-instance layout decision — use logical margins on the instance; thickness, color, end caps and gutter stay per-theme `--ki-divider-*` tokens, never attributes:

```html
<ki-divider style="margin-inline: 16px"></ki-divider>
```
