# Toggle button contract

| Element | Member | Meaning |
| --- | --- | --- |
| Both | `toggle` | Reflected boolean, false by default. Enables persistent press state on the native button. |
| Both | `selected` | Reflected boolean, false by default. Sets the current state in toggle mode. |
| Both | `variant="outline"` | Outlined resting variant with a filled selected appearance. |
| Both | `ki-change` | Bubbles through the composed tree after activation. Detail is `{ selected: boolean }`. |
| `ki-icon-button` | `selected` slot | One decorative icon used in the selected state. An inline SVG in the default slot can take on a current-colour fill when the selected slot is empty. |

The native button exposes `aria-pressed="false"` or `"true"` in toggle
mode. Its accessible name always comes from the same label. A disabled
or loading control suppresses activation. Toggle buttons operate
independently of form submission and reset.

ButtonGroup can listen for `ki-change` on direct toggle children. The
group's `selection` attribute defines single or multiple selection. The
group can set a child's `selected` property during reconciliation
without causing another change event.
