# Feature Specification: Reduced transparency — opaque equivalents for glass

**Feature Branch**: `044-reduced-transparency`

**Created**: 2026-11-17

**Status**: Confirmed — decisions D1–D4 accepted by the founder on 2026-11-17

**Input**: User description: "`prefers-reduced-transparency: reduce`. Sustituir vidrio y translucidez por superficies opacas equivalentes que conserven contraste y jerarquía. Si también se puede forzar." Shares its emission mechanism with spec 043 (043 D5) and ships in the same PR.

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis

Nine components paint MarsUI glass (`backdrop-filter: blur()` over a
translucent fill) or translucent content fills, measured on `main` at
692cbb2:

| Kind | Where | Today |
|---|---|---|
| Glass panel (≈ 80–88 % fill + 12–24px blur) | `ki-select` listbox, `ki-tooltip`, `ki-dialog` surface, `ki-button` secondary, `ki-badge` neutral, `ki-avatar-group` counter, `ki-video` play control | `surface-special-blur-base-*`, `secondary-alpha-base`, `effect-component-backdrop-blur` and per-component blur tokens |
| Tone tint (12–24 % of a tone) | `ki-alert` and `ki-badge` info/success/warning/danger (`ki-alert` also blurs) | `surface-*-low-em-alpha`, `*-base-em-alpha` |
| State wash (3–12 %) | hover/press of ghost, quaternary, option, tab, radio | `state-layer-*`, `hover-overlay` |
| Disabled fill (8–18 %, dark scheme) | input, select, textarea, checkbox, radio, switch | `surface-disabled-*` |
| Modal scrim | `ki-dialog` backdrop | `overlay-*` (12–40 %) |

`ki-checkbox` and `ki-radio` carry the glass gradient but already skip the
blur (their fill is opaque). The semantic layer already has an opaque twin
for every tone tint (`surface-info-low-em` beside `surface-info-low-em-alpha`)
and a scheme-aware opaque surface for every glass panel
(`surface-special-light-s0-dark-s3` and siblings), so the mode can be written
as references only.

Browser support differs from 043: `prefers-reduced-transparency` ships in
Chromium (118) and recent Firefox, not in Safari. The declaration is what
makes the mode reachable on Safari.

## Decisions *(founder, 2026-11-17)*

**D1 — What becomes opaque.** Recommended: every surface that **holds
content** — glass panels and tone tints — becomes its opaque equivalent and
drops its backdrop blur. Three things keep their alpha, because nothing is
read through them:

- state washes (hover/press): a tint over a control that is already opaque
  under the mode (S9);
- disabled fills: exempt like their contrast (WCAG 1.4.3), and an opaque
  disabled fill reads as enabled;
- the modal scrim: its job is to dim the page behind the dialog; making it
  opaque would hide the context the dialog belongs to (S4).

Alternative: also make the scrim opaque (an opaque `overlay` remap), which
the mechanism supports with one more line.

**D2 — "Equivalent" means the opaque surface the glass reads as over the
page, keeping hierarchy.** Glass panels map to the scheme-aware surface one
step above the page (`surface-s0` in light, `surface-s3` in dark — what an
80 % panel over the page resolves to), and keep their border and elevation
shadow so a floating panel stays distinguishable (S3). Tone tints map to
their opaque twin of the same tone and emphasis. Every text on those
surfaces is held to ≥ 4.5:1 by the sweep (S5).

**D3 — Declaration: force on, never force off; more contrast implies it.**
`prefers-reduced-transparency: reduce` or `prefers-contrast: more` (043:
contrast over glass cannot be guaranteed) activates the mode. A page can also
activate it with `data-ki-transparency="reduce"` on the document root or a
theme root; `data-ki-contrast="more"` activates it too. No value switches it
off against the person's preference; other values are ignored. Same reasoning
as 043 D3.

**D4 — Scope and theming: as 043 D4 and D5.** One override file
`modes/reduced-transparency.tokens.json` of references, composed by the build
and emitted as differences; material3 re-asserts only the remapped tokens it
overrides. Its token set is disjoint from the contrast mode's, so the two
compose in either combination without an ordering rule (the build checks the
disjointness).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Glass becomes solid for people who find it hard to read (Priority: P1)

