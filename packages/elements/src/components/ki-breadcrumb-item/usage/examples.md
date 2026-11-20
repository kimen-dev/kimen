Place each item directly inside a breadcrumb. Use the item's text for its
label and add `href` to link to an ancestor page. A level without
`href` provides context as text. Put the current page last.

```html
<ki-breadcrumb label="Settings path">
  <ki-breadcrumb-item href="/workspace">Workspace</ki-breadcrumb-item>
  <ki-breadcrumb-item>Administration</ki-breadcrumb-item>
  <ki-breadcrumb-item current>Settings</ki-breadcrumb-item>
</ki-breadcrumb>
```
