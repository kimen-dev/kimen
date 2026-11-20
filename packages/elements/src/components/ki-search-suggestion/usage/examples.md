# Search suggestion examples

```html
<ki-search label="Search components">
  <ki-search-suggestion value="ki-dialog" description="Component">Dialog</ki-search-suggestion>
  <ki-search-suggestion recent>button tokens</ki-search-suggestion>
</ki-search>
```

The child text is the title. When `value` is omitted, that title supplies the
query. Use `recent` for a removable history item.
