A tab's default slot is its label and accessible name source; `value` pairs it with the `ki-tab-panel` sharing the same value inside a `ki-tabs` group:

```html
<ki-tabs label="Settings" value="profile">
  <ki-tab value="profile">Profile</ki-tab>
  <ki-tab value="privacy">Privacy</ki-tab>
  <ki-tab-panel value="profile">Profile settings</ki-tab-panel>
  <ki-tab-panel value="privacy">Privacy settings</ki-tab-panel>
</ki-tabs>
```

The `start` and `end` slots hold leading and trailing icons or media (they follow writing direction); keep decorative media `aria-hidden`:

```html
<ki-tabs label="Inbox views" value="all">
  <ki-tab value="all">
    <span slot="start" aria-hidden="true">✉</span>
    All mail
  </ki-tab>
  <ki-tab value="unread">Unread</ki-tab>
  <ki-tab-panel value="all">Every conversation.</ki-tab-panel>
  <ki-tab-panel value="unread">Unread conversations only.</ki-tab-panel>
</ki-tabs>
```

`disabled` excludes the tab from selection by every modality, and `selected` is output-only state written by the group — set the group's `value` instead of authoring it:

```html
<ki-tabs label="Repository" value="commits">
  <ki-tab value="commits">Commits</ki-tab>
  <ki-tab value="releases" disabled>Releases</ki-tab>
  <ki-tab-panel value="commits">Commit history</ki-tab-panel>
  <ki-tab-panel value="releases">Published releases</ki-tab-panel>
</ki-tabs>
```
