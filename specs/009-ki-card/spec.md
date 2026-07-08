# Feature Specification: ki-card

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-card` (spec `009-ki-card`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Fase 2 batch component: a `<ki-card>` web
component — a non-interactive grouping container that composes media, header,
body and footer regions through slots and restyles entirely through the token
layer, following the API charter for the 003–016 batch (precedent:
002-ki-button). The Material 3 elevated/filled/outlined style axis is a theme
token decision, never an attribute. No whole-card click or link behavior in
v1: interactive elements compose inside the card's slots."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-card |
|---|---|---|---|
| Style axis | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | 3 card types: elevated, filled, outlined | No attribute: elevation and border resolve from `--ki-card-*` component tokens; each theme picks its card style in the token layer (002 Round/Square precedent) |
| Surface | surface ramp s0–s5 shipped in the token layer (001 extraction); which step the card maps to is a theme decision | surface-container color roles per card type | card surface, border and elevation are component tokens resolving from the semantic surface layer |
| Content anatomy | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | media/image, header (title + subhead), supporting text, actions row | slots: `media`, `header`, default (body), `footer`; actions compose inside `footer` |
| Shape | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | corner radius from the M3 shape scale | radius is a component token per theme, never a prop |
| Interactivity | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | actionable cards exist (whole-card click with hover/pressed states) | Out of scope for v1: the card is non-interactive; interactive elements compose inside slots (whole-card interactivity is a possible future feature) |
| Size | xs–xl metric ramp exists in the shipped token vocabulary (001), but no verified evidence that cards scale through it | no size ramp; paddings fixed by the spec | no `size` attribute; paddings and gaps are per-theme component tokens |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan grouped content on one surface (Priority: P1)

A person viewing an application sees related content — an image, a title,
supporting text, a closing action row — grouped on a single card surface,
visually distinct from the page background, always in the same reading order.
Whatever subset of regions the author fills, the layout stays clean: absent
regions leave no holes.

**Why this priority**: grouping related content into one scannable surface is
the card's entire reason to exist; every other behavior layers on top of it.

**Independent Test**: render one card with all four regions filled and
observe the reading order on a distinct surface; remove regions one at a time
and observe the layout collapse cleanly with no reserved space.

**Acceptance Scenarios**:

1. **Given** a card with media, header, body and footer content, **When** the
   page renders, **Then** the regions appear in reading order — media, header,
   body, footer — on one visually distinct surface.
2. **Given** a card holding only body text, **When** the page renders,
   **Then** only the body is visible, with no space reserved for the absent
   regions.

---

### User Story 2 - Contain interactive content without interfering (Priority: P2)

A person operating with a keyboard or assistive technology uses the buttons
and links placed inside a card exactly as if the card were not there: the card
adds no Tab stop, no role, no announcement of its own. The container is
behaviorally transparent.

**Why this priority**: a container that steals focus or wraps content in
spurious roles is an accessibility hazard (Art. V); transparency is what makes
the card safe to compose with every other Kimen component.

**Independent Test**: place a button in the card's footer, tab through the
page and count exactly one stop (the button); click the button and count
exactly one activation; query the accessibility tree and verify the card
contributes no role, name or state of its own.

**Acceptance Scenarios**:

1. **Given** a card whose footer holds a button, **When** the user presses
   Tab, **Then** focus lands on the button and never on the card itself.
2. **Given** a card with a heading and body text, **When** the accessibility
   tree is queried, **Then** the heading and text are exposed and the card
   contributes no role, name or state of its own.
3. **Given** a card whose footer holds a button, **When** the user clicks the
   button, **Then** the page observes exactly one activation — no duplicate,
   no interception.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every card restyles from the token layer alone — surface color,
border, elevation, radius, spacing. Whether cards look elevated, filled or
outlined is the theme's decision, expressed in token values; no markup change,
no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; the card is the first pure container that must honor
it, and it carries the M3 style axis entirely in the token layer.

**Independent Test**: render a card under onmars, declare the material3
theme, assert the card's appearance resolves from material3 token values;
repeat under the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the card takes material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the card uses the dark token values.

---

### User Story 4 - An agent composes a valid card (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks the card to group related content, fills any subset of its regions, and
knows when NOT to reach for it (never as a button or link). Malformed
attributes — for example vocabulary copied from another design system — do
not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a card with an unrecognized variant attribute and
observe default rendering.

**Acceptance Scenarios**:

1. **Given** a card declared with an unrecognized variant attribute, **When**
   the page renders, **Then** the card renders its content with the default
   appearance.

### Edge Cases

- Unknown attributes or attribute values (e.g. `variant="elevated"` copied
  from M3 vocabulary) are ignored: the card renders its content with the
  default appearance (agent-generated markup is not trusted to be valid).
- A completely empty `<ki-card>` renders an empty surface; catalog guidance
  treats it as an authoring mistake, not an error state.
- Whether the `media` region spans the card's full inline size (full-bleed)
  is a theme decision expressed in the `--ki-card-media-padding` token (both
  shipped themes set it to zero, matching M3's edge-to-edge media); text
  regions keep their own per-region padding tokens.
- Cards nested inside cards render independently; nesting is documented as
  when-NOT-to-use in the catalog.
- Long content grows the card vertically; the card introduces no internal
  scrolling in v1 — consumers manage overflow.
- RTL documents: regions stack in the block direction, so there is no inline
  order to reverse; all internal spacing uses logical properties so padding
  mirrors correctly (Art. IV).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Card
  A card groups related content — media, header, body and footer — on one
  distinct surface that any brand restyles through tokens alone, without the
  card ever competing with the interactive content placed inside it.

  # Family: core behavior
  # S1
  Scenario: A card presents its regions in reading order
    Given a card with an image, the header "Monthly report", body text and a footer holding a "Download" button
    When the page renders
    Then the image leads, the header precedes the body and the footer closes the card

  # S2
  Scenario: Absent regions leave no empty space
    Given a card holding only the body text "Storage is almost full"
    When the page renders
    Then only the body is rendered, with no space reserved for the other regions

  # S3
  Scenario: Unknown attribute values fall back to the default appearance
    Given a card declared with an unrecognized variant attribute copied from another design system
    When the page renders
    Then the card renders its content with the default card appearance

  # S8
  Scenario: The card leaves its content's events untouched
    Given a card whose footer holds a button labeled "Download" on a page that counts activations
    When the user clicks the button
    Then the page observes exactly one activation

  # Family: keyboard path
  # S4
  Scenario: The card never takes focus away from its content
    Given a card whose footer holds a button labeled "Renew subscription"
    When the user presses Tab
    Then focus lands on the "Renew subscription" button and never on the card itself

  # Family: assistive-tech outcome
  # S5
  Scenario: The card exposes its content without adding roles of its own
    Given a card with the heading "Monthly report" and body text
    When the accessibility tree is queried
    Then the heading and body text are exposed and the card contributes no role, name or state of its own

  # Family: form participation — N/A for ki-card: a non-interactive grouping
  # container is not a form control and contributes no entry to submitted
  # form data (justified in spec.md's Scenario Family Coverage table).

  # Family: theming
  # S6
  Scenario: A second theme restyles the card through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the card's surface, border and elevation resolve from material3 token values

  # S7
  Scenario: The card honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the card's appearance resolves from the dark token values
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S8 | |
| Keyboard path | S4 | |
| Assistive-tech outcome | S5 | |
| Form participation | | N/A — ki-card is a non-interactive grouping container: it is not a form control, holds no value and contributes no entry to submitted form data (charter-listed valid N/A). |
| Theming | S6, S7 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The card MUST be a non-interactive grouping container: never
  focusable, never present in the tab order, and emitting no activation or
  component events of its own.
- **FR-002**: Content MUST compose through four regions: `media` slot
  (leading visual), `header` slot, default slot (body), `footer` slot. Any
  subset — including a single region — MUST produce a sensible layout with
  no configuration.
- **FR-003**: Regions with no slotted content MUST NOT reserve visible space.
- **FR-004**: Regions MUST render in the documented reading order: media,
  header, body, footer.
- **FR-005**: Interactive elements slotted inside the card MUST remain fully
  operable; the card MUST NOT intercept, duplicate or re-target their focus
  or events.
- **FR-006**: The card MUST NOT expose any role, name or state of its own —
  interactive, landmark or grouping (e.g. `article`, `group`, `region`): it
  is a generic container whose accessible structure derives entirely from
  the slotted content (semantic HTML first — no ARIA is better than wrong
  ARIA, Art. V).
- **FR-007**: Every visual property (surface color, border, corner radius,
  elevation, per-region padding, inter-region gap) MUST resolve from
  `--ki-card-*` component tokens layered over the semantic token layer; zero
  hardcoded visual values.
- **FR-008**: The M3 elevated/filled/outlined style axis MUST be expressed
  exclusively through theme token values (elevation and border tokens); no
  style or variant attribute exists (002 Round/Square precedent, charter
  rule on pure-appearance axes).
- **FR-009**: Region padding MUST live on the regions, never on the card
  surface: each region resolves its own component token
  (`--ki-card-{media|header|body|footer}-padding`). Whether the `media`
  region bleeds to the card's edge is therefore a theme decision — a theme
  zeroes `--ki-card-media-padding` for full-bleed media (the shipped default
  in both themes, after M3) or pads it — never a structural rule of the
  component.
- **FR-010**: Unrecognized attributes or attribute values MUST NOT break
  rendering; the card renders its content with the default appearance.
- **FR-011**: The component MUST expose parts for the customization ladder
  (tokens first, then parts, then slots): `card` (the surface) and the
  per-region parts `media`, `header`, `body`, `footer`.
- **FR-012**: All internal spacing and layout MUST use logical properties so
  RTL documents mirror correctly (Art. IV).
- **FR-013**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (never as a button or link — slot the
  interactive element inside instead; whole-card interactivity is a possible
  future feature, not a v1 behavior). The generated guidance MUST state that
  the author supplies the heading element in the `header` slot (e.g.
  `h2`/`h3`, at the level the surrounding document outline requires): the
  card neither generates nor wraps a heading, so plain text slotted into
  `header` carries no heading semantics.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-card` (attributes: none in
  v1; events: none; slots: default, `media`, `header`, `footer`; parts:
  `card`, `media`, `header`, `body`, `footer`; component tokens:
  `--ki-card-*`). No sub-components. Additive MINOR; catalog and llms.txt
  regenerate with the new entry.
