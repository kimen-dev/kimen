# Feature Specification: ki-indicator

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-indicator` (spec `024-ki-indicator`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Fase N batch component: a `<ki-indicator>` web
component — a non-interactive page-position indicator ('pager dots') for
carousels, onboarding pagers, image galleries and other bounded sequences. It
renders one dot per position, highlights the current one, and restyles
entirely through the token layer, following the API charter for the batch
(precedent: 002-ki-button, 015-ki-progress). Interactive pagination — dot
navigation, keyboard paging — is explicitly out of v1 scope."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

Material 3 ships no equivalent component, so the abstraction below rests on
the MarsUI evidence plus the platform-generic pager-dots pattern; the
material3 theme expresses its own reading of that pattern purely in token
values:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-indicator |
|---|---|---|---|
| Component inventory | `Indicator` component set (node 14225:4055, Miscellaneous page): one variant axis `State` with values `active` (32×16), `active_2` (24×16) and `inactive` (8×16). The dot is the shipped unit, and the same page also ships the composed row: `Nav_indicator` (node 14195:5866, 74×16, verified 2026-07-17 via MCP metadata + screenshot) assembles one `active` dot (32×16) with three `inactive` dots (8×16) at 6 px gaps (32 + 3×8 + 3×6 = 74) | No page/carousel indicator component in the Material 3 catalog; the M3 carousel conveys position through item size and shape rather than dots. The closest historical analogue is the M2-era pager-dot convention (uniform circles, color emphasis) | `ki-indicator` is the composed row — the very shape `Nav_indicator` materializes (one current dot among evenly spaced resting dots), reinforcing the `count`/`current` API: `count` dots generated from attributes, exactly one current. The dot is internal anatomy exposed as a `dot` part, never a sub-component |
| Current-position emphasis | `active` is an elongated pill (32×16) against an 8×16 resting dot; `active_2` (24×16) differs from `active` in width and fill and carries no usage documentation in the file | n/a; conventional pager dots emphasize by color alone | the contract only requires the current dot to be visually distinct; the treatment (elongation, color or both — and the `active`/`active_2` duality) is a per-theme token decision under `--ki-indicator-dot-current-*`, never an attribute |
| Interactivity & states | Only visual states ship in the set; no hover, focus or pressed variants (verified 2026-07-17) | n/a: in the M3 carousel the items themselves are the interactive surface | non-interactive v1: no focus, no events; navigation lives in the composing carousel's own controls. Interactive pagination is a future feature |
| Height / density | A single 16px-height metric across all three variants; no size ramp | n/a | no `size` attribute; dot metrics resolve from per-theme component tokens |
| Surface | The white rounded backdrop in the set's frame is documentation framing, not component anatomy; no container surface ships with the dots | n/a | the indicator paints no surface of its own; dot colors resolve from the semantic layer through `--ki-indicator-*` tokens, and shipped theme values must satisfy non-text contrast against the theme's surfaces (FR-012) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Follow the current position in a sequence (Priority: P1)

A person viewing a carousel, onboarding flow or image gallery sees at a
glance how many positions the sequence has and which one is current: one dot
per position, exactly one highlighted. When the sequence advances — by the
carousel's own controls, autoplay or any external logic — the highlight
follows immediately. Declarations that do not add up (a current position
beyond the sequence, a non-numeric value) never break the row: they fall back
to the nearest sensible position.

**Why this priority**: conveying "where am I, out of how many" is the
indicator's entire reason to exist; every other behavior layers on top of it.

**Independent Test**: render an indicator with 5 positions and position 2
current and count the dots and the highlight; change the current position to
3 and observe the highlight move; declare current position 9 and a
non-numeric current and observe the documented fallbacks.

**Acceptance Scenarios**:

1. **Given** an indicator with 5 positions and position 2 current, **When**
   the page renders, **Then** five dots render in a single row and only the
   second presents the current appearance.
2. **Given** an indicator with 5 positions and position 2 current, **When**
   the current position changes to 3, **Then** only the third dot presents
   the current appearance.
3. **Given** an indicator with 5 positions declared with current position 9,
   **When** the page renders, **Then** only the fifth dot presents the
   current appearance.
4. **Given** an indicator with 5 positions declared with a non-numeric
   current position, **When** the page renders, **Then** only the first dot
   presents the current appearance.

---

### User Story 2 - Perceive the position through assistive technology (Priority: P2)

A person using a screen reader encounters a single, quiet graphic — "Slide
position, 2 / 5" — instead of five anonymous shapes; when the sequence
advances, the exposed text reflects the new position without the indicator
announcing anything on its own (the composing carousel owns announcements). A
keyboard user tabs straight past: the indicator adds no Tab stop and none of
its dots is focusable. A person who requests reduced motion sees the
highlight move with no transitional animation.

**Why this priority**: a row of unnamed decorative dots is an accessibility
hazard (Art. V) — either it is exposed as one meaningful labeled element or
it is worse than nothing; spurious focus stops or forced motion would make
the component actively harmful.

**Independent Test**: query the accessibility tree of a labeled indicator
and verify exactly one graphic whose name carries the label and the
position, with no roles contributed by the dots; tab through a page
containing the indicator between two buttons and count zero stops on it;
force reduced motion, change the current position and observe no transition.

**Acceptance Scenarios**:

1. **Given** an indicator labeled "Slide position" with 5 positions and
   position 2 current, **When** the accessibility tree is queried, **Then**
   it exposes one graphic named "Slide position, 2 / 5" and the individual
   dots expose no role, name or state of their own.
2. **Given** a focused button, then an indicator, then a second button,
   **When** the user presses Tab, **Then** focus lands on the second button,
   never on the indicator or its dots.
3. **Given** a user whose system requests reduced motion and an indicator
   with position 2 current, **When** the current position changes to 3,
   **Then** the third dot presents the current appearance without
   transitional motion.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every indicator restyles from the token layer alone — dot sizes
and shapes, the current-dot treatment (elongated pill in onmars, uniform
circles with color emphasis in material3), spacing and colors. No markup
change, no component change; the same holds under the forced dark scheme and
in right-to-left documents, where the dot order follows the writing
direction.

**Why this priority**: one-step re-theming is Kimen's visible
differentiator, proven in CI since 001; the indicator carries the entire
MarsUI pill-versus-dot geometry in the token layer, exactly as 002 carried
shape.

**Independent Test**: render an indicator under onmars, declare the
material3 theme, assert the appearance resolves from material3 token values;
repeat under the forced dark scheme and in a right-to-left document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the indicator takes material3 appearance with
   unchanged markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the indicator uses the dark token values.
3. **Given** a right-to-left document with position 1 current, **When** the
   page renders, **Then** the first position's dot leads the row from the
   right edge.

---

### User Story 4 - An agent composes a valid indicator (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks ki-indicator to show position within a bounded sequence, wires `count`
and `current` to the sequence it renders, and knows when NOT to reach for it
(section navigation, task completion, labeled steps, interactive
pagination). Malformed attributes — vocabulary copied from another design
system, impossible numbers — never break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render an indicator with an unrecognized variant
attribute and observe default rendering.

**Acceptance Scenarios**:

1. **Given** an indicator declared with an unrecognized variant attribute,
   **When** the page renders, **Then** the indicator renders with the
   default appearance.

### Edge Cases

- A missing, non-numeric or negative `count` renders no dots; catalog
  guidance documents it as an authoring mistake, not an error state (no
  empty-detection logic, mirroring the empty `<ki-list>` precedent).
- `count="1"` renders a single current dot — harmless; catalog guidance
  notes an indicator carries no information below two positions.
- An out-of-range `current` clamps to the sequence bounds (above `count` →
  last position; below 1 → first); a non-numeric `current` falls back to the
  first position. At no point do zero or two dots present the current
  appearance while `count` ≥ 1.
- Attribute updates re-normalize: if `count` drops from 5 to 3 while
  position 5 was current, the highlight clamps to position 3.
- Very large counts render all dots in a single row; the indicator
  introduces no wrapping, truncation or internal scrolling in v1 — sequences
  long enough to overflow are the consumer's concern (and a sign the
  pattern is wrong for the content).
- A missing `label` degrades the exposed name to the bare position text
  ("2 / 5"); catalog guidance documents the label as required authoring.
- The indicator never announces position changes on its own (no live
  region); the composing carousel owns announcements. This is deliberate:
  autoplaying carousels would otherwise produce a stream of unsolicited
  announcements.
- RTL documents: the dot order and all internal spacing follow the writing
  direction (logical properties only, Art. IV).
- Reduced motion: any theme-defined highlight transition is disabled when
  the user requests reduced motion.
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Indicator
  A page indicator tells a viewer which position of a bounded sequence is
  current — one dot per position, exactly one highlighted — without ever
  taking focus or input, and restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The indicator renders one dot per position with the current one highlighted
    Given an indicator labeled "Slide position" with 5 positions and position 2 current
    When the page renders
    Then five dots render in a single row and only the second presents the current appearance

  # S2
  Scenario: The highlight follows the current position as it changes
    Given an indicator labeled "Slide position" with 5 positions and position 2 current
    When the current position changes to 3
    Then only the third dot presents the current appearance
    And the exposed position text is "3 / 5"

  # S3
  Scenario: An out-of-range current position clamps to the sequence bounds
    Given an indicator labeled "Slide position" with 5 positions declared with current position 9
    When the page renders
    Then only the fifth dot presents the current appearance

  # S4
  Scenario: A malformed current position falls back to the first position
    Given an indicator labeled "Slide position" with 5 positions declared with a non-numeric current position
    When the page renders
    Then only the first dot presents the current appearance

  # S5
  Scenario: Unknown attribute values fall back to the default appearance
    Given an indicator declared with an unrecognized variant attribute copied from another design system
    When the page renders
    Then the indicator renders with the default appearance

  # S6
  Scenario: Reduced motion moves the highlight without animation
    Given a user whose system requests reduced motion
    And an indicator labeled "Slide position" with 5 positions and position 2 current
    When the current position changes to 3
    Then the third dot presents the current appearance without transitional motion

  # Family: keyboard path
  # S7
  Scenario: The indicator never takes keyboard focus
    Given a focused button, then an indicator labeled "Slide position", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the indicator or its dots

  # Family: assistive-tech outcome
  # S8
  Scenario: The indicator exposes its name and position to assistive technology
    Given an indicator labeled "Slide position" with 5 positions and position 2 current
    When the accessibility tree is queried
    Then it exposes one graphic named "Slide position, 2 / 5"
    And the individual dots expose no role, name or state of their own

  # Family: form participation — N/A for ki-indicator: a non-interactive
  # position display is not a form control, holds no value and contributes
  # no entry to submitted form data (justified in spec.md's Scenario Family
  # Coverage table).

  # Family: theming
  # S9
  Scenario: A second theme restyles the indicator through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the dots' size, shape, spacing and colors resolve from material3 token values

  # S10
  Scenario: The indicator honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the indicator's appearance resolves from the dark token values

  # S11
  Scenario: The dot order follows the document's writing direction
    Given a right-to-left document with an indicator labeled "Slide position" with 5 positions and position 1 current
    When the page renders
    Then the first position's dot leads the row from the right edge
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6 | |
| Keyboard path | S7 | |
| Assistive-tech outcome | S8 | |
| Form participation | | N/A — ki-indicator is a non-interactive position display: it is not a form control, holds no value and contributes no entry to submitted form data (charter-listed valid N/A). Position changes are driven by the composing carousel or pager, which owns any form semantics. |
| Theming | S9, S10, S11 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `ki-indicator` MUST be a non-interactive leaf element that
  renders one dot per declared position as a single row in position order.
  It is never focusable, never appears in the tab order, and has no events,
  slots, methods or sub-components in v1.
- **FR-002**: The `count` attribute (non-negative integer) MUST determine
  the number of dots. A missing, non-numeric or negative `count` renders
  zero dots — documented as an authoring mistake, never an error state or a
  rendering failure.
- **FR-003**: The `current` attribute (1-based position) MUST mark exactly
  one dot as current whenever `count` ≥ 1. Values above `count` clamp to
  `count`; values below 1 and non-numeric values fall back to 1. The
  exactly-one-current invariant holds for every attribute combination.
- **FR-004**: Attribute updates MUST re-render in place: when `count` or
  `current` changes, the highlight and the exposed accessible text follow
  immediately, re-applying the FR-002/FR-003 normalization (e.g. a `count`
  drop re-clamps the current position).
- **FR-005**: The indicator MUST be exposed to assistive technology as a
  single non-interactive graphic whose accessible name combines the `label`
  attribute with a wordless numeric position — "<label>, <current> / <count>"
  (bare "<current> / <count>" when `label` is absent). The default position
  text carries no human-language words (Art. IV, coherent with 022 FR-004
  and 025 FR-004): the "/" separator is punctuation, not language — the
  simplest neutral mechanism (Art. VII), declared here as a gate-1 decision
  for founder review; a consumer-overridable, localizable position-text
  format would land as additive MINOR. The individual dots are
  presentational and expose no role, name or state. The expected mechanism
  is the structural `img` role on the host (host `role` attribute or
  `ElementInternals.role`) with a computed accessible name — a graphics
  role, not an APG interactive widget pattern, so it does not conflict with
  "no ARIA is better than wrong ARIA" (Art. V).
- **FR-006**: The indicator MUST NOT announce position changes on its own
  (no live region in v1); the composing carousel or pager owns
  announcements. Catalog guidance documents this division of labor.
- **FR-007**: Every visual property (dot inline/block size, radius, colors
  for resting and current dots, gap, transition duration) MUST resolve from
  `--ki-indicator-*` component tokens layered over the semantic token
  layer; zero hardcoded visual values. The current-dot treatment
  (elongation, color or both) is a per-theme token decision, never an
  attribute (002 Round/Square precedent, charter rule on pure-appearance
  axes).
- **FR-008**: Any motion in the highlight transfer MUST be theme-token-
  driven CSS and MUST be disabled when the user requests reduced motion
  (Art. V); the component itself requires no motion to be functional.
- **FR-009**: Unrecognized attributes or attribute values MUST NOT break
  rendering; the indicator renders with the default appearance
  (agent-generated markup is not trusted to be valid).
- **FR-010**: All internal layout and spacing MUST use logical properties so
  the dot order follows the document's writing direction in RTL (Art. IV).
- **FR-011**: The component MUST expose parts for the customization ladder
  (tokens first, then parts): `indicator` on the row container, `dot` on
  every dot, and the current dot additionally exposes `dot-current`.
- **FR-012**: Shipped theme values MUST satisfy the non-text contrast
  requirement (3:1) both between the current and resting dot appearances
  and between the dots and the theme surfaces they are documented for
  (Art. V; enforced by the contrast gate).
- **FR-013**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (never for section navigation — use
  ki-tabs; never for task completion — use ki-progress; never for labeled
  steps — a stepper is a separate roadmap item; never as interactive
  pagination — future feature).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): one new element `ki-indicator`
  (attributes: `count`, `current`, `label`; events: none; slots: none;
  methods: none; parts: `indicator`, `dot`, `dot-current`; component
  tokens: `--ki-indicator-*`). Additive MINOR; catalog and llms.txt
  regenerate with the new entry.
- **Bundle budget** (Art. IV): output-only leaf component with no text
  content, no interaction logic and at most one CSS transition — expected
  marginal cost in the low single-digit KB gzipped, well inside the budget
  gate; no new runtime dependency ("none").
- **Accessibility** (Art. V): no APG widget pattern applies — pager dots
  have no APG pattern and ki-indicator is deliberately non-interactive, so
  no manual APG walkthrough is required. The obligations are: a single
  labeled graphic (structural `img` role per FR-005) whose name tracks the
  position, presentational dots, zero tab stops, no self-announcements
  (FR-006), reduced motion honored (FR-008), non-text contrast per FR-012.
  axe zero violations across counts × themes × schemes × directions.
- **Tokens** (Art. VI): new component token family `--ki-indicator-*` —
  layout (`--ki-indicator-gap`), resting dot
  (`--ki-indicator-dot-{inline-size|block-size|radius|color}`), current dot
  (`--ki-indicator-dot-current-{inline-size|color|radius}`) and motion
  (`--ki-indicator-motion-duration`) — resolving from the semantic layer.
  No variant, tone, size or state axes: the indicator is static and
  non-interactive. Both shipped themes (onmars, material3) get component
  token files; the MarsUI pill-versus-dot geometry and the material3
  uniform-circle reading live entirely in those theme values. No
  semantic-layer deltas expected.
- **Catalog/agent legibility** (Art. I): when-to-use — showing the current
  position within a bounded, sequential set of peer views (carousel slides,
  onboarding steps without labels, gallery pages) whose navigation lives
  elsewhere. When NOT to use — section navigation (ki-tabs), task
  completion or loading (ki-progress), labeled step flows (stepper, a
  separate roadmap item), interactive pagination (future feature), or
  conveying quantity without a current position.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: for every `count` from 0 to 10 and every `current` value —
  including out-of-range and non-numeric declarations — the rendered dot
  count equals the normalized `count` and at most one dot presents the
  current appearance (exactly one when `count` ≥ 1), with zero rendering
  failures.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every indicator — dot geometry, current-dot treatment, spacing, colors —
  with zero markup or component changes; only the theme declaration
  differs. The same holds for the forced dark scheme.
- **SC-003**: zero accessibility violations in automated auditing across
  counts, themes, schemes and directions; the exposed accessible name
  matches "<label>, <current> / <count>" for 100% of state combinations;
  zero interactive roles and zero tab stops contributed.
- **SC-004**: with reduced motion requested, position changes complete with
  zero transitional animation (computed transition and animation durations
  of the affected parts are 0).
- **SC-005**: the marginal cost of ki-indicator stays in low single-digit
  KB (gzipped) and within the declared budget gate.

## Assumptions

- MarsUI verification 2026-07-17 (MCP metadata + screenshot of component
  set `Indicator`, node 14225:4055, Miscellaneous page): one variant axis
  `State` = {`active` 32×16, `active_2` 24×16, `inactive` 8×16}; the set's
  shipped unit is the single dot, and the sibling `Nav_indicator` symbol on
  the same page (node 14195:5866, 74×16: one `active` plus three `inactive`
  dots at 6 px gaps) ships the composed row, reinforcing the
  `count`/`current` row API; no hover/focus/pressed variants; the white
  rounded backdrop in the frame is documentation framing, not component
  anatomy.
- `active_2` is an undocumented third value differing from `active` in
  width and fill. It is interpreted as theme-level appearance (a candidate
  alternative emphasis or transitional frame), NOT a behavioral contract
  state. If the founder confirms a genuine third state (e.g. an
  adjacent-position treatment à la shrinking dots), it lands as additive
  MINOR through this spec.
- Material 3 ships no page/carousel indicator component (the M3 carousel
  conveys position through item size and shape); the material3 theme styles
  ki-indicator per the M2-era pager-dot convention (uniform circles, color
  emphasis) as a theme-value decision, not a contract term.
- Non-interactive v1 is a charter scope decision: dot navigation
  (click-to-jump) and keyboard paging are future features that would
  re-enter as an interactive pagination pattern with its own APG analysis;
  until then the catalog documents them as when-NOT-to-use.
- `current` is 1-based to match the exposed position text ("2 / 5") and
  human/agent language; `count`/`current` naming mirrors the position
  vocabulary rather than array-index vocabulary.
- The exposed position text is wordless — "<current> / <count>", a
  punctuation separator with no connector word — so the component ships no
  hardcoded human language (Art. IV, coherent with 022 FR-004 and 025
  FR-004). Chosen as the simplest neutral mechanism (Art. VII) and declared
  as a gate-1 decision for founder review; a consumer-overridable,
  localizable position-text format would land as additive MINOR.
- No live region in v1 (FR-006): the composing carousel owns announcements;
  an autoplaying carousel driving a live indicator would otherwise spam
  screen-reader users.
- `count="0"` (or invalid) rendering nothing and a missing `label` are
  treated as authoring mistakes in catalog guidance, not error states to
  handle.
- The indicator is a leaf that generates its dots from attributes rather
  than composing children (contrast: ki-list): the MarsUI set ships only
  the dot unit, both anatomy and count are fully determined by two
  integers, and a child-based API would only add invalid-markup surface for
  agents (Art. VII — simplest design that satisfies the scenarios).
