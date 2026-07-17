# Feature Specification: ki-scroller

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-scroller` (spec `023-ki-scroller`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Fase 3 batch component (Miscellaneous set): a
`<ki-scroller>` web component — a bounded scroll container that clips its
slotted content along one declared axis and replaces platform scrollbar
chrome with a brand-styled, token-resolved scroll indicator. The MarsUI
`Scroller` set carries a single `Type` axis (vertical / horizontal), which
maps to an `orientation` attribute. Scrolling stays native (wheel, touch,
keyboard); the component never intercepts or re-implements it. Page-level
scrolling, carousels, snap points, virtualization and scroll-position APIs
are explicitly out of v1 scope."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The MarsUI artifact is a bare scroll-indicator visual; the abstraction below
turns it into the smallest meaningful web component — the scroll container
that owns that indicator — so that both themes (and future ones) express
their scrollbar look through the same token surface:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-scroller |
|---|---|---|---|
| Component anatomy | `Scroller` component set on the Miscellaneous page (node 12124:22602, verified 2026-07-17): exactly two variants that are bare indicator bars — `Type=vertical` at 8×200 px and `Type=horizontal` at 200×8 px — a thumb-only pill with no visible track | No scroller or scrollbar component exists in the M3 component catalog and no `md.comp.scrollbar` token set is published — Material defers scroll indication to platform scrollbars (checked 2026-07-17) | A lone scrollbar visual is not a meaningful component; ki-scroller is the bounded scroll container that owns it: default slot for content, `viewport` part, indicator resolved entirely from `--ki-scroller-*` tokens |
| Orientation | The set's only variant axis is `Type` ∈ {vertical, horizontal} | Platform scrollbars appear per overflowing axis | `orientation` attribute (`vertical` default, `horizontal`): one declared scroll axis per instance; a both-axes mode is a future additive MINOR |
| Metrics & shape | 8 px thickness; fully rounded (pill) ends; the drawn thumb fills only part of the 200 px frame — a proportional sample thumb, not a full-length rail (verified 2026-07-17) | No metric guidance (no scrollbar tokens) | Thickness, radius, minimum thumb length and gutter are `--ki-scroller-*` component tokens; thumb length stays proportional to the visible fraction (native behavior); no size attribute |
| States | No hover / pressed / dragging variants in the set — the single `Type` axis is the whole vocabulary (verified 2026-07-17) | Platform scrollbars carry their own state styling | No contract states: any hover/active emphasis is a per-theme token decision (pure-appearance axis, 002 Round/Square precedent, charter rule) |
| Surface / track | The track is invisible: the pill thumb floats directly on the content's surface | — | Track color is a `--ki-scroller-*` token defaulting to transparent under onmars; a theme opts into a visible track through the same token, never an attribute |
| Interactivity | The Figma artifact is a static visual; no behavior encoded | Platform scroll behavior (wheel, touch, keys) | Scrolling stays native; the component adds only overflow-aware keyboard reachability and region semantics (Art. V) and never intercepts scroll input |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reach content that overflows a bounded region (Priority: P1)

A person using an application encounters a region whose content outgrew the
space the layout gives it — a chat pane, a log block, a row of tags, a tall
menu inside a card. The content is clipped to the region's bounds, a
brand-styled indicator signals that more exists, and ordinary scrolling
(wheel, touchpad, touch) reveals the rest. When the content happens to fit,
the region looks and behaves like a plain container: no indicator, no
affordance, no reserved space.

**Why this priority**: making overflowing content reachable inside a bounded
region is the scroller's entire reason to exist; every other behavior layers
on top of it.

**Independent Test**: render a vertical scroller with content taller than its
bounds and observe clipping plus a vertical indicator; scroll to the end and
observe the last of the content; repeat with `orientation="horizontal"` and
wider content; replace the content with a fitting one and observe no
indicator.

**Acceptance Scenarios**:

1. **Given** a vertical scroller whose content is taller than its bounds,
   **When** the page renders, **Then** the content is clipped to the
   scroller's bounds and a vertical scroll indicator is shown.
2. **Given** a vertical scroller whose content is taller than its bounds,
   **When** the user scrolls to the end, **Then** the last of the content
   becomes visible.
3. **Given** a horizontal scroller whose content is wider than its bounds,
   **When** the page renders, **Then** the content is clipped at the
   scroller's inline edge and a horizontal scroll indicator is shown.
4. **Given** a scroller whose content fits within its bounds, **When** the
   page renders, **Then** all the content is visible and no scroll indicator
   is shown.
5. **Given** a vertical scroller whose content is taller than its bounds,
   **When** enough content is removed for the remainder to fit within the
   bounds, **Then** no scroll indicator is shown and the scroller no longer
   adds a Tab stop.
6. **Given** a vertical scroller whose content fits within its bounds,
   **When** enough content is added to overflow the bounds, **Then** a
   vertical scroll indicator is shown and the scroller becomes reachable
   via Tab.

---

### User Story 2 - Operate the scroller with keyboard and assistive technology (Priority: P2)

A keyboard user tabs to an overflowing scroller and pages through it with the
standard keys — arrows, Page Up/Down, Home/End — reaching every part of the
content without a pointer. A screen reader user hears the region announced
with its accessible name and reads the slotted content with its own semantics
intact. When the content fits, the scroller adds no Tab stop: keyboard focus
flows straight to the next interactive element.

**Why this priority**: a scrollable region reachable only by pointer is a
WCAG 2.1.1 failure (the axe `scrollable-region-focusable` rule), and a
never-scrollable region that still traps a Tab stop is a keyboard nuisance;
both directions are accessibility obligations (Art. V).

**Independent Test**: with an overflowing scroller as the page's only
element, press Tab and confirm focus lands on the scroller, then press Arrow
Down and observe the content move; query the accessibility tree for a region
named from `label`; swap in fitting content, press Tab and confirm the
scroller is skipped.

**Acceptance Scenarios**:

1. **Given** a page whose only element is a scroller with overflowing
   content, **When** the user presses Tab, **Then** focus lands on the
   scroller.
2. **Given** focus on a vertical scroller whose content is taller than its
   bounds, **When** the user presses Arrow Down, **Then** the content scrolls
   toward the end.
3. **Given** a page holding a scroller whose content fits, followed by a
   button, **When** the user presses Tab, **Then** focus lands on the button,
   skipping the scroller.
4. **Given** an overflowing scroller labeled "Release notes" holding a
   heading and a list, **When** the accessibility tree is queried, **Then**
   it exposes a region named "Release notes" whose heading and list keep
   their own semantics.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every scroller restyles from the token layer alone — indicator
color, thickness, shape, track visibility, gutter. No markup change, no
component change. The same holds under a forced dark scheme, and a horizontal
scroller in a right-to-left document starts at the inline start edge.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; the scroller is the component that reclaims scrollbar
chrome — the last piece of browser UI most design systems leave unbranded —
for the token layer.

**Independent Test**: render an overflowing scroller under onmars, declare
the material3 theme, assert the indicator resolves from material3 token
values; repeat under the forced dark scheme and in a right-to-left document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the scroll indicator's color, thickness and shape
   resolve from material3 token values with unchanged markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the scroll indicator resolves from the dark token
   values.
3. **Given** a right-to-left document with a horizontal scroller whose
   content is wider than its bounds, **When** the page renders, **Then** the
   content begins at the right edge and scrolls toward the left edge.

---

### User Story 4 - An agent composes a valid scroller (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks ki-scroller for a bounded region whose content can outgrow it, gives it
a label and bounds, and knows when NOT to reach for it (page-level scrolling,
carousels, virtualized lists, data tables). Malformed attributes — for
example an orientation value copied from another design system — do not
break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a scroller with an unrecognized orientation value
and observe default vertical behavior.

**Acceptance Scenarios**:

1. **Given** a scroller declared with an unrecognized orientation value,
   **When** the page renders, **Then** the scroller behaves as the default
   vertical scroller.

### Edge Cases

- A scroller whose bounds are never constrained by the consumer's layout
  never overflows and renders as a plain container — documented in catalog
  guidance as authoring guidance, not an error state. The component imposes
  no intrinsic or default size.
- Content changes at runtime (items appended or removed, container resized):
  the indicator and the keyboard reachability follow the current overflow
  state — a scroller that stops overflowing drops its Tab stop and
  indicator, and vice versa (S13, S14, FR-003, FR-005).
- Cross-axis overflow (e.g. wide content inside a vertical scroller) is
  documented as an authoring mistake: the scroller scrolls its declared axis
  only and never grows a second scrollbar; consumers wrap or size content on
  the cross axis.
- Unknown attributes or attribute values (e.g. `orientation="y"` or
  `direction="vertical"` copied from another design system's vocabulary) are
  ignored: the scroller behaves as the default vertical scroller
  (agent-generated markup is not trusted to be valid).
- A scroller without a `label` renders, but exposes no accessible name and
  fails the accessibility audit; `label` is documented as required in the
  public contract (015-ki-progress precedent).
- Interactive elements slotted inside keep their own focus and events; when
  focus moves to an element outside the visible area, the platform's native
  scroll-into-view behavior applies — the component neither blocks nor
  re-implements it. While the scroller overflows, its viewport Tab stop
  precedes the slotted content's own stops in focus order.
- The scroller never intercepts scroll input: no scroll hijacking, no
  synthetic smooth-scroll animation, no snap points in v1 — so
  `prefers-reduced-motion` adds no obligation.
- RTL documents: the scroll start edge, the indicator's resting edge and all
  internal spacing follow the writing direction (logical properties only,
  Art. IV).
- Nesting a scroller inside another scroller is documented as unsupported
  (when-NOT-to-use); v1 guarantees behavior only for a single scroll axis
  per region.
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Scroller
  A scroller clips overflowing content inside a bounded region and keeps it
  reachable by wheel, touch and keyboard alike, with a scroll indicator that
  any brand restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Overflowing content is clipped and signalled
    Given a vertical scroller labeled "Release notes" whose content is taller than its bounds
    When the page renders
    Then the content is clipped to the scroller's bounds
    And a vertical scroll indicator is shown

  # S2
  Scenario: Scrolling reveals the end of the content
    Given a vertical scroller whose content is taller than its bounds
    When the user scrolls to the end
    Then the last of the content becomes visible

  # S3
  Scenario: A horizontal scroller overflows along the inline axis only
    Given a horizontal scroller labeled "Weekly timeline" whose content is wider than its bounds
    When the page renders
    Then the content is clipped at the scroller's inline edge
    And a horizontal scroll indicator is shown

  # S4
  Scenario: Fitting content needs no scroller affordance
    Given a scroller labeled "Release notes" whose content fits within its bounds
    When the page renders
    Then all the content is visible and no scroll indicator is shown

  # S5
  Scenario: Unknown orientation values fall back to vertical
    Given a scroller declared with an unrecognized orientation value copied from another design system
    When the page renders
    Then the scroller behaves as the default vertical scroller

  # Family: keyboard path
  # S6
  Scenario: The keyboard reaches an overflowing scroller
    Given a page whose only element is a scroller with overflowing content
    When the user presses Tab
    Then focus lands on the scroller

  # S7
  Scenario: Arrow keys scroll the focused scroller
    Given focus on a vertical scroller whose content is taller than its bounds
    When the user presses Arrow Down
    Then the content scrolls toward the end

  # S8
  Scenario: A fitting scroller adds no tab stop
    Given a page holding a scroller whose content fits, followed by a button
    When the user presses Tab
    Then focus lands on the button, skipping the scroller

  # Family: assistive-tech outcome
  # S9
  Scenario: The scroller exposes a named region with intact content semantics
    Given an overflowing scroller labeled "Release notes" holding a heading and a list
    When the accessibility tree is queried
    Then it exposes a region named "Release notes"
    And the heading and the list keep their own semantics

  # Family: form participation — N/A for ki-scroller: a scroll container is
  # not a form control, holds no value and contributes no entry to submitted
  # form data (justified in spec.md's Scenario Family Coverage table).

  # Family: theming
  # S10
  Scenario: A second theme restyles the scroller through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the scroll indicator's color, thickness and shape resolve from material3 token values

  # S11
  Scenario: The scroller honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the scroll indicator's appearance resolves from the dark token values

  # S12
  Scenario: A horizontal scroller follows the document's writing direction
    Given a right-to-left document with a horizontal scroller whose content is wider than its bounds
    When the page renders
    Then the content begins at the right edge and scrolls toward the left edge

  # Family: core behavior (appended)
  # S13
  Scenario: A scroller that stops overflowing drops its indicator and Tab stop
    Given a vertical scroller labeled "Chat messages" whose content is taller than its bounds
    When enough content is removed for the remainder to fit within the bounds
    Then no scroll indicator is shown
    And the scroller no longer adds a Tab stop

  # S14
  Scenario: A scroller that starts overflowing gains its indicator and Tab stop
    Given a vertical scroller labeled "Chat messages" whose content fits within its bounds
    When enough content is added to overflow the bounds
    Then a vertical scroll indicator is shown
    And the scroller becomes reachable via Tab
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S13, S14 | |
| Keyboard path | S6, S7, S8 | |
| Assistive-tech outcome | S9 | |
| Form participation | | N/A — ki-scroller is a scroll container, not a form control: it holds no value and contributes no entry to submitted form data (charter-listed valid N/A). Form controls slotted inside it participate in forms on their own. |
| Theming | S10, S11, S12 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scroller MUST be a bounded scroll container: it clips its
  slotted content to the host's bounds and makes overflowing content
  reachable by scrolling along the declared orientation only. The host's
  size comes entirely from the consumer's layout; the component imposes no
  intrinsic or default dimensions.
- **FR-002**: The scroller MUST expose an `orientation` attribute with the
  values `vertical` (default) and `horizontal`, mapping the design source's
  `Type` axis. Unrecognized values MUST fall back to `vertical`
  (agent-generated markup is not trusted to be valid).
- **FR-003**: The scroll indicator MUST appear only while content actually
  overflows; content that fits renders fully with no indicator and no
  scroll affordance. The overflow state MUST track content and bounds
  changes at runtime.
- **FR-004**: Scrolling MUST remain native: wheel, touchpad, touch and
  indicator drag operate the viewport directly, and the component MUST NOT
  intercept, re-target, re-implement or animate scroll input (no scroll
  hijacking, no smooth-scroll animation, no snap points in v1).
- **FR-005**: While content overflows, the viewport MUST be reachable via
  Tab and scrollable with the standard keys (arrow keys, Page Up/Down,
  Home/End); while content fits, the scroller MUST NOT add a Tab stop
  (WCAG 2.1.1; the axe `scrollable-region-focusable` rule in both
  directions, Art. V).
- **FR-006**: Assistive technology MUST receive a region with the
  accessible name from the `label` attribute; the slotted content keeps its
  own semantics and the scroller adds no other role, name or state of its
  own. `label` is documented as required in the public contract
  (015-ki-progress precedent). Region semantics stay stable regardless of
  overflow state; only focusability toggles.
- **FR-007**: Every visual property of the viewport and its indicator
  (thumb color, thickness, radius, minimum thumb length, track color,
  gutter, surface) MUST resolve from `--ki-scroller-*` component tokens
  layered over the semantic token layer; zero hardcoded visual values.
- **FR-008**: No size, thickness or state attributes exist: indicator
  thickness, shape and any hover/active emphasis are pure-appearance theme
  token decisions (002 Round/Square precedent, charter rule on
  pure-appearance axes).
- **FR-009**: Unrecognized attributes or attribute values MUST NOT break
  rendering; the scroller keeps the default vertical behavior and
  appearance.
- **FR-010**: All internal layout MUST use logical properties so the scroll
  start edge, the indicator's resting edge and all spacing follow the
  document's writing direction: in RTL a horizontal scroller begins at the
  inline start edge and scrolls toward the inline end (Art. IV).
- **FR-011**: The component MUST expose the part `viewport` for the
  customization ladder (tokens first, then parts, then slots). The
  indicator itself is scrollbar chrome and is NOT exposed as a part in v1;
  it is styled through tokens only.
- **FR-012**: The scroller emits no component events in v1; scroll-position
  observation or scrolled-edge events are future additive MINOR API.
- **FR-013**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (never for page-level scrolling,
  carousels, virtualized lists, tabular data or nested scrollers).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): one new element `ki-scroller` (attributes:
  `orientation`, `label`; events: none; slots: default (scrollable
  content); parts: `viewport`; component tokens: `--ki-scroller-*`).
  Additive MINOR; catalog and llms.txt regenerate with the entry.
- **Bundle budget** (Art. IV): low single-digit KB gzipped marginal cost —
  a clipping container plus overflow observation; scrolling itself ships no
  logic because it stays native. No new runtime dependency ("none").
- **Accessibility** (Art. V): no APG widget pattern applies — a scrollable
  region is not an APG pattern (the charter flags dialog, tooltip, tabs and
  select's listbox), so no manual APG walkthrough is required. The
  obligations are the keyboard-focusable scrollable region contract in both
  directions (reachable and key-operable while overflowing — WCAG 2.1.1,
  axe `scrollable-region-focusable` — and zero spurious Tab stops while
  fitting), an accessible name via `label` on region semantics, and
  transparency for slotted content semantics. axe zero violations across
  orientations × overflow states × themes × schemes × directions.
- **Tokens** (Art. VI): new component token family `--ki-scroller-*` (thumb
  color, thumb thickness — 8 px pill in onmars per the verified Figma
  metrics — thumb radius, minimum thumb length, track color — transparent
  in onmars — gutter, viewport surface) resolving from the semantic layer.
  No variant, tone, size or state axes. Both shipped themes (onmars,
  material3) get component token files; Material publishes no scrollbar
  guidance, so the material3 values are theme-author decisions recorded in
  the token file. No semantic-layer deltas expected.
- **Catalog/agent legibility** (Art. I): when-to-use — a bounded region
  inside a view whose content can outgrow it: chat or message panes, code
  and log blocks, tag rows, sidebar navigation, tall menus inside cards.
  When NOT to use — page-level scrolling (the browser's job), carousels or
  paginated media (future indicator/carousel patterns), virtualized long
  collections, multi-column tabular data, or nesting scrollers.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: with overflowing content in either orientation, 100% of the
  content is reachable by pointer alone and by keyboard alone; with fitting
  content the scroller contributes zero Tab stops and zero indicators; when
  content or bounds change at runtime, the indicator and the Tab stop
  follow the new overflow state in 100% of transitions.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every scroller — indicator color, thickness, shape, track, gutter — with
  zero markup or component changes; only the theme declaration differs. The
  same holds for the forced dark scheme.
- **SC-003**: zero accessibility violations in automated auditing across
  orientations, overflow states, themes, schemes and directions; the region
  name from `label` is exposed in 100% of cases.
- **SC-004**: scroll input stays native in 100% of paths — the shipped
  bundle registers no wheel, touch or scroll listener that cancels or
  re-dispatches the platform's scrolling.
- **SC-005**: the marginal cost of ki-scroller stays in low single-digit KB
  (gzipped) and within the declared budget gate.

## Assumptions

- Bounds are the consumer's responsibility: ki-scroller ships no intrinsic
  or default height/width, so an unconstrained scroller never overflows and
  renders as a plain container (catalog authoring guidance, not an error
  state).
- Single-axis v1 is a design-source decision: the MarsUI `Type` axis is
  binary (vertical / horizontal, verified 2026-07-17) and neither source
  shows a two-axis scroller; a `both`-axes mode would land as additive
  MINOR.
- No state variants exist in the design source (the `Scroller` set carries
  only the `Type` axis — no hover, pressed or dragging variants), so
  indicator hover/active emphasis is a per-theme token decision, not a
  contract state.
- Material 3 ships no scrollbar/scroller component and no scrollbar token
  set (checked 2026-07-17); the material3 component token values are
  theme-author decisions, exactly as the divider-vs-spacing choice was in
  016.
- The indicator's rendering mechanism (standard CSS scrollbar styling vs an
  overlay element) is an implementation decision; the contract asserts only
  token-resolved appearance and native scroll behavior. Because the
  indicator may be scrollbar chrome, it is not exposed as a shadow part in
  v1 (FR-011); if implementation lands it as an overlay element, exposing
  an `indicator` part later is additive MINOR.
- `label` provides the accessible name only and is not visually rendered; a
  scroller without a label renders but fails the accessibility audit, and
  the contract documents `label` as required (015-ki-progress precedent).
- Focusability toggling with overflow follows the platform precedent
  (keyboard-focusable scrollers) and the axe `scrollable-region-focusable`
  rule; region role and name stay stable regardless of overflow so
  assistive-tech announcements don't churn (FR-006).
- No smooth-scroll animation, snap points or scroll hijacking exist in v1,
  so `prefers-reduced-motion` adds no obligation; native inertial scrolling
  is the platform's domain.
- No scroll events or scroll-position API in v1: observation surfaces
  (scrolled-to-edge events, position getters) are future additive MINOR.
- Cross-axis overflow is an authoring mistake documented in catalog
  guidance; the scroller scrolls its declared axis only and never grows a
  second scrollbar.
