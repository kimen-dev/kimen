# Feature Specification: ki-switch

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-switch` (spec `008-ki-switch`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Fase 2 form-control batch: a `<ki-switch>` web
component — an on/off control whose change takes effect immediately,
form-associated through the ElementInternals pattern established by
002-ki-button. The API abstracts the common patterns of the two reference
designs — MarsUI (onmars, default theme) and the Material 3 Design Kit
(material3, reference theme) — per the Fase 2 API charter. The catalog
distinguishes it from ki-checkbox: a switch applies its effect immediately;
a checkbox records a selection for later submission."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below abstracts the patterns confirmed in the M3 inventory note for
this component, with the MarsUI column pending verification against the
frames; the abstraction is additionally validated against the onmars token
vocabulary extracted in 001, so that once the frames are read neither theme
should lack expressive power (future themes inherit the same guarantee). Per
the batch charter's honesty rule, cells not grounded in a read source — the
whole MarsUI column and two M3 cells below — carry an explicit pending mark
instead of invented content:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-switch |
|---|---|---|---|
| On/off state | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Selected / unselected: a track with a handle that travels on selection | `checked` boolean attribute; both visual states resolve from component tokens |
| Thumb icons | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Optional icons inside the handle for the on and off states | Out of v1 scope (Art. VII); a future additive surface (slots or theme tokens), never an attribute now |
| Size | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | (pending verification against the M3 kit frames — not in the per-component M3 inventory note; Figma connector unavailable 2026-07-08; to confirm at gate 1) | No `size` attribute in v1 (charter: `size` only where the design sources scale the control); all metrics are per-theme component tokens |
| Interaction states | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | enabled, hovered, focused, pressed, disabled | CSS states (hover, focus-visible, active, disabled), never props; all token-styled (002 precedent) |
| Label | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | (pending verification against the M3 kit frames — not in the per-component M3 inventory note; Figma connector unavailable 2026-07-08; to confirm at gate 1) | Default slot carries the label and is the accessible-name source (charter slot convention) |
| Switch vs checkbox semantics | — (product guidance, not a frame pattern) | Switch = immediate effect; checkbox = selection for later submission | Catalog when-to-use / when-NOT-to-use metadata (Art. I), not API surface |
| Form participation | — (behavioral, not a frame pattern) | Form-associated control | ElementInternals per the 002 pattern: `name`/`value`, reset restores defaults, disabled fieldset/form honored |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Flip a setting with immediate effect (Priority: P1)

A person using an application built with Kimen turns a setting on or off —
with a pointer, a keyboard, or assistive technology — and the change takes
effect immediately, reported to the page as it happens. A disabled switch
keeps its state and is clearly unavailable.

**Why this priority**: the immediate binary toggle is the entire reason the
component exists; every other capability layers on top of it.

**Independent Test**: render one labeled switch, toggle it through each input
modality, observe the state flip and exactly one state-change report per
toggle; disable it and observe no change.

**Acceptance Scenarios**:

1. **Given** a switch labeled "Email notifications" that is off, **When** the
   user toggles it, **Then** the switch is on and the page observes exactly
   one state-change report.
2. **Given** a disabled switch, **When** the user attempts to toggle it,
   **Then** the state does not change and focus never lands on it.

---

### User Story 2 - Participate in a form (Priority: P2)

A person filling in a form flips a switch and submits: when the switch is on,
its name and value travel with the form data; when it is off, it contributes
nothing — exactly as the native checkbox counterpart would, without the
application wiring any extra code. Reset restores the initial state, and a
disabled fieldset takes the switch out of play.

**Why this priority**: ki-switch follows the ElementInternals pattern
established by ki-button and proves it on a stateful value-carrying control.

**Independent Test**: place the switch inside a native form; submit with the
switch on and off, reset after changing it, and wrap it in a disabled
fieldset — observe the submitted data, the restored state, and the skipped
control respectively.

**Acceptance Scenarios**:

1. **Given** a form containing a switch named "newsletter" that is on,
   **When** the user submits the form, **Then** the submitted data contains
   "newsletter" with value "on".
2. **Given** the same switch off, **When** the user submits the form,
   **Then** the submitted data does not contain "newsletter".

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every switch — both states, all interaction states — restyles from
the token layer alone. No markup change, no component change. Right-to-left
documents mirror the control automatically.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; every new component must honor it.

**Independent Test**: render on and off switches under onmars, declare the
material3 theme, assert every visual property resolves from theme tokens;
repeat for the forced dark scheme and for a right-to-left document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** switches take material3 appearance with unchanged
   markup.
2. **Given** a right-to-left document, **When** the page renders, **Then**
   the label and control mirror the writing direction.

---

### User Story 4 - An agent picks the right control (Priority: P3)

A GenUI agent reading only the generated contract chooses a switch for
settings that apply immediately and a checkbox for selections submitted
later, and produces valid usage on the first try. Malformed values do not
break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above. The switch/checkbox distinction is
the classic agent confusion this catalog entry must prevent.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a switch with a malformed `checked` value and
observe well-defined rendering.

**Acceptance Scenarios**:

1. **Given** a switch declared with `checked="maybe"`, **When** the page
   renders, **Then** the switch renders on (boolean attribute presence
   semantics) and remains operable.

### Edge Cases

- Boolean attribute semantics: any `checked` attribute value — including
  nonsense written by an agent — counts as presence and renders the switch
  on; malformed markup never breaks rendering.
- A switch with no slotted label has no accessible name; the catalog
  documents the label as required content (invalid usage, flagged by audits).
- Disabled applied while the switch has focus: focus moves on, no toggle
  fires afterwards (002 pattern).
- A custom `value` attribute replaces the default submitted value "on"; an
  off switch never contributes any value, custom or not.
- RTL documents: label order and thumb travel follow the writing direction
  (logical properties only, Art. IV).
- `prefers-reduced-motion`: the thumb's travel animation is suppressed; the
  state change itself is instantaneous and unaffected.
- The pointer target meets the WCAG 2.2 minimum (24×24 px) in every theme;
  no theme may shrink the interactive area below it.
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Switch
  A switch flips a setting on or off with immediate effect, reports its state
  to forms and assistive technology, and lets any brand restyle it through
  tokens alone.

  # Family: core behavior
  # S1
  Scenario: Toggling the switch turns it on
    Given a switch labeled "Email notifications" that is off
    When the user toggles the switch
    Then the switch is on
    And the page observes exactly one input event
    And the page observes exactly one change event

  # S2
  Scenario: Toggling the switch again turns it off
    Given a switch labeled "Email notifications" that is on
    When the user toggles the switch
    Then the switch is off

  # S3
  Scenario: A disabled switch does not toggle
    Given a disabled switch labeled "Email notifications" that is off
    When the user attempts to toggle it
    Then the switch remains off
    And no state change is reported

  # S4
  Scenario: Malformed attribute values do not break the switch
    Given a switch declared with a checked attribute value of "maybe"
    When the page renders
    Then the switch renders on and remains operable

  # S17
  Scenario: Activating the slotted label toggles the switch
    Given a switch labeled "Email notifications" that is off
    When the user activates the slotted label
    Then the switch is on
    And the page observes exactly one change event

  # Family: keyboard path
  # S5
  Scenario: The keyboard reaches the switch with visible focus
    Given a page whose first interactive element is a switch
    When the user presses Tab
    Then the switch is focused and its focus indication is visible

  # S6
  Scenario: Space toggles the focused switch
    Given the focused "Email notifications" switch is off
    When the user presses Space
    Then the switch is on

  # S20
  Scenario: The keyboard skips a disabled switch
    Given a page whose first interactive element is a disabled switch followed by a button
    When the user presses Tab
    Then focus lands on the button, skipping the switch

  # Family: assistive-tech outcome
  # S7
  Scenario: The switch exposes its name, role and state
    Given a switch labeled "Email notifications" that is off
    When the accessibility tree is queried
    Then it exposes a switch named "Email notifications" in the off state

  # S8
  Scenario: Assistive technology observes the state change
    Given a switch labeled "Email notifications" that is off
    When the user toggles the switch
    Then the accessibility tree exposes the switch in the on state

  # S9
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled switch labeled "Email notifications"
    When the accessibility tree is queried
    Then the switch is exposed as unavailable

  # Family: form participation
  # S10
  Scenario: An on switch submits its value with the form
    Given a form containing a switch named "newsletter" that is on
    When the user submits the form
    Then the submitted form data contains "newsletter" with value "on"

  # S11
  Scenario: An off switch contributes nothing to the form
    Given a form containing a switch named "newsletter" that is off
    When the user submits the form
    Then the submitted form data does not contain "newsletter"

  # S12
  Scenario: Resetting the form restores the switch's initial state
    Given the "newsletter" switch was on when the form loaded and is now off
    When the user resets the form
    Then the switch is on

  # S13
  Scenario: A disabled fieldset disables the switch
    Given a switch named "newsletter" inside a disabled fieldset
    When the user attempts to toggle it
    Then the switch keeps its state

  # S18
  Scenario: A custom value replaces the default submitted value
    Given a form containing a switch named "newsletter" with value "weekly" that is on
    When the user submits the form
    Then the submitted form data contains "newsletter" with value "weekly"

  # S21
  Scenario: Resetting the form returns a user-toggled switch to off
    Given the "newsletter" switch was off when the form loaded and the user has turned it on
    When the user resets the form
    Then the switch is off

  # Family: theming
  # S14
  Scenario: A second theme restyles the switch through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the switch's appearance resolves from material3 token values

  # S15
  Scenario: The switch honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the switch's appearance resolves from the dark token values

  # S16
  Scenario: The switch follows the document's writing direction
    Given a right-to-left document with a switch labeled "Email notifications" that is on
    When the page renders
    Then the label and control mirror the writing direction
    And the on-state thumb rests at the track's inline end

  # S19
  Scenario: Reduced motion suppresses the thumb travel animation
    Given a user who prefers reduced motion and a switch that is off
    When the user toggles the switch
    Then the switch is on without a travel animation
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S17 | |
| Keyboard path | S5, S6, S20 | |
| Assistive-tech outcome | S7, S8, S9 | |
| Form participation | S10, S11, S12, S13, S18, S21 | |
| Theming | S14, S15, S16, S19 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The switch MUST expose a `checked` boolean attribute,
  reflected, defaulting to off. Attribute presence — with any value,
  including malformed ones — means on, per native boolean-attribute
  semantics; malformed markup never breaks rendering.
- **FR-002**: Toggling — pointer activation on the control or its slotted
  label, or keyboard activation — MUST flip the state immediately and
  dispatch composed `input` and `change` events, exactly one of each per
  toggle. Both are plain platform-named events carrying no `detail` payload
  (charter event pattern); observers read the new state from the element's
  own `checked` state. These events fire only on user interaction:
  programmatic changes to `checked` (property or attribute) update state
  and presentation without dispatching events (native parity). The native
  click already crosses the shadow boundary; it is never re-emitted.
- **FR-003**: The switch MUST be reachable in the tab order with visible
  focus indication in every theme, and Space MUST toggle the focused switch
  (APG switch pattern).
- **FR-004**: A disabled switch MUST NOT toggle, MUST NOT be reachable in
  the tab order, and MUST expose its unavailable state to assistive
  technology (002 disabled semantics).
- **FR-005**: The switch MUST participate in native forms (form-associated
  via ElementInternals, 002 pattern): `name` and `value` attributes; when on
  it contributes `name`/`value` (default value "on", native checkbox parity;
  a custom `value` attribute replaces the default) to the submitted data;
  when off it contributes nothing; form reset restores the reset default —
  captured once, from the presence of the `checked` attribute at the moment
  the switch is associated with the form, and never updated afterwards by
  user toggles or programmatic `checked` mutations (both reflect to the
  attribute; the default is re-captured only when the switch is associated
  with a form again); a disabled ancestor fieldset or form disables it
  (`formDisabledCallback`).
- **FR-006**: The switch MUST be exposed to assistive technology with switch
  semantics: role switch, accessible name derived from the default-slot
  label, on/off state exposed and updated on every toggle.
- **FR-007**: The label MUST compose through the default slot and be the
  accessible-name source; activating the label toggles the switch.
- **FR-008**: Every visual property (track and thumb color, metrics, radius,
  gap, focus ring, state styling) MUST resolve from `--ki-switch-*`
  component tokens layered over the semantic token layer; zero hardcoded
  visual values. Both shipped themes (onmars, material3) resolve the full
  state matrix.
- **FR-009**: Interaction states (hover, focus-visible, active, disabled)
  MUST be styled exclusively through tokens and CSS states; states are never
  attributes/props.
- **FR-010**: The component MUST expose `track`, `thumb` and `label` parts
  for the customization ladder (tokens first, then parts, then slots).
- **FR-011**: Thumb motion MUST respect `prefers-reduced-motion`: the travel
  animation is suppressed while the state change remains instantaneous.
- **FR-012**: Layout MUST use logical properties only: label order and thumb
  travel follow the document's writing direction in RTL (Art. IV).
- **FR-013**: The pointer target MUST be at least 24×24 px in every theme
  (WCAG 2.2 minimum).
- **FR-014**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance distinguishing the switch (immediate
  effect) from the checkbox (selection for later submission).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-switch` (attributes:
  `checked`, `disabled`, `name`, `value`; slot: default (label); parts:
  `track`, `thumb`, `label`; events: composed `input` and `change`;
  component tokens: `--ki-switch-*`). No sub-components. Additive MINOR.
  Catalog and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): APG switch pattern (single-key toggle over the
  002 focus/disabled machinery). Not flagged for the manual APG walkthrough
  per the batch charter (walkthroughs scoped to dialog, tooltip, tabs,
  select's listbox); axe zero violations across state × theme × scheme.
- **Tokens** (Art. VI): new component token family `--ki-switch-*` in the
  component layer, resolving from the semantic layer — structure
  (track/thumb metrics, gap, radius), color per state
  (`{checked|unchecked}` × `{rest|hover|active|disabled}` for
  track/thumb/border) and
  focus ring (`--ki-switch-focus-ring-{color|width|offset}`). Both themes
  get component token files. No semantic-layer delta anticipated; any delta
  surfaced by the contrast gate at implementation will be declared for
  explicit founder sign-off at the merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — a binary setting
  whose change takes effect immediately (enable notifications, toggle dark
  mode). When NOT to use — a selection collected for later submission (use
  ki-checkbox), mutually exclusive choices (use ki-radio-group), triggering
  an action (use ki-button).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can toggle the switch via pointer, label activation
  and Space, each attempt producing exactly one state change and one
  state-change report, in 100% of themes and schemes.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every switch state with zero markup or component changes — only the theme
  declaration differs.
- **SC-003**: zero accessibility violations across both states, all
  interaction states, both themes and both schemes in automated auditing.
- **SC-004**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-005**: keyboard-only operation covers 100% of the behavior available
  to pointer users.
- **SC-006**: form participation matches the native checkbox counterpart in
  100% of the specified cases: on submits `name`/`value`, off submits
  nothing, reset restores the initial state, a disabled fieldset excludes
  the control.

## Assumptions

- No `size` attribute in v1: neither design source is confirmed to scale
  the switch — the M3 size cell and the whole MarsUI column are pending
  frame verification — and the charter grants `size` only where the design
  sources actually scale the control, so Art. VII (no speculative props)
  excludes it. If verification finds scaled switches, `size` arrives as an
  additive MINOR.
- No `variant`/`tone` in v1: the switch has no emphasis scale and a single
  accent role in the reference design; the charter allows fewer axes than
  the 002 subset (Art. VII — no speculative props).
- No `required`/constraint validation in v1: a switch always holds a valid
  binary state and applies its effect immediately, so a required constraint
  has no meaning here; additive later only if a real scenario demands it.
- Default submitted value is "on" (native checkbox parity, Art. IV least
  surprise); a `value` attribute overrides it.
- Reset default vs. reflection: the native checkbox keeps `defaultChecked`
  in the `checked` attribute because it never reflects state back to it;
  the charter requires reflection so token-driven CSS can select the
  on/off state, so ki-switch deliberately deviates — the reset default is
  a snapshot of the `checked` attribute taken at form association,
  immutable afterwards (FR-005, S12, S21). Native-checkbox parity (US2,
  SC-006) is therefore scoped to the specified observable outcomes, not to
  `defaultChecked` attribute semantics.
- M3's optional thumb icons are out of v1 scope; if adopted later they enter
  as additive slots or theme-token glyphs, never as a breaking change.
- ki-switch exposes no enum attributes, so the mandatory unknown-value
  fallback scenario (002 S11 pattern) is adapted to boolean-attribute
  robustness (S4): any `checked` value counts as presence and rendering
  never breaks.
- The label is required content: the default slot is the accessible-name
  source and usage without it is documented as invalid in the catalog.
- MarsUI switch specifics are pending verification against the frames
  (Figma connector unavailable 2026-07-08; to confirm at gate 1); the
  onmars token vocabulary already extracted in 001 (surfaces, tone ramps,
  metrics) is sufficient to theme the abstraction above.
- Gate 1 approval of this spec endorses an abstraction grounded only in
  the per-component M3 inventory note plus the 001 token vocabulary: the
  whole MarsUI column and two M3 cells (size, labeling pattern) remain
  unverified, and the founder assumes that risk explicitly. If the frames
  later contradict a scope decision taken here, the correction arrives as
  an additive change, never a breaking one.
