# Public contract: `<ki-list>` + `<ki-list-item>`

The behavior contract is `specs/016-ki-list/feature.feature` (S1–S11). This
document freezes the public API surface the scenarios observe — for BOTH
tags: `ki-list-item` is a sub-component of `ki-list` and the two ship,
version and document together (FR-012). Any deviation discovered during
implementation re-enters through the spec, not through code (Art. II).

## Elements

`<ki-list>` — non-interactive, non-virtualized list container for
`ki-list-item` children. Not form-associated, never focusable, no activation
behavior. Registered by `@kimen/elements`; per-component export
`dist/components/ki-list.js` (tree-shakable custom element build).

`<ki-list-item>` — one entry of a `ki-list`; carries meaning only inside its
parent (usage outside a `ki-list` is unsupported — when-NOT-to-use). Same
non-interactive guarantees. Per-component export
`dist/components/ki-list-item.js`.

## Attributes / properties

None on either element in v1. Neither element observes any attribute, so any
attribute — including vocabulary copied from other design systems (e.g.
`variant="two-line"`, `dense`, `divider`) — is ignored and the list renders
its items with the default appearance (S4, FR-009, fallback by
construction).

## Slots

### `ki-list`

| Slot | Contract |
|---|---|
| *(default)* | The items. Restricted to `ki-list-item` children: list semantics are guaranteed only for them; other children are documented as unsupported and never repaired (spec edge case). |

### `ki-list-item`

Regions render in the documented reading order: leading media, primary text
above secondary text, trailing media/meta (S2, FR-004). A region with no
slotted content collapses completely — no reserved space, no gap
contribution (S3, FR-003).

| Slot | Contract |
|---|---|
| `start` | Leading media (icon, avatar, image). Leads in LTR, follows the writing direction in RTL (S9, FR-010). |
| *(default)* | Primary text line. Styled by the `--ki-list-item-primary-*` tokens. |
| `secondary` | Supporting text line, below the primary line. Its presence — not rendered wrapping — switches the item to the multi-line min-height token (FR-003). Wrapped secondary text is the v1 answer to M3 three-line items. |
| `end` | Trailing media or meta (icon, timestamp, or a slotted control such as `ki-switch` — the supported v1 pattern for interactivity). |

## Parts

Customization ladder: tokens first, then parts, then slots.

| Element | Part | Contract |
|---|---|---|
| `ki-list` | `list` | The list surface (background, padding, gap between items). |
| `ki-list-item` | `item` | The item row (min-height, padding, inter-region gap, radius, divider consumption). |
| `ki-list-item` | `start` | The leading region wrapper. |
| `ki-list-item` | `content` | The text column (primary above secondary). |
| `ki-list-item` | `end` | The trailing region wrapper. |

## Events

No custom events on either element, and no interception: pointer and
keyboard events from slotted content pass through untouched — a page
listening to a slotted switch observes exactly one toggle per activation
(S11, FR-006).

## Accessibility contract

- `ki-list` exposes the structural role `list` and `ki-list-item` the
  structural role `listitem`, both as **default semantics via
  `ElementInternals.role`** (research D1): the accessibility tree reports a
  list whose item count matches the rendered items (S6), and an author-set
  `role` attribute on a host still wins (default semantics are
  overridable — the component never fights the author).
- Beyond those two structural roles: **no name, no state, no interactive
  role of anyone's own** (S6, FR-005); item text is exposed as plain
  content. Structural document roles are not the "wrong ARIA" Art. V guards
  against.
- Zero keyboard stops added by list or items (S5, FR-001); slotted
  interactive content keeps its own focus and events (S11, FR-006).

## CSS custom properties (component token layer)

```text
--ki-list-bg                          list surface color
--ki-list-padding                     padding of the list surface
--ki-list-gap                         gap between items (spacing-separated themes)

--ki-list-item-min-height             one-line item min-height (no secondary content)
--ki-list-item-min-height-multiline   multi-line item min-height (secondary present)
--ki-list-item-padding-inline         item inline padding
--ki-list-item-padding-block          item block padding (additive refinement, research D4)
--ki-list-item-gap                    gap between the start/content/end regions
--ki-list-item-radius                 item corner radius
--ki-list-item-divider-width          between-items divider width (0 = no divider)
--ki-list-item-divider-color          between-items divider color
--ki-list-item-primary-font-size      primary line font size
--ki-list-item-primary-line-height    primary line line-height
--ki-list-item-primary-font-weight    primary line font weight
--ki-list-item-primary-fg             primary line ink
--ki-list-item-secondary-font-size    secondary line font size
--ki-list-item-secondary-line-height  secondary line line-height
--ki-list-item-secondary-font-weight  secondary line font weight
--ki-list-item-secondary-fg           secondary line ink
```

Guarantees:

- Every visual property resolves from `--ki-list-*` / `--ki-list-item-*`;
  those resolve from the 001 semantic layer (Art. VI). Zero hardcoded
  visual values.
- **Separation is a theme decision** carried entirely by
  `divider-width`/`divider-color` and `--ki-list-gap` values — no divider
  or variant attribute exists (FR-008, 002 Round/Square precedent). The
  divider renders between items only, never after the last (research D3).
- **Which min-height applies is decided by slotted `secondary` content**,
  never by rendered wrapping; wrapped text grows the item past its
  min-height without changing tokens (FR-003, S10). No truncation surface
  exists (research D5).
- All layout uses logical properties; `start`/`end` follow the document's
  writing direction (S9, FR-010).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs)

- **When to use**: a read-only vertical collection of similar entries —
  settings, contacts, results, activity feeds — where each item composes
  leading media, up to two text lines and trailing meta or a slotted
  control (e.g. a settings list with trailing `ki-switch` controls). Fill
  any subset of an item's four regions.
- **When NOT to use**: menus or command lists (future menu component);
  selectable option lists (use `ki-select`); multi-column tabular data (the
  complex data table is a separate roadmap item, explicitly out of v1);
  navigation; a single `ki-list-item` outside a `ki-list`; anything that
  needs the whole item clickable or selectable (interactive list patterns
  are future features).

## Compatibility

First release of both elements (pre-1.0 line): additive MINOR. Removing or
renaming anything above after first publish is MAJOR per Art. IX. The two
tags are one feature: they are documented, shipped and versioned together
(FR-012).
