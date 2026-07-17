# Feature Specification: ki-divider

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-divider` (spec `020-ki-divider`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Batch component: a `<ki-divider>` web component
— a static, non-interactive separation rule with a single `orientation` axis
(`horizontal` default, `vertical`), no slots, no events, styled by tokens
alone so onmars (default theme) and material3 (reference theme) — and any
future theme — map through the token layer without touching the component,
following the API charter (precedent: 002-ki-button). Labeled separators
('OR' rules), inset attributes and list-item separation are explicitly out of
v1 scope — 016-ki-list already keeps list separation in the token layer."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-divider |
|---|---|---|---|
| Role / anatomy | Two standalone component sets on the Miscellaneous page (verified 2026-07-17, get_metadata + get_screenshot): `Divider_horizontal` (node 12124:22493) and `Divider_vertical` (node 12124:22532); each variant is a single ~1 px low-contrast hairline inside an 8 px frame — no label, no content, no interaction | `md.comp.divider`: a thin rule that groups content in lists and containers; guidance says to use dividers sparingly and prefer white space where possible | A single empty element that draws one rule; no slots, no text, no children rendered. Labeled separators are out of v1 |
| Orientation | Two separate sets, one per direction: horizontal variants 176×8 px, vertical variants 8×176 px (verified 2026-07-17) | Divider guidance covers horizontal rules between stacked content and vertical rules between side-by-side content | `orientation` attribute: `horizontal` (default) \| `vertical` — a structural axis (it changes the layout contract), not a pure-appearance axis, so it is the component's only attribute |
| Thickness & color | ~1 px hairline in a light low-contrast gray (screenshot-verified 2026-07-17) | Thickness token 1 dp; color role outline-variant | `--ki-divider-thickness` and `--ki-divider-color` component tokens resolving from the semantic border/outline layer; never hardcoded |
| End caps | Explicit variant axis `ends=pointed\|rounded` on both sets (verified 2026-07-17) | No cap treatment: square-ended rules only | Pure-appearance axis → per-theme component token `--ki-divider-radius` (pointed ⇒ 0, rounded ⇒ pill), never an attribute (002 Round/Square precedent, charter rule on pure-appearance axes) |
| Alignment / gutter | Variant axis `align=top\|center\|bottom` (horizontal) / `left\|center\|right` (vertical): the hairline sits inside an 8 px frame that reserves gutter space around it (verified 2026-07-17) | Dividers carry no built-in gutter; spacing comes from the surrounding layout | The component reserves symmetric gutter through `--ki-divider-spacing`, with the rule centered; the asymmetric `align` placements are judged a Figma layout convenience, not carried into v1 (see Assumptions) |
| Inset | None: every variant is a full-length rule (verified 2026-07-17) | Full-width vs inset vs middle-inset variants that align the rule with list text | No inset attribute in v1: M3 inset is a per-instance layout decision, achievable with consumer CSS logical margins or a custom-property override; additive MINOR later if evidence demands |
| Interactivity | Purely presentational: the only axes are align and ends, no interaction states (verified 2026-07-17) | Non-interactive; the M3 reference implementation renders the divider decorative, with no role of its own | Non-interactive and decorative: never focusable, no events, no role, name or announcement in the accessibility tree (see FR-004) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Separate adjacent content at a glance (Priority: P1)

A person scanning a dense view — grouped settings sections, a toolbar with
action groups, a card with distinct regions — perceives where one group ends
and the next begins because a subtle rule separates them: horizontal between
stacked content, vertical between side-by-side content. The rule demands
nothing: no click, no focus, no reading.

**Why this priority**: drawing that separation is the component's entire
reason to exist; every other property qualifies this one.

**Independent Test**: render two stacked sections separated by a divider and
observe a horizontal rule spanning the available width between them; repeat
with two side-by-side groups and `orientation="vertical"` and observe a
vertical rule spanning the shared height.

**Acceptance Scenarios**:

1. **Given** a settings page whose "Profile" and "Notifications" sections are
   separated by a divider, **When** the page renders, **Then** a horizontal
   rule spans the available width between the two sections.
2. **Given** a toolbar whose "Edit" and "Share" action groups are separated
   by a divider with orientation "vertical", **When** the page renders,
   **Then** a vertical rule spans the toolbar's height between the two
   groups.

---

### User Story 2 - Stay out of the interaction path (Priority: P2)

A keyboard user tabs across content that contains dividers and never lands on
one; a screen-reader user moves through the same content and hears nothing
about them — the groups themselves (headings, lists, toolbars) carry the
structure, and the divider is purely visual reinforcement.

**Why this priority**: a decorative element that pollutes the focus order or
the accessibility tree actively harms users (Art. V); transparency is what
makes the divider safe to sprinkle through agent-generated layouts.

**Independent Test**: place a divider between two buttons, tab through the
page and count exactly two stops; query the accessibility tree and verify the
divider contributes no role, name or announcement.

**Acceptance Scenarios**:

1. **Given** a page whose only interactive elements are the buttons "Save"
   and "Cancel" separated by a divider, **When** the user tabs through the
   page, **Then** focus visits "Save" and then "Cancel", never the divider.
2. **Given** a settings page whose two sections are separated by a divider,
   **When** the accessibility tree is queried, **Then** the divider
   contributes no role, name or announcement between the sections.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every divider restyles from the token layer alone — thickness,
color, end caps, gutter spacing. onmars keeps its rounded hairline; material3
gets its 1 dp square-ended outline-variant rule. No markup change, no
component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; the divider carries the MarsUI ends axis and the M3
thickness/color roles entirely in the token layer, exactly as 002 carried
shape.

**Independent Test**: render a divider under onmars, declare the material3
theme, assert the rule's appearance resolves from material3 token values;
repeat under the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the divider takes material3 appearance with
   unchanged markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the divider's color resolves from the dark token
   values.

---

### User Story 4 - An agent composes a valid separation (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks ki-divider to separate adjacent groups when spacing alone is not
enough, and knows when NOT to reach for it (between list items — a ki-list
token decision; semantic thematic breaks in prose — native `<hr>`; borders —
surface tokens). Malformed attributes — for example vocabulary copied from
another design system — do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a divider with an unrecognized orientation value
and observe the default horizontal rendering.

**Acceptance Scenarios**:

1. **Given** a divider declared with an unrecognized orientation copied from
   another design system, **When** the page renders, **Then** the divider
   renders as the default horizontal rule.

### Edge Cases

- Unknown attributes or attribute values (e.g. `orientation="inset"` copied
  from another design system's vocabulary) are ignored: the divider renders
  as the default horizontal rule (agent-generated markup is not trusted to
  be valid).
- Content placed inside `<ki-divider>` is not rendered: the component has no
  slots. Labeled separators ("OR" between sign-in options) are a future
  concern, documented as when-NOT-to-use in v1.
- A vertical divider derives its length from the layout context (it
  stretches to the cross size its container provides); in a context that
  resolves no height it renders zero-length — a consumer layout concern the
  component does not repair, documented in catalog guidance.
- Semantic thematic breaks in running prose belong to native `<hr>`
  (when-NOT-to-use): ki-divider is deliberately decorative and contributes
  no separator semantics (FR-004).
- RTL documents: v1 has no start/end asymmetry (no inset), so the rendered
  rule is identical; any spacing the component owns uses logical properties
  (Art. IV).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).
- No motion: the divider is static, so `prefers-reduced-motion` is not
  applicable.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Divider
  A divider draws a subtle rule that visually separates adjacent content —
  stacked sections or side-by-side groups — stays invisible to keyboard and
  assistive technology, and restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: A divider separates stacked content with a horizontal rule
    Given a settings page whose "Profile" and "Notifications" sections are separated by a divider
    When the page renders
    Then a horizontal rule spans the available width between the two sections

  # S2
  Scenario: A vertical divider separates side-by-side content
    Given a toolbar whose "Edit" and "Share" action groups are separated by a divider with orientation "vertical"
    When the page renders
    Then a vertical rule spans the toolbar's height between the two groups

  # S3
  Scenario: Unknown attribute values fall back to the default appearance
    Given a divider declared with an unrecognized orientation copied from another design system
    When the page renders
    Then the divider renders as the default horizontal rule

  # Family: keyboard path
  # S4
  Scenario: The divider adds no keyboard stop
    Given a page whose only interactive elements are the buttons "Save" and "Cancel" separated by a divider
    When the user tabs through the page
    Then focus visits "Save" and then "Cancel", never the divider

  # Family: assistive-tech outcome
  # S5
  Scenario: The divider stays silent in the accessibility tree
    Given a settings page whose two sections are separated by a divider
    When the accessibility tree is queried
    Then the divider contributes no role, name or announcement between the sections

  # Family: form participation — N/A for ki-divider: a static, purely visual
  # separation rule never carries user input, contributes no value to form
  # data and is not form-associated (justified in spec.md's Scenario Family
  # Coverage table).

  # Family: theming
  # S6
  Scenario: A second theme restyles the divider through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the divider's thickness, color and spacing resolve from material3 token values

  # S7
  Scenario: The divider honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the divider's color resolves from the dark token values
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3 | |
| Keyboard path | S4 | |
| Assistive-tech outcome | S5 | |
| Form participation | | N/A — ki-divider is a static, purely visual separation rule: it never carries user input, contributes no value to form data and is not form-associated (charter; Art. IV). |
| Theming | S6, S7 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The divider MUST be a static, non-interactive rule: never
  focusable, never in the tab order, emitting no component events.
- **FR-002**: The component MUST expose a single `orientation` attribute
  with the values `horizontal` (default) and `vertical`; any unrecognized
  value MUST render as the default horizontal rule (agent-generated markup
  is not trusted to be valid).
- **FR-003**: A horizontal divider MUST span the available inline size of
  its container; a vertical divider MUST stretch to the cross size its
  layout context provides. The rule's length is never an attribute.
- **FR-004**: The divider MUST be decorative to assistive technology: it
  exposes no role, name, state or announcement of its own. Semantic
  thematic breaks belong to native `<hr>`, documented as when-NOT-to-use.
  This is a deliberate deviation from native `<hr>` semantics, aligned with
  the M3 reference implementation and "no ARIA is better than wrong ARIA"
  (Art. V; see Assumptions — flagged for founder review).
- **FR-005**: Every visual property (rule thickness, color, end-cap radius,
  gutter spacing) MUST resolve from `--ki-divider-*` component tokens
  layered over the semantic token layer; zero hardcoded visual values.
- **FR-006**: The end-cap treatment (MarsUI `ends=pointed|rounded`) MUST be
  expressed exclusively through the per-theme `--ki-divider-radius` token
  value; no ends or variant attribute exists (002 Round/Square precedent,
  charter rule on pure-appearance axes).
- **FR-007**: The component MUST reserve its gutter (the spacing around the
  rule, MarsUI's 8 px frame) through the `--ki-divider-spacing` token, with
  the rule centered within it; a theme MAY set the gutter to zero.
- **FR-008**: The component MUST have no slots; light-DOM children are not
  rendered. Labeled separators are out of v1 scope.
- **FR-009**: Unrecognized attributes MUST NOT break rendering; the divider
  renders with the default appearance.
- **FR-010**: Any spacing the component owns MUST use logical properties so
  it follows the document's writing direction (Art. IV).
- **FR-011**: The component MUST expose a `divider` part for the
  customization ladder (tokens first, then parts, then slots).
- **FR-012**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (never between list items — a
  ki-list theme-token decision per 016; never for semantic thematic breaks
  in prose — native `<hr>`; never as a border substitute — surface/border
  tokens).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): one new element `ki-divider` (attributes:
  `orientation`; events: none; slots: none; methods: none; parts: `divider`;
  component tokens: `--ki-divider-*`). Additive MINOR; catalog and llms.txt
  regenerate with the new entry.
- **Bundle budget** (Art. IV): expected to be the smallest component in the
  catalog — one attribute, no interaction logic, no text content; marginal
  cost well inside the low single-digit KB (gzipped) budget; no new runtime
  dependency ("none").
- **Accessibility** (Art. V): no APG widget pattern applies — the APG
  window-splitter (focusable separator) is an interactive widget and
  explicitly out of scope; the static `separator` role is deliberately NOT
  used in v1 (FR-004): the divider is visual reinforcement of structure the
  surrounding content already carries, separator announcements between
  grouped sections are noise, and the M3 reference implementation is
  likewise decorative. The obligation is transparency: zero keyboard stops,
  zero accessibility-tree contribution. Rule color contrast is a theme-layer
  concern: a divider is a non-essential graphical object, so the 3:1
  non-text contrast requirement does not bind it, but themes keep the
  hairline perceivable (merge-train precedent on non-text contrast recorded
  for the token layer). axe zero violations across orientations × themes ×
  schemes.
- **Tokens** (Art. VI): new component token family `--ki-divider-*`:
  `thickness`, `color` (resolving from the semantic border/outline layer),
  `radius` (MarsUI ends axis: pointed ⇒ 0, rounded ⇒ pill; material3 ⇒ 0),
  `spacing` (gutter). No variant, tone, size or state axes: the divider is
  static and non-interactive. Both shipped themes (onmars, material3) get
  component token files; the pointed-vs-rounded and 1 dp/outline-variant
  choices live in those theme values. No semantic-layer deltas expected.
- **Catalog/agent legibility** (Art. I): when-to-use — visually separate
  adjacent content when spacing alone is not enough: grouped settings
  sections, toolbar action groups, distinct regions inside a card
  (horizontal between stacked content, vertical between side-by-side
  content). When NOT to use — between list items (separation is a ki-list
  theme-token decision, 016), semantic thematic breaks in running prose
  (native `<hr>`), as a border or outline substitute (surface/border
  tokens), or purely decorative flourishes (prefer white space, per M3
  guidance).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: both orientations render a rule spanning the documented axis
  with zero configuration beyond the `orientation` attribute; unrecognized
  values fall back to the horizontal default in 100% of cases.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every divider — thickness, color, end caps, gutter — with zero markup or
  component changes; only the theme declaration differs. The same holds for
  the forced dark scheme.
- **SC-003**: zero accessibility violations in automated auditing across
  orientations, themes and schemes; the divider contributes zero
  accessibility-tree entries (no role, no name) and zero keyboard stops in
  100% of cases.
- **SC-004**: the marginal bundle cost of ki-divider stays within the
  declared budget gate (expected smallest entry in the catalog).

## Assumptions

- Decorative-by-default (FR-004) is a deliberate deviation from native
  `<hr>` semantics and needs founder confirmation at gate 1: the divider is
  visual reinforcement of structure that headings, lists and toolbars
  already carry, so a `separator` announcement between grouped sections is
  judged noise; the M3 reference implementation makes the same call. A
  semantic opt-in (static `separator` role with matching orientation) would
  be an additive MINOR change later.
- The MarsUI `align` axis (top|center|bottom / left|center|right within the
  8 px frame) is judged a Figma layout convenience for placing the hairline
  inside its reserved gutter, not a behavioral axis: v1 reserves symmetric
  gutter via `--ki-divider-spacing` and centers the rule. If a real
  asymmetric-placement need appears it lands as additive token steps.
- The MarsUI `ends` axis (pointed|rounded) is a pure-appearance axis each
  theme decides through `--ki-divider-radius` (charter rule; 002 shape
  precedent); no ends attribute exists.
- No inset attribute in v1: M3's full-width/inset/middle-inset variants are
  per-instance layout decisions, achievable with consumer CSS logical
  margins or a custom-property override on the instance; an `inset`
  attribute would be additive MINOR if evidence demands it.
- No label slot in v1: neither design source shows a labeled divider ("OR"
  separators); the component has no slots and renders no children.
- No `size`, `tone` or `variant` attributes: neither design source exposes
  a scale or emphasis axis for dividers; thickness and color are per-theme
  component tokens.
- ki-divider does not replace ki-list separation: 016 deliberately keeps
  list-item dividers in the `--ki-list-item-*` token layer, and this spec
  does not reopen that decision.
- `orientation` is a physical axis (a vertical rule is vertical in both
  writing directions); with no start/end asymmetry in v1, RTL has no
  observable effect beyond logical-property spacing.
- No motion: the divider is static in v1, so `prefers-reduced-motion` is
  not applicable.