A person with a cognitive or visual impairment, or one who finds moving
content behind translucent panels distracting, turns on "Reduce
transparency". Menus, tooltips, dialogs and glass buttons become solid, keep
their colours' meaning and stay readable.

**Why this priority**: the mode's reason to exist.

**Independent Test**: open each glass component under the emulated
preference; read its painted background alpha and backdrop filter, and
measure its text.

**Acceptance Scenarios**:

1. **Given** an open select, a tooltip and a secondary button, **When** the page renders under the preference, **Then** each paints an opaque surface without blur.
2. **Given** any shipped theme and scheme, **When** it renders under the preference, **Then** every content surface is opaque and its text ≥ 4.5:1.

---

### User Story 2 - Safari users get it through the app (Priority: P1)

Safari does not report the preference. An app offers "Reduce transparency"
in its settings and sets one attribute on the document root.

**Why this priority**: without it the mode is unreachable for every Safari
user.

**Independent Test**: set the attribute with no preference emulated.

**Acceptance Scenarios**:

1. **Given** a page whose root declares transparency "reduce", **When** it renders with no preference, **Then** glass surfaces are opaque.

---

### User Story 3 - Hierarchy survives (Priority: P2)

Without glass a floating listbox must still read as floating, an alert must
still read as "info", and a dialog must still read as modal.

**Why this priority**: an opaque surface that loses its meaning trades one
accessibility problem for another.

**Independent Test**: inspect elevation, edge, tone and scrim under the mode.

**Acceptance Scenarios**:

1. **Given** an open listbox, **When** the mode is active, **Then** it keeps its elevation shadow and edge.
2. **Given** an open dialog, **When** the mode is active, **Then** the backdrop still dims the page.

---

### Edge Cases

- The browser does not report the media feature (Safari): only the
  declarations activate the mode (S6).
- Both 043 and 044 are active: their token sets are disjoint, so the result
  is the same in any combination.
- `forced-colors: active`: backgrounds are repainted by the user's palette
  regardless; no conflict.
- A component state that animates the blur in (dialog entrance, video
  control) has nothing to animate under the mode: the blur radius token is 0.
- A consumer token reassignment of a remapped glass token keeps its value
  under the mode (S11).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Opaque surfaces when the person asks for less transparency
  Under a "reduce" transparency preference, a "more" contrast preference, or
  when the page declares it, glass and translucent surfaces that hold content
  become opaque equivalents that keep their tone, contrast and hierarchy,
  through tokens alone.

  # S1
  Scenario: Glass surfaces become opaque under the system preference
    Given an onmars light page with an open "Country" select, a tooltip "Copy link" and a secondary button "Cancel"
    When the page renders under a "reduce" transparency system preference
    Then the listbox, the tooltip and the button paint opaque surfaces
    And none of them blurs what is behind it

  # S2
  Scenario: Tinted alerts and badges keep their tone on an opaque surface
    Given an onmars dark page with an info alert "Saved" and a success badge "Paid"
    When the page renders under a "reduce" transparency system preference
    Then the alert and the badge paint opaque surfaces of their own tone
    And their text measures at least 4.5:1 against those surfaces

  # S3
  Scenario: A floating surface stays distinguishable from the page
    Given an onmars light page with an open "Country" select
    When the page renders under a "reduce" transparency system preference
    Then the listbox keeps its elevation shadow and its edge against the page

  # S4
  Scenario: A dialog becomes opaque while its backdrop still dims the page
    Given an onmars light page with an open dialog "Delete file"
    When the page renders under a "reduce" transparency system preference
    Then the dialog paints an opaque surface without blur
    And the backdrop still dims the page behind the dialog

  # S5
  Scenario Outline: Every content surface is opaque in every shipped theme and colour scheme
    Given a <theme> page in the <scheme> colour scheme with every component that paints glass
    When the page renders under a "reduce" transparency system preference
    Then every surface that holds content paints an opaque colour without blur
    And every text on those surfaces measures at least 4.5:1

    Examples:
      | theme     | scheme |
      | onmars    | light  |
      | onmars    | dark   |
      | material3 | light  |
      | material3 | dark   |

  # S6
  Scenario: A page can declare reduced transparency without the system preference
    Given an onmars light page whose root declares the transparency "reduce"
    When the page renders under no transparency system preference
    Then the open "Country" listbox paints an opaque surface without blur

  # S7
  Scenario: More contrast also removes transparency
    Given an onmars light page with an open "Country" select
    When the page renders under a "more" contrast system preference
    Then the listbox paints an opaque surface without blur

  # S8
  Scenario: Without a preference or a declaration glass is unchanged
    Given an onmars light page with an open "Country" select
    When the page renders under no transparency or contrast system preference
    Then the listbox keeps its translucent glass surface and its backdrop blur

  # S9
  Scenario: Hover and press washes keep tinting the control they sit on
    Given an onmars light page with a ghost button "More" under the pointer
    When the page renders under a "reduce" transparency system preference
    Then the hover wash still tints the button over the page surface

  # S10
  Scenario: A themed region inside a page that declares reduced transparency keeps it
    Given a page whose root declares the transparency "reduce"
    When a region of the page declares the theme "material3"
    Then a secondary button inside the region paints an opaque surface without blur

  # S11
  Scenario: A page's own opaque value for a glass surface wins
    Given an onmars light page whose stylesheet sets the floating glass surface token to "#fafafa" under reduced transparency
    When the page renders under a "reduce" transparency system preference
    Then the open "Country" listbox paints "#fafafa"
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9 | |
| Keyboard path | — | No interaction changes: surfaces change paint only; focus indicators are untouched by this mode |
| Assistive-tech outcome | — | Token-only feature: no role, name, state or announcement changes |
| Form participation | — | No form behavior changes |
| Theming | S10, S11 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Under `prefers-reduced-transparency: reduce`, every surface
  that holds content MUST paint an opaque colour and no backdrop blur, in
  every shipped theme × scheme.
