# ki-copy-button API

| Attribute | Type | Default | Purpose |
| --- | --- | --- | --- |
| `value` | string | unset | Exact clipboard text for a direct copy. |
| `from` | string | unset | ID of the source in the current tree. Takes precedence over `value`. |
| `label` | string | `Copy` | Accessible name for icon-only use. |
| `variant` | `primary\|secondary\|quaternary\|ghost` | `ghost` | Button emphasis. |
| `size` | `xs\|sm\|md\|lg\|xl` | `md` | Button size. |
| `feedback-duration` | number | `1500` | Milliseconds of feedback. Zero keeps feedback until the next result. |
| `copied-label` | string | `Copied` | Polite success announcement. |
| `copy-error-label` | string | `Couldn't copy` | Polite failure announcement. |

The default slot accepts a visible label and supplies the accessible name.
The `button`, `icon` and `label` parts expose the native control, glyph box
and visible label wrapper.

`ki-copy` carries `{ value: string }` after a successful write and activates
the declared catalog action. `ki-copy-error` has no payload. Both events bubble
and cross shadow boundaries.
