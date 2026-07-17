# Feature Specification: ki-status

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-status` (spec `021-ki-status`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Fase N batch component: a `<ki-status>` web
component — a tiny, static, non-interactive status dot that marks the state
of a nearby item (presence on an avatar, health of a list entry, connection
state). It abstracts the MarsUI `Status` component set (Miscellaneous page:
Type=success|warning|danger|disabled × Outline=True|False, 4×4 px filled
dots), the concern that spec 010-ki-badge explicitly verified as NOT covered
by the labeled badge pill. Colored dot only — no text rendering; an optional
accessible label carries the meaning to assistive technology. Styled by
tokens alone so onmars (default theme) and material3 (reference theme) — and
any future theme — map through the token layer without touching the
component. Counters and the overlay attachment mechanism (Material 3's
navigation badge) remain a separate, future concern per the 010 record."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

MarsUI is the primary source: its `Status` set (node 10009:933,
Miscellaneous page) is exactly this component. Structure re-verified
2026-07-17 via the Figma file (8 variants: Type=success|warning|danger|disabled
× Outline=True|False, every variant a 4×4 px dot; screenshot: round filled
dots — green, amber, red, gray — the Outline row carrying a separating
ring). Fill at the 500 ramp step, the e1 + inner White/12 effect pair and
the 2 px white ring on Outline=True are recorded in the fase-2 design
extraction (2026-07-08 sweep, 002 train). Material 3 ships no standalone
status-dot component: its closest artifact is the badge in dot form
(md.comp.badge, a ~6 dp error-colored dot overlaid on navigation icons), so
the M3 mapping is PARTIAL — the dot anatomy maps, the overlay attachment and
counter do not (they stay the future nav-badge concern, per the 010 record).

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-status |
|---|---|---|---|
| Role / anatomy | Standalone `Status` component set: an unlabeled 4×4 px filled round dot, no text, no icon (re-verified 2026-07-17) | No standalone status dot; the badge's small form is a ~6 dp dot overlaid on a navigation icon, error-colored, no tone axis | ki-status is a standalone dot element with no rendered content; placement next to (or over) the item it describes is the consumer's layout concern. The M3 overlay attachment/counter is a distinct future component |
| Semantic intent | Type axis = success \| warning \| danger \| disabled — dot fill at the 500 ramp step per tone (fase-2 extraction); no info step in the frame, no neutral name (gray ships as "disabled") | Single color role (error) — no tone axis on the dot | `tone`: neutral (default), success, danger, info, warning — the full feedback vocabulary per the Fase 2 charter (010 precedent). MarsUI's "disabled" gray maps to `neutral`; info exists only in the 001 token ramps, which the vocabulary already covers |
| Ring / separation | Outline axis = True \| False as sibling variants in the same file: a 2 px white ring on True (fase-2 extraction), used to detach the dot from underlying media | The nav badge relies on its overlay position, no ring | `ring` boolean attribute (default off): both variants coexist per instance under one theme, so this is a per-usage functional axis, not a per-theme appearance decision — a recorded deviation from the 002 token-only rule. Ring width/color are `--ki-status-ring-*` tokens |
| Size | Single 4×4 px size, no size steps (re-verified 2026-07-17) | Dot form is ~6 dp | No `size` attribute: one size per theme via the `--ki-status-size` token (onmars 4 px, material3 ~6 dp); a future scale would land as additive MINOR |
| Content / label | The dot carries no text or counter (re-verified 2026-07-17) | Dot form carries no text; the large form's counter belongs to the overlay concern | No slots: the element renders nothing but the dot. An optional `label` attribute names the state for assistive technology; visible status text belongs to adjacent content or ki-badge |
| Effects / elevation | e1 elevation + inner White/12 highlight on the dot (fase-2 extraction) | None documented for the dot | Effects are per-theme token values (`--ki-status-shadow`), never structural; a theme may resolve them to none |
| Interactivity | Purely presentational — the only axes are Type and Outline, no interaction states (re-verified 2026-07-17) | Non-interactive; meaning announced through the host navigation item | Non-interactive: never focusable, no events, no pointer affordance, no live-region announcements in v1 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a state at a glance (Priority: P1)

A person scanning a contact list, a service dashboard or an avatar stack
reads each item's state from a tiny colored dot — green for online, red for
failing, gray for inactive. The dot demands nothing: no click, no focus, no
dismissal. When the dot sits over media (an avatar photo), a ring detaches
it from the pixels beneath so it stays legible.

**Why this priority**: marking a state with minimal footprint is the entire
reason the component exists; every other property qualifies this one.

**Independent Test**: render dots with each tone, verify each resolves its
tone's token values; enable the ring over an image and verify the dot stays
visually separated; verify no interaction is possible.

**Acceptance Scenarios**:

1. **Given** a status dot labeled "Online" with tone "success", **When** the
   page renders, **Then** a small filled dot with the success tone
   appearance is visible.
2. **Given** a status dot labeled "Build failing" with tone "danger",
   **When** the page renders, **Then** the dot takes the danger tone
   appearance.
3. **Given** a status dot with the ring enabled overlaid on an avatar,
   **When** the page renders, **Then** a contrasting ring separates the dot
   from the image beneath.

---

### User Story 2 - Perceive the state without seeing color (Priority: P2)

A screen-reader user hears a labeled dot as a named image ("Online",
graphic) in reading order; an unlabeled dot next to visible status text is
pure decoration and produces no announcement at all. A keyboard user tabs
straight past the dot — it adds no stop. Color is never the only carrier of
the meaning (WCAG 1.4.1): either the label names the state or adjacent text
does.

**Why this priority**: an unlabeled colored dot is invisible to
assistive technology and to color-blind users; the label/decoration contract
is what keeps the component from being an accessibility hazard (Art. V).

**Independent Test**: query the accessibility tree for a labeled dot and
verify role image + name; repeat for an unlabeled dot and verify it exposes
nothing; place a dot between two buttons and count zero extra tab stops.

**Acceptance Scenarios**:

1. **Given** a status dot labeled "Online", **When** the accessibility tree
   is queried, **Then** it exposes an image named "Online" with no
   interactive role or state.
2. **Given** a status dot with no label beside the text "Online", **When**
   the accessibility tree is queried, **Then** the dot contributes nothing.
3. **Given** a button, then a status dot, then a second button, **When** the
   user presses Tab from the first button, **Then** focus lands on the
   second button.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every status dot — size, tone colors, ring, effects — restyles
from the token layer alone. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible
differentiator, proven in CI since 001; every component must honor it
(Art. VI).

**Independent Test**: render the tone × ring matrix under onmars, declare
the material3 theme, assert every dot resolves its appearance (including the
size step, 4 px vs ~6 dp) from theme tokens; repeat for the forced dark
scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** dots take material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** dots use the dark token values.

---

### User Story 4 - An agent places the right marker (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks ki-status for a compact state marker — and is steered away from
misuse: labeled status text (ki-badge), notification counters (future nav
badge), messages that need announcement (ki-alert). Malformed tone values do
not break rendering, and the contract tells the agent that an unlabeled dot
needs adjacent text carrying the meaning.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a dot with an unknown tone value and observe the
neutral fallback.

**Acceptance Scenarios**:

1. **Given** a status dot with an unrecognized tone value, **When** the page
   renders, **Then** the dot renders with the neutral tone appearance.

### Edge Cases

- Unknown `tone` values fall back to `neutral`; unrecognized attributes are
  ignored (agent-generated markup is not trusted to be valid).
- An unlabeled dot with no adjacent status text is a WCAG 1.4.1 authoring
  mistake; the catalog documents the rule (label it or pair it with text),
  and the component neither detects nor repairs it.
- Children/slotted content are unsupported: the element renders only its
  dot; any light-DOM content is not rendered (no slots in v1).
- Runtime tone changes are NOT announced (no live region); state changes
  that must reach assistive technology are the host application's concern,
  and announced feedback belongs to ki-alert (010 precedent).
- The dot never stretches: its size is a theme token, independent of the
  host's font size or line height; consumers position it (inline, corner
  overlay on an avatar) with their own layout.
- RTL documents: a single dot has no start/end order to observe; layout
  uses logical properties (Art. IV) — no dedicated RTL scenario (010 S13
  precedent).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).
- Forced-colors / high-contrast environments may flatten the tone fill;
  meaning survives because it never lives in the color alone (label or
  adjacent text, FR-008).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Status
  A status dot marks the state of a nearby item at a glance — a tiny,
  non-interactive colored dot whose optional label carries its meaning to
  assistive technology and whose appearance any brand restyles through
  tokens alone.

  # Family: core behavior
  # S1
  Scenario Outline: The tone determines the dot's appearance
    Given a status dot labeled "<label>" with tone "<tone>"
    When the page renders
    Then a small filled dot is visible and its appearance resolves from the <tone> tone token values

    Examples:
      | label         | tone    |
      | Online        | success |
      | Build failing | danger  |

  # Retired: S2 (danger tone) was merged into the S1 outline on 2026-07-17 —
  # same rule (the tone determines the dot's appearance) over two data
  # points. The S2 ID is retired and never reused.

  # S3
  Scenario: Unknown tone values fall back to the neutral appearance
    Given a status dot declared with an unrecognized tone value
    When the page renders
    Then the dot renders with the neutral tone appearance

  # S4
  Scenario: The ring separates the dot from underlying media
    Given a status dot labeled "Online" with the ring enabled, overlaid on an avatar image
    When the page renders
    Then a contrasting ring surrounds the dot, separating it from the avatar beneath

  # Family: keyboard path
  # S5
  Scenario: The status dot never takes keyboard focus
    Given a focused button, then a status dot labeled "Online", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the dot

  # Family: assistive-tech outcome
  # S6
  Scenario: A labeled dot exposes its meaning as a named image
    Given a status dot labeled "Online" with tone "success"
    When the accessibility tree is queried
    Then it exposes an image named "Online" with no interactive role or state

  # S7
  Scenario: An unlabeled dot is decorative and exposes nothing
    Given a status dot with no label beside the text "Online"
    When the accessibility tree is queried
    Then the dot contributes nothing to the accessibility tree
    And the status meaning is carried by the adjacent text alone

  # Family: form participation — N/A for ki-status: a static, non-interactive
  # state marker is not a form control, holds no value and contributes no
  # entry to submitted form data (justified in spec.md's Scenario Family
  # Coverage table).

  # Family: theming
  # S8
  Scenario: A second theme restyles the dot through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the dot's size, colors and ring resolve from material3 token values

  # S9
  Scenario: The status dot honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the dot's appearance resolves from the dark token values
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S3, S4 | |
| Keyboard path | S5 | |
| Assistive-tech outcome | S6, S7 | |
| Form participation | | N/A — ki-status is a static, non-interactive state marker: it never carries user input, contributes no value to form data and is not form-associated (charter; Art. IV). |
| Theming | S8, S9 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dot MUST expose a `tone` attribute with exactly five
  semantic values — `neutral` (default), `success`, `danger`, `info`,
  `warning` — describing intent, never appearance; each tone resolves its
  fill from the token layer. (MarsUI re-verified 2026-07-17: the `Status`
  set's Type axis is success|warning|danger|disabled — "disabled" gray maps
  to `neutral`, and info exists only in the 001 tone ramps, which the
  five-tone charter vocabulary already covers; 010 precedent.)
- **FR-002**: The dot MUST expose a boolean `ring` attribute (default off)
  that draws a separating ring around the dot for placement over media;
  ring width and color resolve from `--ki-status-ring-*` component tokens.
  This is a per-instance functional axis, not a pure-appearance theme axis:
  MarsUI ships Outline=True and Outline=False as sibling variants under one
  theme, so the 002 "appearance axes are tokens, never props" rule does not
  apply (recorded deviation, justified in Assumptions).
- **FR-003**: The dot MUST expose an optional `label` attribute. With a
  label, assistive technology receives the dot as a named non-interactive
  image (role `img` with the label as accessible name). Without a label,
  the dot MUST be decorative: it exposes no role, name, state or text to
  assistive technology.
- **FR-004**: The dot MUST be non-interactive: never focusable, never in
  the tab order, no pointer affordance, no events emitted.
- **FR-005**: The component MUST NOT announce runtime changes (no live
  region, no role `status`): the marker is static at render time; state
  changes that must be announced are the host application's concern, and
  announced feedback belongs to ki-alert.
- **FR-006**: Every visual property (size, per-tone fill, ring width and
  color, radius, effects) MUST resolve from `--ki-status-*` component
  tokens layered over the semantic token layer; zero hardcoded visual
  values. The dot has exactly one size per theme (`--ki-status-size`, no
  `size` attribute) and its round shape is a radius token, never an
  attribute (002 shape precedent).
- **FR-007**: Unrecognized `tone` values MUST fall back to `neutral`, and
  unrecognized attributes MUST NOT break rendering.
- **FR-008**: Color MUST never be the only carrier of the meaning (WCAG
  1.4.1): the state is named by the `label` or by adjacent visible text —
  documented as an authoring rule in the catalog. Every tone's dot fill
  MUST meet WCAG 1.4.11 non-text contrast (3:1) against the theme's
  surfaces in all four theme × scheme contexts, and the ring MUST keep the
  dot distinguishable over media.
- **FR-009**: The element renders no slotted content: no slots exist in v1;
  the dot never renders text (a labeled pill is ki-badge).
- **FR-010**: The component MUST expose a `dot` part for the customization
  ladder (tokens first, then parts, then slots).
- **FR-011**: Layout MUST use logical properties (Art. IV); a single dot
  exposes no start/end order, so RTL correctness carries no dedicated
  scenario (010 precedent).
- **FR-012**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (labeled status text belongs to
  ki-badge; counters/overlay attachment to the future nav badge; announced
  messages to ki-alert; progress to ki-progress; and an unlabeled dot
  without adjacent text is documented as an authoring mistake).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-status` (attributes:
  `tone`, `ring`, `label`; events: none; slots: none; part: `dot`;
  component tokens: `--ki-status-*`). No methods, no sub-components.
  Additive MINOR; catalog and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): the smallest presentational component in the
  catalog — expected marginal cost around one KB gzipped, well inside the
  budget gate; no new runtime dependency ("none").
