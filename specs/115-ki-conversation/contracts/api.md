# Conversation public API

| Tag | Prop / attribute | Type | Default |
| --- | --- | --- | --- |
| `ki-conversation` | `label` | string | `Conversation` |
| `ki-conversation` | `stickToBottom` / `stick-to-bottom` | boolean | `false` |
| `ki-conversation` | `jumpLabel` / `jump-label` | string | `Jump to latest` |
| `ki-message` | `messageRole` / `message-role` | `user \| assistant \| event` | `assistant` |
| `ki-message` | `streaming` | boolean | `false` |
| `ki-message` | `author` | string | Role-specific name |
| `ki-message` | `iconName` / `icon-name` | string | Unset |

Conversation exposes the default transcript slot and the `log`, `messages`
and `jump` parts. Message exposes default content, `avatar` and `actions` slots
and the `message`, `avatar`, `content`, `actions` and `caret` parts. The
`avatar` slot is available on assistant messages. The `actions` slot renders
consumer content with native interaction. Neither tag emits catalog actions.

The host's constrained block size defines the scrollport. When following is
enabled, the log follows its own content as it grows. The page retains
ownership of message transport, streaming completion and the composer.

The quoted issue’s `role="user|assistant|event"` markup is accepted as an alias
for the message kind. The component consumes it after upgrade. Use
`message-role` for durable declarative attributes and framework bindings.
