# Floating action menu examples

Register optional Lucide glyphs, then register the menu and its item together.

```ts
import '@kimen/elements/icons/calendar';
import '@kimen/elements/icons/pencil';
import { defineCustomElement as defineItem } from '@kimen/elements/ki-fab-menu-item';
import { defineCustomElement as defineMenu } from '@kimen/elements/ki-fab-menu';

defineItem();
defineMenu();
```

```html
<ki-fab-menu label="Create" icon-name="plus" position="fixed">
  <ki-fab-menu-item icon-name="pencil" value="message">New message</ki-fab-menu-item>
  <ki-fab-menu-item icon-name="calendar" href="/events/new">New event</ki-fab-menu-item>
</ki-fab-menu>
```

Listen to `ki-select` on the menu to handle commands. Use the stable `value`
in the event detail. Leave link navigation to the native anchor. In a catalog
spec, bind separate action IDs to command items and supply a stable `value`
for each item. Keep link items unbound.

Use two to six direct items. Fixed placement shares the FAB's safe-area
and navigation clearance tokens. In static placement, leave space above
the trigger for the stack.
