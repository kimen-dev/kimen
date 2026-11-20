# Sidebar examples

## Grouped navigation

```js
import { defineCustomElement as defineSidebar } from '@kimen/elements/ki-sidebar';
import { defineCustomElement as defineGroup } from '@kimen/elements/ki-sidebar-group';
import { defineCustomElement as defineItem } from '@kimen/elements/ki-sidebar-item';
import { defineCustomElement as defineTooltip } from '@kimen/elements/ki-tooltip';
import '@kimen/elements/icons/house';
import '@kimen/elements/icons/inbox';
import '@kimen/elements/icons/users';

const sidebar = document.querySelector('#main-sidebar');
sidebar.preference = { storageKey: 'sample-app:profile-42:main-sidebar' };

defineTooltip();
defineSidebar();
defineGroup();
defineItem();
```

```html
<ki-sidebar label="Main" collapsible id="main-sidebar">
  <span slot="brand">Kimen</span>
  <ki-sidebar-item href="/" icon-name="house" current>Home</ki-sidebar-item>
  <ki-sidebar-item href="/inbox" icon-name="inbox" count="12">Inbox</ki-sidebar-item>
  <ki-sidebar-group label="Workspace">
    <ki-sidebar-item href="/members" icon-name="users">Members</ki-sidebar-item>
  </ki-sidebar-group>
  <button slot="footer" type="button" aria-label="Account: Ana Garcia">AG</button>
</ki-sidebar>
```

Set the `preference` property before mounting or upgrading the element to
restore the saved mode.
Wire the footer trigger to your application's account menu. Use an app-owned
opaque profile identifier in the storage key, or omit the key and persist
`event.detail.collapsed` through your own preferences service.

## Localized count

```html
<ki-sidebar label="Principal" collapsible collapse-label="Contraer" expand-label="Expandir">
  <ki-sidebar-item href="/bandeja" count="12" count-label="{label}, {count} sin leer">
    Bandeja
  </ki-sidebar-item>
</ki-sidebar>
```