- **Accessibility** (Art. V): no APG pattern exists for a static state dot
  and no new interaction pattern is introduced → no manual APG walkthrough
  required. The contract is the label/decoration duality (FR-003): role
  `img` + accessible name when labeled — a graphics role carrying document
  semantics, not interactive ARIA, so "no ARIA is better than wrong ARIA"
  is not contradicted — and full transparency (nothing in the tree) when
  unlabeled. Zero tab stops (FR-004). No live region (FR-005). Contrast per
  FR-008 (WCAG 1.4.11 non-text, 3:1, the fase-2 merge-train bar). axe zero
  violations across tone × ring × label × theme × scheme. No motion, so
  `prefers-reduced-motion` is not applicable.
- **Tokens** (Art. VI): new component token family `--ki-status-*` —
  structure (`--ki-status-{size|radius|shadow}`), ring
  (`--ki-status-ring-{width|color}`) and color per tone
  (`--ki-status-{tone}-color`) — resolving from the semantic layer; both
  shipped themes (onmars, material3) get component token files covering the
  full tone matrix. Deviation from the button naming template, justified:
  no interaction-state segments (`rest|hover|active|disabled`), no focus
  ring and no typography tokens, because the dot is static, never focusable
  and renders no text. onmars values ground in the fase-2 extraction (4 px
  dot, 500-step tone fills, e1 + inner White/12 as the shadow value, 2 px
  white ring); material3 has no status-dot role, so its values map from
  the M3 tone ramps through the semantic cascade (~6 dp size per the badge
  dot), and info/warning resolve through the inherited shared ramps (001
  contract, 010 precedent) — semantic-layer deltas surfacing there require
  founder sign-off at the merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — a compact state
  marker adjacent to (or overlaid on) the item it describes: presence on an
  avatar, health in a service list, connection state in a toolbar; label it
  or pair it with visible text. When NOT to use — short labeled status text
  (ki-badge), notification counters or the overlay attachment mechanism
  (future nav badge), messages that need attention or announcement
  (ki-alert), progress or loading (ki-progress).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tone × ring combinations render a dot whose fill
  meets WCAG 1.4.11 non-text contrast (3:1) against the theme surfaces in
  all four theme × scheme contexts.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every dot — size, tone fills, ring, effects — with zero markup or
  component changes; only the theme declaration differs. The same holds for
  the forced dark scheme.
