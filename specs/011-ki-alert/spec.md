# Feature Specification: ki-alert

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-alert` (spec `011-ki-alert`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Persistent inline message component `<ki-alert>`
for the Kimen library: it keeps a person informed about the state of a page or
section (a failed save, a completed backup, a service notice) until the
condition is resolved or the person dismisses it. Five semantic tones
(neutral, success, danger, info, warning) resolved through tokens, an optional
heading, opt-in dismissal with an overridable dismiss label, and live-region
exposure matched to the tone's urgency. Part of the Fase 2 batch (003–016)
under the shared API charter. Material 3 has no direct alert equivalent — its
snackbar is transient and maps to the future ki-toast."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

Unlike ki-button, the two reference designs do NOT offer a 1:1 component to
abstract over: Material 3 simply has no persistent inline alert. The API below
therefore leans on the shared charter vocabulary (tones, tokens, slots) and on
what the token layer already guarantees, so both shipped themes — and future
ones — style the same contract from their own color roles:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-alert |
|---|---|---|---|
| Component existence | No dedicated alert/banner frame in MarsUI (full-file sweep verified 2026-07-08); the file's only message artifact is a transient `Toast` used in a documentation prototype, which maps to the future ki-toast, not to this persistent alert | No alert in M3: the snackbar is transient with a single action (it maps to the future ki-toast); the banner was an M2 component and did not carry into M3 | A persistent inline message; each theme styles it from its own container/on-color roles through `--ki-alert-*` tokens — no 1:1 M3 component is required, and the loose mapping is documented in the catalog's when-to-use |
| Semantic intent | Tone ramps already exist in the extracted onmars token vocabulary: success, danger, info and warning alongside neutral (001 extraction) | Error color roles plus container/on-container pairs; no per-tone message component | `tone`: five values — `neutral` (default), `success`, `danger`, `info`, `warning` — the charter's full feedback vocabulary, token-resolved |
| Content anatomy | No alert frame (verified 2026-07-08); the MarsUI `Toast` shows leading tone icon + heading + supporting text + action buttons + close — toast anatomy, recorded for the future ki-toast | Snackbar anatomy (label + optional action + optional close icon) is transient and not 1:1 | Optional `heading` attribute + default slot for the message + opt-in dismiss control |
| Dismissal | No alert frame (verified 2026-07-08); the MarsUI `Toast` auto-closes on a visible countdown and offers a close control — timer dismissal confirmed as toast behavior, not alert behavior | Snackbar dismisses on a timer or via its close affordance | Explicit user dismissal only, opt-in via `dismissible`, notified as `ki-dismiss`; no auto-timeout (that is toast behavior) |
| Surface style (filled / outlined) | onmars surfaces s0–s5 exist in the token vocabulary; there is no alert frame to pin a surface to (verified 2026-07-08) | Container vs outlined surfaces are color-role decisions | No `variant`: filled-vs-outlined is a theme decision expressed in component tokens (002 precedent), never a prop |
| Size | onmars metrics xs–xl exist as tokens; MarsUI has no alert frame, so no alert scale exists (verified 2026-07-08) | No equivalent to scale against | No `size` in v1; alert metrics are per-theme component tokens |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand a persistent status message (Priority: P1)

A person using an application built with Kimen encounters an important
condition — a failed save, a completed backup, a scheduled maintenance
notice — and the alert tells them what happened, where the work happens, with
a tone whose urgency is conveyed both visually and to assistive technology.
The message stays until the condition is resolved or the person acts on it.

**Why this priority**: communicating state is the entire reason the component
exists; a message a screen-reader user never hears, or whose severity is
invisible, fails the component's contract outright (Art. V).

**Independent Test**: render one alert per tone with a real message, observe
the message and the tone's appearance; make an alert appear dynamically and
observe that assistive technology announces it with the urgency matching its
tone, without focus moving.

**Acceptance Scenarios**:

1. **Given** an alert with tone `danger` and the message "We could not save
   your changes", **When** the page renders, **Then** the message is visible
   with the danger tone appearance.
2. **Given** a page where saving fails, **When** a danger alert appears,
   **Then** the message is announced immediately and focus stays where it was.
3. **Given** a page where the profile was saved, **When** a success alert
   appears, **Then** the message is announced without interrupting the
   current task.

---

### User Story 2 - Dismiss an acknowledged message (Priority: P2)

A person has read the message and clears it — with a pointer, a keyboard, or
assistive technology — through the alert's dismiss control. The alert
disappears and the page is notified exactly once, so the application can
react (persist the acknowledgement, free the space).

**Why this priority**: dismissal is the alert's only interactive behavior and
must land with full input-modality parity, but it layers on top of the
message being perceivable in the first place.

**Independent Test**: render a dismissible alert, dismiss it through each
input modality, observe the alert disappear and exactly one `ki-dismiss`
event per dismissal; clear the dismissed state and observe the alert return;
render a non-dismissible alert and observe no dismiss control and no tab
stop.

**Acceptance Scenarios**:

1. **Given** a dismissible alert, **When** the user activates the dismiss
   control, **Then** the alert is no longer displayed and the page observes
   exactly one `ki-dismiss` event.
2. **Given** a dismissible alert whose dismiss control is focused, **When**
   the user activates it from the keyboard, **Then** the same outcome is
   observed and focus moves to the next focusable element after the alert.
3. **Given** a non-dismissible alert before a "Save" button, **When** the
   user presses Tab, **Then** focus lands on the "Save" button.
4. **Given** a dismissed alert still on the page, **When** the application
   clears its dismissed state, **Then** the alert is displayed again.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every alert — all five tones, light and dark — restyles from the
token layer alone. No markup change, no component change, even though
Material 3 never shipped an alert of its own.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; ki-alert is the first component whose Material 3
styling has no reference component to copy, so the token contract carries the
full weight.

**Independent Test**: render the five-tone set under onmars, declare the
material3 theme, assert every alert resolves its appearance from theme
tokens; repeat for the forced dark scheme and for a right-to-left document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** alerts take material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** alerts use the dark token values.

---

### User Story 4 - An agent picks the right messaging component (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
chooses ki-alert for persistent inline messages — and NOT for transient
confirmations (future ki-toast), tiny status descriptors (ki-badge) or
blocking decisions (ki-dialog). Malformed values do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I) and the
alert/toast/badge boundary is a known confusion point, but it builds on the
human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render an alert with an unknown tone value and observe
neutral rendering.

**Acceptance Scenarios**:

1. **Given** an alert with an unrecognized tone value, **When** the page
   renders, **Then** the alert renders with the neutral tone appearance.

### Edge Cases

- Unknown `tone` values fall back to `neutral` (agent-generated markup is not
  trusted to be valid).
- An alert present at initial page load is exposed in the accessibility tree
  with its role, but platforms only guarantee a live announcement for alerts
  that appear dynamically; the catalog documents this for authors.
- Dismissal while the dismiss control has focus: focus is never stranded on
  removed or hidden content; it moves to the next focusable element after
  the alert in document order (the previous one when none follows, the
  document body as a last resort — FR-013).
- A dismissed alert stays in the document but renders nothing and is exposed
  to no one (it leaves the accessibility tree); the page re-shows it by
  clearing the reflected dismissed state, and a re-shown alert announces as
  a dynamic appearance (FR-003).
- An empty alert (no message, no heading) announces nothing — an empty live
  region must not produce phantom announcements.
- A `heading` provided as an empty string renders no heading at all.
- Long messages wrap and the alert grows vertically; no truncation or
  ellipsis by default.
- Multiple alerts on one page are independent; each announces its own
  appearance.
- RTL documents: the message leads and the dismiss control trails the writing
  direction (logical properties only, Art. IV).
- A theme that omits an alert token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).
- `prefers-reduced-motion`: v1 requires no motion of its own; any appear or
  dismiss transition a theme adds is disabled under reduced motion (FR-011).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Alert
  An alert keeps a person informed with a persistent inline message whose
  tone conveys urgency to eyes and assistive technology alike, and lets any
  brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The alert presents its message with the tone's appearance
    Given an alert with tone "danger" and the message "We could not save your changes"
    When the page renders
    Then the message is visible with the danger tone appearance

  # S2
  Scenario: An optional heading introduces the message
    Given an alert with the heading "Update available" and a message body
    When the page renders
    Then the heading "Update available" is displayed before the message
    And the heading is not exposed as a document heading

  # S3
  Scenario: Dismissing the alert removes it and notifies the page
    Given a dismissible alert with the message "Backup completed"
    When the user activates the dismiss control
    Then the alert is no longer displayed
    And the page observes exactly one ki-dismiss event

  # S4
  Scenario: A non-dismissible alert offers no dismiss control
    Given an alert that is not dismissible
    When the page renders
    Then no dismiss control is present

  # S5
  Scenario: Unknown tone values fall back to the default
    Given an alert declared with an unrecognized tone value
    When the page renders
    Then the alert renders with the neutral tone appearance

  # S19
  Scenario: Clearing the dismissed state shows the alert again
    Given a dismissed alert that remains on the page
    When the page clears the alert's dismissed state
    Then the alert is displayed again with its message

  # Family: keyboard path
  # S6
  Scenario: The keyboard reaches the dismiss control with visible focus
    Given a page whose first interactive element is a dismissible alert
    When the user presses Tab
    Then the dismiss control is focused and its focus indication is visible

  # S7
  Scenario: The keyboard dismisses the focused alert
    Given a dismissible alert whose dismiss control is focused
    When the user activates it from the keyboard
    Then the alert is no longer displayed
    And the page observes exactly one ki-dismiss event

  # S8
  Scenario: A non-dismissible alert adds no tab stop
    Given a non-dismissible alert placed before a button labeled "Save"
    When the user presses Tab
    Then focus lands on the "Save" button

  # S16
  Scenario: Keyboard dismissal hands focus to the next focusable element
    Given a dismissible alert whose dismiss control is focused, placed before a button labeled "Save"
    When the user activates the dismiss control from the keyboard
    Then focus lands on the "Save" button
    And focus is not left inside the dismissed alert

  # Family: assistive-tech outcome
  # S9
  Scenario: An urgent alert is exposed assertively without moving focus
    Given a page where saving preferences fails
    When a danger alert "We could not save your changes" appears
    Then the alert is exposed to assistive technology with alert (assertive) semantics
    And focus stays where it was

  # S10
  Scenario: A calm alert is exposed as a polite status update
    Given a page where the profile was saved
    When a success alert "Profile saved" appears
    Then the alert is exposed to assistive technology with status (polite) semantics
    And focus stays where it was

  # S17
  Scenario: A warning alert is exposed with urgent semantics
    Given a page where the session is about to expire
    When a warning alert "Your session expires in one minute" appears
    Then the alert is exposed to assistive technology with alert (assertive) semantics
    And focus stays where it was

  # S18
  Scenario Outline: Calm tones are exposed as polite status updates
    Given a page publishing a service notice
    When a <tone> alert "Maintenance starts at midnight" appears
    Then the alert is exposed to assistive technology with status (polite) semantics

    Examples:
      | tone    |
      | info    |
      | neutral |

  # S11
  Scenario: The dismiss control is exposed as a named button
    Given a dismissible alert using the default dismiss label
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Dismiss"

  # S12
  Scenario: The dismiss label is overridable for localization
    Given a dismissible alert whose dismiss label is set to "Descartar"
    When the accessibility tree is queried
    Then the dismiss control's accessible name is "Descartar"

  # Family: form participation — N/A, justified in spec.md (ki-alert is not a form control)

  # Family: theming
  # S13
  Scenario: A second theme restyles the alert through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the alert's appearance resolves from material3 token values

  # S14
  Scenario: The alert honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the alert's appearance resolves from the dark token values

  # S15
  Scenario: Alert content follows the document's writing direction
    Given a right-to-left document with a dismissible alert
    When the page renders
    Then the message leads and the dismiss control trails the writing direction
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S19 | |
| Keyboard path | S6, S7, S8, S16 | |
| Assistive-tech outcome | S9, S10, S11, S12, S17, S18 | |
| Form participation | | N/A — ki-alert is a feedback message, not a form control: it holds no user-entered value, submits nothing and is not form-associated (the charter's form-associated set for this batch is input, textarea, select, checkbox, radio-group, switch). |
| Theming | S13, S14, S15 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The alert MUST expose a `tone` attribute with exactly five
  semantic values — `neutral` (default), `success`, `danger`, `info`,
  `warning` — describing the message's intent, never its appearance. There
  is no `variant`: the alert has no emphasis scale, and filled-vs-outlined
  surface styling is a theme/token decision, never an attribute.
- **FR-002**: The message MUST compose through the default slot. An optional
  `heading` attribute renders a title for the message as emphasized text
  exposed through the `heading` part — never as a document heading element,
  because from inside its own shadow tree the component cannot know the
  correct outline level for the host page (an opt-in heading-level
  attribute is a possible future additive change). When absent or empty, no
  heading is rendered.
- **FR-003**: Dismissal MUST be opt-in via a boolean `dismissible`
  attribute. When set, the alert renders a single dismiss control;
  activating it (pointer, Enter or Space) dismisses the alert and dispatches
  exactly one `ki-dismiss` event (bubbling, composed) per dismissal.
  `ki-dismiss` carries no detail payload (`detail: null`) in v1; any future
  payload is an additive MINOR change. A dismissed alert reflects a
  `dismissed` attribute on its host, stays in the document, renders nothing
  and is exposed to no one — it leaves the accessibility tree entirely.
  Removing the `dismissed` attribute displays the alert again; a re-shown
  alert behaves as a dynamically appearing alert (FR-005). When
  `dismissible` is not set, no dismiss control exists and the alert
  contributes nothing to the tab order.
- **FR-004**: The dismiss control's accessible name MUST come from a
  `dismiss-label` attribute defaulting to the English "Dismiss"; no
  user-visible or accessible string is hardcoded (Art. IV).
- **FR-005**: Live-region exposure MUST match tone urgency: `danger` and
  `warning` alerts are exposed assertively (alert semantics, announced
  immediately); `neutral`, `success` and `info` alerts are exposed politely
  (status semantics, announced without interrupting). The live region
  scopes the heading and message only — the dismiss control (when present)
  sits outside its boundary, so the control's accessible name is never
  announced as part of the message. An appearing alert never moves focus.
- **FR-006**: The alert itself MUST NOT be focusable and MUST NOT trap
  focus; the dismiss control (when present) is its only interactive part and
  shows clearly visible focus in every theme.
- **FR-007**: Unrecognized `tone` values MUST fall back to `neutral` without
  breaking rendering.
- **FR-008**: Every visual property (color per tone, spacing, radius,
  typography, dismiss-control states) MUST resolve from `--ki-alert-*`
  component tokens layered over the semantic token layer; zero hardcoded
  visual values.
- **FR-009**: The component MUST expose `alert`, `heading`, `message` and
  `dismiss` parts for the customization ladder (tokens first, then parts,
  then slots).
- **FR-010**: Layout MUST follow the document's writing direction using
  logical properties only: the message leads and the dismiss control trails
  in both LTR and RTL (Art. IV).
- **FR-011**: v1 ships no required motion; any appear/dismiss transition a
  theme adds through tokens MUST be disabled under `prefers-reduced-motion`.
- **FR-012**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance distinguishing ki-alert from the
  future ki-toast (transient), ki-badge (tiny status descriptor) and
  ki-dialog (blocking decision).
- **FR-013**: Dismissing an alert whose dismiss control holds focus MUST NOT
  strand focus on removed or hidden content: focus moves to the next
  focusable element after the alert in document order; when none follows,
  to the previous focusable element; when the document offers neither, to
  the document body.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-alert` (attributes:
  `tone`, `heading`, `dismissible`, `dismiss-label`, plus the reflected
  dismissed-state attribute `dismissed`; slot: default; event: `ki-dismiss`
  — bubbling, composed, no detail payload (`detail: null`) in v1; parts:
  `alert`, `heading`, `message`, `dismiss`; component tokens:
  `--ki-alert-*`). No sub-components. Additive change; catalog and
  llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): APG Alert pattern (live region). The live
  region scopes the heading and message only, with the dismiss control
  outside its boundary (FR-005) — precisely the point where the APG Alert
  pattern is most commonly implemented wrong. The dismiss control reuses
  the button pattern established in 002, so no new keyboard interaction
  pattern is introduced and no full APG walkthrough is required. HOWEVER,
  live-region announcement behavior (assertive vs polite per tone,
  announce-on-appear, no focus steal) cannot be observed by automated
  audits: the Gherkin (S9, S10, S17, S18) asserts the accessibility-tree
  exposure, and a manual screen-reader verification of the actual
  announcements is documented in the PR — checking that each announcement
  contains only the heading and message, never the dismiss control's name.
  axe zero violations across tone × dismissible × theme × scheme.
