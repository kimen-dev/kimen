# AI label contract

| Member | Behavior |
| --- | --- |
| `explanation` | Plain-text source explanation. Nonblank text enables disclosure. |
| `model`, `generated-at` | Optional plain-text provenance metadata. |
| `revertible` | Shows the revert action in the explanation. Defaults to false. |
| `size` | `sm` by default. `md` gives the mark more room. |
| `ki-revert` | Bubbling, composed revert request with no application payload. |
| `ki-input` end slot | Direct AI label assignment adds a provenance description to the native control. |

Apps own the original and generated text and handle `ki-revert` to restore
the original. The explanation is a named non-modal dialog. Text supplies the
label and the action name in the application's language.
