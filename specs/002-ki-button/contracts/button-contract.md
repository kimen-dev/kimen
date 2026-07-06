# Public contract: `<ki-button>`

The behavior contract is `specs/002-ki-button/feature.feature` (S1–S11).
This document freezes the public API surface the scenarios observe. Any
deviation discovered during implementation re-enters through the spec, not
through code (Art. II).

## Element

`<ki-button>` — form-associated custom element (participates in native forms
through ElementInternals). Registered by `@kimen/elements`; per-component
export `dist/components/ki-button.js` (tree-shakable custom element build).

## Attributes / properties

All attributes reflect and are observable; TypeScript exposes them as typed
union properties with complete JSDoc (Art. I: an undocumented member is a
build failure).

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'tertiary' \| 'quaternary' \| 'ghost'` | `'secondary'` | Action hierarchy, theme-agnostic. Unknown → default rendering (S11). |
| `tone` | `'neutral' \| 'success' \| 'danger'` | `'neutral'` | Intent axis, orthogonal to variant. Unknown → default. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Geometry from tokens; ≥24×24 px target in every size. Unknown → default. |
| `type` | `'submit' \| 'reset' \| 'button'` | `'submit'` | Native-parity form behavior (S7, S8). |
| `name` | `string` | — | Form-data key contributed only when this button submits the form. |
| `value` | `string` | — | Form-data value paired with `name`. |
| `disabled` | `boolean` | `false` | No activation, not in tab order, exposed as unavailable to AT (S2, S6); honors `fieldset[disabled]`. |

## Slots

| Slot | Contract |
|---|---|
| *(default)* | Label content. Sole source of the accessible name (S5). Required in practice: icon-only usage is when-NOT-to-use. |
| `start` | Leading icon/media. Follows writing direction (RTL-safe). |
| `end` | Trailing icon. Follows writing direction. |

## Parts

| Part | Contract |
|---|---|
| `button` | Internal native button. Second rung of the customization ladder (after tokens, before slots). |
| `label` | Label wrapper around the default slot. |

## Events

No custom events. The composed `click` event from the internal native button
is the activation signal; Enter and Space produce it with native semantics
(S1, S4). Form lifecycle observes native `submit`/`reset` events on the form.

## CSS custom properties (component token layer)

The full vocabulary in [data-model.md](../data-model.md#token-vocabulary-component-layer).
Guarantees:

- Every visual property of every variant × tone × size × state resolves from
  `--ki-button-*`; those resolve from the semantic layer (Art. VI).
- A theme restyles the button by reassigning semantic tokens and, where its
  design language needs it (shape, state-layer effects), component-layer
  overrides — never markup or component code (S9, S10).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: the single main action of a view (`variant="primary"`,
  at most one per view), supporting actions (`secondary`…`ghost` in
  descending attention), confirming/destructive intent via `tone`.
- **When NOT to use**: navigation (use a link), icon-only actions (future
  icon-button component), toggling persistent state (future toggle
  component), loading/progress semantics (not part of this contract).

## Compatibility

First release of the element (pre-1.0 line). Removing or renaming anything
above after first publish is MAJOR per Art. IX. `ki-hello` (documented
smoke element) is removed by this feature — pre-1.0, roadmap-scheduled.
