Use EmptyState when a list, table or first-run screen is empty. Name what is
empty, explain why or what to do next, and offer at most one primary action.

```ts
import '@kimen/elements/icons/folder-plus';
```

```html
<ki-empty-state heading="No projects yet" icon-name="folder-plus" tone="primary-light">
  Projects hold your surfaces, catalogs and themes.
  <ki-button slot="actions" variant="primary">New project</ki-button>
</ki-empty-state>
```

Use `announce` for search or filter results. Insert the message when results
become empty. If it remains visible for a subsequent search, update its heading
and description.

```html
<ki-empty-state heading="No results for webhok" heading-level="2" size="sm" announce>
  Check the spelling or remove a filter.
  <ki-button slot="actions" variant="secondary">Clear filters</ki-button>
</ki-empty-state>
```

Put a decorative illustration in `media` to replace the icon.

```html
<ki-empty-state heading="Your inbox is clear">
  <img slot="media" src="/images/empty-inbox.svg" alt="" width="120" height="80">
  New messages will appear here.
</ki-empty-state>
```
