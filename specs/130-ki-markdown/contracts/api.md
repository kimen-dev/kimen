# ki-markdown public contract

| Surface | Type | Default |
| --- | --- | --- |
| Default source | Direct text nodes | Empty |
| `src-text` | String | Omitted |
| `streaming` | Boolean | False |
| `heading-offset` | Integer from 0 to 5 | 2 |
| `allow-images` | Boolean | False |
| `content` | Part | Rendered Markdown |

Supply untrusted source through `src-text` or DOM text nodes. Escape markup when writing source in an HTML document. The catalog declares a default text slot and four props. The component exposes no action. See the canonical feature for rendering and safety outcomes.
