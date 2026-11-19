# Details and accordion API

| Element | Property | Type | Default |
| --- | --- | --- | --- |
| `ki-details` | `summary` | string | unset |
| `ki-details` | `open` | boolean, reflected | false |
| `ki-details` | `disabled` | boolean, reflected | false |
| `ki-accordion` | `exclusive` | boolean, reflected | false |

The named `summary` slot takes precedence over the plain label. Supply a
heading or phrasing content. The default slot is the panel body. The
accordion's default slot accepts direct disclosure members.

`ki-toggle` bubbles from the member whose native open state changed. Its
detail is `{ open: boolean }`. Initialization and direct property writes
are silent on the member being initialized or written.

The standalone outline and accordion share the Details border and radius.
Surface color, image, backdrop filter, hover foreground and background,
padding, focus and disclosure motion resolve from component tokens.
