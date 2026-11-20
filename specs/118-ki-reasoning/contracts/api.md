# Reasoning public contract

| API | Default or effect |
| --- | --- |
| `status` | `thinking` while steps arrive, `done` when finished |
| `duration` | Optional elapsed milliseconds. Finite, nonnegative values are rounded to the nearest second. |
| `open` | False. A reflected boolean synchronized with the native disclosure. |
| `thinking-label` | Thinking… |
| `done-label` | Thought |
| `singular-duration-label` | Thought for {seconds} second |
| `duration-label` | Thought for {seconds} seconds |
| Default slot | Supporting content such as an ordered list of steps |
| `ki-toggle` | Emits `{ open: boolean }` for native disclosure changes. Setting the property is silent. |
| `summary`, `body` parts | The native summary and the area containing the steps |
| `--ki-reasoning-fg`, `--ki-reasoning-border` | Supporting text and the logical inline-start rule |

The polite announcement accompanies status transitions. The disclosure name
always reflects the current text, including duration and localization changes.
