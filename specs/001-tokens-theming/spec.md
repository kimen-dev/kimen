# Feature Specification: Tokens and theming — onmars default, material3 reference theme

**Feature Branch**: `001-tokens-theming`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "Fase 1 tokens/theming: tema onmars por defecto (light + dark) con valores desde el design file MarsUI; segundo tema de referencia material3 desde el Material 3 Design Kit (Community) para demostrar el re-theming en un paso, verificado en CI."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Default onmars appearance with zero configuration (Priority: P1)

A product team adds Kimen to their app and loads the tokens stylesheet. Without
configuring anything, the app renders with the onmars visual identity in its
light appearance: brand purple, neutral surfaces, Inter-based typography.

**Why this priority**: Every other theming behavior builds on a working default.
If the default theme does not resolve, nothing ships.

**Independent Test**: Load the tokens stylesheet in a blank document and read
the resolved values of the brand and surface tokens.

**Acceptance Scenarios**:

1. **Given** a document that loads the Kimen tokens stylesheet, **When** it renders with no theme configuration, **Then** brand and surface tokens resolve to the onmars light palette.
2. **Given** the same document, **When** any token from the published contract is read, **Then** it resolves to a concrete value (no gaps in the contract).

---

### User Story 2 - Dark appearance that respects the user (Priority: P2)

An end user whose operating system is set to dark mode opens a product built
with Kimen. The interface renders in the onmars dark appearance automatically.
The product can also force light or dark for the whole document, and that
choice wins over the system preference.

**Why this priority**: Dark mode is a core promise of the token system (one
token contract, two schemes) and a baseline user expectation.

**Independent Test**: Render the same document under emulated light and dark
system preferences, with and without the document-level override, and compare
resolved surface tokens.

**Acceptance Scenarios**:

1. **Given** a document with no explicit scheme declaration, **When** the system preference is dark, **Then** surfaces resolve to the onmars dark palette.
2. **Given** a document that declares scheme "light", **When** the system preference is dark, **Then** surfaces resolve to the onmars light palette.

---

### User Story 3 - Re-theming in one step, proven by material3 (Priority: P3)

A brand adopting Kimen wants its own visual identity. The material3 reference
theme demonstrates the path: a second theme built exclusively by reassigning
the theme and semantic token layers, activated by a single document-level
declaration. No component is modified, and the pipeline proves it on every
change.

**Why this priority**: This is the Fase 1 exit criterion, but it depends on
Stories 1-2 existing first.

**Independent Test**: Activate material3 on a document and verify (a) resolved
brand values match the Material 3 palette, and (b) the material3 token contract
is name-identical to the onmars contract.

**Acceptance Scenarios**:

1. **Given** a document loading the Kimen tokens and the material3 theme stylesheet, **When** the document declares theme "material3", **Then** brand tokens resolve to the Material 3 palette.
2. **Given** the compiled onmars and material3 stylesheets, **When** their token contracts are compared, **Then** the sets of token names are identical.

---

### Edge Cases

- A document declares an unknown theme name (e.g. "acme"): the appearance
  remains onmars (safe fallback, never undefined styles).
- A document declares theme "material3" but its stylesheet was not loaded:
  the appearance remains onmars (same safe fallback).
- The user switches the system color scheme while the page is open: the
  appearance follows without a reload.
- Brand fonts are unavailable at render time: typography falls back to the
  declared system font stacks.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Tokens and theming with onmars as the default theme
  Every visual value in Kimen resolves from a design token
  (primitive → theme → semantic). onmars is the default theme;
  a brand restyles the system by reassigning the theme and
  semantic layers only, proven by the material3 reference theme.

  # S1
  Scenario: onmars light is the default appearance without configuration
    Given a document that loads the Kimen tokens stylesheet
    When the document renders with no theme or scheme declaration
    Then the brand token resolves to the onmars purple "#845abe"
    And the base surface token resolves to white "#ffffff"

  # S2
  Scenario: dark appearance follows the system preference automatically
    Given a document that loads the Kimen tokens stylesheet
    When the document renders under a dark system color scheme
    Then the base surface token resolves to the onmars dark surface "#0a0a0a"

  # S3
  Scenario: a document can force dark over a light system preference
    Given a document whose root declares the color scheme "dark"
    When the document renders under a light system color scheme
    Then the base surface token resolves to the onmars dark surface "#0a0a0a"

  # S4
  Scenario: a document can force light over a dark system preference
    Given a document whose root declares the color scheme "light"
    When the document renders under a dark system color scheme
    Then the base surface token resolves to white "#ffffff"

  # S5
  Scenario: declaring the material3 theme restyles the document
    Given a document that loads the Kimen tokens and material3 stylesheets
    When the document root declares the theme "material3"
    Then the brand token resolves to the Material 3 primary "#6750a4"

  # S6
  Scenario: material3 exposes the identical token contract as onmars
    Given the compiled onmars and material3 stylesheets
    When their token contracts are compared
    Then material3 defines exactly the same set of token names as onmars

  # S7
  Scenario: an unknown theme declaration falls back to onmars
    Given a document that loads the Kimen tokens stylesheet
    When the document root declares the unknown theme "acme"
    Then the brand token resolves to the onmars purple "#845abe"
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2 | |
| Keyboard path | — | Token-only feature: no interactive surface ships in this feature |
| Assistive-tech outcome | — | No markup or announced state ships; contrast obligations are covered by FR-009/SC-005 |
| Form participation | — | No form component ships in this feature |
| Theming | S3, S4, S5, S6, S7 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: With zero configuration, the system MUST deliver the onmars
  light appearance as the default.
