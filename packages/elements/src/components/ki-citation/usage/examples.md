# Using ki-citation

Place a citation after its claim and set `ref` to the matching source identifier.

```html
<p>The methods account for the difference<ki-citation ref="methods"></ki-citation>.</p>
<ki-sources>
  <ki-source id="methods" title="Study design" href="/methods"></ki-source>
</ki-sources>
```

Use `citationRef` in JSX. Tab to the link for a preview. Escape dismisses the
preview, and Enter opens the list and moves focus to the source link.