- **Bundle budget** (Art. IV): low single-digit KB gzipped marginal cost — a
  render-only container with no interaction logic; no new runtime dependency
  ("none").
- **Accessibility** (Art. V): no APG pattern applies — APG covers interactive
  widgets and the card is deliberately non-interactive, so no manual APG
  walkthrough is required (charter flags dialog, tooltip, tabs, select). The
  obligation here is semantic transparency: no role, name or state of the
  card's own; axe zero violations across region combinations × themes ×
  schemes.
- **Tokens** (Art. VI): new component token family `--ki-card-*` in the
  component layer — surface (`bg`, `fg`), `border` color and `border-width`,
  `radius`, `elevation`, per-region `{media|header|body|footer}-padding`
  (padding lives on the regions, never on the surface, so a theme bleeds the
  media region by zeroing its padding — the shipped default in both themes),
  `gap` — resolving from the semantic layer
  (onmars surface ramp s0–s5 available since 001). No size, variant, tone or
  state axes: the card is static and non-interactive. Both shipped themes
  (onmars, material3) get component token files; the elevated/filled/outlined
  choice lives in those theme values. No semantic-layer deltas expected.
- **Catalog/agent legibility** (Art. I): when-to-use — grouping related
  content (media, heading, supporting text, actions) into one scannable
  surface visually distinct from the page; the summary entry point to a
  detail. The author supplies the heading element itself in the `header`
  slot (e.g. `h2`/`h3`, at the level the surrounding document requires):
  the card neither generates nor wraps a heading, so plain text slotted
  into `header` carries no heading semantics. When NOT to use — as a
  clickable or link target (the card is
  non-interactive: slot a button or link inside instead), as a form control
  or fieldset, as a page landmark or section replacement, or nested inside
  another card.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: every one of the 16 region-subset combinations renders in the
  documented reading order with zero configuration and zero visible space
  reserved by absent regions.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every card — surface, border, elevation, radius, spacing — with zero markup
  or component changes; only the theme declaration differs. The same holds
  for the forced dark scheme.
