# Feature Specification: ki-list

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-list` (spec `016-ki-list`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Fase 2 batch component: a `<ki-list>` web
component with `<ki-list-item>` children — a simple, non-virtualized,
non-interactive data list. Each item composes leading media, a primary text
line, an optional secondary text line and trailing media or meta through
slots, and restyles entirely through the token layer, following the API
charter for the 003–016 batch (precedent: 002-ki-button). Interactive list
patterns (menus, selection, whole-item navigation) and the complex data table
are explicitly out of v1 scope per roadmap."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-list |
|---|---|---|---|
| Item anatomy | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | leading element (icon, avatar or image), one to three lines of text (headline + supporting text), trailing element (icon, meta text or control) | `ki-list-item` slots: `start` (leading media), default (primary text), `secondary` (supporting text), `end` (trailing media/meta) |
| Text hierarchy | text emphasis levels shipped in the token layer (001 extraction) map naturally to primary vs secondary text | headline and supporting-text type roles | primary and secondary text styled via `--ki-list-item-*` font and foreground tokens resolving from the semantic text-emphasis layer |
| Height / density | xs–xl metric ramp exists in the shipped token vocabulary (001), but no verified evidence that lists scale through it | item height follows line count (one-line vs multi-line conditions), not a size prop | no `size` attribute: item min-height per line count is a per-theme component token; height derives from the content composed |
| Separation | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | optional divider between items | separation (divider, spacing or nothing) is a theme token decision expressed in `--ki-list-item-*` border/gap tokens, never an attribute (002 Round/Square precedent, charter rule on pure-appearance axes) |
| Surface | surface ramp s0–s5 shipped in the token layer (001 extraction); which step the list sits on is a theme decision | list container on a surface color role | list background resolves from the semantic surface layer through `--ki-list-*` tokens |
| Interactivity & selection | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | interactive list items exist (hover/focus/pressed states, selection, drag) | Out of scope for v1: the list is non-interactive; controls compose inside the `start`/`end` slots (interactive list, menu and selection patterns are future features; the complex data table is explicitly out of v1 per roadmap) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan a collection of similar items (Priority: P1)

A person viewing an application scans a vertical collection of similar
entries — a settings list, a contact list, a result list — where every item
composes the same regions in the same reading order: leading media, a primary
text line, an optional secondary line, trailing media or meta. Whatever
subset of regions each item fills, the structure stays consistent and absent
regions leave no holes.

**Why this priority**: presenting a uniform, scannable collection is the
list's entire reason to exist; every other behavior layers on top of it.

**Independent Test**: render one list of three items in source order; fill
all four regions on one item and observe the reading order; strip an item
down to primary text only and observe the layout collapse cleanly with no
reserved space.

**Acceptance Scenarios**:

1. **Given** a list with three items, **When** the page renders, **Then** the
   items appear as one vertical list in source order.
2. **Given** a list item with leading avatar, primary text, secondary text
   and trailing meta, **When** the page renders, **Then** the avatar leads,
   the primary text sits above the secondary text and the meta trails.
3. **Given** a list item holding only primary text, **When** the page
   renders, **Then** only that text is visible, with no space reserved for
   the absent regions.
4. **Given** a list item whose secondary text is longer than the item's
   width, **When** the page renders, **Then** the text wraps and the item
   grows vertically, with no truncation or internal scrolling.

---

### User Story 2 - Understand the collection through assistive technology (Priority: P2)

A person using a screen reader hears the collection announced as a list with
an accurate item count and reads each item's text content; a keyboard user
tabs straight to any control slotted inside an item (for example a trailing
switch in a settings list) because the list itself adds no Tab stop, no
interactive role, no announcement of its own beyond list semantics.

**Why this priority**: list semantics are what distinguish ki-list from a
pile of divs — losing the count or adding spurious focus stops is an
accessibility hazard (Art. V) and would make the component worse than plain
semantic HTML.

**Independent Test**: query the accessibility tree of a three-item list and
verify a list of exactly three items, each named by its text; slot a switch
in one item, tab through the page and count exactly one stop (the switch),
then activate it from the keyboard and observe exactly one toggle.

**Acceptance Scenarios**:

1. **Given** a list with three items, **When** the accessibility tree is
   queried, **Then** it exposes a list of exactly three items whose text
   content is exposed without any interactive role.
2. **Given** a page whose only interactive element is a switch slotted in
   the end slot of a list item, **When** the user presses Tab, **Then**
   focus lands on the switch, skipping the list and its items.
3. **Given** a list whose item holds a trailing switch, with focus on the
   switch, **When** the user activates it from the keyboard, **Then** the
   switch toggles exactly once.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every list restyles from the token layer alone — item heights,
spacing, text styles, surface, and whether items are separated by dividers or
spacing. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; the list carries the M3 divider axis entirely in the
token layer, exactly as 002 carried shape.

**Independent Test**: render a list under onmars, declare the material3
theme, assert every item's appearance resolves from material3 token values;
repeat under the forced dark scheme and in a right-to-left document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the list takes material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the list uses the dark token values.
3. **Given** a right-to-left document, **When** the page renders, **Then**
   `start` content leads and `end` content trails the item text.

---

### User Story 4 - An agent composes a valid list (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks ki-list for a read-only collection of similar entries, composes items
from the four regions, and knows when NOT to reach for it (menus, selectable
option lists, tabular data). Malformed attributes — for example vocabulary
copied from another design system — do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a list with an unrecognized variant attribute and
observe default rendering.

**Acceptance Scenarios**:

1. **Given** a list declared with an unrecognized variant attribute, **When**
   the page renders, **Then** the items render with the default list
   appearance.

### Edge Cases

- Unknown attributes or attribute values (e.g. `variant="two-line"` copied
  from another design system's vocabulary) are ignored: the list renders its
  items with the default appearance (agent-generated markup is not trusted
  to be valid).
- An empty `<ki-list>` is documented in catalog guidance as an authoring
  mistake, not an error state. No special empty-state behavior is specified:
  the component adds no empty-detection logic, and the visual result is
  whatever the theme's `--ki-list-*` tokens resolve (non-normative catalog
  guidance, not a behavioral contract).
- Children of `ki-list` other than `ki-list-item` are documented as
  unsupported; list semantics are guaranteed only for `ki-list-item`
  children, and the component does not attempt to repair foreign markup.
- A `ki-list-item` outside a `ki-list` is documented as unsupported
  (when-NOT-to-use); the sub-component only carries meaning inside its
  parent.
- Long primary or secondary text wraps and grows the item vertically; the
  list introduces no truncation or internal scrolling in v1 — consumers
  manage overflow. A third text line (M3 three-line items) is wrapped
  secondary text, not a dedicated region.
- Interactive content slotted in `start`/`end` (e.g. a trailing switch)
  keeps its own focus and events; the list never intercepts, duplicates or
  re-targets them.
- RTL documents: `start`/`end` regions and all internal spacing follow the
  writing direction (logical properties only, Art. IV).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: List
  A list presents a read-only collection of similar items — leading media,
  primary and secondary text, trailing meta — in one consistent vertical
  structure that any brand restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: A list presents its items in source order
    Given a list with the items "Email", "Notifications" and "Storage"
    When the page renders
    Then the three items appear as one vertical list in that order

  # S2
  Scenario: A list item composes its regions in reading order
    Given a list item with a leading avatar, the primary text "Ana García", the secondary text "ana@onmars.dev" and a trailing timestamp
    When the page renders
    Then the avatar leads, the primary text sits above the secondary text and the timestamp trails

  # S3
  Scenario: Absent regions leave no empty space
    Given a list item holding only the primary text "Storage"
    When the page renders
    Then only the primary text is rendered, with no space reserved for the other regions

  # S4
  Scenario: Unknown attribute values fall back to the default appearance
    Given a list declared with an unrecognized variant attribute copied from another design system
    When the page renders
    Then the list renders its items with the default list appearance

  # S10
  Scenario: Long text wraps and grows the item vertically
    Given a list item whose secondary text is longer than the item's width
    When the page renders
    Then the secondary text wraps and the item grows vertically, with no truncation or internal scrolling

  # Family: keyboard path
  # S5
  Scenario: The list never takes focus away from its content
    Given a page whose only interactive element is a switch slotted in the end slot of a list item
    When the user presses Tab
    Then focus lands on the switch, skipping the list and its items

  # S11
  Scenario: The keyboard operates a slotted control exactly once
    Given a list whose item holds a trailing switch, with focus on the switch
    When the user activates it from the keyboard
    Then the switch toggles exactly once

  # Family: assistive-tech outcome
  # S6
  Scenario: The list exposes list semantics with an accurate item count
    Given a list with the items "Email", "Notifications" and "Storage"
    When the accessibility tree is queried
    Then it exposes a list of exactly three items
    And each item exposes its text content and no interactive role

  # Family: form participation — N/A for ki-list: a non-interactive data
  # display container is not a form control, holds no value and contributes
  # no entry to submitted form data (justified in spec.md's Scenario Family
  # Coverage table).

  # Family: theming
  # S7
  Scenario: A second theme restyles the list through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the items' spacing, separation and text styles resolve from material3 token values

  # S8
  Scenario: The list honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the list's appearance resolves from the dark token values

  # S9
  Scenario: List item content follows the document's writing direction
    Given a right-to-left document with a list item holding an icon in the start slot and a timestamp in the end slot
    When the page renders
    Then the icon leads and the timestamp trails the item's text
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S10 | |
| Keyboard path | S5, S11 | |
| Assistive-tech outcome | S6 | |
| Form participation | | N/A — ki-list is a non-interactive data-display container: it is not a form control, holds no value and contributes no entry to submitted form data (charter-listed valid N/A). Controls slotted inside items (e.g. ki-switch) participate in forms on their own. |
| Theming | S7, S8, S9 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The list MUST be a non-interactive, non-virtualized container
  that renders its `ki-list-item` children as one vertical list in source
  order. Neither the list nor its items are focusable, appear in the tab
  order, or emit component events of their own.
- **FR-002**: Each item's content MUST compose through four regions: `start`
  slot (leading media), default slot (primary text), `secondary` slot
  (supporting text), `end` slot (trailing media or meta). Any subset —
  including primary text alone — MUST produce a consistent layout with no
  configuration.
- **FR-003**: Regions with no slotted content MUST NOT reserve visible
  space; item height derives from the content composed, resolved through
  per-theme component tokens — never a `size` attribute. The line-count
  discriminator is the presence of `secondary` slot content, not rendered
  wrapping: an item with nothing slotted in `secondary` uses the one-line
  min-height token; an item with `secondary` content uses the multi-line
  min-height token (mapping M3's one-line vs two/three-line conditions).
  Text that wraps grows the item vertically beyond its min-height without
  changing which min-height token applies.
- **FR-004**: Regions MUST render in the documented reading order: leading
  media, primary text above secondary text, trailing media/meta.
- **FR-005**: The list MUST expose list semantics to assistive technology:
  a list with an accurate item count, each item exposing its text content;
  neither list nor item adds an interactive role, name or state of its own.
  Because the items are slotted custom elements in the light DOM, a native
  `<ul>`/`<li>` inside the shadow root cannot own them (a `<ul>` wrapping a
  `<slot>` exposes a list of zero items); the expected mechanism is the
  structural roles `list` / `listitem` on the `ki-list` / `ki-list-item`
  hosts (host `role` attribute or `ElementInternals.role`). Structural list
  roles are document-structure semantics, not an APG interactive widget
  pattern, so they do not conflict with "no ARIA is better than wrong ARIA"
  (Art. V).
- **FR-006**: Interactive elements slotted inside an item MUST remain fully
  operable; the list MUST NOT intercept, duplicate or re-target their focus
  or events.
- **FR-007**: Every visual property (surface, item min-heights, padding,
  gaps, separation, text styles for primary and secondary lines) MUST
  resolve from `--ki-list-*` / `--ki-list-item-*` component tokens layered
  over the semantic token layer; zero hardcoded visual values.
- **FR-008**: Item separation (divider, spacing or nothing) MUST be
  expressed exclusively through theme token values; no divider or variant
  attribute exists (002 Round/Square precedent, charter rule on
  pure-appearance axes).
- **FR-009**: Unrecognized attributes or attribute values MUST NOT break
  rendering; the list renders its items with the default appearance.
- **FR-010**: All internal layout and spacing MUST use logical properties so
  `start`/`end` regions follow the document's writing direction in RTL
  (Art. IV).
- **FR-011**: The components MUST expose parts for the customization ladder
  (tokens first, then parts, then slots): `list` on ki-list; `item`,
  `start`, `content`, `end` on ki-list-item.
- **FR-012**: `ki-list-item` MUST be documented as a sub-component of
  `ki-list` (charter: sub-components belong to their parent's spec); usage
  outside a `ki-list` is unsupported.
- **FR-013**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (never for menus, selectable option
  lists or tabular data; the complex data table is a separate roadmap item).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): two new elements. `ki-list` (attributes:
  none in v1; events: none; slots: default, restricted to `ki-list-item`
  children; parts: `list`; component tokens: `--ki-list-*`) and its
  sub-component `ki-list-item` (attributes: none in v1; events: none; slots:
  default (primary text), `secondary`, `start`, `end`; parts: `item`,
  `start`, `content`, `end`; component tokens: `--ki-list-item-*`). Additive
  MINOR; catalog and llms.txt regenerate with both entries.
- **Bundle budget** (Art. IV): low single-digit KB gzipped marginal cost for
  the pair — render-only containers with no interaction logic, no
  virtualization; no new runtime dependency ("none").
- **Accessibility** (Art. V): no APG widget pattern applies — the APG
  list-adjacent patterns (listbox, menu, grid) are interactive widgets and
  ki-list is deliberately non-interactive, so no manual APG walkthrough is
  required (the charter flags dialog, tooltip, tabs and select's listbox).
  The obligation here is correct list/list-item semantics plus transparency
  for slotted interactive content: accurate item count, no spurious
  interactive roles or focus stops. Semantic HTML alone cannot carry the
  semantics in this architecture — the items are slotted custom elements in
  the light DOM, so a `<ul>` inside the ki-list shadow root would wrap only
  a `<slot>` and expose a list of zero items — therefore the hosts carry
  the structural roles `list` / `listitem` (host `role` attribute or
  `ElementInternals.role`), per FR-005. These are document-structure roles,
  not an APG interactive widget pattern, so the "no ARIA is better than
  wrong ARIA" rule is not contradicted. axe zero violations across region
  combinations × themes × schemes × directions.
- **Tokens** (Art. VI): new component token families `--ki-list-*` (surface,
  padding, gap) and `--ki-list-item-*` (min-height per line count — exactly
  two steps, one-line and multi-line, per FR-003's discriminator —
  padding-inline, gap, divider color/width, radius, primary/secondary font
  and foreground tokens) resolving from the semantic layer — onmars surface
  ramp s0–s5 and text emphasis levels available since 001. No variant, tone,
  size or state axes: the list is static and non-interactive. Both shipped
  themes (onmars, material3) get component token files; the divider-vs-
  spacing choice lives in those theme values. No semantic-layer deltas
  expected.
- **Catalog/agent legibility** (Art. I): when-to-use — a read-only vertical
  collection of similar entries (settings, contacts, results, activity
  feeds) where each item composes leading media, up to two text lines and
  trailing meta or a slotted control. When NOT to use — menus or command
  lists (future menu component), selectable option lists (use ki-select),
  multi-column tabular data (the complex data table is a separate roadmap
  item, explicitly out of v1), navigation, or a single item outside a list.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: every region subset of a list item (16 combinations of the
  four regions) renders in the documented reading order with zero
  configuration and zero visible space reserved by absent regions.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every list — heights, spacing, separation, text styles, surface — with
  zero markup or component changes; only the theme declaration differs. The
  same holds for the forced dark scheme.
- **SC-003**: zero accessibility violations in automated auditing across
  region combinations, themes, schemes and directions; the accessibility
  tree reports a list whose item count matches the rendered items in 100% of
  cases, with no interactive role contributed by list or items.
- **SC-004**: the list introduces zero additional keyboard stops; 100% of
  the interactive content slotted inside items remains reachable and
  operable by keyboard alone.
- **SC-005**: the marginal cost of the ki-list + ki-list-item pair stays in
  low single-digit KB (gzipped) and within the declared budget gate.

## Assumptions

- No `variant`, `size` or `tone` attributes: M3 scales list items by line
  count, not by a size prop, and neither design source demonstrably exposes
  an emphasis or intent axis for lists; heights and separation are per-theme
  component tokens. If the MarsUI frames reveal a genuine scale it lands as
  additive MINOR.
- Non-interactive v1 is a charter scope decision: item selection, whole-item
  click/navigation, drag, menus and the M3 interactive item states are
  future features; until then the catalog documents them as when-NOT-to-use.
  Controls composed inside `start`/`end` slots (e.g. a settings list with
  trailing switches) are the supported v1 pattern for interactivity.
- Non-virtualized v1 is a charter scope decision: the list renders all its
  children; very long collections are the consumer's concern beyond the
  bundle budget gate.
- M3 three-line items are covered by wrapping secondary text, not by a
  dedicated third region or an overline slot (Art. VII — simplest design
  that satisfies the scenarios); a dedicated slot would be an additive MINOR
  change later.
- Separation (M3 optional divider) is a pure-appearance axis each theme
  decides through component tokens (charter rule; 002 shape precedent); no
  divider attribute exists.
- The MarsUI column of the design-source table is grounded only in the
  shipped token vocabulary (001 extraction) and the 002 button analysis; the
  MarsUI list frames are pending verification (Figma connector unavailable
  2026-07-08; to confirm at gate 1). No Figma facts were invented.
  **Explicit gate-1 decision batched for the founder**: approve this spec
  with the MarsUI list frames unverified — accepting that a non-additive
  divergence discovered later (e.g. an expected divider attribute, a dense
  variant, or a three-region text anatomy that a slot rename cannot absorb)
  would force a MAJOR change under Art. IX or a pre-1.0 respec — or hold
  gate-1 approval until the frames are verified.
- Structural `list`/`listitem` roles on the hosts (FR-005) are a justified
  deviation from the charter's "semantic HTML first" default: slotted
  light-DOM children make native `<ul>`/`<li>` semantics unable to cross the
  shadow boundary, and structural document roles are not the interactive
  ARIA the "no ARIA is better than wrong ARIA" rule guards against.
- No motion: the list is static in v1 (no transitions, no reordering
  animation), so `prefers-reduced-motion` is not applicable.
- An empty `<ki-list>` and a `ki-list-item` outside a `ki-list` are treated
  as authoring mistakes in catalog guidance, not error states to handle.
