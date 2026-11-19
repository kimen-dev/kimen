# Feature Specification: Compact density for regions

**Feature Branch**: `045-density`

**Created**: 2026-11-17

**Status**: Confirmed — decisions D1–D5 accepted by the founder on 2026-11-17;
Amendment A1 (touch density) decided by the founder on 2026-11-19 (issue #319)

**Input**: User description: "La densidad solo existe como props `size` por componente (`ki-button`, `ki-icon-button`, `ki-avatar`, `ki-badge`). Mecanismo: atributo o clase en cualquier ancestro que reasigna tokens de espaciado y tamaño por herencia, frente a una prop por componente. Niveles. Qué escala. Cómo se respeta el tamaño mínimo de objetivo de WCAG 2.5.8 (24×24)."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis

On `main` at 692cbb2 the default control height is 40px in onmars
(`button-md-height`, `input-height`, `select-height`, `list-item-min-height`,
`tab-min-block-size`: all `space-12xl`) and 48px in material3 for fields and
list rows (`space-14xl`); material3 overrides 34 size and spacing tokens of
its own. So a compact level cannot be one shared list of remapped values: it
would need one list per theme. What both themes share is the step.

Material's density scale removes 4px of height per step (0, −1, −2, −3) and
changes height only, not type or icons. WCAG 2.5.8 (AA) asks for targets of
at least 24 × 24 CSS px; Kimen's smallest targets today are exactly 24px
(`button-xs-height`, `icon-button-xs-size`) and material3's tab is 24px, so
any step without a floor would breach it.

The existing `size` props pick a size within a density; they stay.

## Decisions *(founder, 2026-11-17)*

**D1 — Mechanism: a declaration on any ancestor, inherited, not a prop.**
`data-ki-density="compact"` on any element makes its region compact;
`data-ki-density="default"` restores the default inside it; the nearest
declaration wins; any other value is ignored. Recommended over a per-component
prop because density is a property of a region (a data table, a toolbar, a
dense settings panel), the same declaration must reach generated UI whose
components the host does not write, and a prop on 15 components is 15 public
API members for one decision.

**D2 — Levels: `default` and `compact`.** Compact is Material's −2 step:
controls and rows 8px shorter (onmars 40 → 32, material3 fields 48 → 40),
container padding and gaps × 0.75 (16 → 12). One level is what the use cases
need today (Art. VII); the tokens below let a consumer define a different
step without new API (S12). Alternative: also ship `comfortable` (+4px).

**D3 — What scales.**

| Scales | Does not scale |
|---|---|
| Block size of controls and rows: button, icon button (both axes), text field, select, textarea minimum, option, list item, tab | Font sizes and line heights |
| Container padding and gaps: card, dialog, alert, list, select listbox, tab panel, tooltip | Icon sizes, radius, borders, focus ring |
| | Content sizes: avatar, badge, QR, progress, video, indicator, status |
| | The checkbox, radio and switch indicators (their target is the labelled row) |

Inline padding of controls does not change: density is about height, as in
Material.

**D4 — WCAG 2.5.8: a floor, applied by the component.** Every scaled
interactive dimension renders as the larger of the target minimum token
`--ki-density-target-min` (24px, an alias of the primitive `ki.size.target-min`) and the compact size, so compact can never
produce a target under 24 × 24 CSS px, whatever the size prop or theme (S4,
S5). The floor is in px on purpose: WCAG measures CSS px, and a page that
shrinks its root font size must not shrink the floor.

**D5 — Mechanism and theming: two inherited tokens consumed by component
CSS.** Recommended:

- `--ki-density-control-offset` (`0px` default, `-8px` compact) — added to
  every scaled block size;
- `--ki-density-space-scale` (`1` default, `0.75` compact) — multiplies every
  scaled padding and gap.

Components compute `max(var(--ki-density-target-min), calc(<their size token> +
var(--ki-density-control-offset)))` where they use the size. Because nothing aliases the two
tokens, they inherit through any element, shadow roots included, and resolve
against whatever theme is active where the component is: one declaration
rule, no per-theme files, consumer themes included.

*Implementation note (2026-11-17):* the values live in primitives, because
the semantic layer holds references only (`ki.space.zero` and
`ki.space.minus-md` for the offset, `ki.scale.unit` and `ki.scale.compact`
for the scale), and the floor is the semantic `--ki-density-target-min`
aliasing the primitive `ki.size.target-min`, because components consume only
public semantic and component tokens. The build marks the two density tokens
with `$extensions["dev.kimen"].inherit = "document"`, declares them in their
own `:root` rule, and fails if a token aliases them or a theme or mode
reassigns them or what they reference. The native input of `ki-input` now
spans the whole field height: in material3 its text line measured under
24px, a WCAG 2.5.8 target that predates this spec and that S5 measures. The tokens are declared once on the document root, never on theme
roots, so a theme region nested inside a compact region stays compact (S8);
the build fails if any token aliases them or any theme overrides them.

Rejected — remapping every size token per level (`button-md-height` → …):
two theme-specific lists, the alias problem of 043 D4 (it would only work on
theme roots), and roughly 70 new mode declarations instead of 2.

## Amendment A1: a touch density *(decided 2026-11-19)*

**Status**: Intent decided by the founder on 2026-11-19, who approved the
proposal of issue #319 (a third level on the existing machinery, opt-in
only). The values and the rules below record that decision. Three points
follow from it and were settled at implementation, so they await the
founder's confirmation with the change: which controls extend their target
and which grow to it (A1-D3, last two sentences), the capped floor (A1-D4)
and the complete density set per level (A1-D5).

