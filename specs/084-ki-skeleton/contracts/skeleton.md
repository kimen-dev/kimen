# ki-skeleton public contract

| Prop | Attribute | Default | Behavior |
| --- | --- | --- | --- |
| `shape` | `shape` | `text` | `text`, `circle` or `rect` |
| `lines` | `lines` | `1` | Text line count |
| `size` | `size` | Shape-specific | Shared CSS length for both logical axes |
| `inlineSize` | `inline-size` | Shape-specific | Inline-axis override |
| `blockSize` | `block-size` | Shape-specific | Block-axis override, per line for text |
| `animated` | `animated` | `true` | Enables shimmer when motion and colours are unrestricted |

The `shape` CSS part identifies each painted line, circle or rectangle. The component has no slots, actions or events. Consumers own the loading region, label and delayed reveal.
