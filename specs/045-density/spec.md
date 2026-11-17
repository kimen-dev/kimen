# Feature Specification: Compact density for regions

**Feature Branch**: `045-density`

**Created**: 2026-11-17

**Status**: Confirmed — decisions D1–D5 accepted by the founder on 2026-11-17

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
`--ki-size-target-min` (24px) and the compact size, so compact can never
produce a target under 24 × 24 CSS px, whatever the size prop or theme (S4,
S5). The floor is in px on purpose: WCAG measures CSS px, and a page that
shrinks its root font size must not shrink the floor.

**D5 — Mechanism and theming: two inherited tokens consumed by component
CSS.** Recommended:

- `--ki-density-control-offset` (`0px` default, `-8px` compact) — added to
  every scaled block size;
- `--ki-density-space-scale` (`1` default, `0.75` compact) — multiplies every
  scaled padding and gap.

Components compute `max(var(--ki-size-target-min), calc(<their size token> +
var(--ki-density-control-offset)))` where they use the size. Because the two
tokens are numbers that nothing aliases, they inherit through any element,
shadow roots included, and resolve against whatever theme is active where the
component is: one declaration rule, no per-theme files, consumer themes
included. The tokens are declared once on the document root, never on theme
roots, so a theme region nested inside a compact region stays compact (S8);
the build fails if any token aliases them or any theme overrides them.

Rejected — remapping every size token per level (`button-md-height` → …):
two theme-specific lists, the alias problem of 043 D4 (it would only work on
theme roots), and roughly 70 new mode declarations instead of 2.

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
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S9, S10, S11 | |
| Keyboard path | — | No interaction changes: density changes dimensions only; every keyboard path and focus indicator is unchanged |
| Assistive-tech outcome | — | No role, name, state or announcement changes; the accessibility obligation of this feature (WCAG 2.5.8 target size) is measured by S4 and S5 |
| Form participation | — | No form behavior changes |
| Theming | S8, S12 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `data-ki-density="compact"` on any element MUST shorten the
  block size of every scaled control and row inside it by the compact
  offset, and scale every scaled container padding and gap by the compact
  factor (D2, D3).
- **FR-002**: Font sizes, line heights, icon sizes, radius, borders, focus
  rings and content sizes MUST NOT change.
- **FR-003**: No interactive target MAY render smaller than
  `--ki-size-target-min` (24 × 24 CSS px) under any density, size or theme.
- **FR-004**: The nearest density declaration MUST win; `default` MUST
  restore the default; unknown values MUST be ignored.
- **FR-005**: A theme root nested in a compact region MUST stay compact; the
  density tokens MUST be declared only on the document root, and the build
  MUST fail if a theme overrides them or another token aliases them.
- **FR-006**: Without a declaration, every component MUST measure exactly as
  it does today.
- **FR-007**: Reassigning the density tokens MUST restyle compact regions
  without any other change (S12).

### Key Entities

- **Density**: a named region-level step (default, compact) applied through
  two inherited tokens.
- **Target minimum**: the smallest interactive dimension any density may
  produce, `--ki-size-target-min`.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive. New declaration
  `data-ki-density`; new tokens `--ki-density-control-offset`,
  `--ki-density-space-scale`, `--ki-size-target-min`. No prop added; `size`
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

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Making a region compact takes 1 attribute on 1 element and 0
  token redeclarations by the consumer.
- **SC-002**: 0 interactive targets under 24 × 24 CSS px in a compact region,
  across every interactive component × size × theme.
- **SC-003**: Without a declaration, 0 visual baseline changes.
- **SC-004**: Compact adds 2 mode declarations to the token stylesheet; 0
  theme-specific density files.

## Assumptions

- The floor is a pointer-target guarantee, not a visual one: a checkbox or
  radio indicator stays 20px because its target is the labelled row.
- `ki-avatar`, `ki-badge` and `ki-indicator` keep their `size` props as
  content-size choices; density does not touch them.
- Visual baselines for compact are new captures added by this feature; they
  are generated on CI Linux and accepted by the founder.
