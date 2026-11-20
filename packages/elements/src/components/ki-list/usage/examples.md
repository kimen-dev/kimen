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

```html
<ki-list label="Settings">
  <ki-list-item href="/settings/account">
    Account
    <span slot="secondary">Name, email, password</span>
  </ki-list-item>
</ki-list>
```

```html
<ki-list label="Reviewers" selection="multiple" name="reviewers" required>
  <ki-list-item value="ana" selected>Ana Garcia</ki-list-item>
  <ki-list-item value="luis">Luis Perez</ki-list-item>
</ki-list>
```

```html
<ki-list label="Notifications">
  <ki-list-item>
    Email digest
    <span slot="secondary">Every Monday</span>
    <ki-switch slot="end" checked></ki-switch>
  </ki-list-item>
</ki-list>
```
