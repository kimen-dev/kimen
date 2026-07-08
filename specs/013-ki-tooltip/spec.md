# Feature Specification: ki-tooltip

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-tooltip` (spec `013-ki-tooltip`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Supplementary-text component: a `<ki-tooltip>`
web component that wraps its trigger in the default slot and reveals brief,
text-only content (`label` attribute) on pointer hover AND keyboard focus,
hides on Escape, and is associated to the trigger via description semantics.
Batch decisions recorded in the Fase 2 API charter: the tooltip content must
be text-only, is never focusable and never carries essential information
(when-NOT-to-use); Material 3's rich tooltip (subhead + actions) exceeds the
accessible tooltip pattern and is out of scope (future `ki-popover`); the APG
tooltip pattern is new to the repo and requires the manual walkthrough flag."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The abstraction below is grounded in the Material 3 tooltip guidance plus the
onmars token vocabulary already extracted in 001 (surfaces s0–s5,
text-emphasis levels). The MarsUI file was verified page by page on
2026-07-08: it contains no tooltip component at all — the only "Tip"-named
artifact is a 320×472 documentation callout used on the file's overview
sheets, not a UI tooltip. The three decisions formerly contingent on that
verification — the no-arrow appearance (no `arrow` part), the absence of a
size axis, and the text-only `label` content model (FR-001, FR-011 and the
Art. IX API delta) — therefore stand uncontradicted:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-tooltip |
|---|---|---|---|
| Content model | No tooltip component in MarsUI (full-file sweep verified 2026-07-08); the only "Tip"-named artifact is a documentation callout, not a UI tooltip | Plain tooltip: container + single brief label text. Rich tooltip adds subhead, multi-line body and actions | `label` attribute, text-only by construction. The rich tooltip exceeds accessible tooltip semantics → future `ki-popover`, out of 013 |
| Trigger & reveal | No tooltip frame, hence no trigger/reveal behavior to read (verified 2026-07-08) | Anchors to any component; transient; shown on hover, focus and long press | Default slot wraps one trigger; shows on hover AND keyboard focus, hides on pointer leave, blur and Escape. Long press deferred (open question for gate 1) |
| Placement | No tooltip frame and no placement conventions to mirror (verified 2026-07-08) | Positioned adjacent to its anchor, repositioning to avoid screen-edge obstruction | `placement` preference: `top` (default) / `bottom` / `start` / `end`; the component repositions to stay fully visible; logical values follow writing direction |
| Appearance | No tooltip frame in MarsUI (verified 2026-07-08); the onmars token vocabulary already extracted in 001 (surfaces s0–s5, text-emphasis levels) provides the mapping ground | Inverse container with on-inverse label text, small corner radius, no caret/arrow | All appearance resolves from `--ki-tooltip-*` component tokens over the semantic layer; no arrow part in v1 |
| Size / emphasis scale | No tooltip frame, so no size or emphasis scale exists in MarsUI (verified 2026-07-08) | Single size; no emphasis or intent axis on the plain tooltip | No `size`, `variant` or `tone` attributes (Art. VII); metrics are per-theme component tokens |
| Interaction states | No tooltip frame (verified 2026-07-08); nothing in MarsUI suggests an interactive tooltip | The tooltip itself is not interactive; no hover/press states of its own | Tooltip content is never focusable and never interactive; only the trigger carries interaction states |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get a hint about a control (Priority: P1)

A person pauses the pointer over a control — or moves keyboard focus onto it —
and a short text hint appears next to it, clarifying what the control does.
Moving away, or pressing Escape, removes the hint without any side effect on
the control.

**Why this priority**: revealing supplementary text on hover and focus, and
dismissing it cleanly, is the entire reason the component exists.

**Independent Test**: wrap one button in a tooltip, hover it and focus it,
observe the text appear each time; leave, blur and press Escape, observe it
disappear each time with the trigger unaffected.

**Acceptance Scenarios**:

1. **Given** a "Send" button wrapped in a tooltip labeled "Send immediately",
   **When** the user hovers the trigger, **Then** the tooltip shows "Send
   immediately".
2. **Given** a visible tooltip on its focused trigger, **When** the user
   presses Escape, **Then** the tooltip hides and the trigger keeps focus.

---

### User Story 2 - Equal access without a pointer (Priority: P1)

A person who navigates by keyboard, or through assistive technology, gets
exactly the same hint: focusing the trigger reveals the tooltip, and the
tooltip text is read out as the trigger's description — without ever changing
the trigger's own name.

**Why this priority**: a hover-only tooltip excludes keyboard and AT users
from the information; parity is constitutional (Art. V), not optional.

**Independent Test**: reach the trigger with Tab alone and observe the
tooltip appear; query the accessibility tree and observe the trigger's name
unchanged and its description equal to the tooltip text.

**Acceptance Scenarios**:

1. **Given** the page's first interactive element is a "Send" button with a
   tooltip, **When** the user presses Tab, **Then** the trigger is focused
   and the tooltip is shown.
2. **Given** a "Send" button wrapped in a tooltip labeled "Send immediately",
   **When** the accessibility tree is queried, **Then** the button's
   accessible name is "Send" and its accessible description is "Send
   immediately".

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every tooltip restyles from the token layer alone — surface, text,
radius, spacing, elevation. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; every component must honor it.

**Independent Test**: render a tooltip under onmars, declare the material3
theme, assert the tooltip resolves its appearance from theme tokens; repeat
for the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   tooltip shows, **Then** it takes material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the tooltip
   shows, **Then** it uses the dark token values.

---

### User Story 4 - An agent uses tooltips correctly (Priority: P3)

A GenUI agent reading only the generated contract adds tooltips where they
belong — a short clarifying hint on an icon-only or ambiguous control — and
never puts essential information or interactive content inside one. Malformed
placement values do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a tooltip with an unknown placement value and
observe default rendering.

**Acceptance Scenarios**:

1. **Given** a tooltip with an unrecognized placement value, **When** the
   user hovers the trigger, **Then** the tooltip appears in the default
   position above the trigger.

### Edge Cases

- Empty or whitespace-only `label`: the tooltip never shows; the trigger
  behaves as if unwrapped (no empty bubble, no dangling description).
- Trigger near a viewport edge: the tooltip repositions to remain fully
  visible; the declared `placement` is a preference, not a promise.
- Pointer moves from the trigger onto the tooltip itself: the tooltip stays
  visible (WCAG 1.4.13 hoverable — it must not vanish while being read).
- Escape with a tooltip open inside an open dialog: the first Escape
  dismisses only the tooltip; the dialog stays open.
- Tooltip on a disabled control: disabled controls receive neither focus nor
  reliable hover, so the hint is unreachable for keyboard and AT users —
  documented as when-NOT-to-use.
- Two triggers hovered/focused in quick succession: each instance manages
  only its own trigger's hover/focus state; v1 declares no cross-instance
  coordination (Art. VII — no user story needs a global singleton), so
  tooltips on distinct triggers may briefly coexist. No information is lost
  because tooltip content is never essential; a global "only one visible"
  policy would be a post-v1 additive concern.
- Touch and other hover-less inputs: v1 defines no dedicated touch gesture;
  because tooltip content is never essential, no information is lost
  (long-press reveal is an open question for gate 1).
- Multiple elements placed in the default slot: the component targets exactly
  one trigger; additional content is not part of the contract (documented
  usage constraint).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Tooltip
  A tooltip reveals brief supplementary text about its trigger on hover or
  keyboard focus, describes the trigger to assistive technology, and lets any
  brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Hovering the trigger reveals the tooltip text
    Given a "Send" button wrapped in a tooltip labeled "Send immediately"
    When the user hovers the trigger
    Then the tooltip shows the text "Send immediately"

  # S2
  Scenario: Moving the pointer away hides the tooltip
    Given the "Send immediately" tooltip is visible on its "Send" trigger
    When the user moves the pointer away from the trigger and the tooltip
    Then the tooltip is hidden

  # S3
  Scenario: Unknown placement values fall back to the default
    Given a tooltip labeled "Send immediately" declared with an unrecognized placement value
    When the user hovers the trigger
    Then the tooltip appears in the default position above the trigger

  # S12
  Scenario: The pointer can move onto the tooltip without hiding it
    Given the "Send immediately" tooltip is visible on its hovered "Send" trigger
    When the user moves the pointer from the trigger onto the tooltip
    Then the tooltip stays visible

  # S13
  Scenario: An empty label never shows a tooltip
    Given a "Send" button wrapped in a tooltip with an empty label
    When the user hovers the trigger
    Then no tooltip is shown
    And the button exposes no accessible description

  # S14
  Scenario: The tooltip repositions to stay inside the viewport
    Given a trigger at the top edge of the viewport with a tooltip placed "top"
    When the user hovers the trigger
    Then the tooltip appears fully within the viewport, below the trigger

  # Family: keyboard path
  # S4
  Scenario: Focusing the trigger reveals the tooltip
    Given the page's first interactive element is a "Send" button with the tooltip "Send immediately"
    When the user presses Tab
    Then the trigger is focused and the tooltip shows "Send immediately"

  # S5
  Scenario: Escape dismisses the tooltip without moving focus
    Given the "Send immediately" tooltip is visible on its focused trigger
    When the user presses Escape
    Then the tooltip is hidden and the trigger keeps focus

  # S6
  Scenario: Moving focus away hides the tooltip
    Given the "Send immediately" tooltip is visible on its focused trigger
    When the user moves focus to the next interactive element
    Then the tooltip is hidden

  # S15
  Scenario: Escape dismisses a hover-shown tooltip while focus is elsewhere
    Given the "Send immediately" tooltip is visible on its hovered trigger while focus rests on another element
    When the user presses Escape
    Then the tooltip is hidden
    And focus stays on that element

  # S16
  Scenario: Escape over a tooltip inside an open dialog dismisses only the tooltip
    Given an open dialog containing a "Send" trigger with its tooltip visible
    When the user presses Escape
    Then the tooltip is hidden
    And the dialog stays open

  # Family: assistive-tech outcome
  # S7
  Scenario: The tooltip text describes the trigger to assistive technology
    Given a "Send" button wrapped in a tooltip labeled "Send immediately"
    When the accessibility tree is queried
    Then the button exposes the accessible description "Send immediately"
    And its accessible name remains "Send"

  # S8
  Scenario: The visible tooltip is exposed with the tooltip role
    Given the "Send immediately" tooltip is visible on its focused trigger
    When the accessibility tree is queried
    Then it exposes a tooltip whose content is "Send immediately"

  # Family: form participation — N/A (non-form component; justification in
  # spec.md's Scenario Family Coverage table)

  # Family: theming
  # S9
  Scenario: A second theme restyles the tooltip through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the user hovers the "Send" trigger
    Then the tooltip's appearance resolves from material3 token values

  # S10
  Scenario: The tooltip honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the user hovers the "Send" trigger
    Then the tooltip's appearance resolves from the dark token values

  # S11
  Scenario: Logical placements follow the document's writing direction
    Given a right-to-left document with a tooltip placed "start" on its trigger
    When the user hovers the trigger
    Then the tooltip appears on the right side of the trigger

  # S17
  Scenario: The tooltip honors reduced motion
    Given a page requesting reduced motion
    When the user hovers the "Send" trigger
    Then the tooltip appears without animated movement
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S12, S13, S14 | |
| Keyboard path | S4, S5, S6, S15, S16 | |
| Assistive-tech outcome | S7, S8 | |
| Form participation | — | Non-form component: a tooltip is a transient descriptive overlay; it holds no value, contributes no data to form submission and has nothing to restore on reset |
| Theming | S9, S10, S11, S17 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tooltip MUST expose a `label` attribute holding its entire
  content — text-only by construction. An empty or whitespace-only `label`
  means the tooltip never shows and exposes no description.
- **FR-002**: The default slot MUST hold the trigger (exactly one interactive
  element); the component attaches its reveal behavior and description
  semantics to that trigger without altering the trigger's own behavior.
  Annotating the slotted trigger with description-related ARIA attributes is
  part of attaching those semantics, not an alteration of behavior.
- **FR-003**: The tooltip MUST show on pointer hover of the trigger AND on
  keyboard focus of the trigger. On focus it appears without delay; a short
  hover-intent delay is permitted for the pointer path.
- **FR-004**: The tooltip MUST hide when the pointer leaves the trigger (and
  the tooltip itself), when the trigger loses focus, and when the user
  presses Escape. Escape hides it without moving focus and without
  activating the trigger.
- **FR-005**: The visible tooltip MUST satisfy the WCAG 1.4.13 trio:
  dismissible (Escape), hoverable (the pointer can move onto the tooltip
  without it hiding), persistent (it stays until hover/focus is removed or
  it is dismissed).
- **FR-006**: The `label` MUST be exposed as the trigger's accessible
  description; the trigger's accessible name never changes. While visible,
  the tooltip is exposed with the tooltip role. Tooltip content is never
  focusable and never contains interactive content.
- **FR-007**: The tooltip MUST expose a `placement` attribute with values
  `top` (default), `bottom`, `start`, `end`, expressing a preference: the
  component repositions as needed to keep the tooltip fully within the
  viewport. `start`/`end` follow the document's writing direction (logical
  positioning only, Art. IV).
- **FR-008**: Unrecognized `placement` values MUST fall back to the default
  without breaking rendering.
- **FR-009**: Every visual property (surface, text color, radius, spacing,
  typography, elevation, offset from the trigger, maximum width) MUST
  resolve from `--ki-tooltip-*` component tokens layered over the semantic
  token layer; zero hardcoded visual values; both shipped themes resolve the
  full appearance.
- **FR-010**: Any show/hide motion MUST honor `prefers-reduced-motion:
  reduce`: no animated movement; the visibility change is instant or a
  non-moving fade.
- **FR-011**: The component MUST expose a `tooltip` part for the
  customization ladder (tokens first, then parts, then slots).
- **FR-012**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance: never essential information, never
  interactive content, never on disabled controls; rich content (title,
  body, actions) points to the future popover component.
- **FR-013**: An Escape keypress that dismisses a visible tooltip MUST be
  consumed by the tooltip and not reach ancestor components: with a tooltip
  open inside an open `ki-dialog`, the first Escape hides only the tooltip
  and the dialog stays open (cross-spec precedence with 012-ki-dialog, whose
  own Escape-closes behavior applies only when no tooltip consumed the
  event).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-tooltip` (attributes:
  `label`, `placement`; slot: default (the trigger); part: `tooltip`;
  component tokens: `--ki-tooltip-*`; no events and no sub-components in
  v1). Purely additive. Catalog and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost. No new
  runtime dependency planned ("none"); if plan-time analysis shows
  viewport-aware repositioning warrants a positioning utility, that
  dependency must be justified against the budget at plan time — the default
  is in-house logic.
