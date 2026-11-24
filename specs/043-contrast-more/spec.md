# Feature Specification: More contrast — `prefers-contrast: more` and a page declaration

**Feature Branch**: `043-contrast-more`

**Created**: 2026-11-17

**Status**: Confirmed — decisions D1–D5 accepted by the founder on 2026-11-17

**Input**: User description: "Kimen no tiene densidad, ni respuesta a `prefers-contrast`, ni a `prefers-reduced-transparency`. Hay que diseñar e implementar los tres modos solo con tokens (Art. VI)." This spec covers contrast; 044 covers transparency and 045 density. 043 and 044 share one emission mechanism (D5).

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis

Measured on `main` at 692cbb2 with the token sweep's own resolver
(`packages/tokens/scripts/check-contrast.mjs`), text against `--ki-surface-s0`
unless stated:

| Pair | onmars light | onmars dark | material3 light | material3 dark |
|---|---|---|---|---|
| secondary text (`text-med-em`) | 6.22 | 10.20 | 8.88 | 10.91 |
| placeholder on field fill (`surface-s2`) | 5.56 | 9.46 | 8.47 | 10.02 |
| control boundary (`outline-control`) | 3.69 | 5.01 | 4.33 | 5.87 |
| separators (`outline-high/med-em`) | 1.32 / 1.19 | 1.33 / 1.19 | 4.33 / 1.62 | 5.87 / 1.99 |
| focus ring colour (`outline-primary-high-em`) | 5.02 | 8.21 | 6.12 | 10.91 |

Standard AA holds everywhere (the existing sweeps enforce it). What a person
who asks for more contrast does not get today: secondary text and
placeholders under 7:1 in onmars light, control boundaries barely over 3:1,
separators at 1.2–1.3:1 (decorative, so WCAG does not require them, but they
are what tells one region from another), and a 2px focus ring.

Text on brand and tone fills is a different population: 48 of the 86
component text cells of onmars light sit under 7:1 (25 in material3 light),
and only 5 of them are neutral text (quaternary/ghost buttons, avatar
initials). Raising the rest to 7:1 means darkening the brand purple and the
tone fills in this mode (D2).

The focus indicator is 13 copies of the same three values
(`--ki-<component>-focus-ring-{width,color,offset}` → `space-xxs`,
`outline-primary-high-em`), one per component. A mode that changes it would
have to remap 13 tokens; a semantic focus-ring token that the 13 alias
removes that true duplication (D4).

## Decisions *(founder, 2026-11-17)*

**D1 — What strengthens, and the thresholds.** Recommended:

| Role | Standard (today, AA) | More contrast |
|---|---|---|
| Neutral text: body, secondary, labels, helper, placeholder | ≥ 4.5:1 | ≥ 7:1 (AAA 1.4.6) against the surface behind it |
| Control boundary: text field, select, textarea, checkbox, radio, switch | ≥ 3:1 | ≥ 4.5:1 against the page surface |
| Separators and container edges: divider, card, list, alert, tooltip, dialog | none | ≥ 3:1 against the page surface |
| Keyboard focus indicator | 2px, ≥ 3:1 | ≥ 3px thick and ≥ 4.5:1 against the page surface |
| Text on brand and tone fills | ≥ 4.5:1 | unchanged, ≥ 4.5:1 (D2) |
| Disabled controls | exempt | unchanged, exempt (WCAG 1.4.3 exception) |
| Hover/press washes, selected/checked fills | existing ≥ 3:1 sweeps | unchanged |

Disabled stays as it is on purpose: raising it to enabled-like contrast makes
a disabled control look operable, which is the larger harm.

*Implementation note (2026-11-17), within D1–D2:* the 4.5:1 boundary
threshold applies to **neutral** boundaries (a control at rest, empty,
hovered). A boundary drawn in a brand or tone colour — a checked box, an
invalid field's danger edge, a focused field's brand edge — keeps the
standard 3:1, for the same reason D2 keeps brand and tone text at 4.5:1:
raising it means darkening the palette in this mode. Neutral is measured, not
named: a colour whose channels stay within 0.075 of each other (both themes'
neutrals reach 0.06, the weakest tone tint 0.09). Separators and container
edges are the divider rule, list-row and tab-list dividers where a theme
draws them, and the card, alert, tooltip and dialog edges; cards and alerts
draw their edge in this mode. The outline emphasis ramp itself is not
remapped, because disabled borders draw from it. For the same reason the
mode strengthens the role `--ki-text-supporting` (enabled labels,
placeholders, list secondary lines, quiet button labels, unselected tabs),
which those component tokens alias in both themes, and not the `med-em`
emphasis step: disabled ink also draws from `med-em`, directly (radio and
radio-group labels) or through `text.muted` (every disabled button label).
The token sweep holds every disabled cell to its standard value under each
mode, and every component's focus-ring width to 3px under more contrast.

