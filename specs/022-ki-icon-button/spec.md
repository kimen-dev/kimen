# Feature Specification: ki-icon-button

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-icon-button` (spec `022-ki-icon-button`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Fase N batch component: a `<ki-icon-button>`
web component — the icon-only action button that 002-ki-button explicitly
scoped out (its Design-source analysis lists the separate MarsUI
`Icon_button` set and M3's icon buttons as a future `ki-icon-button`). It
carries the same semantic API family as ki-button (`variant`, `tone`,
`size`), a single decorative icon in the default slot, and a mandatory
`label` attribute for the accessible name, restyling entirely through the
token layer, following the API charter for the batch (precedents:
002-ki-button for the axes, 015-ki-progress for the required `label`).
Toggle/selected icon buttons and form association are explicitly out of v1
scope."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-icon-button |
|---|---|---|---|
| Visual emphasis | `Icon_button` set (node 10078:2975, page Buttons, verified 2026-07-17): 8 types — primary, primary_light, primary_flat, secondary, tertiary, quaternary, neutral, flat — the same eight as `Button`, with the same glass surface treatment | 4 styles: filled, filled tonal, outlined, standard | `variant`: the same 5 semantic levels as ki-button (`primary`, `secondary`, `tertiary`, `quaternary`, `ghost`); MarsUI light/flat sub-styles are token-layer decisions inside a level (002 precedent) |
| Semantic intent | The Icon_button set carries a single color matrix — no separate success/danger matrices like `Button`'s (verified 2026-07-17) | No tone evidence either: M3 documents icon buttons as filled / filled tonal / outlined / standard, with no error or success variant | `tone`: `neutral` / `success` / `danger` — an API-parity decision with ki-button, not an extraction (neither source ships tone matrices for icon buttons; see Assumptions); appearance resolves through the semantic intent tokens 002 established |
| Size | 5 square sizes: xs 24 / sm 32 / md 40 / lg 48 / xl 56 px; md is 40×40 with a 20 px icon and zero padding beyond centering (verified 2026-07-17) | pre-expressive standard: 40 dp container, 24 dp icon, 48 dp target; expressive ramp XSmall 32 … XLarge 136 dp with default/narrow/wide widths | `size`: xs–xl, 1:1 with MarsUI; square dimension and icon size are per-theme component tokens; M3 width variants are pure appearance → token layer, no attribute |
| Interaction states | default, hover, focus, disabled per variant × size (160 variants inventoried) | enabled, hovered, focused, pressed, disabled | CSS states (hover, focus-visible, active, disabled), never props; all token-styled (002 precedent) |
| Content anatomy | a single centered icon; no label text, no start/end regions | a single icon; the icon has no visible text of its own | default slot holding exactly one decorative icon; the accessible name never derives from content — it comes from a mandatory `label` attribute (015 ki-progress precedent) |
| Label affordance | — (icon only) | accessible name required; tooltips commonly pair with icon buttons | `label` attribute is the accessible name; catalog guidance pairs ki-tooltip (013) for the visible affordance; a host accessible description forwards to the focus target (002 FR-015/S14 pattern) |
| Shape | fixed radius per size (square glass tile) | Round / Square shape axis | radius is a component token per size; shape is a theme decision, NOT a prop (002 precedent) |
| Toggle (selected) | — | toggle icon button with selected/unselected states | out of scope for v1 (future feature, mirroring 002's toggle exclusion) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trigger a compact action (Priority: P1)

A person using an application built with Kimen activates an icon-only
control — close a dialog, clear a field, play a track — with a pointer, a
keyboard, or assistive technology, and the associated action runs exactly
once. A disabled icon button is skipped and clearly unavailable.

**Why this priority**: activation parity with the native button in the
smallest possible footprint is the component's entire reason to exist;
everything else layers on top of it.

**Independent Test**: render one icon button with a label and an icon,
activate it through each input modality, observe exactly one activation per
attempt; disable it and observe none.

**Acceptance Scenarios**:

1. **Given** an icon button labeled "Close", **When** the user clicks it,
   **Then** the page observes exactly one activation.
2. **Given** a disabled icon button, **When** the user attempts to activate
   it, **Then** no activation is observed and focus never lands on it.

---

### User Story 2 - Understand an icon-only control without seeing it (Priority: P2)

A person using a screen reader reaches an icon button and hears a proper
name — "Close, button" — even though the control shows no visible text; the
disabled state is announced as unavailable; and when a tooltip wraps the
button, its text reaches the same person as the accessible description.

**Why this priority**: an unnamed icon button is the canonical accessibility
failure of every icon-only control (Art. V); the mandatory accessible name
is what distinguishes ki-icon-button from a decorated clickable square, and
it is the one obligation ki-button could delegate to its slotted label but
this component cannot.

**Independent Test**: query the accessibility tree of an icon button holding
only an icon and verify a button named from the `label` attribute with no
extra output contributed by the icon; disable it and verify the unavailable
state; wrap it in a description-supplying host and verify the exposed
description, its updates and its removal.

**Acceptance Scenarios**:

1. **Given** an icon button labeled "Close" holding only an icon, **When**
   the accessibility tree is queried, **Then** it exposes a button whose
   accessible name is "Close" and the icon contributes nothing of its own.
2. **Given** a disabled icon button, **When** the accessibility tree is
   queried, **Then** the button is exposed as unavailable.
3. **Given** an icon button labeled "Close" whose host carries an accessible
   description, **When** the accessibility tree is queried, **Then** the
   exposed button carries that description as its accessible description,
   which follows later changes and disappears when the host description is
   removed.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every icon button — all variants, tones and sizes — restyles from
the token layer alone: dimensions, icon size, radius, colors, state styling.
No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; the icon button carries MarsUI's glass treatment and
M3's shape/width axes entirely in the token layer, exactly as 002 carried
shape.

**Independent Test**: render the variant × tone × size matrix under onmars,
declare the material3 theme, assert every icon button resolves its
appearance from theme tokens; repeat for the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** icon buttons take material3 appearance with
   unchanged markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** icon buttons use the dark token values.

---

### User Story 4 - An agent picks the right control (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
reaches for ki-icon-button only where space precludes a visible label,
always supplies `label`, and knows when NOT to use it (a visible label fits →
ki-button; toggling → future toggle component; navigation → link). Malformed
attribute values do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render an icon button with unknown variant/tone/size
values and observe default rendering.

**Acceptance Scenarios**:

1. **Given** an icon button with an unrecognized variant value, **When** the
   page renders, **Then** the icon button renders as the default variant.

### Edge Cases

- Unknown `variant`, `tone` or `size` values fall back to the documented
  defaults (agent-generated markup is not trusted to be valid).
- An icon button without a `label` still renders but exposes no accessible
  name and fails the accessibility audit; `label` is documented as required
  in the catalog contract (015 ki-progress precedent). The component never
  invents a hardcoded fallback name (Art. IV).
- Text slotted instead of an icon is an unsupported authoring mistake: the
  default slot is presentational, its content is hidden from assistive
  technology and never contributes to the accessible name.
- More than one icon slotted is an unsupported authoring mistake documented
  in catalog guidance; the component does not attempt to repair it.
- `xs` size (24 px in onmars) sits exactly at the WCAG 2.2 minimum pointer
  target (24×24); no theme may go below it (002 precedent).
- Disabled state applied while the icon button has focus: focus moves on, no
  activation fires afterwards.
- Inside a native form, activating an icon button never submits or resets
  the form: the component is not form-associated in v1. An icon-only
  submit/reset control is documented as when-NOT-to-use (use ki-button,
  whose visible label communicates the consequence).
- RTL documents: a single centered glyph has no directional anatomy, so no
  writing-direction behavior is specified; internal layout still uses
  logical properties only (Art. IV). Choosing a direction-aware icon (e.g. a
  back arrow) is the consumer's concern, not the component's.
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Icon button
  An icon button lets a person trigger a compact, icon-only action with
  full input-modality parity and a mandatory accessible name, and lets
  any brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Activating the icon button runs its action exactly once
    Given an icon button labeled "Close" on a page that counts activations
    When the user clicks the icon button
    Then the page observes exactly one activation

  # S2
  Scenario: A disabled icon button does not act
    Given a disabled icon button labeled "Close"
    When the user attempts to activate it
    Then no activation is observed

  # S3
  Scenario: Unknown appearance values fall back to defaults
    Given an icon button declared with an unrecognized variant value
    When the page renders
    Then the icon button renders with the default variant appearance

  # Family: keyboard path
  # S4
  Scenario: The keyboard reaches the icon button with visible focus
    Given a page whose first interactive element is an icon button
    When the user presses Tab
    Then the icon button is focused and its focus indication is visible

  # S5
  Scenario: The keyboard activates the focused icon button
    Given a focused icon button labeled "Close"
    When the user activates it from the keyboard
    Then the page observes exactly one activation

  # Family: assistive-tech outcome
  # S6
  Scenario: The icon button is exposed as a named button without visible text
    Given an icon button labeled "Close" holding only a close icon
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Close"
    And the slotted icon contributes no name, role or text of its own

  # S7
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled icon button labeled "Close"
    When the accessibility tree is queried
    Then the icon button is exposed as unavailable

  # S8
  Scenario: An accessible description on the host reaches assistive technology
    Given an icon button labeled "Close" whose host carries the accessible description "Closes the dialog"
    When the accessibility tree is queried
    Then it exposes a button named "Close" whose accessible description is "Closes the dialog"

  # Family: form participation
  # S9
  Scenario: An icon button never submits an enclosing form
    Given a form holding a filled text field and an icon button labeled "Clear"
    When the user activates the icon button
    Then the form does not submit

  # Family: theming
  # S10
  Scenario: A second theme restyles the icon button through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the icon button's appearance resolves from material3 token values

  # S11
  Scenario: The icon button honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the icon button's appearance resolves from the dark token values

  # Family: assistive-tech outcome (appended)
  # S12
  Scenario: The exposed description follows a change on the host
    Given an icon button labeled "Close" whose host carries the accessible description "Closes the dialog"
    When the host description changes to "Closes the settings panel"
    Then the button's exposed accessible description is "Closes the settings panel"

  # S13
  Scenario: Removing the host description removes the exposed description
    Given an icon button labeled "Close" whose host carries the accessible description "Closes the dialog"
    When the host description is removed
    Then the button exposes no accessible description

  # Family: keyboard path (appended)
  # S14
  Scenario: A disabled icon button sits outside the tab order
    Given a focused button, then a disabled icon button labeled "Close", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the disabled icon button
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3 | |
| Keyboard path | S4, S5, S14 | |
| Assistive-tech outcome | S6, S7, S8, S12, S13 | |
| Form participation | S9 | |
| Theming | S10, S11 | |

Form participation is covered by a deliberate negative contract (S9):
ki-icon-button is not form-associated in v1 and MUST NOT submit or reset an
enclosing form — see FR-008 and Assumptions for the rationale and the
founder decision it batches.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The icon button MUST expose a `variant` attribute with exactly
  the five semantic emphasis levels established by 002 — `primary`,
  `secondary`, `tertiary`, `quaternary`, `ghost` — defaulting to
  `secondary`. Levels describe action hierarchy, never appearance.
- **FR-002**: The icon button MUST expose a `tone` attribute with values
  `neutral` (default), `success`, `danger`, orthogonal to `variant`.
- **FR-003**: The icon button MUST expose a `size` attribute with values
  `xs`, `sm`, `md` (default), `lg`, `xl`; the square dimension and the icon
  size per step are per-theme component tokens.
- **FR-004**: The icon button MUST expose a `label` attribute that becomes
  the accessible name of the internal focusable button. The component never
  invents hardcoded strings (Art. IV); `label` is documented as required in
  the catalog contract, and an icon button without it fails the
  accessibility audit.
- **FR-005**: The default slot MUST accept exactly one icon and treat it as
  presentational: slotted content is hidden from assistive technology and
  never contributes to the accessible name.
- **FR-006**: Activation MUST behave with native-button parity: pointer
  click, Enter and Space each produce exactly one activation; activation is
  observable to the page as a standard click. The component emits no events
  of its own.
- **FR-007**: A disabled icon button MUST NOT activate, MUST NOT be
  reachable in the tab order, and MUST expose its unavailable state to
  assistive technology.
- **FR-008**: The icon button MUST NOT be form-associated in v1: it exposes
  no `type`, `name` or `value` attributes, and activating it inside a native
  form MUST NOT submit or reset that form. Icon-only submit/reset controls
  are documented as when-NOT-to-use (use ki-button).
- **FR-009**: Every visual property (dimension, icon size, color, radius,
  elevation, state styling) MUST resolve from `--ki-icon-button-*` component
  tokens layered over the semantic token layer; zero hardcoded visual
  values. Shape/radius and M3's width axis are tokens, never attributes.
- **FR-010**: Interaction states (hover, focus-visible, active, disabled)
  MUST be styled exclusively through tokens and CSS states; states are never
  attributes/props.
- **FR-011**: Unrecognized `variant`, `tone` or `size` values MUST fall back
  to their documented defaults without breaking rendering.
- **FR-012**: Focus MUST be clearly visible in every theme; the pointer
  target MUST be at least 24×24 px in every size and theme.
- **FR-013**: The component MUST expose `button` and `icon` parts for the
  customization ladder (tokens first, then parts, then slots).
- **FR-014**: An `aria-description` supplied on the host MUST reach the
  internal native button that receives focus, MUST track later value
  changes, and MUST be removed internally when the host description is
  removed (002 FR-015 pattern; ki-tooltip is the expected supplier).
- **FR-015**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance: use only where space precludes a
  visible label and always with `label`; when a visible label fits, use
  ki-button; toggling state is a future toggle component; navigation is a
  link; form submit/reset is ki-button.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-icon-button` (attributes:
  `variant`, `tone`, `size`, `label`, `disabled`; events: none of its own —
  activation is a standard click; slots: default (single decorative icon);
  parts: `button`, `icon`; component tokens: `--ki-icon-button-*`). Additive
  MINOR; catalog and llms.txt regenerate with the new entry, and
  002-ki-button's when-NOT-to-use pointer ("icon-only actions → future
  icon-button") now resolves to this element.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none"); the component reuses the interaction pattern
  ki-button already paid for.
