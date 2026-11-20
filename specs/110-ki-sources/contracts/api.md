# Public contract: Sources

| Element | Member | Meaning |
| --- | --- | --- |
| `ki-citation` | `ref` attribute / `citationRef` property | Identifies a source in the same tree. |
| `ki-citation` | `label-template` | Accessible link name template. The default is `Source {number}: {title}`. |
| `ki-sources` | `open` | Boolean disclosure state. Closed by default. |
| `ki-sources` | `source-count-label`, `sources-count-label` | Singular and plural templates. The defaults are `{count} source` and `{count} sources`. |
| `ki-sources` | default slot | Direct `ki-source` definitions. |
| `ki-source` | `id` or `source-id` | Unique native ID or its catalog-friendly alias. `source-id` takes precedence. |
| `ki-source` | `href` | Valid web URL. Controls both the link destination and the displayed domain. |
| `ki-source` | `title`, `snippet` | Required title and optional plain-text excerpt. |

Each source list numbers its valid sources independently. A citation opens the
disclosure and makes the source's title link available to the reader. Navigation
uses native links and the components expose no catalog actions.
