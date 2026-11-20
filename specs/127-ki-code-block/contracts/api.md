# ki-code-block API

| Attribute | Type | Default | Purpose |
| --- | --- | --- | --- |
| `language` | string | unset | Visible language label and spelling of the syntax grammar. |
| `filename` | string | unset | File name displayed beside the language. |
| `line-numbers` | boolean | false | Display decorative one-based line numbers. |
| `highlight` | string | unset | Comma-separated, one-based lines or inclusive ranges. |
| `wrap` | boolean | false | Soft-wrap code within the available width. |
| `copyable` | boolean | true | Show the copy control. |
| `label` | string | `Code` | Figure and scroll area label when there is no language or filename. |
| `highlight-label` | string | `Highlighted lines` | Prefix for the accessible description of the highlighted ranges. |
| `copy-label` | string | `Copy code` | Accessible name of CopyButton. |
| `copied-label` | string | `Copied` | Successful clipboard announcement. |
| `copy-error-label` | string | `Couldn't copy` | Failed clipboard announcement. |

Supply source text in the default slot. Escape markup characters in HTML or assign
`textContent` in JavaScript. The `figure`, `header`, `scroll` and `code` parts expose
the main presentation surfaces.

The bubbling, composed `ki-copy` event carries the exact clipboard string in
`detail.value`. It is the catalog activation event. `ki-copy-error` signals failure
without a payload.
