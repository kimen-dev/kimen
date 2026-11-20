# Text field extension

| Host API | Values | Default |
| --- | --- | --- |
| `appearance` | `default`, `outlined`, `filled` | `default`, the theme's current appearance |
| `minlength` | Nonnegative integer | Unbounded |
| `maxlength` | Nonnegative integer | Unbounded |
| `show-count` | Boolean | `false` |
| `maxlength-error-text` (textarea) | Localized soft-limit message | English message |

`ki-input` retains its existing start and end slots. Both controls keep
their visible label above the field. For an enabled count, the `count` part
displays the current length and maximum at the logical end of the help or
error row. The accessible description combines the message and count.

The input enforces native entry constraints. The textarea accepts edits over
the maximum and exposes `validity.tooLong` and `aria-invalid`, and blocks
validated submission until corrected. Reset restores the initial value and
recalculates the count and validity.
