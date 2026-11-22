# Feature Specification: Read-only native tables

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. I, II, V, VI, VII and IX. -->

**Feature Branch**: `claude/native-tables` (spec `158-native-tables`)

**Created**: 2026-11-22

**Status**: Draft. Awaiting the founder's approval of the scenarios and of
the amendment to spec 037 below. Every scenario is a guardrail scenario
(Art. VIII).

**Input**: Founder decision of 2026-11-21 on the improvements to land before
`@kimen/catalog`, `@kimen/emitter` and the adapters are published:
improvement 5, "a spec can show a table". The table elements join the
native primitives of `037-native-primitives`, for reading only: no sorting
and no selection from a spec. The founder confirmed widening the closed set
the same day.

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. The native elements are a closed set at the
guarded boundary (`037`), so widening it is a guardrail change and every
scenario requires explicit founder confirmation.

## Design-source analysis

Not applicable as a visual design. A table from a spec has no look of its
own: outside a `ki-table` it takes the browser's table defaults and the host
page's CSS, and inside one it takes `ki-table`'s existing styling, which
already expects a native light-DOM table. No token, no style rule and no
component changes.

## Decisions

Proposed by the agent, for the founder's approval with the scenarios.

- **D1 Seven elements**: `table`, `caption`, `thead`, `tbody`, `tr`, `th`
  and `td`. Out on purpose:
  - `tfoot`: a totals row is a body row.
  - `colgroup` and `col`: they only style columns, and a spec declares no
    styling.
  - Every other element stays out, as `037` D1 says.
- **D2 One attribute**: `th` declares `scope`, `col` or `row`, optional and
  without a default. No other table element declares any attribute. That
  leaves out on purpose:
  - `colspan`, `rowspan`, `headers` and `abbr`: every cell spans one row
    and one column, so headers stay unambiguous.
  - `ki-table`'s hooks `data-sort`, `data-key` and `aria-selected`: a table
    from a spec is never sorted or selected.
  - `data-numeric` and `data-meta`: `ki-table` aligns every cell of a
    spec's table to the start. A `numeric` prop can be added later without
    changing any valid spec.
  - The legacy presentational attributes (`background`, which loads a URL,
    `border`, `width`, `bgcolor`, …) and everything `037` D2 already lists
    (S5, S6).
- **D3 Content model**:
  - A `table` holds, in this order, at most one `caption`, at most one
    `thead`, then any number of `tbody`. It holds no text.
  - `thead` and `tbody` hold only `tr`, and `tr` holds only `th` and `td`.
    None of them holds text.
  - A `caption` is phrasing, like `p`: text, `strong` and `em`.
  - `th` and `td` hold what a layout `div` holds, except a `table`: text,
    the other native elements and catalog components.
  - Each table part sits only in its own parent. It never sits in a `div`,
    a cell or a catalog component's slot, and is never the root of a spec
    or a top-level node of a live surface.
  - A `table` may sit wherever a `div` may, except inside a cell: tables
    never nest.
  - A violation is `invalid-child`. Its message names what the parent
    accepts, or where the part belongs (S4).
- **D4 The live surface checks placement on the resulting state**: a node an
  op inserts or replaces is checked where it lands. A `tr` inserted into a
  `tbody` is accepted, and the same `tr` as a top-level node is rejected
  (S8, S9). Node ids work on table elements as on every native (`035`).
- **D5 Rendering**: the builder creates each element by its tag and writes
  `scope` as an attribute. It writes no style and no class, and pins
  nothing. Text is inherited, as `037` D3 says.
- **D6 No actions**: no table element binds an action, in either form of
  `154` (`037` D7 and S9, unchanged; S7). A cell may hold a catalog
  component that binds one, such as a `ki-button`.
- **D7 `ki-table` keeps its contract**: a spec cannot write `data-sort` or
  `data-key`, so a `ki-table` in a spec never sorts and selects nothing.
  `selectable` still adds its selection column, which selects nothing.
  Rejecting `selectable` in a spec would change the meaning of specs that
  validate today, so this spec leaves it alone. The emitter's prompt and
  the guide say to leave `selectable` off.
- **D8 One definition, generated**: the seven entries join
  `packages/catalog/scripts/primitives.mjs`, and the generator merges them
  into the catalog, so validation, the emitter, `llms-full.txt` and
  `kimen-mcp` read them from the same artifact (`037` D8). Their slot
  descriptions state the content model, so agents read it from the
  emitter's prompt. The catalog schema version becomes `1.9.0`. This is
  additive: a spec declaring `1.8.0` keeps its meaning.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An agent shows records as a table (Priority: P1)