- **Accessibility** (Art. V): APG button pattern — the manual walkthrough
  was documented in 002 and the delta here is reviewed against it, not
  rewalked. The new obligations are the mandatory accessible name without
  visible text (an unnamed icon button is the canonical icon-only failure)
  and the pointer-target floor at `xs` (24×24, WCAG 2.2). axe zero
  violations across variant × tone × size × state under both themes, both
  schemes.
- **Tokens** (Art. VI): new component token family `--ki-icon-button-*`
  (square dimension and icon size per size step, radius per size, per
  variant × tone color and state styling, focus ring, border width)
  resolving from the semantic layer; expected to reuse the emphasis and
  intent semantic tokens 002 declared — no semantic-layer deltas expected.
  Both shipped themes (onmars, material3) get component token files; MarsUI
  glass treatment and M3 shape/width live in those theme values.
- **Catalog/agent legibility** (Art. I): when-to-use — a compact, widely
  understood action where space precludes a visible label: toolbars, card
  and dialog corners (close), media transport, data-row actions; always with
  `label`, usually paired with ki-tooltip for sighted discoverability. When
  NOT to use — whenever a visible label fits (ki-button), toggling state
  (future toggle icon button), navigation (use a link), form submit/reset
  (ki-button).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can trigger the icon button's action via pointer,
  Enter and Space, each attempt producing exactly one activation, in 100% of
  variants, tones and sizes.
