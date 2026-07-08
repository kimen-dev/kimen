# Feature Specification: ki-progress

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-progress` (spec `015-ki-progress`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Progress indicator component `<ki-progress>`: a
non-interactive, output-only indicator that shows how far a task has advanced
(determinate, via `value`/`max`) or that work of unknown duration is ongoing
(`indeterminate`), rendered linear or circular through a single `shape`
attribute — one Kimen component where Material 3 ships two, with M3's newer
loading-indicator use covered by the indeterminate mode (Art. VII, no
speculative component). Accessible name required via `label`; indeterminate
motion respects `prefers-reduced-motion`. Styled by tokens alone so onmars
(default theme) and material3 (reference theme) — and any future theme — map
through the token layer without touching the component."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

Material 3 splits this concern into two components — a linear progress
indicator and a circular progress indicator, each offering determinate and
indeterminate modes — plus a newer loading-indicator artifact for expressive
unknown-duration waiting. Kimen abstracts all of that into one `ki-progress`:
`shape` selects linear or circular, `indeterminate` selects the mode, and the
loading-indicator use is the indeterminate mode (Art. VII — the simplest
design that satisfies the scenarios, no speculative extra component). The
MarsUI progress frame has not yet been read; its column is grounded only in
what the 001 token extraction and the 002 button analysis established:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-progress |
|---|---|---|---|
| Component split / modes | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Two separate components — linear and circular progress indicators — each with determinate and indeterminate modes; a newer loading-indicator artifact covers expressive waiting | One element: `shape: linear \| circular` plus an `indeterminate` boolean; the M3 loading-indicator use maps to the indeterminate mode (Art. VII, no extra component) |
| Anatomy | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | An active indicator advancing over a track | `track` and `indicator` parts; every metric and color resolves from `--ki-progress-*` component tokens |
| Semantic intent | Token layer ships full tone ramps including info and warning (001 extraction); progress-frame tone usage pending verification (see above) | Single accent color role; no intent axis on the indicator | No `tone` in v1 — progress is not in the charter's feedback-component list and neither source shows intent-colored progress; colors are token-resolved and a future tone axis would be additive MINOR |
| Size | Metric scale xs–xl exists in the onmars token vocabulary (001); progress-specific size steps pending verification (see above) | No size scale in the inventory notes; metrics fixed per component | No `size` attribute in v1 (charter: size only where the sources scale the control); track thickness and ring diameter are per-theme component tokens |
| Interactivity | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Non-interactive output; no pointer or keyboard behavior | Non-interactive: never focusable, no events, output-only status |
| Motion | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Indeterminate modes animate continuously | Indeterminate animation is token-scheduled and respects `prefers-reduced-motion` (Art. V): no continuous motion when reduced motion is requested; the stilled presentation is a theme decision |

**Gate-1 basis note (single-source risk)**: the MarsUI progress frames remain
unread (Figma connector unavailable 2026-07-08), so every API-shaping decision
above rests on the Material 3 inventory notes plus the 001 token vocabulary
alone — including for the default theme's own design source. Founder approval
at gate 1 is therefore explicitly conditional: sign-off records acceptance of
that single-source basis for the v1 decisions (single component, no `size`,
no `tone`, token-only metrics). If the MarsUI frames, once read, contradict
any of them — a size scale, tone usage, different thickness or diameter
semantics — the spec is revised and re-approved before implementation;
"additive MINOR later" is not invoked to paper over wrongly chosen v1
defaults.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Follow a task to completion (Priority: P1)

A person who starts an upload, an installation or a multi-step process
watches the indicator fill in proportion to the work completed — as a bar in
page flows, as a ring in compact placements — and can estimate the remainder
at a glance. Malformed or out-of-range values never produce a broken or
misleading indicator.

**Why this priority**: reflecting a task's completed fraction is the entire
reason the component exists; every other property (indeterminate mode,
theming, exposure) qualifies this one.

**Independent Test**: render determinate progress at several value/max pairs
in both shapes and verify the filled fraction equals value ÷ max; declare
out-of-range values and verify they clamp to the bounds.

**Acceptance Scenarios**:

1. **Given** a linear progress with value 40 of max 100, **When** the page
   renders, **Then** the indicator fills 40% of the track.
2. **Given** a progress declared with value 250 of max 100, **When** the page
   renders, **Then** the indicator renders completely full.
3. **Given** a linear progress with value 40 of max 100, **When** the task
   advances the value to 80, **Then** the indicator fills 80% of the track
   and the exposed current value is 80 of 100.

---

### User Story 2 - Wait through an unknown duration (Priority: P2)

A person waiting on work whose length cannot be measured — connecting,
searching, loading messages — sees continuous activity that promises "the
system is working" without pretending to know a fraction. A person whose
system requests reduced motion receives the same promise without continuous
animation.

**Why this priority**: unknown-duration waiting is the second half of the
charter scope (and covers M3's loading-indicator use); its motion is the
component's only animation, so the reduced-motion obligation (Art. V) lives
here.

**Independent Test**: render an indeterminate progress and observe activity
with no completed fraction; enable the reduced-motion preference and observe
the indication presents without continuous motion.

**Acceptance Scenarios**:

1. **Given** an indeterminate progress labeled "Loading messages", **When**
   the page renders, **Then** the indicator shows continuous activity without
   a completed fraction.
2. **Given** a system requesting reduced motion and an indeterminate
   progress, **When** the page renders, **Then** the activity indication
   presents without continuous motion.

---

### User Story 3 - Perceive progress through assistive technology (Priority: P2)

A screen-reader user reads what is progressing ("Uploading report.pdf") and
how far it has advanced (40 of 100); when the duration is unknown, no
fabricated value is announced. A keyboard user tabs straight past the
indicator: it adds no focus stops and demands no interaction.

**Why this priority**: an output-only element that pollutes the focus order
or exposes wrong values actively harms users; correct exposure is the
component's accessibility contract (Art. V).

**Independent Test**: query the accessibility tree for role, name and value
in both modes; place the indicator between two interactive elements and tab
through, observing it is skipped.

**Acceptance Scenarios**:

1. **Given** a progress labeled "Uploading report.pdf" with value 40 of max
   100, **When** the accessibility tree is queried, **Then** it exposes a
   progressbar named "Uploading report.pdf" with value 40 of 100.
2. **Given** a progress between two buttons, **When** the user presses Tab
   from the first button, **Then** focus lands on the second button.

---

### User Story 4 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every progress indicator — both shapes, both modes — restyles from
the token layer alone. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; every component must honor it (Art. VI).

**Independent Test**: render the shape × mode matrix under onmars, declare
the material3 theme, assert every indicator resolves its appearance from
theme tokens; repeat for the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** indicators take material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** indicators use the dark token values.

---

### User Story 5 - An agent picks the right progress (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
reaches for `ki-progress` to show task advancement or unknown-duration
activity — and is steered away from misuse: static measurements, wizard-step
navigation, skeleton placeholders. Malformed values do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a progress with unknown shape and non-numeric
value/max and observe default rendering.

**Acceptance Scenarios**:

1. **Given** a progress with an unrecognized shape value, **When** the page
   renders, **Then** the progress renders with the linear shape.
2. **Given** a progress declared with a non-numeric value, **When** the page
   renders, **Then** the indicator renders empty at the default value 0.

### Edge Cases

- A `value` above `max` clamps to `max`; a negative `value` clamps to 0; a
  non-numeric `value` falls back to the default 0 (agent-generated markup is
  not trusted to be valid).
- A non-numeric, zero or negative `max` falls back to the default 100 so the
  fraction is always computable.
- `indeterminate` declared together with a `value`: indeterminate wins — no
  completed fraction is presented and no current value is exposed to
  assistive technology.
- An unrecognized `shape` value falls back to `linear` (002 S11 pattern).
- A progress without a `label` still renders, but exposes no accessible name
  and fails the accessibility audit; `label` is documented as required in the
  catalog (Art. V — the name says WHAT is progressing).
- Runtime `value` updates refresh the exposed current value, but the
  component adds no live region: announcing every tick would be noise, and
  completion feedback that must be announced belongs to ki-alert (011).
- Reduced-motion preference active while indeterminate: zero
  indefinitely-running animations are observable (FR-009's oracle); the
  theme's stilled presentation should remain visually distinguishable from a
  determinate bar — design guidance for theme authors, not a gated
  criterion.
- RTL documents: the linear fill grows from the right edge — the filled
  portion follows the writing direction (logical properties only, Art. IV).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Progress
  A progress indicator shows how far a task has advanced — or that work of
  unknown duration is ongoing — without ever taking focus or input, and
  restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The indicator fills to the task's completed fraction
    Given a linear progress labeled "Uploading report.pdf" with value 40 of max 100
    When the page renders
    Then the indicator visibly fills 40% of the track

  # S2
  Scenario: The circular shape presents the same progress as a ring
    Given a circular progress labeled "Uploading report.pdf" with value 40 of max 100
    When the page renders
    Then a ring indicator visibly covers 40% of its circumference

  # S3
  Scenario: An indeterminate progress signals activity of unknown duration
    Given an indeterminate progress labeled "Loading messages"
    When the page renders
    Then the indicator shows continuous activity without a completed fraction

  # S4
  Scenario: Out-of-range values clamp to the track's bounds
    Given a progress labeled "Uploading report.pdf" declared with value 250 of max 100
    When the page renders
    Then the indicator renders completely full

  # S5
  Scenario: Unknown appearance values fall back to defaults
    Given a progress declared with an unrecognized shape value
    When the page renders
    Then the progress renders with the linear shape

  # S6
  Scenario: Reduced motion stills the indeterminate animation
    Given a user whose system requests reduced motion
    And an indeterminate progress labeled "Loading messages"
    When the page renders
    Then the activity indication presents without continuous motion

  # S13
  Scenario: The indicator follows the task as it advances
    Given a linear progress labeled "Uploading report.pdf" with value 40 of max 100
    When the task advances the value to 80
    Then the indicator visibly fills 80% of the track
    And the exposed current value is 80 of 100

  # S14
  Scenario Outline: Malformed numbers fall back to safe defaults
    Given a progress labeled "Uploading report.pdf" declared with value <value> of max <max>
    When the page renders
    Then the indicator visibly fills <fill> of the track
    And the exposed current value is <exposed> of 100

    Examples:
      | value | max | fill | exposed |
      | -10   | 100 | 0%   | 0       |
      | abc   | 100 | 0%   | 0       |
      | 40    | 0   | 40%  | 40      |
      | 40    | -5  | 40%  | 40      |
      | 40    | abc | 40%  | 40      |

  # S15
  Scenario: Indeterminate wins over a declared value
    Given an indeterminate progress labeled "Loading messages" declared with value 40 of max 100
    When the page renders
    Then the indicator presents no completed fraction
    And no current value is exposed to assistive technology

  # Family: keyboard path
  # S7
  Scenario: The progress never takes keyboard focus
    Given a focused button, then a progress labeled "Uploading report.pdf", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the progress

  # Family: assistive-tech outcome
  # S8
  Scenario: The progress exposes its name, role and current value
    Given a progress labeled "Uploading report.pdf" with value 40 of max 100
    When the accessibility tree is queried
    Then it exposes a progressbar named "Uploading report.pdf" with value 40 of 100

  # S9
  Scenario: An indeterminate progress exposes no current value
    Given an indeterminate progress labeled "Loading messages"
    When the accessibility tree is queried
    Then it exposes a progressbar named "Loading messages" with no current value

  # Family: theming
  # S10
  Scenario: A second theme restyles the progress through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the progress's appearance resolves from material3 token values

  # S11
  Scenario: The progress honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the progress's appearance resolves from the dark token values

  # S12
  Scenario: The bar fills along the document's writing direction
    Given a right-to-left document with a linear progress at value 40 of max 100
    When the page renders
    Then the filled portion grows from the right edge of the track
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S13, S14, S15 | |
| Keyboard path | S7 | |
| Assistive-tech outcome | S8, S9 | |
| Form participation | | N/A — ki-progress is an output-only status indicator: it never carries user input, contributes no value to form data and is not form-associated (charter; Art. IV). |
| Theming | S10, S11, S12 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The progress MUST expose a numeric `value` attribute (default
  0) for the completed amount, clamped to the range 0..`max`; non-numeric
  values fall back to the default.
- **FR-002**: The progress MUST expose a numeric `max` attribute (default
  100) for the total amount; non-numeric, zero or negative values fall back
  to the default so the fraction is always computable.
- **FR-003**: The progress MUST expose an `indeterminate` boolean attribute;
  when set, no completed fraction is presented, any declared `value` is
  ignored for presentation, and no current value is exposed to assistive
  technology.
- **FR-004**: The progress MUST expose a `shape` attribute with values
  `linear` (default) and `circular`; both shapes render both modes;
  unrecognized values fall back to `linear`.
- **FR-005**: The progress MUST expose a `label` attribute that becomes its
  accessible name, stating what is progressing; the component ships no
  hardcoded strings (Art. IV) and `label` is documented as required for
  accessible usage.
- **FR-006**: The determinate indicator MUST visibly cover the fraction
  `value ÷ max` of its track (linear) or circumference (circular), updating
  when `value` changes at runtime.
- **FR-007**: The progress MUST be non-interactive: never focusable, never
  in the tab order, no pointer affordance, no events emitted.
- **FR-008**: Assistive technology MUST receive role progressbar with the
  accessible name from `label`; determinate mode exposes the current value
  and range, indeterminate mode exposes no current value. The component adds
  no live region — announcing task completion is the host application's
  concern (ki-alert).
- **FR-009**: The indeterminate animation MUST respect
  `prefers-reduced-motion`: when reduced motion is requested, zero
  indefinitely-running animations are observable in the indicator's
  animation state. Observable oracles for the scenarios: "shows continuous
  activity" (S3) means at least one running, indefinitely-iterating
  animation is observable on the indicator; "presents without continuous
  motion" (S6) means none is. Keeping the stilled indication visually
  distinguishable from a determinate indicator is design guidance for theme
  authors (see Assumptions), not a gated criterion.
- **FR-010**: Every visual property (track and indicator colors, thickness,
  diameter, radius, animation timing) MUST resolve from `--ki-progress-*`
  component tokens layered over the semantic token layer; zero hardcoded
  visual values.
- **FR-011**: Unrecognized or invalid `value`, `max` or `shape` values MUST
  fall back to their documented defaults without breaking rendering.
- **FR-012**: The indicator color MUST meet WCAG 1.4.11 non-text contrast
  (3:1) against its adjacent colors in all four theme × scheme contexts
  (onmars/material3 × light/dark).
- **FR-013**: The component MUST expose `track` and `indicator` parts for
  the customization ladder (tokens first, then parts, then slots).
- **FR-014**: Layout MUST use logical properties so the linear fill follows
  the document's writing direction in RTL documents (Art. IV).
- **FR-015**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (static measurements, wizard-step
  navigation, skeleton placeholders and sub-second operations are documented
  as when-NOT-to-use).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-progress` (attributes:
  `value`, `max`, `indeterminate`, `shape`, `label`; parts: `track`,
  `indicator`; component tokens: `--ki-progress-*`). No slots, no events, no
  methods, no sub-components. Additive MINOR; catalog and llms.txt
  regenerate with the new entry.
