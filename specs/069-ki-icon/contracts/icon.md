# Icon surface

Import `@kimen/elements/icons/circle-check` before rendering `<ki-icon name="circle-check">`. Each side-effect import makes one glyph available in the current JavaScript realm. Import the exact spelling used by the surface, including when it uses a Lucide alias.

| Prop | Default | Contract |
| --- | --- | --- |
| `name` | Required | An imported Lucide name. |
| `size` | `inherit` | `inherit`, `sm`, `md`, or `lg`. |
| `label` | Omitted | Human-readable image name when the glyph independently conveys meaning. |

The surface has no slots or actions. Unavailable names produce a catalog diagnostic when a guarded document attempts to use them.
