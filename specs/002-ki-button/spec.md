# Feature Specification: ki-button

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-button` (spec `002-ki-button`)

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "First real Kimen component: a `<ki-button>` web
component whose API abstracts the common patterns of two design systems
analyzed in Figma — MarsUI (onmars, default theme) and the Material 3 Design
Kit (material3, reference theme) — so any future theme maps through tokens
alone, without touching the component. Founder decisions recorded during
specify: emphasis scale is five semantic levels (primary, secondary, tertiary,
quaternary, ghost); the semantic-intent axis (tone: neutral, success, danger)
IS in scope for 002."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-button |
|---|---|---|---|
| Visual emphasis | 8 types (primary, primary_light, primary_flat, secondary, tertiary, quaternary, neutral, flat) | 5 colors (filled, tonal, elevated, outlined, text) | `variant`: 5 semantic levels; themes resolve appearance via component tokens. MarsUI sub-styles (light/flat) are token-layer decisions inside a level |
| Semantic intent | Separate full matrices: default, success, danger | Color roles incl. error | `tone`: neutral / success / danger, orthogonal to `variant`, token-resolved |
| Size | xs 24 / sm 32 / md 40 / lg 48 / xl 56 px | XSmall 32 / Small 40 / Medium 56 / Large 96 / XLarge 136 dp | `size`: xs–xl, 1:1 in both; heights are per-theme component tokens |
| Interaction states | default, hover, focus, disabled | enabled, hovered, focused, pressed, disabled | CSS states (hover, focus-visible, active, disabled), never props; all token-styled |
| Content anatomy | avatar/media + leading icon + primary label + secondary label + trailing icon | leading icon + label | default slot (label) + `start` / `end` slots. Secondary label and media compose inside slots; dedicated slots can arrive later as additive MINOR |
| Shape | Fixed radius per size | Round / Square variant axis | Radius is a component token per size; shape is a theme decision, NOT a prop |
| Toggle (selected) | — | Toggle button variants | Out of scope for 002 (future feature) |
| Icon-only | Separate `Icon_button` set | Separate "Icon buttons" component | Out of scope for 002 (future `ki-icon-button`) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trigger an action (Priority: P1)

A person using an application built with Kimen activates a button — with a
pointer, a keyboard, or assistive technology — and the associated action runs
exactly once. A disabled button is skipped and clearly unavailable.

**Why this priority**: activation parity with the native button is the entire
reason the component exists; everything else layers on top of it.

**Independent Test**: render one button with a label, activate it through
each input modality, observe exactly one activation per attempt; disable it
and observe none.

**Acceptance Scenarios**:

1. **Given** a button labeled "Save", **When** the user clicks it, **Then**
   the page observes exactly one activation.
2. **Given** a disabled button, **When** the user attempts to activate it,
   **Then** no activation is observed and focus never lands on it.

---

### User Story 2 - Participate in a form (Priority: P2)

A person filling in a form uses the button to submit or reset it, exactly as
a native button would, without the application wiring any extra code.

**Why this priority**: ki-button is Kimen's first form-associated component
and establishes the ElementInternals pattern every later form control follows.

**Independent Test**: place the button inside a native form; a submit-type
button submits it (contributing its name/value), a button-type button does
not, a reset-type button restores field defaults.

**Acceptance Scenarios**:

1. **Given** a form with a filled text field and a submit button, **When**
   the user activates the button, **Then** the form submits with the field's
   data.
2. **Given** a form with a button of type "button", **When** the user
   activates it, **Then** the form does not submit.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every button — all variants, tones and sizes — restyles from the
token layer alone. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; ki-button is the first component that must honor it.

**Independent Test**: render the variant × tone × size matrix under onmars,
declare the material3 theme, assert every button resolves its appearance from
theme tokens; repeat for the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** buttons take material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** buttons use the dark token values.

---

### User Story 4 - An agent picks the right button (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
chooses a variant/tone/size by meaning — "primary means the single main
action" — and produces valid usage on the first try. Malformed values do not
break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a button with unknown variant/tone/size values and
observe default rendering.

**Acceptance Scenarios**:

1. **Given** a button with an unrecognized variant value, **When** the page
   renders, **Then** the button renders as the default variant.

### Edge Cases

- Unknown `variant`, `tone` or `size` values fall back to the documented
  defaults (agent-generated markup is not trusted to be valid).
- A button with no slotted label still meets the minimum pointer-target size;
  icon-only usage is documented as when-NOT-to-use (future `ki-icon-button`).
- `xs` size (24px in onmars) sits exactly at the WCAG 2.2 minimum pointer
  target (24×24); no theme may go below it.
- Disabled state applied while the button has focus: focus moves on, no
  activation fires afterwards.
- RTL documents: `start`/`end` slots and paddings follow writing direction
  (logical properties only, Art. IV).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Button
  A button lets a person trigger an action or operate a form with full
  input-modality parity, and lets any brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Activating the button runs its action exactly once
    Given a button labeled "Save" on a page that counts activations
    When the user clicks the button
    Then the page observes exactly one activation

  # S2
  Scenario: A disabled button does not act
    Given a disabled button labeled "Save"
    When the user attempts to activate it
    Then no activation is observed

  # S11
  Scenario: Unknown appearance values fall back to defaults
    Given a button declared with an unrecognized variant value
    When the page renders
    Then the button renders with the default variant appearance

  # Family: keyboard path
  # S3
  Scenario: The keyboard reaches the button with visible focus
    Given a page whose first interactive element is a button
    When the user presses Tab
    Then the button is focused and its focus indication is visible

  # S4
  Scenario: The keyboard activates the focused button
    Given a focused button labeled "Save"
    When the user activates it from the keyboard
    Then the page observes exactly one activation

  # Family: assistive-tech outcome
  # S5
  Scenario: The button is exposed as a named button
    Given a button labeled "Save"
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Save"

  # S6
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled button labeled "Save"
    When the accessibility tree is queried
    Then the button is exposed as unavailable

  # Family: form participation
  # S7
  Scenario: A submit button submits its form with the form data
    Given a form holding a named text field with a value and a submit button
    When the user activates the button
    Then the form submits carrying the field's name and value

  # S8
  Scenario: A button of type button never submits its form
    Given a form containing a button of type "button"
    When the user activates the button
    Then the form does not submit

  # S12
  Scenario: A reset button restores the form's defaults
    Given a form whose text field has been edited away from its default
    When the user activates a button of type "reset"
    Then the field returns to its default value

  # Family: theming
  # S9
  Scenario: A second theme restyles the button through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the button's appearance resolves from material3 token values

  # S10
  Scenario: The button honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the button's appearance resolves from the dark token values

  # S13
  Scenario: Button content follows the document's writing direction
    Given a right-to-left document with icons in the start and end slots
    When the page renders
    Then the start content leads and the end content trails the label
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S11 | |
| Keyboard path | S3, S4 | |
| Assistive-tech outcome | S5, S6 | |
| Form participation | S7, S8, S12 | |
| Theming | S9, S10, S13 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The button MUST expose a `variant` attribute with exactly five
  semantic emphasis levels — `primary`, `secondary`, `tertiary`,
  `quaternary`, `ghost` — defaulting to `secondary`. Levels describe action
  hierarchy, never appearance.
- **FR-002**: The button MUST expose a `tone` attribute with values
  `neutral` (default), `success`, `danger`, orthogonal to `variant`.
- **FR-003**: The button MUST expose a `size` attribute with values `xs`,
  `sm`, `md` (default), `lg`, `xl`.
- **FR-004**: Activation MUST behave with native-button parity: pointer
  click, Enter and Space each produce exactly one activation; activation is
  observable to the page as a standard click.
- **FR-005**: A disabled button MUST NOT activate, MUST NOT be reachable in
  the tab order, and MUST expose its unavailable state to assistive
  technology.
- **FR-006**: The button MUST participate in native forms (form-associated):
  a `type` attribute accepts `submit` (default, native parity), `reset` and
  `button`; submit buttons contribute their `name`/`value` to the submitted
  data; reset buttons restore field defaults; `button` type never submits.
- **FR-007**: Content MUST compose through slots: default slot for the
  label, `start` and `end` slots for icons or media. The accessible name
  derives from the slotted label content.
- **FR-008**: Every visual property (color, radius, spacing, typography,
  elevation, state styling) MUST resolve from `--ki-button-*` component
  tokens layered over the semantic token layer; zero hardcoded visual
  values. Shape/radius is a token, never an attribute.
- **FR-009**: Interaction states (hover, focus-visible, active, disabled)
  MUST be styled exclusively through tokens and CSS states; states are never
  attributes/props.
- **FR-010**: Unrecognized `variant`, `tone`, `size` or `type` values MUST
  fall back to their documented defaults without breaking rendering.
- **FR-011**: Focus MUST be clearly visible in every theme; the pointer
  target MUST be at least 24×24 px in every size and theme.
- **FR-012**: The component MUST expose `button` and `label` parts for the
  customization ladder (tokens first, then parts, then slots).
- **FR-013**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (icon-only usage is documented as
  when-NOT-to-use, pointing to the future icon-button component).
- **FR-014**: The factory smoke component (`ki-hello`) MUST be removed in
  this feature, as scheduled by the roadmap ("deleted when the first real
  component lands").

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-button` (attributes:
  `variant`, `tone`, `size`, `type`, `name`, `value`, `disabled`; slots:
  default, `start`, `end`; parts: `button`, `label`; component tokens:
  `--ki-button-*`). Removes the pre-release smoke element `ki-hello`
  (pre-1.0, no deprecation cycle required). Catalog and llms.txt regenerate
  with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): APG button pattern; first interaction pattern
  in the repo → manual APG walkthrough documented in the PR. axe zero
  violations across variant × tone × size × state.