- **FR-002**: The dark appearance MUST activate automatically from the user's
  system color-scheme preference.
- **FR-003**: A document MUST be able to force the light or dark scheme with a
  single document-level declaration that wins over the system preference.
- **FR-004**: A document MUST be able to activate the material3 theme with a
  single document-level declaration plus its theme stylesheet.
- **FR-005**: material3 MUST be built exclusively by reassigning values in the
  theme and semantic layers, exposing a token contract name-identical to
  onmars.
- **FR-006**: Contract equality between themes MUST be verified automatically
  on every change; a divergence blocks the merge.
- **FR-007**: An unknown theme declaration MUST degrade to the onmars
  appearance, never to undefined styles.
- **FR-008**: onmars values MUST trace to the MarsUI design file and material3
  values to the Material 3 Design Kit, with the mapping documented per layer
  (primitive → theme → semantic).
- **FR-009**: The default text-on-surface pairs of both themes MUST meet
  contrast ≥4.5:1 in both light and dark schemes.

### Key Entities

- **Token**: a named design decision (color, spacing, radius, typography)
  with a resolved value; belongs to exactly one layer.
- **Layer**: primitive (raw ramps and scales), theme (brand identity: brand
  ramp, type families and type scale), semantic (role-based names components
  consume: surface, text, outline, overlay, elevation).
- **Theme**: a named, complete assignment of the theme + semantic layers
  (onmars, material3). Every theme ships light and dark schemes.
- **Scheme**: the light or dark variant within a theme, selected by system
  preference or document-level override.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): the token name contract and two
  document-level declarations (theme selection, scheme override) become
  public API (pre-1.0, first publication of this contract; no breaking
  change).
- **Bundle budget** (Art. IV): each compiled theme stylesheet stays within a
  single-digit KB compressed budget; no runtime dependency (none added).
- **Accessibility** (Art. V): default text/surface pairs meet AA contrast in
  both themes and schemes (FR-009); system color-scheme preference respected
  (FR-002). No new interaction pattern → no APG walkthrough required.
- **Tokens** (Art. VI): this feature IS the token system: primitive → theme →
  semantic layers; the component layer starts with the first Fase 2
  component. Re-theming by semantic/theme reassignment proven in CI (FR-005,
  FR-006).
- **Catalog/agent legibility** (Art. I): the tokens package ships a
  when-to-use/when-NOT-to-use description and a machine-readable token
  reference so agents can theme correctly from the description alone.
- **Guardrail/security boundary** (Art. VIII): none — no spec-rendering,
  actions or adapter surface is touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Activating material3 requires exactly 1 document-level
  declaration (plus loading its stylesheet) and 0 changes to component
  files — verified on every pipeline run.
- **SC-002**: 100% of the token contract names are present in both themes;
  the comparison is exact and automated.
- **SC-003**: Switching light↔dark requires at most 1 document-level change,
  and 0 when following the system preference.
- **SC-004**: Every compiled theme stylesheet stays within its declared
  size budget (single-digit KB compressed), enforced by the budget gate.
- **SC-005**: Default text-on-surface pairs measure ≥4.5:1 contrast in both
  themes and both schemes, verified automatically.

## Assumptions

- material3 ships light and dark schemes, using the Material 3 Design Kit
  baseline palette (default seed; primary #6750a4). The kit is a reference,
  not a pixel-perfect Material implementation.
- Theme and scheme declarations apply at the document root; subtree-scoped
  theming may work naturally but is not guaranteed or tested in this feature.
- The onmars token sources generated from MarsUI on 2026-07-05 (primitive,
  theme, semantic, dark) are the working base of this feature.
- The token component layer, the RTL showcase and forced-colors/high-contrast
  support are out of scope: component layer grows with Fase 2 components; RTL
  ships as its own Fase 1 feature; forced-colors is tracked for later.
- Figma letter-spacing percentages compile to em units; radius compiles to
  px; spacing and type sizes compile to rem (decisions recorded with the
  generated sources).