- **Bundle budget** (Art. IV): output-only component with one CSS animation
  and no text content — expected marginal cost in the low single-digit KB
  gzipped, well inside the budget gate; no new runtime dependency ("none").
- **Accessibility** (Art. V): role progressbar per the ARIA specification;
  no dedicated APG interaction pattern exists for a non-interactive output
  element and no new interaction pattern is introduced → no manual APG
  walkthrough required. Accessible name required via `label`; determinate
  value/range exposed, indeterminate exposes no value; zero tab stops; axe
  zero violations across shape × mode × theme × scheme; non-text contrast
  per FR-012; `prefers-reduced-motion` honored per FR-009 (the component's
  only motion is the indeterminate animation).
- **Tokens** (Art. VI): new component token family `--ki-progress-*` —
  structure per shape (`--ki-progress-linear-{thickness|radius}`,
  `--ki-progress-circular-{size|track-width}`), color per anatomy part
  (`--ki-progress-{track|indicator}-color`) and motion
  (`--ki-progress-indeterminate-duration`) — resolving from the semantic
  layer; both shipped themes (onmars, material3) get component token files
  covering the shape × mode matrix. Deviation from the button naming
  template, justified: no interaction-state segments
  (`rest|hover|active|disabled`) and no focus-ring tokens, because the
  progress is static output and never focusable; a motion token appears for
  the first time. No semantic-layer deltas expected; if the contrast gate's
  arithmetic surfaces one, it requires explicit founder sign-off at the
  merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — communicate the
  advancement of an ongoing task (upload, download, installation, multi-step
  processing) with `value`/`max` when the fraction is known, or ongoing
  activity of unknown duration with `indeterminate` (including the
  loading-indicator use); `shape` follows the layout context (linear in
  flows and lists, circular in compact or centered placements). When NOT to
  use — static measurements within a known range (disk usage, scores: a
  gauge/meter concern, not a task), step-by-step wizard navigation (a
  stepper concern), skeleton placeholders while content loads, or operations
  that finish in under about one second, where a flash of progress is noise.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: for every declared value/max pair, the rendered fill fraction
  equals value ÷ max (after documented clamping) in both shapes, in 100% of
  cases — out-of-range or malformed values never render a broken indicator.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every indicator in the shape × mode matrix with zero markup or component
  changes — only the theme declaration differs.