**Path**: in place, through the Art. II amendment path: one feature, so the
new scenarios are appended (S13–S23) and none is retired or renumbered.

### Design source

The Figma file "Kimen UI" has a `mobile` size on `Toggle` (`10023:1125`) and
`*-Mobile` type modes, but no touch density: nothing in it says how tall a
control is on a touch screen. The values therefore come from the standards:
WCAG 2.5.5 Target Size (Enhanced, AAA) and Apple's Human Interface
Guidelines both ask for 44 × 44 CSS px (44pt) targets. Material asks for
48dp; a consumer who follows Material sets the minimum to 48px through the
token (S23). Kimen's default floor, 24px, is the AA minimum of WCAG 2.5.8.

### Decisions

- **A1-D1 Level.** `data-ki-density="touch"` is a third level, declared
  exactly like `compact`: on any element, inherited by its region, nested at
  will, the nearest declaration winning (D1). An unknown value still falls
  back to the default (S11).
- **A1-D2 Step.** Touch is one +4px step: `--ki-density-control-offset`
  becomes `4px` (`ki.space.xs`), so the medium button and the medium text
  field go from 40px to 44px tall (S13), and every scaled control and row
  grows by the same step: no size shrinks, and sizes never invert. Container
  spacing stays at the default step (`--ki-density-space-scale` `1`): touch
  is about targets, not about air (S17). Text and icon sizes do not change
  (FR-002 holds).
- **A1-D3 Target.** `--ki-density-target-min` becomes `44px` in touch (the
  new primitive `ki.size.target-touch`). It is a pointer-target minimum, not
  a painted size. The small controls — checkbox, radio, switch, icon button
  and the dismiss control of `ki-alert` — and the buttons the step leaves
  under 44px (`xs` 28px, `sm` 36px) keep their painted size and their place
  in the layout; their target extends beyond what they paint, invisibly and
  centred on the control, to 44 × 44 CSS px (S15, S16). Icon buttons do not
  take the touch step: their painted square stays 24/32/40/48/56px and only
  their target grows (S14). Rows (option, list item) and tabs are their own
  targets and are not extended — stacked rows would extend into each other,
  and the tab strip scrolls and clips what a tab draws outside it — so the
  target minimum lifts them instead, as it does today. Text fields reach 44px
  through the step; a field's target is its field box.
- **A1-D4 The floor stops a shrink, it never forces a growth.** D4 floors a
  scaled dimension at the target minimum. For the controls of A1-D3 that
  floor is capped at the control's own standard size:
  `max(min(target-min, size), size + offset)` for buttons and
  `min(size, max(target-min, size + offset))` for icon buttons. With the
  24px minimum (default and compact) both resolve exactly as before;
  with the 44px minimum the floor never paints.
- **A1-D5 Nesting.** Every level declares the whole density set — offset,
  space scale and target minimum — so a touch region nested in a compact
  region is fully touch, and the other way round (S19, S20). The target
  minimum joins the other two tokens as inherited from the document (D5): it
  is declared on `:root` alone, so a theme region nested in a touch region
  keeps the touch targets (S22).
- **A1-D6 Opt-in only.** Kimen never applies touch by itself: no Kimen
  stylesheet changes a density token under `@media (pointer: coarse)` (S21).
  Whether a coarse pointer means touch density is the product's decision, and
  a hybrid device (a laptop with a touch screen) reports the pointer its
  maker chose, not the one in use.

