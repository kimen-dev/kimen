Valid only as a child of `ki-list`; the default slot is the primary text line:

```html
<ki-list>
  <ki-list-item>Release 1.4 shipped</ki-list-item>
</ki-list>
```

`secondary` adds a supporting line below the primary text; its presence selects the multi-line min-height token:

```html
<ki-list>
  <ki-list-item>
    Backups
    <span slot="secondary">Last run 2 hours ago</span>
  </ki-list-item>
</ki-list>
```

`start` leads with media and `end` trails with meta or a slotted control; media beside the visible primary text is decorative (unlabeled avatar, empty `alt`), while a slotted control needs its own accessible name:

```html
<ki-list>
  <ki-list-item>
    <ki-avatar slot="start" initials="GH" size="sm"></ki-avatar>
    Grace Hopper
    <span slot="secondary">Compilers and COBOL</span>
    <ki-icon-button slot="end" size="sm" label="Edit Grace Hopper">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" fill="currentColor" /></svg>
    </ki-icon-button>
  </ki-list-item>
</ki-list>
```
