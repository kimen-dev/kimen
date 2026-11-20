# Button group public contract

| Property | Type | Default | Behavior |
| --- | --- | --- | --- |
| `label` | `string` | Required | Accessible name of the group or toolbar |
| `attached` | `boolean` | `false` | Shares an edge and a visual style across the grouped buttons |
| `toolbar` | `boolean` | `false` | Provides a framed toolbar with roving focus |
| `size` | `xs`, `sm`, `md`, `lg`, `xl` | Child sizes | An explicit value applies to all directly slotted buttons |

The default slot takes `ki-button` and `ki-icon-button` actions. In toolbars it
also accepts author-provided noninteractive vertical separators. The group has
no actions of its own. Activation, form behavior, toggle state and menu
selection belong to the individual actions and the application.

For a split button, author an attached group with a text primary action and a
labeled icon trigger with `aria-haspopup="menu"`. Connect the second button to
the menu independently of the primary action.

```html
<ki-button-group label="History" attached>
  <ki-button type="button">Undo</ki-button>
  <ki-button type="button">Redo</ki-button>
</ki-button-group>
```