### Non-goal: automatic touch density on coarse pointers

The proposal offered to apply touch under `@media (pointer: coarse)`; the
founder kept it opt-in. A consumer who wants that behaviour writes it in
their own stylesheet, with the public tokens, after Kimen's:

```css
@media (pointer: coarse) {
  :root {
    --ki-density-control-offset: var(--ki-space-xs);
    --ki-density-space-scale: var(--ki-scale-unit);
    --ki-density-target-min: var(--ki-size-target-touch);
  }
}
```

Regions that declare a density keep winning inside such a page, because a
declaration on an element outranks what the root passes down.

### Edge cases

- An extended target does not reserve room in the layout. Two small
  controls closer than 44px centre to centre share the overlap, and the one
  painted later receives it; a radio group or a toolbar at its default
  spacing is such a case. Spacing touch controls apart is the page's
  decision; the targets themselves never shrink.
- A control flush against an ancestor that clips its overflow (a card's
  media, a scroll container) loses the part of its target outside it.
- A mouse resting over the extended target hovers the control: the target
  is where the control is, for every pointer.
- `size="xs"` buttons paint 28px in touch and accept a pointer across 44px.

### Decisions on the open questions *(founder, 2026-11-19)*

1. **Which values?** WCAG 2.5.5 and Apple's HIG: 44 × 44 CSS px targets,
   medium controls 44px tall; Figma has no touch density to read from.
2. **Automatic under a coarse pointer?** No: opt-in only, documented above.
3. **Do small controls grow?** No: their target extends, their painted size
   stays.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A dense region in an otherwise comfortable page (Priority: P1)

A product shows an admin table with row actions and filters inside a page of
roomy forms. The team marks the table's container compact; its controls and
rows get shorter and its spacing tighter, and the rest of the page is
untouched.

**Why this priority**: the core use case; density is a regional choice.

**Independent Test**: measure real components inside and outside a compact
region.

**Acceptance Scenarios**:

1. **Given** a medium button and a text field inside a region, **When** the region declares compact, **Then** they measure 32px tall and 40px outside.
2. **Given** a card inside a compact region, **Then** its body padding is 12px instead of 16px.

---

### User Story 2 - Compact never costs accessibility (Priority: P1)

Whatever size and theme a component uses, compact never makes something a
person has to hit smaller than 24 × 24 CSS px, and never shrinks text or
icons.

**Why this priority**: a density that breaks WCAG 2.5.8 cannot ship (Art. V).

**Independent Test**: sweep every interactive component in every size under
compact in both themes and measure each target.

**Acceptance Scenarios**:

1. **Given** every interactive component in every size in a compact region, **Then** every target measures ≥ 24 × 24.

---

### User Story 3 - Density composes with themes and nesting (Priority: P2)

Compact follows the active theme's own sizes, a nested region can return to
default, a theme region inside a compact region stays compact, and a whole
page can be compact with one declaration on its root.

**Why this priority**: generated UI is embedded and nested (spec 001
story 4); the declaration must compose like theme and scheme do.

**Independent Test**: nest regions with density and theme declarations and
measure components at each level.

**Acceptance Scenarios**:

1. **Given** a material3 text field in a compact region, **Then** it measures 40px instead of 48px.
2. **Given** a region declaring default inside a compact region, **Then** components inside measure their default size.

---

### User Story 4 - A touch surface with 44 × 44 targets (Priority: P2, Amendment A1)

A product ships a kiosk screen, or a mobile layout, inside an otherwise
desktop page. The team marks the region touch: its medium controls grow to
44px, every control a finger has to hit offers a 44 × 44 CSS px target, and
nothing else changes — not the type, not the icons, not the spacing, not the
size of a checkbox.

**Why this priority**: WCAG 2.5.5 (AAA) and Apple's HIG ask for 44px
targets on touch-first surfaces; the 24px floor of compact is the AA minimum
and is small under a finger.

**Independent Test**: measure real components inside and outside a touch
region, and probe each target with the pointer hit test.

**Acceptance Scenarios**:

1. **Given** a medium button and a text field inside a region, **When** the region declares touch, **Then** they measure 44px tall and 40px outside.
2. **Given** a checkbox in a touch region, **Then** its box still paints 20px and a pointer anywhere in the 44 × 44 square around it toggles it.

---

### Edge Cases

- `size="xs"` buttons and icon buttons are already 24px: in compact they stay
  24px (the floor), the same as `sm`. Sizes may coincide in compact; they
  never invert.