An agent answering "which orders are pending?" emits a `ki-table` holding a
table captioned "Pedidos". It has a header row and one body row per order,
and each status cell holds a `ki-badge`. Today the spec cannot say
"table", so the agent falls back to a list or to paragraphs.

**Why this priority**: records with shared fields are among the most common
generated answers, and `ki-table` exists but cannot be filled from a spec.

**Independent Test**: render the S1 spec in Chromium and assert the element
tree, the accessibility tree and `ki-table`'s computed styling.

**Acceptance Scenarios**: S1, S2 and S3.

---

### User Story 2 - A table cannot open a hole in the boundary (Priority: P1)

Seven more tags reach `createElement`. Each keeps the guarantees of `037`:
closed attributes, inert text and no action. A strict content model keeps
the table valid HTML, which assistive technology reads as a table.

**Why this priority**: widening a closed set at the guarded boundary must
not weaken it (Art. VIII).

**Independent Test**: validate specs carrying each defect, one each.

**Acceptance Scenarios**: S4, S5, S6 and S7.

---

### User Story 3 - A live table changes in place (Priority: P2)

A live board adds a row to a table it already shows. The rows already on
screen keep their elements. A batch that would misplace a table part is
rejected as a whole.

**Acceptance Scenarios**: S8 and S9.

### Edge Cases

- An empty `table`, `thead`, `tbody`, `tr`, `th` or `td` is valid, as an
  empty `p` is.
- A `th` without `scope` is valid; the browser infers whether it heads a
  column or a row. `scope` on a `td` is `unknown-prop` (S5).
- A `table` inside a phrasing element (`p`, `h2`–`h4`, `strong`, `em`,
  `caption`) is already `invalid-child` under `037` D7.
- Inside a `ki-table`, the caption names the scroll region when the table
  overflows, and a `th` with `scope="row"` takes the row-header weight.
  Both are `ki-table`'s own contract.
- Outside a `ki-table`, a table has the browser's defaults: no borders and
  no frame. The `table` entry's guidance says to wrap it in a `ki-table`.
- `ki-table`'s `loading` row and selection column are elements `ki-table`
  adds to the table. They are not nodes of the spec, and a live batch never
  addresses them.
