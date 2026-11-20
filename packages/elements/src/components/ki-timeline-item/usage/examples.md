# ki-timeline-item examples

## Add an avatar and expandable details

```html
<ki-timeline label="Order updates" order="oldest-first">
  <ki-timeline-item datetime="2024-11-19">
    <ki-avatar slot="start" initials="ML" size="xs"></ki-avatar>
    Mina Lee packed the order
  </ki-timeline-item>
  <ki-timeline-item datetime="2024-11-20T11:45:00Z" details-label="Carrier details">
    Dispatch confirmed
    <div slot="details">The parcel is with the carrier.</div>
  </ki-timeline-item>
</ki-timeline>
```

Keep identity and status in the event text. Use the decorative `start`
slot for an avatar or use `icon-name` with an imported Lucide glyph. If you
use direct imports, register `ki-avatar` when you use it in the slot.

Use `details-label` to localize or describe the disclosure. The control
appears only when the event supplies details. The main event text stays
visible while details are collapsed.