- A consumer that reassigns a component size token (`--ki-button-md-height`)
  still gets the compact step on top of its own value.
- A region declares compact and a nested element declares an unknown value:
  the unknown value is ignored and the region stays compact.
- Compact on the document root and a nested `default` region: the region
  renders at default.
- Container queries inside components are unaffected: density changes
  dimensions, not breakpoints.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: A compact density for dense regions
  Any element can declare a compact density for its region: controls and
  rows get shorter and container spacing gets tighter, text and icons keep
  their size, and no interactive target ever drops below 24 by 24 CSS pixels.

  # S1
  Scenario: A compact region shortens its controls
    Given an onmars page with a medium button "Save" and a text field "Email" inside a region
    When the region declares the density "compact"
    Then the button and the text field inside the region measure 32px tall
    And the same controls outside the region keep 40px

  # S2
  Scenario: A compact region tightens container spacing
    Given an onmars page with a card "Invoice" inside a region
    When the region declares the density "compact"
    Then the card body padding shrinks from 16px to 12px

  # S3
  Scenario: Compact keeps text and icon sizes
    Given an onmars page with a medium button "Save" with a leading icon inside a region
    When the region declares the density "compact"
    Then the label font size and the icon size are the same as outside the region

  # S4
  Scenario: No interactive target shrinks below 24 by 24 pixels
    Given an onmars page with an extra-small button "Undo" and an extra-small icon button "Close" inside a region
    When the region declares the density "compact"
    Then both measure at least 24 by 24 CSS pixels

  # S5
  Scenario Outline: Every interactive component meets the minimum target in compact
    Given a <theme> page with every interactive component in every size inside a region
    When the region declares the density "compact"
    Then every interactive target measures at least 24 by 24 CSS pixels

    Examples:
      | theme     |
      | onmars    |
      | material3 |

  # S6
  Scenario: Compact follows the active theme's own sizes
    Given a material3 page with a text field "Email" inside a region
    When the region declares the density "compact"
    Then the text field measures 40px tall instead of its standard 48px

  # S7
  Scenario: A nested region can return to the default density
    Given a compact region with a medium button "Save"
    When a region nested inside it declares the density "default"
    Then a medium button inside the nested region measures 40px tall
    And the button "Save" between the two regions keeps 32px

  # S8
  Scenario: A themed region inside a compact region stays compact
    Given an onmars page with a compact region
    When a region nested inside it declares the theme "material3"
    Then a text field inside the nested region measures 40px tall

  # S9
  Scenario: The whole page can be compact
    Given an onmars page with a medium button "Save" in its body
    When the page root declares the density "compact"
    Then the button measures 32px tall

  # S10
  Scenario: Without a declaration every component keeps its standard dimensions
    Given an onmars page with every component and no density declaration
    When the page renders
    Then every component measures exactly as it did before compact density existed

  # S11
  Scenario: An unknown density falls back to the default
    Given an onmars page with a medium button "Save" inside a region
    When the region declares the density "cozy"
    Then the button measures 40px tall

  # S12
  Scenario: Reassigning the compact step restyles compact regions
    Given an onmars page whose stylesheet sets the compact control offset token to "-4px"
    When a region declares the density "compact"
    Then a medium button inside the region measures 36px tall

  # Amendment A1 (decided 2026-11-19, issue 319): a touch density, opt-in
  # Family: core behavior
  # S13
  Scenario: A touch region grows its medium controls to 44 pixels
    Given an onmars page with a medium button "Save" and a text field "Email" inside a region
    When the region declares the density "touch"
    Then the button and the text field inside the region measure 44px tall
    And the same controls outside the region keep 40px

  # S14
  Scenario: Touch grows every button size by one step and leaves icon buttons their size
    Given an onmars page with a button "Save" and an icon button "Close" in every size inside a region
    When the region declares the density "touch"
    Then every button inside the region measures 4px taller than the same size outside it
    And every icon button inside the region measures the same as the same size outside it

  # S15
  Scenario: Small controls keep their painted size and their place in touch
    Given an onmars page with a checkbox "Accept", a radio "Basic", a switch "Alerts" and a dismissible alert "Saved" inside a region
    When the region declares the density "touch"
    Then each checkbox box, radio circle, switch track and dismiss control measures the same as outside the region
    And each component takes the same space as outside the region

  # S16
  Scenario Outline: Every interactive target accepts a pointer across 44 by 44 pixels in touch
    Given a <theme> page with every interactive component in every size inside a region
    When the region declares the density "touch"
    Then a pointer anywhere in the 44 by 44 CSS pixel square centred on each interactive target reaches that target

    Examples:
      | theme     |
      | onmars    |
      | material3 |

  # S17
  Scenario: Touch keeps text sizes, icon sizes and container spacing
    Given an onmars page with a medium button "Save" with a leading icon and a card "Invoice" inside a region
    When the region declares the density "touch"
    Then the label font size, the icon size and the card body padding are the same as outside the region

  # S18
  Scenario: Touch follows the active theme's own sizes
    Given a material3 page with a text field "Email" inside a region
    When the region declares the density "touch"
    Then the text field measures 52px tall instead of its standard 48px

  # S19
  Scenario: A touch region nested in a compact region is touch
    Given a compact region holding a region with a medium button "Save" and a card "Invoice"
    When the nested region declares the density "touch"
    Then the button measures 44px tall
    And the card body padding is 16px

  # S20
  Scenario: A compact region nested in a touch region is compact
    Given a touch region holding a region with a medium button "Save" and an extra-small icon button "Close"
    When the nested region declares the density "compact"
    Then the button measures 32px tall
    And the icon button's target ends at its 24px box

  # S21
  Scenario: A coarse pointer alone does not change the density
    Given an onmars page with a medium button "Save" and no density declaration
    When the page renders on a device whose primary pointer is coarse
    Then the button measures 40px tall

  # Family: theming
  # S22
  Scenario: A themed region inside a touch region stays touch
    Given an onmars page with a touch region
    When a region nested inside it declares the theme "material3"
    Then a text field inside the nested region measures 52px tall
    And a pointer anywhere in the 44 by 44 square centred on a checkbox inside it reaches the checkbox

  # S23
  Scenario: Reassigning the touch target minimum restyles touch regions
    Given an onmars page whose stylesheet sets the touch target minimum token to "48px"
    When a region declares the density "touch"
    Then a pointer anywhere in the 48 by 48 square centred on an extra-small icon button reaches it
    And the icon button still measures 24px
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S9, S10, S11, S13, S14, S15, S16, S17, S18, S19, S20, S21 | |
| Keyboard path | — | No interaction changes: density changes dimensions and pointer targets only; every keyboard path and focus indicator is unchanged (Amendment A1 included) |
| Assistive-tech outcome | — | No role, name, state or announcement changes; the accessibility obligation of this feature (WCAG 2.5.8 target size, and WCAG 2.5.5 in touch) is measured by S4, S5 and S16 |
| Form participation | — | No form behavior changes |
| Theming | S8, S12, S22, S23 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `data-ki-density="compact"` on any element MUST shorten the
  block size of every scaled control and row inside it by the compact
  offset, and scale every scaled container padding and gap by the compact
  factor (D2, D3).
