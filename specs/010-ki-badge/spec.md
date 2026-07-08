# Feature Specification: ki-badge

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-badge` (spec `010-ki-badge`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Status descriptor component `<ki-badge>`: a
static, non-interactive pill that names the state of a nearby item. Label in
the default slot; five semantic tones (neutral, success, danger, info,
warning — feedback components take the full tone vocabulary per the Fase 2
API charter, since the token layer already ships the info and warning ramps);
two sizes (sm, md). Styled by tokens alone so onmars (default theme) and
material3 (reference theme) — and any future theme — map through the token
layer without touching the component. Charter decisions recorded: not
interactive, not dismissible, no counter/dot overlay mode in v1 (Material 3's
navigation badge is a separate, future concern)."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The Material 3 "badge" is a narrower artifact than ki-badge: a notification
dot or numeric counter overlaid on a navigation item. The M3 → Kimen mapping
is therefore PARTIAL — ki-badge is the standalone status pill, and the M3
overlay use is deliberately deferred to a future component. The MarsUI file
was verified on 2026-07-08 (full page sweep): it contains no badge pill;
its only status artifact is the tiny `Status` dot set (Miscellaneous page,
Type=success|warning|danger|disabled × Outline=True|False — unlabeled ~4 px
dots), which maps to the M3-style dot concern, not to this pill. The
formerly frame-dependent requirements (FR-001, FR-002, the no-variant
assumption) record the verified result inline:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-badge |
|---|---|---|---|
| Role / anatomy | No badge pill in MarsUI (verified 2026-07-08); closest artifact is the `Status` dot set (Type=success\|warning\|danger\|disabled × Outline=True\|False) — unlabeled ~4 px status dots, closer to M3's overlay dot than to a labeled pill | Notification dot or numeric counter overlaid on a navigation item's icon; no standalone status pill | ki-badge is a standalone static pill labeling a nearby item; the M3 overlay dot/counter is a distinct future concern (nav badge). Mapping is partial and documented |
| Semantic intent | Token layer ships full tone ramps including info and warning (001 extraction); the `Status` dot set uses success\|warning\|danger\|disabled — no info tone and no labeled-badge tone usage in the file (verified 2026-07-08) | Single color role (error container) — no tone axis on the badge itself | `tone`: neutral (default), success, danger, info, warning — the full feedback vocabulary per the charter, token-resolved. material3 defines no info/warning color roles; under material3 those two tones resolve through the inherited shared/onmars ramps via the semantic cascade (001 contract) |
| Size | Metric scale xs–xl exists in the onmars token vocabulary (001); no badge size steps in MarsUI — the `Status` dots ship in a single size (verified 2026-07-08) | Small (dot) vs large (counter) — sizes serve the overlay use, not a pill scale | `size`: sm, md (default md) — charter v1 subset of the shared xs–xl scale; metrics are per-theme component tokens |
| Content | No labeled badge in MarsUI (verified 2026-07-08); the `Status` dot carries no text or counter | A number with max-value truncation ("999+"-style), or none (dot) | Default slot with a short text label; numeric truncation belongs to the future overlay badge, out of v1 |
| Interactivity | The `Status` dot set is purely presentational — its only axes are tone and Outline, no interaction states (verified 2026-07-08) | Non-interactive; meaning is announced through the host navigation item | Non-interactive: never focusable, no events, no dismiss affordance in v1 |
| Shape | No badge pill to verify; the `Status` dot renders round (screenshot-verified 2026-07-08), and pill radius grounds in the onmars metric conventions (001) | Fully rounded shape | Pill radius is a component token per size; shape is a theme decision, NOT a prop (002 precedent) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a status at a glance (Priority: P1)

A person scanning a list, table or card sees a badge naming each item's state
("Active", "Payment failed", "Beta"). The text carries the meaning; the tone
color reinforces it. The badge is understood instantly and demands nothing:
no click, no focus, no dismissal.

**Why this priority**: naming a status is the entire reason the component
exists; every other property (tones, sizes, theming) qualifies this one.

**Independent Test**: render badges with each tone and size, verify the label
is visible inside a tone-styled pill, and verify no interaction is possible.

**Acceptance Scenarios**:

1. **Given** a badge labeled "Active", **When** the page renders, **Then**
   the label is visible inside a neutral-tone pill.
2. **Given** a badge labeled "Payment failed" with tone "danger", **When**
   the page renders, **Then** the pill takes the danger tone appearance.

---

### User Story 2 - Stay out of the interaction path (Priority: P2)

A keyboard or screen-reader user working through a view that contains badges
receives each status as plain text, in reading order, without extra tab
stops, spurious roles or phantom announcements.

**Why this priority**: a decorative-looking element that pollutes the focus
order or the accessibility tree actively harms users; transparency is the
badge's accessibility contract (Art. V).

**Independent Test**: place a badge between two interactive elements; tab
through and observe the badge is skipped; query the accessibility tree and
observe only static text, no interactive role or state.

**Acceptance Scenarios**:

1. **Given** a badge between two buttons, **When** the user presses Tab from
   the first button, **Then** focus lands on the second button.
2. **Given** a badge labeled "Active", **When** the accessibility tree is
   queried, **Then** it exposes the text "Active" and nothing interactive.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every badge — all tones and sizes — restyles from the token layer
alone. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; every component must honor it (Art. VI).

**Independent Test**: render the tone × size matrix under onmars, declare the
material3 theme, assert every badge resolves its appearance from theme
tokens; repeat for the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** badges take material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** badges use the dark token values.

---

### User Story 4 - An agent picks the right badge (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
chooses a badge for a short status descriptor — and is steered away from
misuse: counters on navigation icons, dismissible chips, actionable messages.
Malformed values or an empty label do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a badge with unknown tone/size values and observe
default rendering; render an empty badge and observe no error and no output
to assistive technology.

**Acceptance Scenarios**:

1. **Given** a badge with an unrecognized tone value, **When** the page
   renders, **Then** the badge renders with the neutral tone appearance.
2. **Given** a badge with no label, **When** the page renders, **Then** the
   page renders without error and nothing reaches assistive technology.

### Edge Cases

- Unknown `tone` or `size` values fall back to the documented defaults
  (agent-generated markup is not trusted to be valid).
- An empty default slot renders without error and exposes no content to
  assistive technology (S8, FR-012); meaning MUST live in the text, so empty
  usage is documented as when-NOT-to-use (the dot/counter overlay is the
  future nav badge, not this component).
- A long label stays on a single line and grows the pill; truncation or
  wrapping is the consumer's layout concern in v1.
- Tone is never the only carrier of meaning (WCAG 1.4.1): the label text
  states the status; every tone's text/background pair meets contrast
  requirements (WCAG 1.4.3) in every theme × scheme.
- Badge text changed at runtime is NOT announced by the component (no live
  region); feedback that must be announced belongs to ki-alert.
- RTL documents: with only a default slot there is no start/end order to
  observe; layout uses logical properties so padding follows writing
  direction (Art. IV) — no dedicated RTL scenario (002 S13 pattern not
  applicable).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Badge
  A badge names a status at a glance — a short, non-interactive pill whose
  tone reinforces the meaning its text already carries, and whose appearance
  any brand restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The badge renders its label as a status pill
    Given a badge labeled "Active"
    When the page renders
    Then the label "Active" is visible inside a pill with the neutral tone appearance

  # S2
  Scenario: The tone drives the badge's appearance
    Given a badge labeled "Payment failed" with tone "danger"
    When the page renders
    Then the badge's appearance resolves from the danger tone token values

  # S3
  Scenario: Unknown appearance values fall back to defaults
    Given a badge declared with an unrecognized tone value
    When the page renders
    Then the badge renders with the neutral tone appearance

  # S8
  Scenario: An empty badge exposes nothing and breaks nothing
    Given a badge with no label
    When the page renders
    Then the accessibility tree exposes no content for the badge and the page renders without error

  # Family: keyboard path
  # S4
  Scenario: The badge never takes keyboard focus
    Given a focused button, then a badge labeled "Active", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the badge

  # Family: assistive-tech outcome
  # S5
  Scenario: The badge's meaning reaches assistive technology as text
    Given a badge labeled "Active" with tone "success"
    When the accessibility tree is queried
    Then it exposes the text "Active" with no interactive role or state

  # Family: theming
  # S6
  Scenario: A second theme restyles the badge through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the badge's appearance resolves from material3 token values

  # S7
  Scenario: The badge honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the badge's appearance resolves from the dark token values
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S8 | |
| Keyboard path | S4 | |
| Assistive-tech outcome | S5 | |
| Form participation | | N/A — ki-badge is a static, non-interactive descriptor: it never carries user input, contributes no value to form data and is not form-associated (charter; Art. IV). |
| Theming | S6, S7 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The badge MUST expose a `tone` attribute with exactly five
  semantic values — `neutral` (default), `success`, `danger`, `info`,
  `warning` — describing intent, never appearance; each tone resolves its
  colors from the token layer. (MarsUI verified 2026-07-08: the file has no
  badge pill — its `Status` dot set (success|warning|danger|disabled, no
  info) is unlabeled and maps to the future overlay/dot concern — so the
  five-tone, text-only pill stands on the charter and the 001 tone ramps.)
- **FR-002**: The badge MUST expose a `size` attribute with values `sm` and
  `md` (default `md`); metrics per size are per-theme component tokens,
  never hardcoded. (MarsUI verified 2026-07-08: no badge frame and no badge
  size steps exist; the sm/md subset is a charter decision over the shared
  xs–xl token scale.)
- **FR-003**: The label MUST compose through the default slot, and the
  slotted text MUST be the sole carrier of the status meaning; tone color
  reinforces but never replaces it (WCAG 1.4.1).
- **FR-004**: The badge MUST be non-interactive: never focusable, never in
  the tab order, no pointer affordance, no events emitted.
- **FR-005**: Assistive technology MUST receive the slotted label as plain
  static text with no interactive role or state; no ARIA role is added
  (semantic HTML first — no APG pattern exists for a static badge, so none
  is claimed).
- **FR-006**: Every visual property (color, radius, spacing, typography,
  border) MUST resolve from `--ki-badge-*` component tokens layered over
  the semantic token layer; zero hardcoded visual values. Pill radius is a
  token, never an attribute (002 shape precedent).
- **FR-007**: Unrecognized `tone` or `size` values MUST fall back to their
  documented defaults without breaking rendering.
- **FR-008**: Every tone's text/background pair MUST meet WCAG 1.4.3
  contrast in all four theme × scheme contexts (onmars/material3 ×
  light/dark).
- **FR-009**: The component MUST expose a `badge` part for the
  customization ladder (tokens first, then parts, then slots).
- **FR-010**: Layout MUST use logical properties so the pill renders
  correctly in RTL documents (Art. IV).
- **FR-011**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (counters/dots on navigation items,
  dismissible chips, actionable or announced messages, and empty/icon-only
  usage are documented as when-NOT-to-use).
- **FR-012**: A badge with an empty default slot MUST render without error
  and MUST expose no content to assistive technology; empty usage remains a
  documented when-NOT-to-use (FR-011) — the dot/counter overlay is the
  future nav badge, not this component.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-badge` (attributes:
  `tone`, `size`; slot: default; part: `badge`; component tokens:
  `--ki-badge-*`). No events, no methods, no sub-components. Additive MINOR;
  catalog and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): static presentational component — expected
  marginal cost in the low single-digit KB gzipped, well inside the budget
  gate; no new runtime dependency ("none").