- **SC-003**: zero accessibility violations in automated auditing across
  region combinations, themes and schemes, and the card contributes no role,
  name or state of its own to the accessibility tree in 100% of them.
- **SC-004**: the card introduces zero additional keyboard stops; 100% of the
  interactive content slotted inside it remains reachable and operable by
  keyboard alone.
- **SC-005**: the component's marginal cost stays in low single-digit KB
  (gzipped) and within the declared budget gate.

## Assumptions

- No `variant`/style attribute: elevated vs filled vs outlined is a
  pure-appearance axis each theme decides through component tokens (charter
  rule; 002 shape precedent). If a genuine container-emphasis scale emerges
  in a future design source, an attribute could arrive as additive MINOR.
- Non-interactive v1 is a scope decision (charter): whole-card click/link
  behavior, hover/pressed states and the M3 "actionable card" pattern are
  future features; until then the catalog documents them as when-NOT-to-use.
- No `size` or `tone` attributes: neither design source demonstrably scales
  cards through a size or intent ramp that the component must expose;
  metrics are per-theme tokens. (M3 confirmed; MarsUI pending verification —
  if the frames reveal a card scale it lands as additive MINOR.)
- Media full-bleed is a theme decision, not a structural rule: padding is
  per-region (`--ki-card-{media|header|body|footer}-padding`, applied to the
  regions, never to the card surface), and both shipped themes zero the
  media region's padding to match M3's edge-to-edge media. A theme that pads
  its media region instead needs no component change. This keeps the only
  M3-grounded layout behavior out of the structural contract while the
  MarsUI frames are pending verification.
