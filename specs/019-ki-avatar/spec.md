# Feature Specification: ki-avatar

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-avatar` (spec `019-ki-avatar`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Identity visual `<ki-avatar>`: a static,
non-interactive element that identifies a person or entity at a glance
through a fallback chain — portrait image, then initials, then a generic
person figure — across the shared size scale, restyled by tokens alone.
Companion container `<ki-avatar-group>` (specified here per the charter rule
that companion elements belong to their parent's spec) stacks several
avatars with a configurable visible cap and a '+N' overflow counter, exactly
as MarsUI's `Avatar_group` frames show. Interactive avatar patterns
(clickable profile trigger, member picking inside a group, expandable
overflow) and the presence/verified adornments visible in the MarsUI frames
are explicitly out of v1 scope."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee). Material 3 ships no standalone avatar component (avatars appear
only as content inside other components — list-item leading avatar, input-chip
avatar, top-app-bar profile image), so the MarsUI → Kimen mapping is the
primary source and the M3 column records conventions, not a component spec:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-avatar |
|---|---|---|---|
| Content modes | `avatar` set (node 10010:1415, Avatars page, verified 2026-07-17): axis `Type` = image \| text \| icon. Image shows a portrait, text shows initials ("A" at xxs, "AT" at larger sizes), icon shows a generic person glyph | No avatar component; where avatars appear (list items, chips) the content is a photo or a monogram | One element with a runtime fallback chain — portrait (`src`) → initials (`initials`) → built-in generic figure. The three Figma types are states of one component, never a `type` attribute |
| Size ramp | Axis `Size` = xxs 20 / xs 24 / sm 32 / md 40 / lg 48 / xl 56 px (metadata-verified 2026-07-17: six steps, exact frame dimensions) | No avatar spec; nearest conventions are the 40dp list-item avatar and 24dp chip avatar | `size`: xxs–xl over the shared scale (default `md`); per-size metrics are per-theme component tokens, never hardcoded |
| Shape | Circular at every size and type (screenshot-verified 2026-07-17) | Avatars render circular in M3 usage examples | Shape is the `--ki-avatar-radius` token — a theme decision, never an attribute (002 Round/Square precedent) |
| Adornments | The frame samples render a presence dot and a verified check overlaid at the corners (screenshot-verified 2026-07-17), but the component set's only axes are Type × Size — the overlays are separate layered artifacts, consistent with the standalone `Status` dot set recorded in 010-ki-badge | The M3 badge is an overlay dot/counter on navigation items — the same future overlay concern 010 deferred | Out of v1: presence, verification and any corner adornment are a future overlay concern shared with the deferred nav badge; documented as when-NOT-to-use |
| Grouping & overflow | `Avatar_group` set (node 10087:2600, verified 2026-07-17): axis `Size` = xs–xl, five steps, frame heights 20/32/40/48/56 px; each frame shows an overlapping stack of six avatars with a trailing "+5" counter circle. The group's "xs" frame is 20 px tall — the avatar set's xxs metric, a naming skew recorded in Assumptions | No avatar-group artifact | `ki-avatar-group`: default slot of `ki-avatar` children rendered as one overlapping stack, `max` visible cap with a "+N" text counter, group-level `size` governing member metrics; overlap distance and separating ring are theme tokens, never attributes |
| Interactivity | The avatar set exposes no interaction states — its only axes are Type × Size (verified 2026-07-17) | Avatars are passive content inside interactive hosts (list item, chip) | Non-interactive v1: never focusable, no events; clickable-profile patterns compose an avatar inside an interactive host (e.g. ki-button), and interactive grouping is a future feature |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognize who an item belongs to (Priority: P1)

A person scanning a view — a comment thread, a settings header, a contact
list item — recognizes at a glance who each entry belongs to: a portrait
when one is available, the person's initials when it is not, and a generic
person figure when neither exists. A portrait that fails to download never
leaves a broken-image hole; the avatar silently falls back down the chain.

**Why this priority**: representing an identity compactly and never showing
a broken state is the component's entire reason to exist; every other
behavior qualifies this one.

**Independent Test**: render one avatar per content mode and verify the
portrait, the initials and the generic figure respectively; point a portrait
avatar at an unreachable URL and observe the initials appear with no error
and no broken-image artifact.

**Acceptance Scenarios**:

1. **Given** an avatar labeled "Ana García" with a reachable portrait,
   **When** the page renders, **Then** the portrait is visible inside the
   avatar shape.
2. **Given** an avatar labeled "Ana García" with initials "AG" and a portrait
   that cannot be retrieved, **When** the portrait fails to load, **Then**
   the initials "AG" are visible instead of the portrait.
3. **Given** an avatar with no portrait and no initials, **When** the page
   renders, **Then** the generic person figure is visible.

---

### User Story 2 - Grasp a set of people at a glance (Priority: P2)

A person viewing a shared document, a project card or an event row sees who
is involved as one compact overlapping stack of avatars; when the set is
larger than the space deserves, the stack shows the first few members and a
"+N" counter that accounts for the rest, exactly and always.

**Why this priority**: the group is the avatar's highest-value composition
(verified as a first-class MarsUI component set) but it builds entirely on
User Story 1's single-avatar behavior.

**Independent Test**: render a group of eight avatars limited to three
visible; count exactly three rendered avatars and one "+5" counter; remove
the cap and observe all eight with no counter.

**Acceptance Scenarios**:

1. **Given** an avatar group of eight labeled avatars limited to three
   visible, **When** the page renders, **Then** the first three avatars
   appear as one overlapping stack and a "+5" counter trails the stack.
2. **Given** an avatar group of three avatars with no visible cap, **When**
   the page renders, **Then** all three avatars render and no counter
   appears.
3. **Given** an avatar group sized "sm" whose avatars declare mixed sizes,
   **When** the page renders, **Then** every visible avatar renders at the
   group's "sm" metrics.

---

### User Story 3 - Perceive identity through assistive technology, without interaction noise (Priority: P2)

A screen-reader user hears a labeled avatar as an image named after its
person — once, with no initials read out as stray text — and hears nothing
at all for a decorative avatar sitting next to the person's visible name. A
keyboard user tabs straight past avatars and groups: they add no stops, no
roles, no phantom announcements. In a group, the visible members' names and
the "+N" overflow text are all the screen reader needs to know who is there.

**Why this priority**: a purely visual identity element that pollutes the
focus order or double-announces names actively harms users; transparency is
the avatar's accessibility contract (Art. V).

**Independent Test**: query the accessibility tree of a labeled
initials-avatar and observe one image named "Ana García" and no stray text;
render an unlabeled avatar beside visible text and observe no contribution;
place a group between two buttons and count zero extra tab stops.

**Acceptance Scenarios**:

1. **Given** an avatar labeled "Ana García" showing the initials "AG",
   **When** the accessibility tree is queried, **Then** it exposes an image
   named "Ana García", with no interactive role and no separate "AG" text.
2. **Given** an avatar with no label beside the visible text "Ana García",
   **When** the accessibility tree is queried, **Then** the avatar
   contributes no name, role or text of its own.
3. **Given** an avatar group of eight labeled avatars limited to three
   visible, **When** the accessibility tree is queried, **Then** the three
   visible members' names are exposed and the overflow reaches assistive
   technology as the text "+5".
4. **Given** a focused button, then an avatar group, then a second button,
   **When** the user presses Tab, **Then** focus lands on the second button.

---

### User Story 4 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every avatar and group restyles from the token layer alone —
shape, colors, per-size metrics, group overlap and ring. No markup change,
no component change.

**Why this priority**: one-step re-theming is Kimen's visible
differentiator, proven in CI since 001; every component must honor it
(Art. VI).

**Independent Test**: render the content-mode × size matrix and a group
under onmars, declare the material3 theme, assert every appearance resolves
from theme tokens; repeat under the forced dark scheme and in a
right-to-left document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** avatars take material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** avatars use the dark token values.
3. **Given** a right-to-left document with a capped avatar group, **When**
   the page renders, **Then** the stack and its counter follow the writing
   direction.

---

### User Story 5 - An agent composes valid identity visuals (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks ki-avatar for a compact identity visual and ki-avatar-group for a
compact set of people, supplies the label that makes them accessible, and is
steered away from misuse: avatars as buttons, groups as member pickers,
logos or arbitrary illustrations. Malformed attribute values never break
rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render an avatar with an unrecognized size value and
observe default rendering; render a group with a non-numeric cap and observe
all members visible.

**Acceptance Scenarios**:

1. **Given** an avatar declared with an unrecognized size value, **When**
   the page renders, **Then** the avatar renders at the default medium
   size.
2. **Given** an avatar group whose visible cap is not a positive whole
   number, **When** the page renders, **Then** all member avatars render
   and no counter appears.

### Edge Cases

- A portrait that fails to load after initial render falls back to initials
  (or, without initials, to the generic figure) with no error, no
  broken-image artifact and no component event; the swap does not change the
  avatar's size (S2, FR-001).
- Unknown `size` values (on either element) and non-positive-integer `max`
  values fall back to their documented defaults; agent-generated markup is
  not trusted to be valid (S4, FR-007; S14, FR-009).
- Initials render verbatim — the component never derives them from the
  label (locale- and script-dependent) and never truncates them; catalog
  guidance documents one to two characters as the supported usage.
- An avatar with no `label` is decorative: it exposes nothing to assistive
  technology. Catalog guidance requires `label` whenever the avatar is the
  only carrier of the identity (no adjacent visible name).
- A group with `max` equal to or greater than its member count — or with no
  `max` at all — shows every member and no counter; a "+0" counter never
  renders (S15, FR-009).
- A group with a single member renders that avatar with no overlap artifacts
  and no counter.
- Members beyond the cap are not rendered and not exposed to assistive
  technology; the counter text is their only trace (FR-009, FR-011).
- Children of `ki-avatar-group` other than `ki-avatar` are documented as
  unsupported; the group does not attempt to repair foreign markup
  (016 precedent).
- Mixed member sizes inside a group are overridden by the group's `size` so
  the stack stays uniform (S6, FR-010).
- RTL documents: the stack's leading edge and the trailing counter follow
  the writing direction; layout uses logical properties only (Art. IV).
- The presence dot and verified check visible in the MarsUI frames are NOT
  part of this component (future overlay concern, shared with the nav badge
  deferred in 010); composing content over an avatar is documented as
  when-NOT-to-use in v1.
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Avatar
  An avatar identifies a person or entity at a glance — a portrait, initials
  or a generic figure inside one compact shape — and an avatar group stacks
  several with a "+N" overflow counter, all restyled through tokens alone.

  # Family: core behavior
  # S1
  Scenario: An avatar shows the person's portrait
    Given an avatar labeled "Ana García" with a reachable portrait
    When the page renders
    Then the portrait is visible inside the avatar shape

  # S2
  Scenario: A broken portrait falls back to the initials
    Given an avatar labeled "Ana García" with initials "AG" and a portrait that cannot be retrieved
    When the portrait fails to load
    Then the initials "AG" are visible instead of the portrait, with no broken-image artifact

  # S3
  Scenario: An avatar with no portrait and no initials shows the generic figure
    Given an avatar labeled "Guest" with no portrait and no initials
    When the page renders
    Then the generic person figure is visible inside the avatar shape

  # S4
  Scenario: Unknown size values fall back to the default
    Given an avatar declared with an unrecognized size value
    When the page renders
    Then the avatar renders at the default medium size

  # S5
  Scenario: A group stacks its avatars and summarizes the overflow
    Given an avatar group of eight labeled avatars limited to three visible
    When the page renders
    Then the first three avatars appear as one overlapping stack
    And a "+5" counter trails the stack

  # S6
  Scenario: The group renders every member at the group's size
    Given an avatar group sized "sm" whose avatars declare mixed sizes
    When the page renders
    Then every visible avatar renders at the group's "sm" metrics

  # Family: keyboard path
  # S7
  Scenario: Avatars never take keyboard focus
    Given a focused button, then an avatar group of three avatars, then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the group or its avatars

  # Family: assistive-tech outcome
  # S8
  Scenario: A labeled avatar exposes the person's name as an image
    Given an avatar labeled "Ana García" showing the initials "AG"
    When the accessibility tree is queried
    Then it exposes an image named "Ana García" with no interactive role
    And no separate "AG" text is exposed

  # S9
  Scenario: An unlabeled avatar stays out of the accessibility tree
    Given an avatar with no label beside the visible text "Ana García"
    When the accessibility tree is queried
    Then the avatar contributes no name, role or text of its own

  # S10
  Scenario: The group announces its visible members and the overflow
    Given an avatar group of eight labeled avatars limited to three visible
    When the accessibility tree is queried
    Then the three visible members' names are exposed
    And the overflow reaches assistive technology as the text "+5"

  # Family: form participation — N/A for ki-avatar and ki-avatar-group:
  # static, non-interactive identity visuals are not form controls, hold no
  # value and contribute no entry to submitted form data (justified in
  # spec.md's Scenario Family Coverage table).

  # Family: theming
  # S11
  Scenario: A second theme restyles avatars through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the avatar's shape, colors and metrics resolve from material3 token values

  # S12
  Scenario: The avatar honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the avatar's appearance resolves from the dark token values

  # S13
  Scenario: The group's stack follows the document's writing direction
    Given a right-to-left document with an avatar group of four avatars limited to three visible
    When the page renders
    Then the first avatar leads the stack from the right edge
    And the "+1" counter trails at the stack's left end

  # Family: core behavior (appended)
  # S14
  Scenario: A malformed visible cap shows every member and no counter
    Given an avatar group of three labeled avatars declared with the malformed visible cap "0"
    When the page renders
    Then all three avatars render and no counter appears

  # S15
  Scenario: A group with no cap shows every member and no counter
    Given an avatar group of three labeled avatars with no visible cap
    When the page renders
    Then all three avatars render
    And no counter appears, not even "+0"
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S14, S15 | |
| Keyboard path | S7 | |
| Assistive-tech outcome | S8, S9, S10 | |
| Form participation | | N/A — ki-avatar and ki-avatar-group are static, non-interactive identity visuals: they never carry user input, contribute no value to form data and are not form-associated (charter-listed valid N/A, 010/016 precedent). |
| Theming | S11, S12, S13 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The avatar MUST resolve its content through a fallback chain:
  a portrait from `src` when it loads; otherwise the `initials` text;
  otherwise the built-in generic person figure. A portrait that fails to
  load — initially or at runtime — MUST fall back down the chain with no
  error, no broken-image artifact, no layout change and no component event.
  The chain maps the design source's Type=image|text|icon variants onto
  runtime states of one element; no `type` attribute exists.
- **FR-002**: The `label` attribute MUST be the avatar's accessible name:
  with a label the avatar exposes image semantics named by it (in every
  content mode); without a label the avatar is decorative and MUST expose
  nothing to assistive technology. The portrait never carries a second
  alternative text of its own — the label is the single name.
- **FR-003**: Initials MUST render verbatim from the `initials` attribute —
  never derived from the label, never truncated by the component. When a
  label is present the initials are presentational: assistive technology
  receives the label, not the initials, as the avatar's content (S8).
- **FR-004**: The avatar MUST expose a `size` attribute with values `xxs`,
  `xs`, `sm`, `md`, `lg`, `xl` (default `md`); per-size metrics (box size,
  initials font size) are per-theme component tokens, never hardcoded.
  (MarsUI verified 2026-07-17: six steps at 20/24/32/40/48/56 px.)
- **FR-005**: Shape MUST be a token decision: the radius that makes an
  avatar circular (onmars) or any other shape resolves from
  `--ki-avatar-radius`, never from an attribute (002 Round/Square
  precedent).
- **FR-006**: Both elements MUST be non-interactive: never focusable, never
  in the tab order, no pointer affordance, no events emitted.
- **FR-007**: Unrecognized attribute values MUST fall back to their
  documented defaults without breaking rendering; unrecognized `size`
  renders as `md` on either element.
- **FR-008**: `ki-avatar-group` MUST render its `ki-avatar` children as one
  overlapping stack in source order. Overlap distance and the separating
  ring are theme tokens (`--ki-avatar-group-*`), never attributes.
- **FR-009**: The group MUST expose a `max` attribute capping the visible
  members: when the member count exceeds `max`, the first `max` members
  render followed by a counter reading "+N", where N is exactly the number
  hidden; members beyond the cap are neither rendered nor exposed to
  assistive technology. Without `max`, with `max` not a positive whole
  number, or with `max` ≥ the member count, all members render and no
  counter appears.
- **FR-010**: The group MUST expose a `size` attribute with the avatar's
  vocabulary (default `md`) governing the metrics of every visible member
  and the counter; member-declared sizes are overridden inside a group so
  the stack stays uniform (S6).
- **FR-011**: Assistive technology MUST receive from a group: each visible
  member per FR-002, and the overflow counter as static text ("+N"); the
  group itself adds no interactive role, name or state of its own.
- **FR-012**: Text/background pairs rendered by the components — initials
  and generic figure over the avatar surface, counter text over the counter
  surface — MUST meet WCAG 1.4.3 contrast in all four theme × scheme
  contexts (onmars/material3 × light/dark).
- **FR-013**: All layout MUST use logical properties so the stack's leading
  edge and trailing counter follow the document's writing direction in RTL
  (Art. IV).
- **FR-014**: The components MUST expose parts for the customization ladder
  (tokens first, then parts, then slots): `avatar`, `image`, `initials`,
  `icon` on ki-avatar; `group`, `counter` on ki-avatar-group.
- **FR-015**: `ki-avatar` MUST be usable standalone; `ki-avatar-group` is
  its companion container, specified here per the charter (companion
  elements belong to their parent's spec), and supports only `ki-avatar`
  children — foreign children are documented as unsupported and are not
  repaired (016 precedent).
- **FR-016**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (never as a clickable control, never
  for logos or arbitrary illustrations, never with adornments overlaid in
  v1; the group is never a member picker).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): two new elements. `ki-avatar` (attributes:
  `label`, `src`, `initials`, `size`; events: none; slots: none in v1;
  parts: `avatar`, `image`, `initials`, `icon`; component tokens:
  `--ki-avatar-*`) and its companion `ki-avatar-group` (attributes: `max`,
  `size`; events: none; slots: default, restricted to `ki-avatar` children;
  parts: `group`, `counter`; component tokens: `--ki-avatar-group-*`).
  Additive MINOR; catalog and llms.txt regenerate with both entries.
- **Bundle budget** (Art. IV): low single-digit KB gzipped marginal cost for
  the pair — static visuals whose only logic is the image-failure fallback
  and the overflow count; no new runtime dependency ("none").
- **Accessibility** (Art. V): no APG pattern exists for a static avatar or
  avatar group and no new interaction pattern is introduced → no manual APG
  walkthrough required. The contract is image semantics with a single
  accurate name when labeled (FR-002), full transparency when decorative,
  zero tab stops (FR-006), overflow conveyed as text (FR-011), and initials
  never double-announced (FR-003). Because the rendered content (initials
  text, inline figure) lives inside the shadow root, image semantics on the
  host (host `role`/`aria-label` or `ElementInternals`) are the expected
  mechanism — a structural role in the 016 sense, not interactive ARIA, so
  "no ARIA is better than wrong ARIA" is not contradicted. Contrast per
  FR-012. axe zero violations across content modes × sizes × themes ×
  schemes × directions. No motion, so `prefers-reduced-motion` is not
  applicable.
- **Tokens** (Art. VI): new component token families `--ki-avatar-*` —
  structure per size (`--ki-avatar-{xxs|xs|sm|md|lg|xl}-{size|font-size}`,
  the six-step ramp verified in MarsUI), family-level surface and shape
  (`--ki-avatar-{radius|bg|fg|border-width|border-color|font-family|font-weight}`)
  — and `--ki-avatar-group-*` (`overlap`, `ring-width`, `ring-color`,
  `counter-bg`, `counter-fg`), all resolving from the semantic layer.
  Deviation from the button naming template, justified: no
  interaction-state segments and no focus-ring tokens because both elements
  are static and never focusable (010 precedent). Both shipped themes
  (onmars, material3) get component token files; material3 has no avatar
  spec, so its values are derived from M3 color/shape conventions (full
  round shape, container/on-container monogram colors) via the semantic
  cascade — no semantic-layer deltas expected, and any that surface require
  founder sign-off at the merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — a compact identity
  visual for a person or entity (comment author, contact list item, project
  member), with `label` naming the identity and ki-avatar-group for a
  compact "who is involved" stack with overflow. When NOT to use — as a
  clickable control (compose inside an interactive host), for logos or
  arbitrary illustrations (plain `img`), for presence/verification
  adornments (future overlay concern), as a member picker or expandable
  list (future interactive grouping), or unlabeled when no adjacent text
  names the identity.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched. `src` is consumer-supplied
  media identical in trust profile to a native image; the component adds no
  URL handling of its own.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of content modes (portrait, initials, generic figure)
  across all six sizes render inside the themed shape, and a failing
  portrait falls back with zero broken-image artifacts and zero errors in
  100% of failure cases.
- **SC-002**: a group of N members with cap M renders exactly min(N, M)
  avatars, and renders a counter reading exactly "+(N−M)" only when N > M —
  accurate in 100% of combinations exercised.
- **SC-003**: switching the document theme (onmars ↔ material3) restyles
  every avatar and group — shape, colors, metrics, overlap, ring — with
  zero markup or component changes; the same holds for the forced dark
  scheme.
- **SC-004**: avatars and groups contribute zero tab stops; labeled avatars
  expose exactly one name each; unlabeled avatars expose nothing; automated
  auditing reports zero violations across content modes × sizes × themes ×
  schemes × directions.
- **SC-005**: the marginal cost of the ki-avatar + ki-avatar-group pair
  stays in low single-digit KB (gzipped) and within the declared budget
  gate.
- **SC-006**: markup with unrecognized size values or a malformed cap
  renders with the documented defaults in 100% of cases — malformed agent
  output never breaks a page.

## Assumptions

- No `type` attribute: MarsUI's Type=image|text|icon axis maps to the
  runtime fallback chain (FR-001), which serves the same three appearances
  from content alone — simplest design that satisfies the scenarios
  (Art. VII).
- `initials` is explicit and verbatim: deriving initials from `label` is
  locale- and script-dependent (multi-word surnames, non-Latin scripts) and
  is deliberately out of scope; automatic derivation could land later as
  additive MINOR without breaking the explicit attribute.
- The presence dot and verified check overlaid on the MarsUI frame samples
  are not axes of the `avatar` component set (Type × Size only, verified
  2026-07-17) and are excluded from v1 as a future overlay concern — the
  same deferral 010-ki-badge recorded for the M3 nav badge/dot. An overlay
  slot or companion element would be additive MINOR.
- Size vocabulary skew in the design file: the `Avatar_group` set names its
  20 px step "xs" while the `avatar` set names 20 px "xxs" (both verified
  2026-07-17). The API uses one shared vocabulary (`xxs–xl`) on both
  elements; per-theme tokens carry the metrics, so the group's five
  design-file steps remain expressible. The unified vocabulary also
  synthesizes a sixth group step that no design frame demonstrates: the
  `Avatar_group` set ships five frames (20/32/40/48/56 px, no 24 px step),
  so the group's `xs` = 24 px metric derives from the avatar ramp rather
  than from any group frame. Both the naming skew and the synthesized step
  are flagged for founder review.
- Group frames show six visible avatars plus "+5" at every size; the visible
  cap is a consumer decision (`max`), not a fixed design constant — the
  frames document the overflow pattern, not a mandated count.
- Overlap distance, stacking ring and which member overlaps which are
  theme/token decisions (charter rule on pure-appearance axes; 002 shape
  precedent); no overlap or ring attribute exists.
- Non-interactive v1 is a charter scope decision: clickable profile
  triggers, member picking, tooltips on members and expandable "+N"
  overflow are future features; until then the catalog documents them as
  when-NOT-to-use. The counter is static text, never a button.
- The counter renders "+" followed by the hidden-member count; localized
  numeral formatting beyond the document's rendering of digits is out of
  scope in v1.
- Image loading policy (lazy/eager, referrer, CORS) follows the platform
  defaults of the underlying image; tuning attributes could land later as
  additive MINOR.
- Host-level image semantics (FR-002) are a justified structural-role
  deviation from "semantic HTML first", exactly as 016 recorded for
  list/listitem: the named content lives across the shadow boundary, and an
  image role with a name is document-structure semantics, not an APG
  interactive widget pattern.
- No motion: avatars are static in v1 (no load transitions), so
  `prefers-reduced-motion` is not applicable.
- An empty `ki-avatar-group` and foreign children inside it are authoring
  mistakes documented in catalog guidance, not error states to handle
  (016 precedent).