- **Accessibility** (Art. V): no APG pattern exists for a static badge and
  no new interaction pattern is introduced → no manual APG walkthrough
  required. Semantic HTML first: no ARIA role added; label exposed as static
  text; zero tab stops. axe zero violations across tone × size × theme ×
  scheme; contrast per FR-008; meaning-in-text per FR-003. No motion, so
  `prefers-reduced-motion` is not applicable.
- **Tokens** (Art. VI): new component token family `--ki-badge-*` —
  structure per size (`--ki-badge-{sm|md}-{height|padding-inline|radius|font-size|line-height}`),
  family-level typography and stroke (`--ki-badge-{font-family|font-weight|border-width}`,
  the 002 button convention; `border-width` is what makes a
  filled-vs-outlined pill treatment expressible as a token-layer decision)
  and color per tone (`--ki-badge-{tone}-{bg|fg|border}`) — resolving from
  the semantic layer; both shipped themes (onmars, material3) get component
  token files covering the full tone × size matrix. Deviation from the
  button naming template, justified: no interaction-state segments
  (`rest|hover|active|disabled`) and no focus-ring tokens, because the badge
  is static and never focusable. Semantic-layer honesty: material3 defines
  no info/warning color roles — under material3 those tones resolve through
  the shared info/warning ramps inherited via the semantic cascade (001
  contract), and FR-008's info/warning contrast in the two material3
  contexts has never been swept by the existing gate, so semantic-layer
  deltas may surface there; any such delta changes 001-shipped values and
  requires explicit founder sign-off at the merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — a short textual
  status ("Active", "Beta", "Payment failed") labeling an adjacent item in a
  list, table row, or card header, with `tone` matching the intent. When NOT
  to use — notification counts or dots on navigation items (future overlay
  nav badge), removable/interactive chips (future component), messages that
  need attention, announcement or dismissal (ki-alert), long sentences, or
  empty/icon-only pills.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tone × size combinations render the label visibly
  inside a tone-styled pill whose text/background contrast meets WCAG 1.4.3
  in all four theme × scheme contexts.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every badge in the tone × size matrix with zero markup or component
  changes — only the theme declaration differs.
