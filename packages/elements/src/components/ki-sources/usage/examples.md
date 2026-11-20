# Using Sources

Put a citation immediately after the clause it supports. Put the source
definitions directly inside the corresponding disclosure. The list shows
sources in order of first citation and adds uncited sources in declaration order.

```html
<p>The study design<ki-citation ref="methods"></ki-citation> explains the results.</p>
<ki-sources>
  <ki-source
    id="methods"
    href="https://example.org/methods"
    title="Study design"
    snippet="How the study ran."
  ></ki-source>
</ki-sources>
```

Use `open` to start with the list expanded. Use unique source identifiers
within each document or shadow root. Hover or focus a citation to see its
title and hostname. Activate it to expand the list and focus the title link.
The card links can be used independently of the inline markers.

When importing individual elements, register all three tags with their
respective `defineCustomElement()` functions. Use `citationRef` and
`sourceTitle` as component props in JSX. In a guarded spec, use keys
`ref`, `source-id`, `title` and `href` on their respective nodes. Put
the citation in a `div` primitive if it shares a line with text.

Provide the local language through `label-template`, `source-count-label`,
and `sources-count-label`. Titles and snippets are plain text. HTTP(S) URLs
and relative web references work in authored HTML. Guarded specs also follow
the application's allowed-origin policy.
