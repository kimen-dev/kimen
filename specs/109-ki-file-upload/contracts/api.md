# FileUpload public contract

`<ki-file-upload>` exposes `label`, `help-text`, `error-text`, `name`,
`required`, `disabled`, `multiple`, `accept`, `max-size` and `max-files`.
The `help` slot replaces the plain text help. Localized defaults are overridable
through label and message props.

The JavaScript `files` property contains `KiFile` entries with `name`, `size`,
`status` (`queued`, `uploading`, `done` or `error`), and optional `progress`,
`error` and original `file`. The application assigns a fresh array for updates.
File names and errors render as text.

| Event | Detail | When |
| --- | --- | --- |
| `ki-files-add` | `{ files: KiFile[] }` | A picker or drop batch accepts at least one file. |
| `ki-file-remove` | `{ file: KiFile }` | The user removes a displayed row. |
| `ki-file-cancel` | `{ file: KiFile }` | The user requests cancellation of an in-progress upload. |

The events bubble across shadow roots. The host application owns transfers and
uses the emitted file records to correlate its work. The form contributes original
files under the repeated `name`. The guarded catalog exposes the declared events
as actions and accepts declarative props and the help slot.