- **SC-003**: assistive technology receives role, name and current value for
  100% of determinate renders and no current value for 100% of indeterminate
  renders, with zero automated accessibility violations across the full
  matrix.
- **SC-004**: the component contributes zero tab stops in 100% of renders.
- **SC-005**: with the reduced-motion preference active, zero
  indefinitely-running animations are observable in the indicator's
  animation state in 100% of indeterminate renders (the deterministic
  oracle defined in FR-009).
- **SC-006**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.

## Assumptions

- `indeterminate` is an explicit boolean attribute; a bare `<ki-progress>`
  renders determinate at value 0. This diverges from the native `<progress>`
  element (where a missing value means indeterminate) in favor of agent
  legibility: an agent states unknown duration explicitly instead of
  implying it by omission. Flagged as an open question for gate 1.
- `shape` is an attribute, not a token: linear vs circular is a structural
  presentation axis the consumer chooses per layout context, not a
  pure-appearance decision a theme can make (distinct from the 002 radius
  precedent, where shape was appearance only).
- No `size` attribute in v1: the M3 inventory notes show no size scale and
  the MarsUI frame is pending verification; thickness and diameter are
  per-theme component tokens (Art. VII). A size axis would be an additive
  MINOR change if the design sources justify it.
- No `tone` attribute in v1: progress is not in the charter's
  feedback-component list and neither source shows intent-colored
  indicators; indicator color is a token-layer decision.