- **Accessibility** (Art. V): APG tooltip pattern — a NEW interaction
  pattern in the repo → manual APG walkthrough REQUIRED and documented in
  the PR. Description semantics (name never overridden), Escape dismissal,
  WCAG 1.4.13 (dismissible / hoverable / persistent), keyboard parity with
  hover. axe zero violations across placements × themes × schemes.
  Cross-spec dependency: Escape precedence with 012-ki-dialog — the tooltip
  consumes the Escape that dismisses it so an ancestor dialog stays open
  (FR-013, S16); noted for the 012 implementation.
- **Tokens** (Art. VI): new component token family `--ki-tooltip-*` —
  structure (`radius`, `padding-inline`, `padding-block`, `max-inline-size`,
  `offset`), color (`bg`, `fg`), typography (`font-size`, `font-weight`,
  `line-height`) and `shadow` — resolving from the semantic layer; both
  shipped themes (onmars, material3) get component token files. No
  semantic-layer deltas anticipated; if the inverse-surface pairing turns
  out to need a new semantic token, the delta is declared at implementation
  and requires founder sign-off (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — a brief text hint
  that clarifies a control (icon-only buttons, abbreviations, truncated
  labels); the same information must be discoverable elsewhere. When NOT to
  use — essential or unique information (put it in the layout), interactive
  or rich content (future popover), form validation messages (the field's
  own validation display), disabled controls (unreachable by keyboard/AT),
  touch-primary flows.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: every tooltip reveal available to pointer users is equally
  available through keyboard focus alone — 100% parity, no pointer-only
  path.
- **SC-002**: Escape dismisses a visible tooltip in 100% of attempts, with
  focus retained on the trigger and zero trigger activations.
- **SC-003**: with a tooltip attached, assistive technology reads the
  trigger's name unchanged and its description equal to the tooltip text in
  100% of cases; zero automated accessibility violations; a documented
  manual walkthrough of the tooltip pattern.
- **SC-004**: switching the document theme (onmars ↔ material3) restyles
  every tooltip with zero markup or component changes — only the theme
  declaration differs.
- **SC-005**: near any viewport edge, the visible tooltip remains fully
  inside the viewport in 100% of the four placements (S14 makes the
  top-edge case observable; the derived test matrix covers the remaining
  placements).
- **SC-006**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.

## Assumptions

- Tooltip content is a `label` attribute, not a dedicated slot (the batch
  charter allowed either): an attribute is text-only by construction, which
  enforces the APG constraint that tooltip content is never interactive; a
  content slot would invite rich markup that belongs to the future popover.
  The name `label` matches Material 3's "label text" vocabulary.
- A `placement` preference attribute is included even though the charter's
  scope line does not name one: collision-free positioning near viewport
  edges (FR-007, S14) needs a declared preference to deviate from, and
  logical `start`/`end` values are what make the RTL scenario (S11) and the
  unknown-value fallback (S3) observable. This is a committed decision,
  recorded here as the charter-mandated justification for the deviation —
  not an open question: S3, S11, S14, FR-007, FR-008 and SC-005 depend on
  it and are approvable as written.
- Default placement is `top` (above the trigger), matching the most common
  tooltip convention; themes cannot change placement (it is behavior, not
  appearance).
- No `size`, `variant` or `tone` axes: Material 3's plain tooltip has a
  single size and no intent axis; MarsUI verification 2026-07-08 found no
  tooltip frame, so no scale exists — adding one later would be an additive
  MINOR change.
- No show/hide events in v1 (Art. VII — no scenario needs them); adding
  `ki-show`/`ki-hide` later would be additive MINOR.
- The hover-intent show delay is implementation-defined (not a public prop
  in v1); the focus path always reveals immediately.
- v1 defines no dedicated touch gesture (Material 3 uses long press); since
  tooltip content is never essential, no information is lost. Open question
  for gate 1.
- The default slot is expected to hold exactly one focusable trigger
  element; other arrangements are outside the contract and documented as
  usage constraints, not runtime errors.
- Material 3's rich tooltip (subhead, body, actions) is a separate future
  component (popover); excluding it here is a scope decision, not an
  omission.
- No arrow/caret in v1: Material 3 plain tooltips have none, and MarsUI has
  no tooltip frame (verified 2026-07-08); adding an `arrow` part later
  would be additive MINOR.
- Description association crosses a shadow boundary: the trigger lives in
  light DOM (default slot) while the tooltip content renders inside the
  component, `aria-describedby` idrefs cannot cross shadow roots, and the
  constitution rules that Reference Target is never load-bearing (Art. IV).
  FR-002's "without altering the trigger's own behavior" therefore
  constrains behavior, not markup: annotating the slotted trigger with
  description-related ARIA attributes is within the contract. The concrete
  association technique is a plan-time decision, verified only against the
  observable accessibility-tree outcomes (S7, S8, S13).