- A cell whose content is wider than the frame scrolls inside a `ki-table`.
  Outside one, it overflows its container like any wide content.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Read-only native tables in generated UI
  A UI spec may carry a table as native elements: a caption, a header row
  and body rows whose cells hold text, native elements and catalog
  components. A table is for reading: it keeps a strict content model,
  carries no attribute beyond a header cell's scope, never binds an action,
  and takes ki-table's styling inside a ki-table.

  Rule: A table renders as native elements

    # S1
    Scenario: A spec renders a table with a caption, a header row and two body rows
      Given a spec whose ki-table holds a table captioned "Pedidos" with the header row "Pedido", "Estado" and two body rows whose "Estado" cells hold a ki-badge
      When the host renders the spec
      Then the surface holds one table whose caption reads "Pedidos", whose head holds one row of two th cells and whose body holds two rows
      And the last cell of each body row holds a ki-badge

    # S2
    Scenario: A table exposes its caption and headers to assistive technology
      Given a spec whose table is captioned "Pedidos", with the th cells "Pedido" and "Estado" scoped to columns and body rows headed by the th cells "A-17" and "A-18" scoped to rows
      When the host renders the spec
      Then the accessibility tree exposes a table named "Pedidos" with the column headers "Pedido" and "Estado" and the row headers "A-17" and "A-18"

    # S3
    Scenario: Reassigning a ki-table token restyles a table from a spec
      Given a page that sets the token "--ki-table-header-bg" to "rgb(10, 20, 30)"
      And a spec whose ki-table holds a table with a header row
      When the host renders the spec
      Then the table head's background computes to "rgb(10, 20, 30)"
      And no table element carries a style attribute

  Rule: A table keeps its content model

    # S4
    Scenario Outline: Table elements accept only their content model
      Given a spec where <parent> holds <child>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | parent                         | child                                    | outcome                   |
        | a table                        | a caption, a thead and a tbody, in order | accepted                  |
        | a table                        | two tbody elements                       | accepted                  |
        | a td                           | a ki-badge and the text "activo"         | accepted                  |
        | a caption                      | the text "Pedidos" and an em             | accepted                  |
        | a layout div                   | a table                                  | accepted                  |
        | the default slot of ki-table   | a table                                  | accepted                  |
        | a table                        | a td                                     | rejected as invalid-child |
        | a table                        | a tbody followed by a caption            | rejected as invalid-child |
        | a table                        | two thead elements                       | rejected as invalid-child |
        | a table                        | the text "Pedidos"                       | rejected as invalid-child |
        | a tbody                        | a td                                     | rejected as invalid-child |
        | a tr                           | a layout div                             | rejected as invalid-child |
        | a tr                           | the text "A-17"                          | rejected as invalid-child |
        | a td                           | a table                                  | rejected as invalid-child |
        | a caption                      | a layout div                             | rejected as invalid-child |
        | a layout div                   | a tr                                     | rejected as invalid-child |
        | the default slot of ki-card    | a td                                     | rejected as invalid-child |
        | the spec                       | a tr as its root                         | rejected as invalid-child |

  Rule: A table is for reading

    # S5
    Scenario Outline: A table element rejects every attribute it does not declare
      Given a spec whose <element> carries the attribute "<attribute>"
      When the host validates the spec
      Then the spec is rejected with the rule "unknown-prop" naming "<attribute>"

      Examples:
        | element | attribute     |
        | table   | background    |
        | table   | class         |
        | th      | data-sort     |
        | tr      | data-key      |
        | tr      | aria-selected |
        | tr      | onclick       |
        | td      | colspan       |
        | td      | scope         |
        | td      | style         |

    # S6
    Scenario Outline: A th's scope is a column or a row
      Given a spec whose th declares the scope <scope>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | scope      | outcome                       |
        | "col"      | accepted                      |
        | "row"      | accepted                      |
        | absent     | accepted                      |
        | "colgroup" | rejected as invalid-prop-type |
        | "rowgroup" | rejected as invalid-prop-type |
        | "COL"      | rejected as invalid-prop-type |

    # S7
    Scenario Outline: A table element never binds an action
      Given a spec declaring the action "abrir" bound to a <element>
      When the host validates the spec
      Then the spec is rejected with the rule "action-not-allowed"

      Examples:
        | element |
        | table   |
        | caption |
        | thead   |
        | tbody   |
        | tr      |
        | th      |
        | td      |

  Rule: Live surfaces keep the table's content model

    # S8
    Scenario: A live batch adds a row to a rendered table in place
      Given a live surface showing a table whose tbody "cuerpo" holds the row "r1"
      When the agent applies a batch inserting into "cuerpo" the row "r2" with two td cells
      Then the tbody holds the rows "r1" and "r2" in that order
      And "r1" is the same element as before

    # S9
    Scenario Outline: A live batch is held to the table content model on the resulting state
      Given a live surface showing the layout div "fila" holding a table whose tbody is "cuerpo"
      When the agent applies a batch that <violation>
      Then the surface, its revision and its snapshot are unchanged
      And the diagnostic names the rule "invalid-child"

      Examples:
        | violation                          |
        | inserts into "fila" a td           |
        | inserts into "cuerpo" a layout div |
        | inserts a tr as a top-level node   |