**D2 — Text on brand and tone fills stays at ≥ 4.5:1.** Recommended for this
spec. Taking it to 7:1 is a palette decision (darker primary and tone fills
in this mode, in both themes) that deserves its own design pass; the token
mechanism here supports it later without new machinery. Alternative: 7:1 for
every text cell now, with darker fills chosen in this PR.

**D3 — Declaration: force on, never force off.** The system preference
`prefers-contrast: more` activates the mode. A page can also activate it with
`data-ki-contrast="more"` on the document root or on a theme root (an element
carrying `data-ki-theme`); a theme root nested inside one that declares it
inherits it. There is no value that switches the mode off against the
person's system preference: a page may add contrast, never take it away.
Any other value is ignored. Recommended because an in-app accessibility
setting is a real need, the downward override is an accessibility footgun,
and a force-on-only declaration needs no "nearest declaration wins"
machinery. Alternative: also accept `data-ki-contrast="standard"` to opt out.

**D4 — Scope of a declaration: document root and theme roots, not any
element.** Theme and scheme work on any element (spec 001 FR-010–FR-012).
Contrast cannot do the same cheaply: a mode changes semantic tokens that
component tokens alias, and an alias is resolved where it is declared, so the
element that carries the mode must redeclare the whole token set — which is
exactly what a theme root already does. Making any element a token root would
make it redeclare the default theme and break a material3 region around it,
unless every theme also re-emits itself per mode per nesting (CSS `@scope`
proximity, three to four times the stylesheet). Recommended: root and theme
roots only. A region that needs its own contrast declares it next to its
theme: `<section data-ki-theme="material3" data-ki-contrast="more">`.
Contrast describes the person, not the region, so this is rarely needed.

**D5 — Theming: a mode is a small override file, composed by the build.**
`packages/tokens/tokens/modes/contrast-more.tokens.json` remaps tokens onto
other existing tokens (for example control boundary and secondary text → the
scheme-aware neutral alpha ramp; separators and container edges →
`outline-strong`). Because
every value is a reference, one file serves both themes and both schemes,
and a consumer theme that reassigns the semantic layer gets the mode for
free. The build composes theme × scheme × mode, merges schemes with
`light-dark()` as today, and emits only differences:

- `tokens.css` — the onmars diff, inside `@media (prefers-contrast: more)`
  and again under the forced declaration.
- `tokens.material3.css` — only the tokens material3 itself overrides that
  the mode also remaps, re-asserted after its theme rule.

Precedence is fixed without depending on stylesheet order: default tokens <
mode remaps (`:where()`, same specificity as the default rule, later in the
same sheet) < theme overrides < theme mode re-assertions (later in the theme's
own sheet). A theme needs its own mode file only if it wants values the
shared remap does not give; material3 does not today. The focus indicator
gains semantic tokens `--ki-focus-ring-width`, `--ki-focus-ring-color` and
`--ki-focus-ring-offset`, which the 13 component focus-ring tokens alias with
unchanged values, so the mode remaps one token instead of 13.

**Spec split.** Three specs (043 contrast, 044 transparency, 045 density),
because they are three public contracts with different observables and
risks. 043 and 044 share the mechanism above and ship in one PR; 045 uses a
different mechanism (inherited tokens consumed by component CSS) and ships
in its own PR.

## Amendment A1: the mode wins over any theme *(decided 2026-11-24)*

**Status**: Decided by the founder on 2026-11-24, after an integrator theme
lost more contrast (integrator feedback on 0.1.3, item 1). A preference mode
applies over any theme without the theme doing anything, and a theme still
chooses its own mode values through tokens.

**Path**: in place, through the Art. II amendment path: the page's own value
(S12) now goes through the mode token, and S13–S15 are appended. None
is retired or renumbered.