- **SC-002**: 100% of icon buttons rendered with a `label` expose it as the
  accessible name of the focus target; the automated audit fails any icon
  button rendered without one.
- **SC-003**: switching the document theme (onmars ↔ material3) restyles
  every icon button in the variant × tone × size matrix with zero markup or
  component changes — only the theme declaration differs. The same holds for
  the forced dark scheme.
- **SC-004**: zero accessibility violations across the full matrix and all
  interaction states in automated auditing; the pointer target measures at
  least 24×24 px in every size and theme.
- **SC-005**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-006**: keyboard-only operation covers 100% of the behavior available
  to pointer users.

## Assumptions

- The `variant`, `tone` and `size` vocabularies and defaults are inherited
  verbatim from 002-ki-button (charter API-coherence rule): same five
  levels, same three tones, same xs–xl ramp, defaults
  `secondary`/`neutral`/`md`. An icon button is the icon-only counterpart of
  ki-button, not a new abstraction.
- Neither design source ships tone matrices for icon buttons: the MarsUI
  `Icon_button` set carries no separate success/danger matrices (verified
  2026-07-17), unlike `Button`, and M3's icon buttons (filled / filled
  tonal / outlined / standard) document no error or success variant. `tone`
  is included anyway as an API-parity decision with ki-button — destructive
  icon actions (delete row) are a core use — and onmars resolves tone
  appearance through the semantic intent tokens 002 declared; no per-tone
  icon-button design is required of a theme.