- **FR-002**: Font sizes, line heights, icon sizes, radius, borders, focus
  rings and content sizes MUST NOT change.
- **FR-003**: No interactive target MAY render smaller than
  `--ki-density-target-min` (24 × 24 CSS px) under any density, size or theme.
- **FR-004**: The nearest density declaration MUST win; `default` MUST
  restore the default; unknown values MUST be ignored.
- **FR-005**: A theme root nested in a compact region MUST stay compact; the
  density tokens MUST be declared only on the document root, and the build
  MUST fail if a theme overrides them or another token aliases them.
- **FR-006**: Without a declaration, every component MUST measure exactly as
  it does today.
- **FR-007**: Reassigning the density tokens MUST restyle compact regions
  without any other change (S12).

Amendment A1 (decided 2026-11-19):

- **FR-008**: `data-ki-density="touch"` on any element MUST grow the block
  size of every scaled control and row inside it by the touch offset (4px),
  except icon buttons, and MUST keep container padding and gaps at the
  default step (A1-D2, S13, S14, S17).
- **FR-009** *(amends FR-003)*: Under touch, a pointer anywhere in the
  44 × 44 CSS px square centred on any interactive target MUST reach that
  target (`--ki-density-target-min`). Checkbox, radio, switch, icon button,
  the `ki-alert` dismiss control and buttons painted under the minimum MUST
  reach it without painting more or taking more space; rows and tabs MAY
  grow to it (A1-D3, S15, S16).
- **FR-010** *(amends D4)*: The target minimum MUST NOT lift a button or an
  icon button above its own standard size; it only stops a shrink (A1-D4,
  S10, S14).