- **SC-003**: dots contribute zero tab stops; labeled dots expose exactly
  one image with the given name and no interactive role or state; unlabeled
  dots expose nothing; automated auditing reports zero violations across
  the full matrix.
- **SC-004**: the component's marginal cost stays around one KB (gzipped)
  and within the declared budget gate.
- **SC-005**: markup with unrecognized tone values renders with the neutral
  default in 100% of cases — malformed agent output never breaks a page.

## Assumptions

- ki-status is the component 010-ki-badge deferred: the 010 design analysis
  verified (2026-07-08) that the MarsUI `Status` dot set "maps to the
  M3-style dot concern, not to this pill". This spec claims the standalone
  dot only; the M3 overlay attachment and counter (the actual md.comp.badge
  use) remain a separate future nav-badge component, unchanged from the 010
  record.
- `ring` is an attribute, not a token-only treatment — a recorded deviation
  from the 002 "pure-appearance axes are theme tokens" rule, justified
  because MarsUI ships Outline=True|False as per-instance sibling variants
  under a single theme: the axis is functional (detach the dot from
  underlying media) and usage-dependent, not a brand decision. Ring width
  and color remain theme tokens.
- MarsUI's `disabled` Type maps to the `neutral` tone: the gray dot marks
  an inactive/indeterminate state, and the charter tone vocabulary
  (neutral, success, danger, info, warning) has no "disabled" intent —
  ki-status has no disabled interaction state to express (it is never
  interactive).
- `label` is an attribute, not a slot: the dot never renders text, so a
  slot would invite visible content the anatomy forbids; the label exists
  purely for the accessibility tree. Visible status text belongs to
  adjacent content or ki-badge.
- Role `img` (when labeled) over role `status`: role `status` is a live
  region and would announce runtime changes, contradicting FR-005 and the
  010 "announcements belong to ki-alert" precedent; a named graphic is the
  semantics a static marker actually has.
- Single size per theme (no `size` attribute): MarsUI ships one 4 px dot
  and M3's dot form is ~6 dp — a per-theme metric, not an API axis. If a
  design source later reveals a genuine scale it lands as additive MINOR.
- No motion: the dot is static in v1 (no pulse/blink presence animation),
  so `prefers-reduced-motion` is not applicable; a future animated variant
  would re-enter through this spec as additive MINOR with a reduced-motion
  requirement.
- With no slots and a single glyph there is no observable start/end order,
  so the 002 S13 RTL scenario pattern is not applicable; RTL correctness is
  carried by FR-011 (logical properties).
- Positioning over media (corner of an avatar) is the consumer's layout
  concern in v1: ki-status does not attach itself to a host element (that
  is the future overlay nav-badge mechanism).