- Not form-associated in v1 is a deliberate divergence from ki-button's
  `type="submit"` default, batched for founder confirmation at gate 1: an
  icon-only control has no visible text to communicate a submit/reset
  consequence, so those roles stay with ki-button. Form association could
  arrive later as additive MINOR; until then S9 guards the negative
  contract.
- `label` as a first-class attribute (015 ki-progress precedent) rather than
  documentation-level `aria-label` guidance: the focus target lives inside
  the shadow root, so the component owns the cross-root wiring and agents
  learn a single attribute.
- Toggle/selected icon buttons (M3) are a separate future feature; excluding
  them mirrors 002's toggle exclusion and is a scope decision, not an
  omission.
- M3's width axis (default/narrow/wide) and Round/Square shape are
  pure-appearance axes each theme decides through component tokens (002
  shape precedent, charter rule); no width or shape attribute exists.
- A loading state appears in neither reference design and is excluded
  (Art. VII — no speculative props; mirrors 002).
- No RTL scenario: a single centered glyph has no writing-direction anatomy.
  Logical properties are still mandatory internally (Art. IV), and
  direction-aware icon choice (back/forward arrows) belongs to the consumer.
- Exactly one icon in the default slot; multiple icons or text content are
  documented as unsupported authoring mistakes in catalog guidance, not
  error states to handle.
- Badging an icon button (M3 shows badges on icon buttons in navigation
  contexts) is composition at the consumer level and out of v1 scope; no
  badge slot exists.
