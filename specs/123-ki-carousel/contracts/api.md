# Carousel public contract

| Carousel attribute | Default | Meaning |
| --- | --- | --- |
| `label` | Required | Accessible region name |
| `slides-per-view` | `1` | Simultaneously visible items in the single layout |
| `slides-per-move` | `1` | Items to advance with each navigation action |
| `loop` | `false` | Wrap at the ends |
| `autoplay` | Off | Positive rotation interval in milliseconds. Values below 5,000 rotate every 5,000 (Amendment A1) |
| `navigation` | `true` | Show Previous and Next |
| `pagination` | `true` | Show the position indicator |
| `current` | `1` | One-based leading slide |
| `layout` | `single` | `single`, `multi-browse`, `uncontained`, `hero`, or `full-screen` |

The carousel accepts `ki-carousel-item` children in its default slot.
Each item takes content in its default slot and optional decorative media in its
`preview` slot. `next()`, `previous()` and `goTo(index)` change the leading
slide. `ki-slide-change` bubbles and crosses shadow boundaries with detail
`{ index }`. The catalog exposes that event as its only Carousel action.

Localization uses the control-label props, the region and slide role
descriptions, and a slide position template containing `{index}` and `{count}`.
