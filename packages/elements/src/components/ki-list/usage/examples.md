The list accepts only `ki-list-item` children (other children are unsupported); each item's default slot is the primary text line:

```html
<ki-list>
  <ki-list-item>Ada Lovelace</ki-list-item>
  <ki-list-item>Grace Hopper</ki-list-item>
  <ki-list-item>Margaret Hamilton</ki-list-item>
</ki-list>
```

Full item composition — `start` for leading media (decorative beside the visible name, so the avatar carries no `label`), `secondary` for supporting text and `end` for trailing meta:

```html
<ki-list>
  <ki-list-item>
    <ki-avatar slot="start" initials="AL" size="sm"></ki-avatar>
    Ada Lovelace
    <span slot="secondary">Analytical engine programs</span>
    <ki-badge slot="end" tone="success">Active</ki-badge>
  </ki-list-item>
  <ki-list-item>
    <ki-avatar slot="start" initials="GH" size="sm"></ki-avatar>
    Grace Hopper
    <span slot="secondary">Compilers and COBOL</span>
    <span slot="end">1906–1992</span>
  </ki-list-item>
</ki-list>
```

Rows are never click targets; interactivity lives in controls slotted into a region, which keep their own semantics and focus behavior:

```html
<ki-list>
  <ki-list-item>
    Two-factor authentication
    <span slot="secondary">Enabled via authenticator app</span>
    <ki-button slot="end" size="sm" variant="tertiary" type="button">Manage</ki-button>
  </ki-list-item>
</ki-list>
```