**A1-D1 — Mode values are tokens.** The value a token takes under a mode is a
token of its own, `--ki-<mode>-<token>` (`--ki-contrast-more-outline-control`), declared at normal
priority with the rest of the token set, next to the token it replaces in the
DTCG sources (`ki.<mode>.<path>`). The shared mode file and the per-theme
mode files are gone: a theme's mode values are ordinary overrides of those
tokens (material3 overrides two; onmars sets its own in its theme and dark
files).

**A1-D2 — The mode re-points with `!important`.** Under the media query and
under the declaration, on the root and on theme roots, the mode declares
`--ki-<token>: var(--ki-<mode>-<token>) !important`. An important
declaration outranks every normal one on the element, so a theme rule that
sets the token loses under the mode, wherever it loads and whatever its
specificity. Only the re-pointing is important: a theme that wants other mode
values sets the mode tokens at normal priority and never needs `!important`
(Art. VI). Components keep reading the same tokens.

**A1-D3 — Behaviour change.** A theme that followed the earlier guidance and
restated a reassigned token under the mode's media query or declaration now
loses to the mode; it moves those values to the mode tokens. A token set on
an element that is neither the root nor a theme root still wins inside it, as
any per-element value does. A deprecated token gets no mode token (its
replacement carries the mode), so `--ki-select-listbox-backdrop-blur` keeps
its length under reduced transparency; the listbox filter that replaced it
still turns off.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A person who needs more contrast gets it everywhere (Priority: P1)

A person with low vision sets "Increase contrast" in their operating system.
Every Kimen page they open strengthens secondary text, field boundaries,
separators and the focus ring, in whatever theme and colour scheme the page
uses, without the page doing anything.

**Why this priority**: it is the reason the mode exists, and it costs the
page author nothing.

**Independent Test**: render real components under the emulated preference
in each theme × scheme and measure the painted colours.

**Acceptance Scenarios**:

1. **Given** an onmars light page with a text field, **When** it renders under the "more" preference, **Then** its label and placeholder measure ≥ 7:1.
2. **Given** any shipped theme and scheme, **When** it renders under the preference, **Then** neutral text, control boundaries and separators meet D1.

---

### User Story 2 - An app offers its own "more contrast" setting (Priority: P2)

A product has an accessibility panel with a "High contrast" switch, for
people whose system setting is off or whose browser does not report it. The
switch sets one attribute on the document root.

**Why this priority**: the system preference is the default path; the
declaration covers in-app settings.

**Independent Test**: set the attribute under no system preference and
measure the same thresholds.

**Acceptance Scenarios**:

1. **Given** a page whose root declares contrast "more", **When** it renders with no system preference, **Then** the enhanced thresholds hold.

---

### User Story 3 - Themed regions keep the person's contrast (Priority: P3)

A host page that declares more contrast embeds a material3 island of
generated UI. The island renders with more contrast too, in its own theme.

**Why this priority**: generative UI is embedded in pages Kimen does not own
(spec 001 story 4); the mode must cross theme boundaries.

**Independent Test**: compare a component inside the themed region with the
same component in a material3 page under the mode.

**Acceptance Scenarios**:

1. **Given** a page whose root declares contrast "more", **When** a region declares theme "material3", **Then** components inside it render as in a material3 page with more contrast.

---

### Edge Cases

- The browser does not report `prefers-contrast` (none in the baseline lacks
  it; Chrome 96, Firefox 101, Safari 14.1): only the declaration activates
  the mode.
- `prefers-contrast: less` or `custom`: treated as no preference.
- `forced-colors: active` (Windows contrast themes): the user's palette
  replaces author colours entirely; the existing forced-colors rules govern
  and this mode adds nothing visible. The two do not conflict.
- `data-ki-contrast` with any value other than "more", or on an element that
  is neither the root nor a theme root: ignored.
- A consumer stylesheet or theme that reassigns a token this mode remaps
  gets the mode's value under the mode (S13, S14); to choose its own value it
  sets the token's more-contrast token (S12, S15; Amendment A1).
