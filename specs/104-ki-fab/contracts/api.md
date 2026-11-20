# `ki-fab` public contract

| Property | Type | Default | Behavior |
| --- | --- | --- | --- |
| `label` | `string` | Required | Names the native control and labels the extended layout. |
| `icon-name` | `string` | Unset | Registered Lucide glyph. |
| `size` | `md`, `lg`, `xl` | `md` | 56, 80 or 96 pixels at the default root size. |
| `variant` | `primary`, `secondary`, `surface` | `secondary` | Selects the fill and ink pair. |
| `extended` | `boolean` | `false` | Shows the label next to the icon. |
| `collapse-on-scroll` | `boolean` | `false` | Compacts an extended FAB on viewport scroll down and restores it on scroll up. |
| `position` | `static`, `fixed` | `static` | Keeps the FAB in flow or places it at the block-end inline-end corner. |
| `href` | `string` | Unset | A nonempty destination renders a native link. Guarded catalog rendering applies URL policy. |

The `icon` slot replaces the named glyph. Supply decorative, noninteractive content. The `control`, `icon` and `label` parts expose the painted action, the decorative icon wrapper and the visual label. Activation produces native `click` and lets the page handle its declared action. The component itself declares no form value.
