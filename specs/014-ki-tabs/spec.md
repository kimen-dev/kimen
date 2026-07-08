# Feature Specification: ki-tabs

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-tabs` (spec `014-ki-tabs`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Tabbed view switcher for Kimen: a `<ki-tabs>`
composite with `<ki-tab>` and `<ki-tab-panel>` children following the APG
Tabs pattern — automatic activation, arrow-key navigation, observable
selected state — abstracting the tab patterns of the two reference designs
(MarsUI/onmars and the Material 3 Design Kit/material3) so any theme
restyles it through tokens alone. Batch conventions per the Fase 2 API
charter; 002-ki-button is the approved precedent."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-tabs |
|---|---|---|---|
| Visual emphasis | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Two tab styles: primary tabs and secondary tabs (indicator treatment and emphasis differ) | No `variant` prop: the primary/secondary distinction is pure appearance a theme can decide, so it resolves as component tokens (002 precedent: M3 Round/Square became a radius token, not an attribute) |
| Selection semantics | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Tabs switch content views; segmented buttons make a value selection — distinct components in the kit | Catalog metadata distinguishes view switching (ki-tabs) from value selection (radio group today, a possible segmented control later) |
| Accessibility pattern | Not a Figma concern; the onmars token vocabulary carries no interaction semantics | ARIA tablist/tab/tabpanel with automatic activation | APG Tabs pattern: roving tabindex, automatic activation, arrow-key navigation. New interaction pattern in the repo → manual walkthrough flag |
| Content anatomy | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Tab item: label with optional leading icon | `ki-tab`: default slot (label, accessible-name source) + `start`/`end` slots for icons/media; panels are free content in `ki-tab-panel` |
| Interaction states | Frames pending as above; the onmars token layer already ships surfaces s0–s5 and text-emphasis levels the tab states can resolve from | enabled, hovered, focused, pressed, plus the active-tab indicator | CSS states (hover, focus-visible, active, disabled) styled through tokens, never props; selection is a managed state, reflected as `selected` for observation and token-driven styling |
| Metrics | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1); the onmars metric scale xs–xl exists in the token layer if needed | Fixed tab-bar height per style; no author-facing size scale | No `size` prop in v1 (charter: `size` only where the design sources scale the control); heights, paddings and indicator metrics are per-theme component tokens |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch between content views (Priority: P1)

A person using an application built with Kimen selects a tab — with a
pointer, a keyboard, or assistive technology — and the matching panel becomes
the one visible view; every other panel is hidden. A disabled tab is clearly
unavailable and cannot be selected.

**Why this priority**: showing exactly one of several peer views is the
entire reason the component exists; everything else layers on top of it.

**Independent Test**: render a tab group with two labeled tabs and panels,
select each tab through each input modality, observe exactly one visible
panel matching the selected tab at all times; disable a tab and observe the
selection never lands on it.

**Acceptance Scenarios**:

1. **Given** a tab group where "Email" is selected, **When** the user selects
   the "Notifications" tab, **Then** the "Notifications" panel is shown, the
   "Email" panel is hidden, and the page observes the selection change.
2. **Given** a tab group with a disabled "Billing" tab, **When** the user
   attempts to select it, **Then** the selection does not change.

---

### User Story 2 - Operate the tabs from the keyboard (Priority: P2)

A keyboard user reaches the tab list as a single tab stop, moves between
tabs with the arrow keys (selection follows focus — automatic activation),
jumps to the ends with Home/End, and leaves the tab list straight into the
visible panel with Tab.

**Why this priority**: keyboard parity is constitutional (Art. V), and
ki-tabs is the first composite in the batch built on a roving-tabindex tab
stop, setting the precedent the catalog documents.

**Independent Test**: with only a keyboard, enter the tab list, traverse all
tabs with arrows observing selection follow focus, press Home/End, press Tab
and observe focus land in the visible panel — no pointer used at any step.

**Acceptance Scenarios**:

1. **Given** the selected "Email" tab is focused, **When** the user presses
   the right arrow key, **Then** the next tab is focused, selected, and its
   panel is shown.
2. **Given** a focused tab in a group of three, **When** the user presses
   Tab, **Then** focus skips the remaining tabs and lands in the visible
   panel.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and the whole tab group — strip, tabs, indicator, panels — restyles
from the token layer alone. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; the M3 primary/secondary tab styles are the test case
that appearance axes live in tokens, not the API.

**Independent Test**: render the same tab group under onmars, declare the
material3 theme, assert every visual property resolves from theme tokens;
repeat under the forced dark scheme and in a right-to-left document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the tab group takes material3 appearance with
   unchanged markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the tab group uses the dark token values.

---

### User Story 4 - An agent composes tabs correctly (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks ki-tabs for switching peer views — not for value selection or page
navigation — and composes valid tab/panel pairs on the first try. Malformed
values do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a tab group whose declared selection matches no
tab and observe the documented fallback to the first non-disabled tab.

**Acceptance Scenarios**:

1. **Given** a tab group declared with a selection value matching no tab,
   **When** the page renders, **Then** the first non-disabled tab is
   selected and its panel is shown.

### Edge Cases

- A selection value matching no tab, matching a disabled tab, or no declared
  selection at all falls back to the first non-disabled tab (agent-generated
  markup is not trusted to be valid); programmatic value writes follow the
  same fallback rule.
- Arrow-key navigation skips disabled tabs and wraps from the last tab to
  the first (and vice versa).
- A tab group whose every tab is disabled renders with no visible panel and
  contributes no tab stop.
- A tab without a matching panel (or a panel without a matching tab) must
  not break rendering: the tab still selects, the orphan panel stays hidden.
  The visibility invariant is at most one visible panel — exactly one
  whenever the selected tab has a matching panel; when no panel is visible,
  the Tab key moves focus to the next focusable element after the tab list.
- A visible panel with no focusable content is still reachable with the Tab
  key (the panel itself receives focus, per the APG pattern).
- RTL documents: the strip order, `start`/`end` slots and arrow-key
  direction follow the writing direction (logical properties only, Art. IV).
- Indicator or panel transitions are suppressed when the user prefers
  reduced motion.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Tabs
  A tab group lets a person switch between peer content views — one visible
  at a time — with full input-modality parity, and lets any brand restyle it
  through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Selecting a tab reveals its panel
    Given a tab group with tabs "Email" and "Notifications" where "Email" is selected
    When the user selects the "Notifications" tab
    Then the "Notifications" panel is shown and the "Email" panel is hidden
    And a ki-change event reports "Notifications" as the selected tab

  # S2
  Scenario: A disabled tab cannot be selected
    Given a tab group where the "Billing" tab is disabled
    When the user attempts to select the "Billing" tab
    Then the selection does not change and the "Billing" panel stays hidden

  # S3
  Scenario: A selection value matching no tab falls back to the first non-disabled tab
    Given a tab group declared with a selected value that matches none of its tabs
    When the page renders
    Then the first non-disabled tab is selected and its panel is shown

  # S12
  Scenario: The fallback never lands on a disabled tab
    Given a tab group whose first tab "Email" is disabled and whose declared value is "Email"
    When the page renders
    Then the second tab "Notifications" is selected and its panel is shown

  # S18
  Scenario: A group whose every tab is disabled selects nothing
    Given a tab group whose every tab is disabled
    When the page renders
    Then no tab is selected and no panel is visible

  # Family: keyboard path
  # S4
  Scenario: The arrow key moves selection to the next tab
    Given a left-to-right document where the selected "Email" tab is focused and "Notifications" is the next tab
    When the user presses the right arrow key
    Then the "Notifications" tab is selected with visible focus
    And the "Notifications" panel is shown

  # S13
  Scenario: Arrow navigation wraps past a disabled tab
    Given a tab group "Email", "Notifications", "Security" where "Email" is disabled and the last tab "Security" is focused
    When the user presses the right arrow key
    Then the selection wraps past the disabled "Email" tab to the "Notifications" tab with visible focus

  # S5
  Scenario: End jumps to the last tab
    Given the selected "Email" tab is focused in a tab group ending with "Security"
    When the user presses End
    Then the "Security" tab is selected with visible focus

  # S14
  Scenario: Home jumps to the first tab
    Given the selected "Security" tab is focused in a tab group beginning with "Email"
    When the user presses Home
    Then the "Email" tab is selected with visible focus

  # S6
  Scenario: The tab key leaves the tab list into the visible panel
    Given the selected "Email" tab is focused in a tab group of three tabs
    When the user presses Tab
    Then focus skips the remaining tabs and lands in the "Email" panel

  # S15
  Scenario: A panel without focusable content receives focus itself
    Given the selected "Email" tab is focused and the "Email" panel contains no focusable content
    When the user presses Tab
    Then the "Email" panel itself receives focus

  # S16
  Scenario: Arrow keys follow a right-to-left reading direction
    Given a right-to-left document where the selected "Email" tab is focused and "Notifications" is the next tab
    When the user presses the left arrow key
    Then the "Notifications" tab is selected with visible focus

  # Family: assistive-tech outcome
  # S7
  Scenario: The tab group exposes roles, names and the selected state
    Given a tab group labeled "Settings" with tabs "Email" and "Notifications"
    When the accessibility tree is queried
    Then it exposes a tab list named "Settings" containing tabs "Email" and "Notifications"
    And the selected "Email" tab is exposed as selected

  # S8
  Scenario: The visible panel is exposed as a tab panel named after its tab
    Given a tab group where the "Email" tab is selected
    When the accessibility tree is queried
    Then the visible panel is exposed as a tab panel whose accessible name is "Email"

  # Family: form participation — N/A, justified in spec.md (tabs switch views,
  # they never contribute form data; not in the charter's form-associated list)

  # Family: theming
  # S9
  Scenario: A second theme restyles the tabs through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the tab group's appearance resolves from material3 token values

  # S10
  Scenario: The tabs honor a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the tab group's appearance resolves from the dark token values

  # S11
  Scenario: Tab order follows the document's writing direction
    Given a right-to-left document with tabs "Email" and "Notifications"
    When the page renders
    Then the "Email" tab leads from the right and the tab order flows right to left

  # S17
  Scenario: Reduced motion suppresses the panel-switch animation
    Given a page where the user prefers reduced motion and the "Email" tab is selected
    When the user selects the "Notifications" tab
    Then the "Notifications" panel is shown without transition or animation
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S12, S18 | |
| Keyboard path | S4, S5, S6, S13, S14, S15, S16 | |
| Assistive-tech outcome | S7, S8 | |
| Form participation | | Tabs switch content views and never contribute form data; ki-tabs is not form-associated (the charter's form-associated set is input, textarea, select, checkbox, radio-group, switch) |
| Theming | S9, S10, S11, S17 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST ship three cooperating elements: `ki-tabs`
  (the tab group and single orchestrator), `ki-tab` (a selectable tab) and
  `ki-tab-panel` (the content view). A tab and its panel pair through a
  shared `value` identifier; exactly one tab is selected at a time.
- **FR-002**: `ki-tabs` MUST expose the selection through a `value`
  attribute. When the declared value matches no tab, matches a disabled
  tab, or no value is declared, the selection MUST fall back to the first
  non-disabled tab without breaking rendering; programmatic `value` writes
  follow the same fallback rule. When every tab is disabled, no tab is
  selected, no panel is visible, and the tab list contributes no tab stop.
- **FR-003**: The selected `ki-tab` MUST make its state observable: the
  reflected `selected` attribute on the tab and the `value` on the group
  stay in sync with the visible panel. The group's `value` is the single
  source of truth: `selected` is output-only reflection, and any author-set
  `selected` attribute is ignored and overwritten on first render.
- **FR-004**: Selecting a tab MUST show its matching panel and hide every
  other panel — at most one panel is visible at any time, and exactly one
  whenever the selected tab has a matching panel — and MUST notify the page
  through a `ki-change` event (bubbling, composed, `detail` carrying the
  selected value) on every user-driven selection change.
- **FR-005**: Activation MUST be automatic per the APG Tabs pattern: moving
  focus between tabs with the arrow keys also selects the focused tab.
- **FR-006**: The keyboard path MUST cover: arrow keys move through tabs
  following the reading direction, wrapping at the ends and skipping
  disabled tabs; Home/End jump to the first/last non-disabled tab; the tab
  list is a single tab stop (roving tabindex); Tab leaves the tab list into
  the visible panel, which is reachable even when it contains no focusable
  content (the panel itself receives focus); when no panel is visible, Tab
  moves to the next focusable element after the tab list.
- **FR-007**: A disabled `ki-tab` MUST NOT be selectable by any modality,
  MUST be skipped by arrow navigation, and MUST expose its unavailable
  state to assistive technology.
- **FR-008**: The accessibility tree MUST expose the APG Tabs semantics:
  the strip as a tab list (accessible name from the group's `label`
  attribute when provided), each tab with its selected state and its
  accessible name derived from the slotted label, and each visible panel
  as a tab panel named after its tab.
- **FR-009**: Every visual property (strip, tab, indicator, panel — color,
  spacing, typography, radius, state styling) MUST resolve from the
  per-tag component token families — `--ki-tabs-*` (strip/tablist),
  `--ki-tab-*` (tab metrics, indicator and states) and `--ki-tab-panel-*`
  (panel) — layered over the semantic layer; zero
  hardcoded visual values. The M3 primary/secondary tab styles are theme
  token decisions, never attributes.
- **FR-010**: Interaction states (hover, focus-visible, active, disabled)
  MUST be styled exclusively through tokens and CSS states; they are never
  attributes/props. Selection is the only reflected managed state.
- **FR-011**: Any motion (indicator transition, panel switch animation) MUST
  be suppressed when the user prefers reduced motion.
- **FR-012**: Content MUST compose through slots: `ki-tab` default slot for
  the label plus `start`/`end` slots for icons or media; `ki-tab-panel`
  default slot for arbitrary content. Order and layout follow the document's
  writing direction (logical properties only).
- **FR-013**: The components MUST expose parts for the customization ladder
  (tokens first, then parts, then slots): `tablist` on `ki-tabs`, `tab` and
  `indicator` on `ki-tab`, `panel` on `ki-tab-panel`.
- **FR-014**: Malformed composition (a tab without a matching panel, a panel
  without a matching tab, duplicate values, redundant or conflicting
  author-set `selected` attributes) MUST NOT break rendering. Duplicate
  values resolve first-in-document-order: the first tab or panel bearing a
  value owns it, and later duplicates render but never pair (a duplicate tab
  is never selected, a duplicate panel stays hidden). Orphan panels stay
  hidden, orphan tabs select with no visible panel (FR-004's at-most-one
  invariant), and author-set `selected` yields to the group's `value`
  resolution (FR-002, FR-003).
- **FR-015**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance distinguishing tabs (view switching)
  from value selection and page navigation.

### Key Entities

- **Tab group (`ki-tabs`)**: the orchestrator; owns the selection (`value`),
  the tab list's accessible name (`label`) and the change notification.
- **Tab (`ki-tab`)**: a selectable label identified by `value`; can be
  `disabled`; reflects `selected` while active (output-only: an author-set
  `selected` is overwritten by the group's `value` resolution); label
  composes through its default slot, media through `start`/`end`.
- **Tab panel (`ki-tab-panel`)**: a content view tied to its tab by the same
  `value`; visible only while its tab is selected.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): three new elements. `ki-tabs` (attributes:
  `value`, `label`; event: `ki-change` with the selected value in `detail`;
  slot: default for tab and panel children; part: `tablist`). `ki-tab`
  (attributes: `value`, `disabled`, reflected managed state `selected`;
  slots: default, `start`, `end`; parts: `tab`, `indicator`). `ki-tab-panel`
  (attribute: `value`; slot: default; part: `panel`). Component token
  families per published tag: `--ki-tabs-*` (strip/tablist), `--ki-tab-*`
  (tab metrics, indicator and states) and `--ki-tab-panel-*` (panel).
  Additive change; catalog and llms.txt regenerate with the three new
  entries.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost for the
  three elements combined; no new runtime dependency ("none").
- **Accessibility** (Art. V): APG Tabs pattern with automatic activation —
  a NEW interaction pattern in the repo → manual APG walkthrough required
  and documented in the PR. axe zero violations across selection ×
  disabled × theme × scheme states.
- **Tokens** (Art. VI): new component token families, one per published tag:
  `--ki-tabs-*` (strip/tablist metrics and layout), `--ki-tab-*` (tab
  metrics, typography, indicator size/color, per-state fg/bg/border, focus
  ring) and `--ki-tab-panel-*` (panel spacing and surface), all resolving
  from the semantic layer; both shipped themes
  (onmars, material3) get component token files. No semantic-layer delta
  anticipated; if the contrast gate surfaces one at implementation it will
  be declared for founder sign-off at the merge gate, as in 002.
- **Catalog/agent legibility** (Art. I): when-to-use — switching between
  peer content views inside the same page context, where exactly one view
  is visible at a time and switching loses no data. When NOT to use —
  choosing a value inside a form (use ki-radio-group, or a future segmented
  control), navigating between pages or routes (use links), sequential
  step-by-step flows (a future stepper). The generated contract documents
  `selected` on `ki-tab` as output-only (the group's `value` is the single
  source of truth), so agents never author it.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: in a well-formed group (every tab paired with a panel), a
  person can change the selected tab via pointer and via keyboard (arrows,
  Home/End), with exactly one panel visible after every selection change,
  in 100% of attempts.
- **SC-002**: keyboard-only operation covers 100% of the behavior available
  to pointer users, with the tab list occupying exactly one tab stop.
- **SC-003**: switching the document theme (onmars ↔ material3) restyles the
  entire tab group with zero markup or component changes — only the theme
  declaration differs; the forced dark scheme resolves from dark tokens.
- **SC-004**: zero accessibility violations across selection, disabled,
  theme and scheme states in automated auditing, and a documented manual
  walkthrough of the tabs pattern.
- **SC-005**: the three elements' combined marginal cost stays in
  single-digit KB (gzipped) and within the declared budget gate.
- **SC-006**: markup with an invalid or missing selection value renders a
  usable tab group (first non-disabled tab selected) in 100% of cases.

## Assumptions

- Horizontal orientation only in v1; vertical tab lists would be an additive
  change later (new attribute plus the APG vertical keyboard mapping).
- Activation is automatic (selection follows focus), per the charter and the
  M3 inventory notes; a manual-activation opt-in is a possible future
  enhancement, not v1 scope.
- No `variant`, `tone` or `size` props: the M3 primary/secondary tab styles
  are pure appearance resolved in the token layer (002 shape precedent), no
  semantic-intent axis exists for tabs, and neither source scales tabs
  through an author-facing size (MarsUI frames pending verification; if they
  surface a real scale it arrives as an additive change).
- Overflow behavior (scrollable tab strips) is out of v1 scope; authors keep
  tab sets small enough to fit. Documented in the catalog guidance.
- M3's stacked icon-above-label primary-tab layout is a theme-layer
  presentation concern; v1 composes leading icons in the `start` slot.
- `ki-change` fires only on user-driven selection changes; programmatic
  `value` writes update the state silently (native `change` parity).
- Tabs are not form-associated: the charter's form-associated set (input,
  textarea, select, checkbox, radio-group, switch) excludes them, and no
  scenario submits tab state with a form.
- Panels stay in the document while hidden (no lazy mounting in v1); lazy
  content is an application concern.
- Dynamic mutation of the tab set (adding or removing tabs after render) is
  out of v1 scope (Art. VII): the charter's user stories compose the tab set
  once as static markup, and no scenario mutates it. Selection repair on
  tab removal/addition would be an additive enhancement with its own
  scenarios.
- Dismissible/closable tabs and badge/counter overlays on tabs appear in
  neither inventory note and are excluded (Art. VII — no speculative props).
