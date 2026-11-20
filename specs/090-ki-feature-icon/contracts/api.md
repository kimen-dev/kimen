# FeatureIcon public contract

| Prop | Values | Default |
| --- | --- | --- |
| `tone` | `neutral`, `primary`, `primary-light`, `info`, `success`, `warning`, `danger` | `neutral` |
| `size` | `xs`, `sm`, `md`, `lg`, `xl` | `md` |
| `shape` | `square`, `circle` | `square` |

The unnamed slot holds one decorative inline Lucide SVG using `currentColor` or an imported `ki-icon` with inherited size. The glyph is centered and occupies half the tile on each axis. Use the tile beside the heading, which carries the name.

The `tile` part exposes the painted surface. Tile geometry, radius, color pair, background image and backdrop are controlled by component tokens. The tile and its glyph are hidden from assistive technology and outside the tab sequence.

The catalog declares the three props and the default slot. The component has no actions, methods, emitted events or form value.
