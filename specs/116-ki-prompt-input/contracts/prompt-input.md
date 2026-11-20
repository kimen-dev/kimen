# Public contract — `ki-prompt-input`

| Member | Kind | Default | Behavior |
|---|---|---|---|
| `label` | string prop | required | Accessible name of the native textarea. |
| `placeholder`, `value`, `name` | string props | empty | Hint, current text and optional form-data key. |
| `disabled` | boolean prop | `false` | Disables composer controls and form participation. |
| `status` | enum prop | `idle` | `idle`, `submitted`, `streaming`. The last state exposes Stop and a polite writing status. |
| `accept` | string prop | empty | Comma-separated file specifiers. Empty disables the attachment surface. |
| `max-files`, `max-size` | number props | unrestricted | Count limit and byte limit per file. |
| `submit-on` | enum prop | `enter` | `enter` or `mod-enter`. Shift+Enter inserts a newline. |
| `*-label`, `*-message` | string props | English strings | Override action names, list name, writing status and rejection messages. |
| `ki-submit` | event | — | `{ text: string, files: File[] }`. Requests a send. |
| `ki-stop` | event | — | Requests a stop. |
| `tools` | slot | — | Application-owned controls such as a model picker. |
| `attachments` | slot | — | Supplementary list items, alongside composer-owned input chips. |
| `field`, `textarea`, `attachments`, `tools`, `actions`, `attach`, `send`, `stop`, `status`, `feedback` | CSS parts | — | Styling hooks for the surface, native text field, controls and feedback. |

The generated manifest and catalog derive their public shape from the component's typed JSDoc.