- No dedicated `actions` slot in v1: actions compose inside `footer`
  (Art. VII — simplest design that satisfies the scenarios); a dedicated
  `actions` slot would be an additive MINOR change later.
- The MarsUI column of the design-source table is grounded only in the
  shipped token vocabulary (001 extraction); the MarsUI card frames are
  pending verification (Figma connector unavailable 2026-07-08). No Figma
  facts were invented. **Explicit decision submitted for founder
  ratification at gate 1** (so approval does not rest on an open promise):
  if the frames are still unavailable at approval, the onmars
  `--ki-card-*` token values are defined without a reference frame —
  grounded in the shipped 001 vocabulary (surface ramp s0–s5, radius and
  spacing scales) — and are reconciled against the frames as a visual
  PATCH/MINOR once the connector returns. The API surface itself (four
  slots, no attributes) does not depend on that reconciliation: it stands
  on the charter's binding v1 scope for 009 and the M3 anatomy; if the
  frames later reveal additional MarsUI card patterns they land as
  additive MINOR.
- No RTL scenario: the card has no `start`/`end` slots and its regions stack
  in the block direction, so there is no observable inline order to assert
  (the 002 S13 precedent does not apply); FR-012 still mandates logical
  properties throughout.
- No motion: the card is static in v1 (no transitions, no hover elevation),
  so `prefers-reduced-motion` is not applicable.
- An empty `<ki-card>` renders an empty surface; it is treated as an
  authoring mistake in catalog guidance, not an error state to handle.