- `label` provides the accessible name only and is not visually rendered in
  v1; visible captions or percentage readouts compose in the host layout and
  could arrive later as additive MINOR. Flagged as an open question for
  gate 1.
- No buffer/secondary-value axis and no explicit "paused"/"error" states in
  v1 (Art. VII — no speculative props); tone or buffer axes would be
  additive MINOR changes if a design source demands them.
- No live-region semantics: role progressbar already carries the value;
  announcing every tick would be noise, and completion feedback that must be
  announced belongs to ki-alert (011) or the host application.
- The circular determinate ring starts at the top and sweeps clockwise in
  both writing directions in v1; the observable start/end order that the RTL
  scenario (S12, 002 S13 pattern) asserts applies to the linear fill.
- The reduced-motion presentation (a static segment or similar) is a
  theme/implementation choice; the contract only requires that zero
  indefinitely-running animations play (FR-009's deterministic oracle).
  Visual distinguishability from a determinate indicator is documented
  design guidance for theme authors, outside the gated Success Criteria.
- The MarsUI progress frame is unverified (Figma connector unavailable
  2026-07-08); the MarsUI column of the design-source table is grounded only
  in the 001 token extraction and the 002 button analysis. Gate-1 approval is
  explicitly conditional on that single-source basis (see the gate-1 basis
  note under the design-source table): founder sign-off records its
  acceptance, and a later contradiction from the MarsUI frames reopens the
  spec before implementation.