- Under the mode, translucent surfaces also become opaque (spec 044 S7): a
  contrast ratio over glass depends on whatever is behind it and cannot be
  guaranteed.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: More contrast when the person asks for it
  Under a "more" contrast preference, or when the page declares it, every
  shipped theme and colour scheme strengthens neutral text, control
  boundaries, separators and the keyboard focus indicator through tokens
  alone, and leaves the standard appearance untouched otherwise.

  # S1
  Scenario: Secondary text reaches enhanced contrast under the system preference
    Given an onmars light page with a text field labeled "Email" and the placeholder "name@example.com"
    When the page renders under a "more" contrast system preference
    Then the label and the placeholder measure at least 7:1 against the surfaces behind them

  # S2
  Scenario: Control boundaries strengthen under the system preference
    Given an onmars light page with a text field, a select, a checkbox and a radio
    When the page renders under a "more" contrast system preference
    Then the boundary of each control measures at least 4.5:1 against the page surface

  # S3
  Scenario: Separators and container edges become visible under the system preference
    Given an onmars light page with a card "Invoice" and a divider
    When the page renders under a "more" contrast system preference
    Then the card edge and the divider measure at least 3:1 against the page surface

  # S4
  Scenario: The keyboard focus indicator thickens under the system preference
    Given an onmars light page whose "Save" button has keyboard focus
    When the page renders under a "more" contrast system preference
    Then the focus indicator is at least 3px thick
    And it measures at least 4.5:1 against the page surface

  # S5
  Scenario Outline: Enhanced contrast holds in every shipped theme and colour scheme
    Given a <theme> page in the <scheme> colour scheme
    When the page renders under a "more" contrast system preference
    Then every neutral text measures at least 7:1 against its surface
    And every control boundary measures at least 4.5:1 and every separator at least 3:1

    Examples:
      | theme     | scheme |
      | onmars    | light  |
      | onmars    | dark   |
      | material3 | light  |
      | material3 | dark   |

  # S6
  Scenario: Text on brand and tone fills keeps at least the standard contrast
    Given a material3 light page with a primary button "Save" and a danger alert "Payment failed"
    When the page renders under a "more" contrast system preference
    Then the button label and the alert text measure at least 4.5:1 against their fills

  # S7
  Scenario: A page can declare more contrast without the system preference
    Given an onmars light page whose root declares the contrast "more"
    When the page renders under no contrast system preference
    Then the "Email" label and placeholder measure at least 7:1 against the surfaces behind them

  # S8
  Scenario: Without the preference or a declaration the standard appearance is unchanged
    Given an onmars light page with no contrast declaration
    When the page renders under no contrast system preference
    Then the "Email" text field keeps its standard boundary and placeholder colours

  # S9
  Scenario: Disabled controls keep their standard appearance under more contrast
    Given an onmars light page with a disabled text field "Email"
    When the page renders under a "more" contrast system preference
    Then the disabled field keeps its standard colours

  # S10
  Scenario: A themed region inside a page that declares more contrast keeps it
    Given a page whose root declares the contrast "more"
    When a region of the page declares the theme "material3"
    Then a text field inside the region renders as it does in a material3 page with more contrast

  # S11
  Scenario: A themed region can declare more contrast on its own
    Given an onmars page under no contrast system preference
    When a region of the page declares the theme "onmars" and the contrast "more"
    Then a text field inside the region meets the enhanced thresholds
    And a text field outside the region keeps its standard colours

  # S12
  Scenario: A page's own value for a strengthened token wins under more contrast
    Given an onmars page whose stylesheet sets the more-contrast value of the control boundary to "#000000"
    When the page renders under a "more" contrast system preference
    Then the text field boundary renders in "#000000"

  # S13
  Scenario: More contrast applies over a theme of the page's own
    Given a page themed "acme" by its own stylesheet, which sets the control boundary to "#c8c8c8"
    When the page renders under a "more" contrast system preference
    Then the text field boundary renders in the more-contrast boundary colour, not "#c8c8c8"

  # S14
  Scenario: A declared contrast applies over a theme of the page's own
    Given a page themed "acme" by its own stylesheet, which sets the control boundary to "#c8c8c8"
    And the page root declares the contrast "more"
    When the page renders under no contrast system preference
    Then the text field boundary renders in the more-contrast boundary colour, not "#c8c8c8"

  # S15
  Scenario: A theme of the page's own chooses its more-contrast values
    Given an onmars page with a region themed "acme" by its own stylesheet, which sets the more-contrast value of the control boundary to "#000000"
    When the page renders under a "more" contrast system preference
    Then the text field boundary inside the region renders in "#000000"
    And the text field boundary outside the region keeps the more-contrast boundary colour
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S5, S6, S7, S8, S9 | |
| Keyboard path | S4 | |
| Assistive-tech outcome | — | Token-only feature: no role, name, state or announcement changes; the visual outcome for low-vision users is measured by S1–S6 |
| Form participation | — | No form behavior changes: values, validity and reset are untouched; only how fields are painted |
| Theming | S10, S11, S12, S13, S14, S15 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Under `prefers-contrast: more`, every shipped theme × scheme
  MUST meet the D1 thresholds for neutral text, control boundaries,
  separators and the focus indicator.