- **Tokens** (Art. VI): introduces the component token layer
  (`--ki-button-*`, including `border-width` and the focus ring) resolving
  from the semantic layer; both shipped themes (onmars, material3) must
  resolve the full matrix. DECLARED SEMANTIC-LAYER DELTAS (implementation
  finding: WCAG 1.4.3 arithmetic over the built CSS, enforced by the
  extended contrast gate that now sweeps every interactive button cell in
  all four theme × scheme contexts): (a) `surface/text.{success,danger}-high-em`
  darken 600→700 in onmars light; (b) onmars dark keeps white on-colors and
  raises the high-em fills to steps that carry white (brand.500,
  success/danger.700), with hover at brand.600 / success.800 / danger.800;
  (c) new semantic tokens `text.primary-on-danger` and
  `surface.{primary,success,danger}-high-em-hover` in both schemes;
  (d) material3 dark gains the success container ramp and dark on-colors
  (`primary-on-danger` #601410, `primary-on-success` success.950) mirroring
  its existing danger pattern. These change 001-shipped visual values and
  require explicit founder sign-off at the merge gate.
- **Catalog/agent legibility** (Art. I): when-to-use — the single or
  supporting action a person triggers in a view, hierarchy expressed by
  `variant`, destructive/confirming intent by `tone`. When NOT to use —
  navigation (use a link), icon-only actions (future icon-button), toggling
  state (future toggle component).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can trigger the button's action via pointer, Enter
  and Space, each attempt producing exactly one activation, in 100% of
  variants, tones and sizes.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every button in the variant × tone × size matrix with zero markup or
  component changes — only the theme declaration differs.
- **SC-003**: zero accessibility violations across the full matrix and all
  interaction states in automated auditing, and a documented manual
  walkthrough of the button pattern.
- **SC-004**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-005**: keyboard-only operation covers 100% of the behavior available
  to pointer users.

## Assumptions

- Default `variant` is `secondary`: a bare `<ki-button>` must not claim
  primary emphasis; agents state the main action explicitly.
- Default `type` is `submit` for native-button parity (Art. IV, least
  surprise); catalog guidance tells agents to set `type="button"` for
  non-submit actions.
- Disabled follows native semantics (not focusable). The
  focusable-when-disabled pattern is a possible future enhancement and out
  of scope here.
- MarsUI's secondary label and avatar/media compose inside the existing
  slots (styled span in the default slot; media in `start`); dedicated slots
  would be additive MINOR changes later.
- Shape (M3 Round/Square) is expressed by radius tokens per size in the
  theme layer; no shape attribute exists.
- Toggle/selected behavior (M3) and icon-only buttons (both kits) are
  separate future features; excluding them here is a scope decision, not an
  omission.
- A loading state appears in neither reference design and is excluded
  (Art. VII — no speculative props).
- MarsUI's kit shows no pressed visual; `:active` styling still exists and
  each theme decides its visibility through tokens.