- **SC-003**: badges contribute zero tab stops and zero interactive roles or
  states to the accessibility tree, and automated auditing reports zero
  violations across the full matrix.
- **SC-004**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-005**: markup with unrecognized tone or size values renders with the
  documented defaults in 100% of cases — malformed agent output never breaks
  a page.

## Assumptions

- `size` ships as the `sm | md` subset of the shared `xs–xl` scale: a
  charter v1 scope decision (Art. VII — simplest design that satisfies the
  scenarios). Additional sizes would be additive MINOR changes if the design
  sources justify them.
- No `variant` attribute: neither design source shows an emphasis scale for
  badges (M3's badge has none; MarsUI verified 2026-07-08 has no badge
  pill). A filled-vs-soft/outlined pill treatment, if a theme wants it, is
  a token-layer decision, not a prop (002 shape precedent) — executable
  because the token family declares `--ki-badge-border-width` alongside the
  per-tone border colors. MarsUI verification 2026-07-08: the only
  appearance axis on the related `Status` dot set is Outline=True|False,
  exactly the filled-vs-outlined treatment the token layer already
  expresses; per the recorded assumption an emphasis axis would land as
  additive MINOR post-v1.
- MarsUI verification 2026-07-08 (full page sweep of the MarsUI Figma
  file) resolved the batched founder question: (a) no variant/emphasis axis
  exists — the `Status` dot's only appearance axis is Outline=True|False, a
  token-layer treatment; (b) no badge pill anatomy exists at all — the
  `Status` dot is unlabeled and belongs to the future overlay/dot concern;
  (c) MarsUI defines no badge size steps, so sm/md stands as the charter
  subset; (d) frame tone usage is success|warning|danger|disabled on the
  dot — info appears only in the 001 token ramps, which the five-tone
  vocabulary already covers. No FR changes; the verified facts are recorded
  inline in FR-001/FR-002 and the design-source table.
- Non-interactive and not dismissible per the charter: dismissal/removal
  belongs to a future chip-like component; the notification dot/counter
  overlay (M3's actual badge) is a separate future component.
- No live-region semantics: the badge is static at render time; announcing
  runtime status changes is the host application's concern, and feedback
  that must be announced belongs to ki-alert (011).
- Long labels stay on one line and grow the pill; truncation/wrapping is the
  consumer's layout concern in v1.
- The badge has no motion or transitions, so no `prefers-reduced-motion`
  scenario or requirement is needed.
- With only a default slot there is no observable start/end order, so the
  002 S13 RTL scenario pattern is not applicable; RTL correctness is carried
  by FR-010 (logical properties).
