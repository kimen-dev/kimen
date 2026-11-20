# ki-toolbar API

| Property | Type | Default | Behavior |
| --- | --- | --- | --- |
| `label` | string | Required | Gives the toolbar its accessible name. |
| `variant` | `floating\|docked` | `floating` | Docked spans the viewport's bottom edge. Use a different screen for MobileNav. |
| `orientation` | `horizontal\|vertical` | `horizontal` | Docked always presents a horizontal toolbar. |
| `tone` | `standard\|vibrant` | `standard` | Vibrant uses the accent container palette. |
| `hide-on-scroll` | boolean | false | Scroll down to hide. Scroll up or focus an action to reveal. |

| Slot | Contents |
| --- | --- |
| Default | Button actions, icon button actions and dividers. Supply accessible names for icon-only actions. |
| `fab` | One companion FAB for a floating toolbar. It has its own Tab stop. |

The `toolbar` part paints the grouped actions. The toolbar itself emits no
actions. The child controls own activation and expose their individual states
and events.