- **FR-002**: Opaque equivalents MUST keep the surface's tone and emphasis,
  floating surfaces MUST keep their elevation and edge, and text on them
  MUST measure ≥ 4.5:1.
- **FR-003**: State washes, disabled fills and the modal scrim MUST keep
  their alpha (D1).
- **FR-004**: `prefers-contrast: more`, `data-ki-transparency="reduce"` and
  `data-ki-contrast="more"` (root or theme root) MUST also activate the
  mode; nothing MAY switch it off against the preference.
- **FR-005**: Without any activation, every public token MUST resolve to
  exactly the value it has today.
- **FR-006**: The mode MUST be one override file of references, emitted as
  differences per theme, with a token set disjoint from 043's.

### Key Entities

- **Content surface**: a fill that text or content is painted on (panel,
  tooltip, dialog, button, badge, alert, counter, video control), as opposed
  to a wash, a disabled fill or a scrim.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive. New declaration
  `data-ki-transparency="reduce"`. No new, renamed or removed tokens; every
  default value unchanged.
- **Bundle budget** (Art. IV): two rule blocks per theme stylesheet; no
  runtime JavaScript.
- **Accessibility** (Art. V): honours a user preference the library ignored;
  keeps AA contrast on every opaque replacement.
- **Browser baseline** (Art. IV): the media feature is not in every engine
  (no Safari); the mode degrades to "off" there and the declaration covers
  it. No baseline reduction.
- **Tokens** (Art. VI): token-only; references to existing semantic tokens.
- **Guardrail/security boundary** (Art. VIII): none.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 content surfaces with alpha < 1 or a non-zero backdrop blur
  across the 4 theme × scheme cells under the mode, verified in the browser.
- **SC-002**: 0 texts under 4.5:1 on those surfaces, verified by the token
  sweep.
- **SC-003**: Outside the mode, token values and visual baselines are
  byte-identical.
- **SC-004**: 1 override file; material3 needs 0 mode files of its own.

## Assumptions

- Chromium, the PR gate engine, emulates the media feature through CDP
  (`Emulation.setEmulatedMedia` with `prefers-reduced-transparency`);
  Playwright's `emulateMedia` does not carry it.
- The dialog's surface gradient (`dialog-bg-start` → end) becomes a flat
  opaque surface under the mode; the gradient is part of the glass.
