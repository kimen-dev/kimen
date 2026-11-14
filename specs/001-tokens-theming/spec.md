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

### User Story 4 - A region with its own theme or scheme (Priority: P3)

A host page embeds an island of generated UI. The island needs its own theme
or colour scheme — material3 inside an onmars page, a dark panel inside a
light page, or the default theme inside a page themed otherwise — without
touching the page around it, and nesting must compose.

**Why this priority**: generative UI is embedded in pages Kimen does not own.
Document-only theming forces the host to adopt the island's theme or the
island to give up its own.

**Independent Test**: Declare a theme or a scheme on an element and compare
what real components paint inside and outside it with what they paint in a
document themed that way at the root.

**Acceptance Scenarios**:

1. **Given** an onmars document, **When** a subtree declares theme "material3", **Then** components inside it render as in a material3 document and components outside keep the onmars appearance.
2. **Given** a light document, **When** a subtree declares scheme "dark", **Then** components inside it render as in a dark document and components outside keep the light appearance.
3. **Given** nested subtrees, **When** each declares a theme and/or a scheme, **Then** every component follows its nearest declaration.

---

### User Story 5 - A dark page that is coherent without extra stylesheets (Priority: P2)

A visitor who prefers dark opens a page that loads only the Kimen tokens
stylesheet. The browser paints the page canvas, scrollbars and native
controls in the same scheme the tokens resolve to, so component text is
never light-on-light.

**Why this priority**: the alternative shipped an unreadable combination by
default — dark tokens on a light canvas — unless an opt-in stylesheet was
also loaded.

**Independent Test**: Load only the tokens stylesheet under an emulated dark
system preference and measure every rendered string against the surface
actually behind it, down to the browser canvas.

**Acceptance Scenarios**:

1. **Given** a document that loads only the tokens stylesheet, **When** the system preference is dark, **Then** the canvas and native controls render dark and every component string meets 4.5:1.

---

### Edge Cases

- A subtree declares an unknown theme name, or a theme whose stylesheet was
  not loaded: the subtree renders in the default theme (the same safe
  fallback as at the root).
- A subtree declares only a scheme inside a themed ancestor subtree: it keeps
  that ancestor's theme and flips its scheme alone.
- A page pins its own `color-scheme`: the tokens follow the page's
  declaration, not the system preference.
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
    Given a document that loads the Kimen tokens and material3 stylesheets
    When the document root declares the theme "material3"
    Then every token name of the onmars contract resolves to a value
    And the material3 stylesheet reassigns no token name outside that contract

  # S7
  Scenario: an unknown theme declaration falls back to onmars
    Given a document that loads the Kimen tokens stylesheet
    When the document root declares the unknown theme "acme"
    Then the brand token resolves to the onmars purple "#845abe"

  # S8
  Scenario: a subtree can declare the material3 theme inside an onmars document
    Given an onmars document that loads the Kimen tokens and material3 stylesheets
    When a subtree of the document declares the theme "material3"
    Then a button and a text field inside the subtree render as they do in a material3 document
    And a button and a text field outside the subtree keep the onmars appearance

  # S9
  Scenario: a subtree can return to the default theme inside a material3 document
    Given a document whose root declares the theme "material3"
    When a subtree of the document declares the theme "onmars"
    Then a button and a text field inside the subtree render as they do in an onmars document
    And a button and a text field outside the subtree keep the material3 appearance

  # S10
  Scenario: a subtree can force dark inside a light document
    Given a document that renders in the light color scheme
    When a subtree of the document declares the color scheme "dark"
    Then a button and a text field inside the subtree render as they do in a dark document
    And a button and a text field outside the subtree keep the light appearance

  # S11
  Scenario: a subtree can force light inside a dark document
    Given a document whose root declares the color scheme "dark"
    When a subtree of the document declares the color scheme "light"
    Then a button and a text field inside the subtree render as they do in a light document
    And a button and a text field outside the subtree keep the dark appearance

  # S12
  Scenario: nested subtrees each follow their nearest declaration
    Given a material3 dark subtree inside an onmars light document
    When a subtree nested inside it declares the theme "onmars" and the color scheme "light"
    Then a button inside the nested subtree renders as it does in an onmars light document
    And a button between the two subtrees renders as it does in a material3 dark document

  # S13
  Scenario: the tokens stylesheet alone keeps a dark page coherent
    Given a document that loads only the Kimen tokens stylesheet
    When the document renders under a dark system color scheme
    Then the browser paints the page canvas and its native controls dark
    And every component text stays readable against the surface behind it
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S13 | |
| Keyboard path | — | Token-only feature: no interactive surface ships in this feature |
| Assistive-tech outcome | — | No markup or announced state ships; contrast obligations are covered by FR-009/SC-005 |
| Form participation | — | No form component ships in this feature |
| Theming | S3, S4, S5, S6, S7, S8, S9, S10, S11, S12 | |

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
- **FR-010**: Any element MUST be able to declare a theme for its subtree with
  the same declaration the document root uses; the default theme's name (or
  an unknown one) MUST return the subtree to the default theme.