- **FR-002**: Text on brand and tone fills MUST keep ≥ 4.5:1 under the mode
  (D2).
- **FR-003**: `data-ki-contrast="more"` on the document root or on a theme
  root MUST activate the mode without the system preference; a theme root
  nested inside one that declares it MUST inherit it (D3, D4).
- **FR-004**: No declaration MAY switch the mode off against the system
  preference; unknown values MUST be ignored.
- **FR-005**: Without the preference and without the declaration, every
  public token MUST resolve to exactly the value it has today.
- **FR-006**: Disabled controls MUST keep their standard appearance.
- **FR-007**: The mode MUST be expressed as tokens, one per remapped token
  (`--ki-contrast-more-*`, Amendment A1), re-pointed with `!important` under
  the mode; the build MUST fail if a remap leaves a theme × scheme below
  FR-001.
- **FR-008**: Mode precedence MUST NOT depend on the order in which the
  token stylesheets are loaded.
- **FR-009**: The 13 component focus-ring tokens MUST alias the new semantic
  focus-ring tokens with their current values unchanged.

### Key Entities

- **Mode**: a named reassignment of part of the semantic layer (contrast
  "more"), activated by a user preference or a declaration, composable with
  every theme and scheme.
- **Token root**: the document root or an element carrying `data-ki-theme`;
  the elements on which the whole token set is declared and where a mode
  declaration takes effect.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive. New declaration
  `data-ki-contrast="more"`; new semantic tokens `--ki-focus-ring-width`,
  `--ki-focus-ring-color`, `--ki-focus-ring-offset`, and the component token
  `--ki-tooltip-border-color` (the tooltip edge, previously painted from a
  semantic token in component CSS, same value) and the role
  `--ki-text-supporting` (aliased by enabled supporting-text tokens, same
  value). The mode is published as the
  `contrast-more/{light,dark}` contexts of both stylesheets. No token renamed
  or removed; every default value unchanged (FR-005, FR-009).
  `changes/api/043-preference-modes.json` records the delta for 043 and 044.
- **Bundle budget** (Art. IV): the mode adds two rule blocks of a few dozen
  declarations to each theme stylesheet; the stylesheets stay inside their
  budgets. No runtime JavaScript.
- **Accessibility** (Art. V): adds WCAG 1.4.6 (AAA, 7:1) for neutral text and
  a stronger 1.4.11 / 2.4.13 posture under the preference; AA is unchanged
  outside it. No new interaction pattern, no APG walkthrough.
- **Browser baseline** (Art. IV): `prefers-contrast` is Baseline (Chrome 96,
  Firefox 101, Safari 14.1); `:where()` is Baseline.
- **Tokens** (Art. VI): token-only. The mode reuses semantic tokens; it adds
  three focus-ring tokens and removes 13-way duplication.
- **Guardrail/security boundary** (Art. VIII): none.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 neutral text cells under 7:1, 0 control boundaries under
  4.5:1 and 0 separators under 3:1 across the 4 theme × scheme cells under
  the mode, verified by the token sweep on every build.
- **SC-002**: Activating the mode in an app takes 1 attribute on 1 element,
  and 0 when the system preference is on.
- **SC-003**: Outside the mode, `public-api.json` token values and every
  visual baseline are byte-identical.
- **SC-004**: The mode's source is 1 override file; material3 needs 0 mode
  files of its own (it re-asserts 13 remapped tokens it overrides).

## Assumptions

- "Neutral text" is text painted on the page, field and neutral container
  surfaces (`surface-s0`…`s3` and the field fills), not on brand or tone fills.
- Thresholds are measured against the surface actually behind the text or
  boundary, compositing translucent fills over the page surface as the
  existing sweeps do.
- The browser test engine of the PR gate (Chromium) emulates
  `prefers-contrast` through Playwright's `emulateMedia({ contrast })`.
