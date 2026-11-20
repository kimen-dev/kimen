# Public Format API

All three elements use the nearest language declaration, including their own
`lang` attribute. Their output is inline and has no slots, methods or actions.

| Element | Attributes | Output |
| --- | --- | --- |
| `ki-format-date` | `date`, `date-style`, `time-style`, `time-zone`, `lang` | A localized native `time` element with the original ISO date or timestamp. |
| `ki-format-number` | `value`, `format-style`, `currency`, `unit`, `notation`, `minimum-fraction-digits`, `maximum-fraction-digits` | A localized number in tabular figures. |
| `ki-relative-time` | `date`, `numeric`, `sync`, `threshold` | A native `time` element with absolute text for assistive technology and in its tooltip. |

Date and time styles accept `full`, `long`, `medium` and `short`.
Number styles accept `decimal`, `percent` and `unit`. Use an ISO currency code
for currency output, an Intl unit identifier for unit output and `compact`
notation for abbreviated numbers. Relative wording accepts `auto` and
`always`. The optional threshold is expressed in seconds.

The `--ki-format-date-font-family`, `--ki-format-number-font-family` and
`--ki-relative-time-font-family` tokens default to the semantic body family.