- **FR-011**: Any element MUST be able to force the light or dark scheme for
  its subtree, inside any theme, without redeclaring any token.
- **FR-012**: Nested declarations MUST compose: each component follows the
  nearest theme declaration and the nearest scheme declaration,
  independently.
- **FR-013**: The tokens stylesheet alone MUST make the browser paint the
  page in the scheme the tokens resolve to (canvas, native controls), so a
  page that loads nothing else stays legible under a dark system preference.
- **FR-014**: A theme stylesheet MUST reassign only token names of the
  default contract; it is loaded alongside the default stylesheet, never
  instead of it.
- **FR-015**: Only colours MAY depend on the colour scheme; a token whose
  light and dark values differ in anything else MUST fail the build.

### Key Entities

- **Token**: a named design decision (color, spacing, radius, typography)
  with a resolved value; belongs to exactly one layer.
- **Layer**: primitive (raw ramps and scales), theme (brand identity: brand
  ramp, type families and type scale), semantic (role-based names components
  consume: surface, text, outline, overlay, elevation).
- **Theme**: a named, complete assignment of the theme + semantic layers
  (onmars, material3). Every theme ships light and dark schemes.
- **Scheme**: the light or dark variant within a theme, selected by system
  preference or by a declaration on the document root or on any element.
- **Subtree**: an element that carries a theme and/or scheme declaration,
  together with its descendants (shadow trees included).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): the token name contract and two
  declarations (theme selection, scheme override) are public API. Subtree
  scoping of both declarations is additive (pre-1.0). Token names and the
  effective value of every public token in every theme × scheme are
  unchanged — `public-api.json` is byte-identical across the emission change.
  Two behaviors change and are called out in the theming contract: a theme
  stylesheet is no longer self-sufficient (it carries overrides only), and
  the tokens stylesheet now declares `color-scheme` on the root.
- **Bundle budget** (Art. IV): each compiled theme stylesheet stays within a
  single-digit KB compressed budget; no runtime dependency (none added).
- **Accessibility** (Art. V): default text/surface pairs meet AA contrast in
  both themes and schemes (FR-009); system color-scheme preference respected
  (FR-002); the browser canvas follows the tokens' scheme, closing the
  dark-tokens-on-light-canvas combination (FR-013, S13). No new interaction
  pattern → no APG walkthrough required.
- **Browser baseline** (Art. IV): scheme-dependent tokens use the CSS
  `light-dark()` function (Baseline: Chrome 123, Firefox 120, Safari 17.5) —
  inside "current + previous stable" for all three engines (research D8).
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
- **SC-006**: Giving a subtree its own theme or scheme requires exactly 1
  declaration on 1 element and 0 token redeclarations by the consumer —
  verified in the browser on real components.
- **SC-007**: With only the tokens stylesheet loaded and a dark system
  preference, 0 of the library's components render text below 4.5:1.
- **SC-008**: Each scheme-dependent token is declared once per theme
  stylesheet (no per-scheme duplicate blocks), and a theme stylesheet
  declares only the tokens it changes.

## Assumptions

- material3 ships light and dark schemes, using the Material 3 Design Kit
  baseline palette (default seed; primary #6750a4). The kit is a reference,
  not a pixel-perfect Material implementation.
- Theme and scheme declarations apply at the document root and on any
  element (S8-S12). A declaration restyles what consumes tokens; it does not
  paint the element that carries it — a region that wants its own surface
  paints it from tokens, as the page contract does for the page.
- The onmars token sources generated from MarsUI on 2026-07-05 (primitive,
  theme, semantic, dark) are the working base of this feature.
- The token component layer, the RTL showcase and forced-colors/high-contrast
  support are out of scope: component layer grows with Fase 2 components; RTL
  ships as its own Fase 1 feature; forced-colors is tracked for later.
- Figma letter-spacing percentages compile to em units; radius compiles to
  px; spacing and type sizes compile to rem (decisions recorded with the
  generated sources).
