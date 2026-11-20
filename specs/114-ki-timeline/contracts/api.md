# Timeline API

| Element | Property | Values |
| --- | --- | --- |
| `ki-timeline` | `label` | Accessible name of the ordered list |
| `ki-timeline` | `order` | `newest-first` (default) or `oldest-first` |
| `ki-timeline-item` | `datetime` | ISO date, local date-time, or date-time with offset |
| `ki-timeline-item` | `icon-name` | Name of a registered Lucide icon |
| `ki-timeline-item` | `tone` | `neutral` (default), `primary`, `success`, `warning` or `danger` |
| `ki-timeline-item` | `details-label` | Localized disclosure label, defaulting to “Details” |

The timeline's default slot takes direct timeline items. Each item accepts the event summary in its default slot, optional expandable content in `details`, and an optional decorative marker replacement in `start`. Authors convey status in the event text.

The timeline exposes the `list`, `item` and `announcements` parts. The item exposes `dot`, `content`, `time`, `summary` and `details`. The catalog uses both components with no surface actions.