- **FR-011** *(amends FR-004, FR-005)*: Every density level MUST declare the
  control offset, the space scale and the target minimum, so the nearest
  declaration wins whatever it is nested in; the target minimum MUST be
  inherited from the document like the other two (A1-D5, S19, S20, S22).
- **FR-012**: No Kimen stylesheet MAY change a density token under a pointer
  media query: touch is opt-in only (A1-D6, S21).
- **FR-013** *(amends FR-007)*: Reassigning the density tokens MUST restyle
  touch regions without any other change (S23).

### Key Entities

- **Density**: a named region-level step (default, compact) applied through
  two inherited tokens.
- **Target minimum**: the smallest interactive dimension any density may
  produce, `--ki-density-target-min`.
- **Touch** *(Amendment A1)*: the level whose step is +4px and whose target
  minimum is 44 × 44 CSS px; a target it extends is invisible and takes no
  space.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive. New declaration
  `data-ki-density`; new tokens `--ki-density-control-offset`,
  `--ki-density-space-scale`, `--ki-density-target-min`. No prop added; `size`
  props unchanged. A declaration in `changes/api/` records the tokens.
- **Bundle budget** (Art. IV): one `calc()`/`max()` per scaled dimension in
  about 15 component stylesheets and two rules in the token stylesheet; no
  runtime JavaScript. Per-component budgets re-measured.
- **Accessibility** (Art. V): WCAG 2.5.8 enforced by construction (floor) and
  by a browser sweep (S5). No new interaction pattern.
- **Browser baseline** (Art. IV): `calc()`, `max()` and custom-property
  inheritance into shadow roots are Baseline.
- **Tokens** (Art. VI): three new tokens; no size token duplicated per level.
- **Guardrail/security boundary** (Art. VIII): none.

Amendment A1 (decided 2026-11-19):

- **Public API delta** (Art. IX): additive. New value `touch` of
  `data-ki-density`; new primitive token `--ki-size-target-touch` (44px).
  `--ki-density-target-min` keeps its name and default value and becomes
  inherited from the document: it is declared on `:root` and in every
  density rule, no longer on theme roots. Every density rule now declares
  all three density tokens. No prop, part or slot changes. Declared in
  `changes/api/` with the implementation.
- **Bundle budget** (Art. IV): one invisible target rule in the shared
  button surface and one in `ki-alert`, one more operand in the target rules
  of checkbox, radio and switch, a capped floor in `ki-button` and
  `ki-icon-button`, an inline floor in `ki-tab`; one rule in the token
  stylesheet. No runtime JavaScript.
- **Accessibility** (Art. V): WCAG 2.5.5 (AAA) target size in touch regions,
  measured by hit-testing every target (S16); the AA floor of WCAG 2.5.8 is
  unchanged everywhere else.
- **Browser baseline** (Art. IV): `min()` inside `max()`, absolutely
  positioned pseudo-elements as pointer targets and `isolation` are Baseline.
- **Tokens** (Art. VI): one new primitive; the three density tokens gain one
  rule; no size token duplicated per level.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Making a region compact takes 1 attribute on 1 element and 0
  token redeclarations by the consumer.
- **SC-002**: 0 interactive targets under 24 × 24 CSS px in a compact region,
  across every interactive component × size × theme.
- **SC-003**: Without a declaration, 0 visual baseline changes.
- **SC-004**: Compact adds 2 mode declarations to the token stylesheet; 0
  theme-specific density files.
- **SC-005** *(Amendment A1)*: 0 interactive targets a pointer cannot reach
  across 44 × 44 CSS px in a touch region, across every interactive
  component × size × theme.
- **SC-006** *(Amendment A1)*: 0 checkbox, radio, switch, icon button or
  dismiss control that paints larger or takes more space in a touch region
  than outside it.
- **SC-007** *(Amendment A1)*: 0 density changes on a coarse-pointer device
  without a declaration.

## Assumptions

- The floor is a pointer-target guarantee, not a visual one: a checkbox or
  radio indicator stays 20px because its target is the labelled row.
- `ki-avatar`, `ki-badge` and `ki-indicator` keep their `size` props as
  content-size choices; density does not touch them.
- Visual baselines for compact are new captures added by this feature; they
  are generated on CI Linux and accepted by the founder.
- *(Amendment A1)* The invisible target of a small control is part of the
  control for every pointer, so it also receives hover and clicks from a
  mouse; it paints nothing.
- *(Amendment A1)* Touch adds no visual baseline of its own until the
  founder asks for one; the touch measurements are browser tests.