- **Tokens** (Art. VI): new component token family `--ki-alert-*` in the
  component layer, both themes (onmars, material3): structural tokens
  (`--ki-alert-{padding-inline|padding-block|gap|radius|font-size|...}` plus
  heading typography), per-tone color tokens
  (`--ki-alert-{tone}-{bg|fg|border}`), dismiss-control state tokens
  (`--ki-alert-dismiss-{rest|hover|active}-fg`) and
  `--ki-alert-focus-ring-{color|width|offset}`. All resolve from the
  semantic layer — the info and warning ramps shipped in 001 are consumed by
  a component for the first time. No semantic-layer deltas are anticipated;
  if the contrast gate forces any (002 precedent), they will be declared for
  founder sign-off at the merge gate.
- **Catalog/agent legibility** (Art. I): when-to-use — a persistent inline
  message about the state of a page or section (failed save, completed
  operation the user should notice, service notice) that remains until
  resolved or dismissed; severity is expressed by `tone`. When NOT to use —
  transient action confirmations that expire on their own (future ki-toast,
  the Material 3 snackbar's territory), tiny status descriptors attached to
  another element (ki-badge), messages requiring a blocking decision
  (ki-dialog), inline field-level validation text (belongs to the form
  control).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can perceive the message and its severity in 100% of
  the tone × theme × scheme matrix (5 tones, 2 themes, light and dark), with
  zero hardcoded visual values.
- **SC-002**: a dismissible alert can be dismissed via pointer and keyboard,
  each dismissal producing exactly one `ki-dismiss` notification; keyboard-only
  operation covers 100% of the behavior available to pointer users.
- **SC-003**: dynamically appearing alerts are announced by assistive
  technology with the urgency class matching their tone in 100% of tones,
  with zero focus moves; the exposure class is asserted per tone in the
  accessibility tree, and the announcements themselves are verified by a
  documented manual screen-reader pass.
- **SC-004**: switching the document theme (onmars ↔ material3) restyles
  every alert with zero markup or component changes — only the theme
  declaration differs.
- **SC-005**: zero accessibility violations across the full matrix in
  automated auditing.
- **SC-006**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-007**: an alert with an unknown tone renders as neutral in 100% of
  cases; rendering never breaks on malformed input.

## Assumptions

- Urgency mapping (FR-005): `danger` and `warning` are assertive; `neutral`,
  `success` and `info` are polite. This is the common industry mapping, but
  whether `warning` should interrupt is a product call — flagged for the
  founder at gate 1. The mapping is encoded tone by tone in the contract
  (S9, S10, S17, S18), so the gate-1 decision lands in the Gherkin: if the
  founder flips `warning` to polite, S17 is amended before approval.
- On dismissal the component hides itself AND emits `ki-dismiss`; the event
  is not cancelable in v1. The dismissed state is reflected as a `dismissed`
  attribute (FR-003): the host stays in the document, renders nothing and
  leaves the accessibility tree; the application re-shows the alert by
  removing the attribute (or by re-inserting a fresh element), and a
  re-shown alert re-announces as a dynamic appearance. Applications that
  prefer to control removal can listen and remove the element themselves —
  flagged for the founder at gate 1 as the main API-semantics decision.
- The heading is emphasized text, not a document heading element (FR-002):
  from inside its shadow tree the component cannot know which outline level
  fits the host page, so v1 injects none. An opt-in heading-level attribute
  is a possible future additive MINOR change — flagged for the founder at
  gate 1.
- No `variant` and no `size` in v1 (charter deviation justified): neither
  source establishes an emphasis or size scale for alerts — Material 3 lacks
  the component entirely and MarsUI verification 2026-07-08 found no alert
  frame at all. Both axes would be additive MINOR changes later.
- No tone icon and no `start`/`end` slots in v1: MarsUI verification
  2026-07-08 found no alert frame; the file's transient `Toast` does show a
  leading tone icon, so if that anatomy is ever inherited by the persistent
  alert it lands as a theme token or an additive slot — per the recorded
  assumption this is additive MINOR post-v1.
- No auto-dismiss timer: time-based disappearance is toast behavior and
  explicitly out of scope (charter: M3 snackbar maps to the future
  ki-toast).
- Default `dismiss-label` is the English "Dismiss", overridable per Art. IV;
  the component never hardcodes user-facing strings.
- Alerts present at initial page load are exposed in the accessibility tree
  but not guaranteed a live announcement (platform live-region behavior);
  the catalog documents that dynamic insertion is what triggers
  announcements.
- The Material 3 theme styles ki-alert from its container/on-container color
  roles even though M3 ships no alert component; this loose mapping is a
  deliberate scope decision documented in the catalog, not an omission.
