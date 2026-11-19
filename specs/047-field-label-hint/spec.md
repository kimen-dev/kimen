# Feature Specification: Field label hint

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, with Arts. I, IV, V, VI and IX. -->

**Feature Branch**: `feat/issue-318-label-hint` (spec `047-field-label-hint`)

**Created**: 2026-11-19

**Status**: Confirmed by the founder (D1–D5, 2026-11-19, issue #318); the
implementation notes under D4 and D5, settled at implementation, were
confirmed with the change on 2026-11-19 (PR #340)

**Input**: Issue #318, "Fields: show required / optional before submission".
A person filling a Kimen form learns that a field was required only after a
blocked submission, when spec 042 paints its error. Nothing in the label says
it beforehand, and an application that writes "Email (optional)" into
`label` cannot style the two runs apart. WCAG 2.2 3.3.2 (Labels or
Instructions) asks that a required or optional field be identified when the
form is presented. The MarsUI `Input_label` master (`12021:6068`) already
carries the missing piece: a secondary "(Support text)" run after the label,
4px away.

**Constitution check**: a public API addition on five existing components
(Art. II, IX); a change to each control's accessible name when the new prop is
set (Art. V); new component tokens and one new part per control (Art. VI); new
catalog props an agent can fill (Art. I, VIII). No new interaction pattern:
the hint is label text. No guardrail or security boundary changes: the
renderer already passes string props through its existing checks.

## Evidence gathered *(2026-11-19)*

The Figma variables bound to `Input_label` (`12021:6068`, read with the Figma
MCP `get_variable_defs`): the label is `UI/Para/medium` (body_1 13/20, weight
600) in `Text/med_em` `#5b616d`; the second run uses `UI/Para/normal` (weight
500) in `Text/low_em` `#8c929c`, with `Space/xs` (4px) between them, and the
caption_2 sizes for the small variant.

Accessible name of a native `<input>` whose `<label for>` holds "Email" and a
span "(optional)", inside a shadow root, measured in Chromium 158 with CDP
`Accessibility.getFullAXTree`; distance from the end of the label text to the
start of the span, measured in Chromium 158, Firefox 159 and WebKit 27.2:

| # | Markup of the label | Name (Chromium) | Distance |
|---|---|---|---|
| E1 | `Email<span>` with an inline margin of 4px | **"Email(optional)"** | 4px |
| E2 | `Email <span>` (a literal space, no margin) | "Email (optional)" | one space of the font: 4px in Chromium and Firefox, 3.2px in WebKit (default 16px font) |
| E3 | `Email<span>`, the span `inline-block` with a 4px margin | "Email (optional)" | 4px |
| E4 | label `display: flex; flex-wrap: wrap; column-gap: 4px`, text and span as items | "Email (optional)" | 4px |

E1 joins the two words: an inline box adds no word boundary. E2 cannot meet a
token-defined gap. E3 depends on how each engine treats `inline-block` in name
computation (Gecko adds a separator only around block-level boxes). E4 makes
both runs block-level flex items, which every name computation separates with a
space, and puts the gap on a token. Firefox and WebKit expose no accessibility
tree to Playwright, so their names were not measured.

Contrast of the inks, measured with `packages/tokens/scripts/check-contrast.mjs`
helpers against `--ki-surface-s0/s1/s2`:

| Ink | onmars light | onmars dark | material3 light | material3 dark |
|---|---|---|---|---|
| `--ki-text-low-em` (the Figma hint ink) | **3.13 / 2.98 / 2.8** | 5.01 / 4.95 / 4.91 | **4.33 / 4.13 / 3.96** | 5.87 / 5.39 / 5.14 |
| `--ki-text-supporting` (standard) | 6.22 / 5.91 / 5.56 | 10.2 / 9.72 / 9.46 | 8.88 / 8.47 / 8.13 | 10.91 / 10.02 / 9.56 |
| `--ki-text-supporting` (more contrast) | 9.29 / 8.97 / 8.71 | 10.2 / 9.72 / 9.46 | 9.03 / 8.78 / 8.65 | 9.9 / 9.32 / 8.99 |

## Decisions *(founder, 2026-11-19, issue #318)*

- **D1 API shape: one text prop.** `label-hint` (property `labelHint`, a
  string) on `ki-input`, `ki-textarea`, `ki-select`, `ki-checkbox` and
  `ki-radio-group`. `ki-switch` does not take it: a switch applies at once and
  has no constraint of its own (spec 042 D7), so it is never required or
  optional. A string prop, not a slot, for the reasons of spec 042 D1: the
  catalog and the framework wrappers pass strings, and the text renders inside
  the shadow root, so the name does not depend on each engine computing it
  through a slot.
- **D2 The hint is part of the label.** When set and not blank, the control
  renders the hint inside its label element (the `<label>`, or the group label
  of `ki-radio-group`), after the label text, so it joins the control's
  accessible name: label "Email" with hint "(optional)" names the control
  "Email (optional)". Absent or blank, nothing renders and the name is
  unchanged. For `ki-checkbox` the label is its slotted content and the hint
  follows it.
- **D3 Independent of `required`.** The hint does not set or imply
  `required`, and `required` does not render a hint. The text is the
  application's own ("(optional)", "(required)", "(obligatorio)"), so no
  user-visible string is hardcoded (Art. IV) and each form decides which of
  its fields to mark.
- **D4 Placement.** The hint sits 4px (`Space/xs`) after the label text, in
  the label's inline direction, so on a right-to-left page it sits to the
  left. It composes with disabled, the help and error lines of spec 042,
  density, forced colors and reduced transparency.
  *Implementation note:* while a hint shows, the label element is a wrapping
  flex row whose two items are the label text and the hint, with the gap
  token as `column-gap` (evidence E4); without a hint the label renders
  exactly as before. A long label wraps inside its own item and the hint
  moves to the next line when it does not fit after it.
- **D5 Typography and ink: a contrast correction over Figma.** The hint takes
  the size and line height of its label and the normal body weight, the
  secondary run of `Input_label`. Its Figma ink, `Text/low_em`, reads
  2.8–3.13:1 on the onmars light surfaces and fails WCAG 1.4.3, so the hint
  takes the supporting-text role `--ki-text-supporting` instead (5.56–6.22:1),
  a declared deviation like the placeholder one. Being that role, it
  strengthens under more contrast with every other enabled supporting text
  (spec 043). Under a disabled control the hint follows the label's disabled
  ink; `ki-checkbox` keeps its label ink when disabled, so its hint keeps the
  supporting ink. Under forced colors it takes the label's forced ink.
  *Implementation note:* each control exposes two component tokens,
  `--ki-<control>-label-hint-fg` (aliasing `ki.text.supporting`) and
  `--ki-<control>-label-hint-gap` (aliasing `ki.space.xs`), and a part
  `label-hint`. material3 adds no overlay: its own supporting ink resolves
  through the alias and reads 8.13–10.91:1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Know before submitting which fields to answer (Priority: P1)

A person reading a form sees, next to each label, whether the question is
optional or required, and a screen reader says it with the field's name.

**Independent Test**: S1, S5, S6, S8, S9.

### User Story 2 - The application decides what the hint says (Priority: P1)

An application marks the fields it wants, in its own words and language;
nothing appears unless it asks for it, and the hint never changes how the
form validates.

**Independent Test**: S2, S3, S4, S11.

### User Story 3 - The hint reads clearly everywhere (Priority: P2)

The hint meets AA contrast in every theme and scheme, strengthens under more
contrast, dims with a disabled control and restyles through tokens.

**Independent Test**: S12–S17.

### Edge Cases

- `label-hint=""` or whitespace-only text renders nothing and leaves the name
  as the label alone (S3).
- A disabled fieldset disables the control: the hint follows the label's
  disabled ink exactly as the `disabled` prop does.
- A required control with the hint "(optional)" is still required: the hint
  is text, and keeping the two consistent is the application's job (D3).
- The listbox of `ki-select` is labelled by the same label element, so its
  name carries the hint too.
- `ki-radio-group` names the `radiogroup` with the hint; each `ki-radio` keeps
  its own name.
- Compact density (spec 045) changes no font size and no label gap: the hint
  keeps its type and its 4px.
- Reduced transparency (spec 044) changes no ink the hint uses.
- The lazy loader limitation of spec 036 does not apply: props exist on
  loader hosts.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Field label hint
  A form control can carry a short hint after its label, such as "(optional)"
  or "(required)", so people learn before they submit which questions they
  must answer. The hint is part of the label: it is shown after the label text
  and read with it as the control's name. It is the application's own text
  and never changes whether the control is required.

  Rule: The label hint joins the label

    # S1
    Scenario Outline: A control's label hint is shown after its label and joins its name
      Given a <control> labeled "Email" with the label hint "(optional)"
      When the control receives focus
      Then "(optional)" is shown after the label "Email"
      And the accessibility tree exposes the control with the name "Email (optional)"

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-radio-group |

    # S2
    Scenario Outline: A required control without a label hint shows no hint of its own
      Given a required <control> labeled "Email" without a label hint
      When the page renders
      Then nothing is shown after the label "Email"
      And the accessibility tree exposes the control with the name "Email"

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-radio-group |

    # S3
    Scenario: A blank label hint shows nothing
      Given a ki-input labeled "Email" whose label hint is only spaces
      When the page renders
      Then nothing is shown after the label "Email"
      And the accessibility tree exposes the field with the name "Email"

    # S4
    Scenario: Removing the label hint removes it from the name
      Given a ki-input labeled "Email" with the label hint "(optional)"
      When the application removes the label hint
      Then nothing is shown after the label "Email"
      And the accessibility tree exposes the field with the name "Email"

    # S5
    Scenario: The label hint sits a small space after the label text
      Given an onmars page with a ki-input labeled "Email" with the label hint "(optional)"
      When the page renders
      Then the label hint starts 4px after the end of the label text
      And the label hint has the font size and line height of the label

    # S6
    Scenario: On a right-to-left page the label hint follows the label in reading order
      Given a right-to-left page with a ki-input labeled "البريد" with the label hint "(اختياري)"
      When the page renders
      Then the label hint ends 4px to the left of the label text
      And the accessibility tree exposes the field with the name "البريد (اختياري)"

    # S7
    Scenario Outline: Clicking the label hint acts as clicking the label
      Given a <control> labeled "Terms" with the label hint "(optional)"
      When the user clicks the label hint
      Then <outcome>

      Examples:
        | control     | outcome                 |
        | ki-input    | focus is on the field   |
        | ki-checkbox | the checkbox is checked |

  Rule: The label hint reaches the keyboard and assistive technology

    # S8
    Scenario Outline: Tabbing to a control lands on it with its full name
      Given a text field "Name" followed by a <control> labeled "Phone" with the label hint "(optional)"
      When the user tabs from "Name" to the next control
      Then focus is on the <control>
      And the accessibility tree exposes the focused control with the name "Phone (optional)"

      Examples:
        | control     |
        | ki-input    |
        | ki-select   |
        | ki-checkbox |

    # S9
    Scenario: The label hint joins the name while the help text stays the description
      Given a ki-input labeled "Email" with the label hint "(optional)" and the help text "We never share your email"
      When the control receives focus
      Then the accessibility tree exposes the field with the name "Email (optional)"
      And the accessibility tree exposes the field with the description "We never share your email"

    # S10
    Scenario: An error message leaves the label hint in the name
      Given a form with a required ki-select labeled "Country" with the label hint "(required)" and the error text "Choose a country", left unanswered
      When the user submits the form
      Then "Choose a country" is shown with the control
      And the accessibility tree exposes the control with the name "Country (required)" and the description "Choose a country"

  Rule: The label hint never sets a constraint

    # S11
    Scenario Outline: A control whose label hint says required is not required by it
      Given a form with a <control> labeled "Answer" with the label hint "(required)", left unanswered
      When the user submits the form
      Then the form is submitted

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-radio-group |

  Rule: The label hint reads clearly in every theme and mode

    # S12
    Scenario Outline: The label hint reads at least 4.5:1 in every theme and scheme
      Given a <theme> page in the <scheme> scheme with every control carrying the label hint "(optional)"
      When the page renders
      Then every label hint reads at a contrast of at least 4.5:1 against the surface behind it
      And no accessibility rule is violated

      Examples:
        | theme     | scheme |
        | onmars    | light  |
        | onmars    | dark   |
        | material3 | light  |
        | material3 | dark   |

    # S13
    Scenario Outline: Under more contrast the label hint strengthens with the other supporting text
      Given a <theme> page in the <scheme> scheme with every control carrying the label hint "(optional)"
      When the page declares more contrast
      Then every label hint reads at a contrast of at least 7:1 against the surface behind it

      Examples:
        | theme     | scheme |
        | onmars    | light  |
        | onmars    | dark   |
        | material3 | light  |
        | material3 | dark   |

    # S14
    Scenario Outline: A disabled control's label hint follows the disabled ink of its label
      Given a disabled <control> labeled "Email" with the label hint "(optional)"
      When the page renders
      Then the label hint renders in the same ink as the label

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-radio-group |

    # S15
    Scenario: Reassigning the semantic supporting ink restyles every label hint
      Given a page themed with --ki-text-supporting set to "#7a1fa2"
      And every control carrying the label hint "(optional)"
      When the page renders
      Then every label hint renders in "#7a1fa2"

    # S16
    Scenario: Reassigning one component's hint tokens restyles that component's hint alone
      Given a page whose stylesheet sets --ki-input-label-hint-fg to "#7a1fa2" and --ki-input-label-hint-gap to "8px"
      And a ki-input and a ki-textarea carrying the label hint "(optional)"
      When the page renders
      Then the ki-input label hint renders in "#7a1fa2", 8px after its label text
      And the ki-textarea label hint keeps the ink and the gap of its theme

    # S17
    Scenario Outline: Under forced colors the label hint takes the forced ink of its label
      Given forced colors are active
      And <state> <control> labeled "Terms" with the label hint "(optional)"
      When the page renders
      Then the label hint renders in the same forced color as its label

      Examples:
        | state      | control     |
        | an enabled | ki-input    |
        | a disabled | ki-checkbox |
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S14 | |
| Keyboard path | S8 | |
| Assistive-tech outcome | S1, S4, S6, S8, S9, S10 | |
| Form participation | S11 | |
| Theming | S12, S13, S15, S16, S17 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `ki-input`, `ki-textarea`, `ki-select`, `ki-checkbox` and
  `ki-radio-group` MUST accept a reflected `label-hint` string prop
  (`labelHint`).
- **FR-002**: When the trimmed hint is not empty, the control MUST render it
  inside its label element, after the label text, in an element with the part
  `label-hint`, so that it is part of the control's accessible name.
- **FR-003**: When the hint is absent, empty or whitespace only, the control
  MUST render no hint element and its accessible name MUST be the label alone.
- **FR-004**: The hint MUST NOT set, imply or change `required` or any other
  constraint, and `required` MUST NOT render a hint.
- **FR-005**: The hint MUST start `--ki-<control>-label-hint-gap` (4px) after
  the label text in the inline direction, with the label's font size and line
  height and the normal body weight; CSS logical properties only.
- **FR-006**: The hint ink MUST be `--ki-<control>-label-hint-fg`, an alias of
  `--ki-text-supporting`, and read at least 4.5:1 on the page in onmars and
  material3, light and dark, and at least 7:1 under more contrast.
- **FR-007**: Under a disabled control the hint MUST render in the label's
  disabled ink; under forced colors in the label's forced ink.
- **FR-008**: Without a hint, the label MUST render exactly as before this
  feature.
- **FR-009**: The prop MUST be documented with when-to-use and
  when-NOT-to-use guidance, and the generated catalog, `llms.txt` and
  framework wrappers MUST carry it (Art. I).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): 5 props (`label-hint` × 5), 5 parts
  (`label-hint` × 5) and 10 component tokens
  (`--ki-{input,textarea,select,checkbox,radio-group}-label-hint-{fg,gap}`);
  the accessible name of a control gains the hint while one is set. Additive,
  MINOR. Declared in `changes/api/`.
- **Bundle budget** (Art. IV): one text node and a few lines of wiring per
  control, one shared functional component and stylesheet; no runtime
  dependency.
- **Accessibility** (Art. V): WCAG 2.2 3.3.2 (the requirement is identified
  before submission) and 1.4.3 (a contrast correction over the Figma ink). No
  new interaction pattern: the hint is label text.
- **Tokens** (Art. VI): 10 component tokens aliasing the semantic
  supporting-text role and the `xs` space step; no new semantic or primitive
  token; one declared deviation from the MarsUI `Text/low_em` hint ink.
- **Catalog/agent legibility** (Art. I, VIII): the generated catalog gains the
  prop; no protocol type enters `@kimen/elements`; the guardrail is unchanged.
- **Guardrail/security boundary** (Art. VIII): none. The hint renders as a
  text node, never as markup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every scenario S1–S17 passes in Chromium for every control it
  names.
- **SC-002**: axe-core reports no violation on the five controls with a hint,
  in the four theme × scheme pairs (S12).
- **SC-003**: The token contrast gate passes, and the visual baselines of
  every control without a hint stay unchanged.

## Assumptions

- `ki-switch`, `ki-option` and `ki-radio` get no hint.
- Kimen ships no default hint text: the wording and its language belong to
  the application.
- The visual galleries do not show a hinted label yet; baselines for one are
  a follow-up captured on CI Linux.