```

### Scenario Family Coverage

The table elements are non-interactive guardrail vocabulary, like the other
native primitives.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S4, S5, S6, S7, S8, S9 | |
| Keyboard path | | N/A — a read-only table has no interaction, and table elements add no tab stop (as every native, `037` S15). A scrolling `ki-table`'s focusable region is `ki-table`'s own contract |
| Assistive-tech outcome | S2 | |
| Form participation | | N/A — no table element is form-associated, and a spec's table selects nothing (D7) |
| Theming | S3 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (D1, D8): the built-in catalog MUST gain exactly the native
  entries `table`, `caption`, `thead`, `tbody`, `tr`, `th` and `td`, each
  with a description, `whenToUse`, `whenNotToUse` and a default slot whose
  description states its content model. They MUST be defined once in
  `packages/catalog/scripts/primitives.mjs`, and `NATIVE_PRIMITIVE_TAGS`
  MUST list them. The catalog schema version MUST become `1.9.0`.
- **FR-002** (D2): `th` MUST declare exactly the optional enum prop `scope`
  with the values `col` and `row`. No other table element declares a prop.
  Any other attribute is `unknown-prop`, and a value outside the enum is
  `invalid-prop-type`, through the existing checks.
- **FR-003** (D3, D4): validation MUST enforce the content model of D3,
  reporting `invalid-child` at the child's path, or at the root's path for
  a misplaced root. This holds in `validateUiSpec`, in both renderers and
  in every live batch. A live batch is checked on its resulting state: a
  node an op inserts or replaces is checked where it lands, never as a root
  of its own.
- **FR-004** (D5): the builder MUST create table elements by their tag,
  write `scope` as an attribute and nothing else, and write no style and no
  class attribute.
- **FR-005** (D6): an `action` on any table element MUST be
  `action-not-allowed`, unchanged from `037`.
- **FR-006** (D7, D8): the emitter's schema MUST offer one branch per table
  element whose props are exactly the declared ones (`037` S21, unchanged).
  The emitter's prompt, `docs/guides/ui-spec.md`, its site page and the
  catalog README MUST describe the table elements and their content model.
  The emitter MUST demand catalog schema `1.9.0`.
- **FR-007**: spec 037 MUST be amended as below. Its scenarios do not
  change: S2 lists no table element, and S9 still holds for every native.

### Amendment to spec 037 (to apply on approval)

`specs/037-native-primitives/spec.md`, three passages. `feature.feature`
and the Gherkin block of `spec.md` do not change.

D1, its first two lines. Before:

> - **D1 Closed element set**: `h2`, `h3`, `h4`, `p`, `strong`, `em`, `img`
>   and one layout container `div`. Nothing else. Out on purpose:

After:

> - **D1 Closed element set**: `h2`, `h3`, `h4`, `p`, `strong`, `em`, `img`,
>   one layout container `div`, and the read-only table elements `table`,
>   `caption`, `thead`, `tbody`, `tr`, `th` and `td` (`158-native-tables`).
>   Nothing else. Out on purpose:

D7, its second sentence. Before:

> `img` declares no slot;
> the `div` accepts text, every native element and every catalog
> component; catalog component slots accept native elements.

After:

> `img` declares no slot;
> the `div` accepts text, every native element and every catalog
> component; catalog component slots accept native elements. A table
> part (`caption`, `thead`, `tbody`, `tr`, `th`, `td`) sits only in its
> own parent, under the content model of `158-native-tables`.

FR-001, its first sentence. Before:

> the built-in catalog gains exactly the entries `h2`,
> `h3`, `h4`, `p`, `strong`, `em`, `img` and `div`,

After:

> the built-in catalog gains exactly the entries `h2`,
> `h3`, `h4`, `p`, `strong`, `em`, `img` and `div` (and, with
> `158-native-tables`, the seven table elements),

### Key Entities

- **Table element**: one of the seven native entries of D1.
- **Table part**: a table element other than `table`, which sits only in its
  own parent.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive on `@kimen/catalog`. There are
  seven catalog entries, `NATIVE_PRIMITIVE_TAGS` gains seven tags, and the
  catalog schema goes from `1.8.0` to `1.9.0`. `@kimen/elements` and
  `@kimen/tokens` do not change, so the public-API snapshot does not change.
- **Bundle budget** (Art. IV): the seven entries in the generated catalog
  and the placement checks, in the catalog, the MCP Apps document and
  `kimen-mcp`. They are measured on this branch against `main`. If a base
  has to move, the founder sees the figures and decides before the pull
  request is ready. No new dependency.
- **Accessibility** (Art. V): the caption names the table and `scope` names
  its headers (S2). There is no tab stop and no action on any table
  element (S7).
- **Tokens** (Art. VI): none new. Inside a `ki-table`, its existing tokens
  style the table (S3).
- **Catalog/agent legibility** (Art. I): agents learn the elements and their
  content model from the emitter's schema and prompt and from `kimen-mcp`.
- **Guardrail/security boundary** (Art. VIII): seven more tags reach
  `createElement`. They have closed attributes (one enum), a strict content
  model, no actions, and the canonical-definition check of `037` D9 on
  every catalog value. Every scenario needs explicit founder confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: the S1 table renders in Chromium inside a `ki-table` with the
  expected element tree, accessibility tree and computed header styling.
- **SC-002**: every spec that validates under catalog schema `1.8.0`
  validates the same under `1.9.0`.
- **SC-003**: 100% of the adversarial specs and batches (S4–S7, S9) attach
  nothing and report their rule.

## Assumptions

- Sorting and selecting a table from a spec stay out (design, non-goal).
  They would need an event's `detail` in the action data, which stays out
  as well.
- The A2UI adapter maps nothing to tables and keeps doing so (`037` D10).
- `ki-list` selection (improvement 7) is deferred by the founder and is not
  addressed here.
