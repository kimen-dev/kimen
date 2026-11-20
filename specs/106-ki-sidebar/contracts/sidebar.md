# Sidebar public contract

- `ki-sidebar` owns the named `nav` and its layout. `label` defaults to
  `Main`. `collapsible` shows the toggle and `collapsed` sets the rail state.
  Both default to false. `collapse-label` and `expand-label` localize the
  toggle. The default slot accepts items and groups. `brand` and `footer`
  accept application-owned content.
- `storage-key` enables browser-local persistence for an application-specific
  profile key. `ki-sidebar-change` exposes `{ collapsed: boolean }` after
  a user toggle. Assigning `collapsed` is silent.
- `ki-sidebar-group` labels a list using its `label` heading. Supply one
  or more items in its default slot.
- `ki-sidebar-item` takes the route name in its default slot. `href`
  gives it a native link and `current` marks the current page. A registered
  `icon-name` or decorative `start` slot supplies its icon. A positive
  `count` appears as a pill in the panel or a dot in the rail.
  `count-label` localizes the name using `{label}` and `{count}` and
  defaults to `{label}, {count} new`. The rail tooltip shows that same name.
- The sidebar exposes a single change event. Links follow native navigation
  and guarded rendering validates their destinations.
