# Feature Specification: Text fields large enough for a touch screen

**Feature Branch**: `048-touch-field-text`

**Created**: 2026-11-19

**Status**: Confirmed — decisions D1–D4 accepted by the founder on 2026-11-19 (issue #320)

**Input**: Issue #320: "Text fields trigger page zoom on iOS: field text is 13px. Safari on iOS zooms the page when a text field with a computed font size under 16px gets focus, and the page stays zoomed after the field loses it."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis

On `main` at 8c57dfc, `--ki-input-font-size` and `--ki-textarea-font-size`
resolve to `body-1`: 13px in onmars and 14px in material3 (`body-medium`).
Safari on iOS zooms the page into any focused text field whose computed font
size is under 16px, and leaves it zoomed after the field loses focus. Both
themes are under that line, so every Kimen text field zooms the page on an
iPhone.

The onmars type scale has no 16px step: `body-2` and `title-1` are 15px and
`title-2` is 18px. The Figma `Typeface-1-Mobile` mode maps `body-1` to 15px,
which would still zoom. material3's `body-large` (`body-2` there) is 16px.
`ki-select` is not affected: what the person focuses is a button, and its
native `<select>` is a hidden validity donor that never takes focus.

## Decisions *(founder, 2026-11-19)*

**D1 — Only on a coarse pointer.** Desktop keeps 13px (onmars) and 14px
(material3): the larger text is applied under `@media (pointer: coarse)`,
the devices whose browsers zoom into small fields.

**D2 — At least 16px, through tokens.** `--ki-input-font-size-touch` and
`--ki-textarea-font-size-touch` set the field text under a coarse pointer:
16px in onmars (`space-3xl`, as `caption-1` and `caption-2` already resolve
through the spacing scale) and `body-2` in material3 (`body-large`, 16px).
A theme or a page can reassign them; nothing smaller than 16px is shipped.

**D3 — Only the text the person types.** The native control's text and its
placeholder grow; the label, the help and error lines, the field height and
the line height do not.

**D4 — No viewport workaround.** Kimen never ships or recommends
`maximum-scale=1` or `user-scalable=no`: they block the person's own zoom,
which WCAG 1.4.4 requires.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Typing on a phone does not zoom the page (Priority: P1)

A person on an iPhone taps a Kimen text field to type an email address. The
page stays at the scale they chose; nothing zooms in, and nothing is left
zoomed when they move on.

**Why this priority**: the defect affects every text field on every iOS
device, and a zoomed page hides the rest of the form.

**Independent Test**: emulate a coarse primary pointer, focus a field and
measure the computed font size of its native control.

**Acceptance Scenarios**: S1, S3.

### User Story 2 - Desktop layouts do not change (Priority: P1)

With a mouse or a trackpad, fields keep the size every existing layout and
visual baseline was designed for.

**Independent Test**: with a fine pointer, measure the field text.

**Acceptance Scenarios**: S2.

### User Story 3 - A theme can choose the touch size (Priority: P3)

A theme with a larger type scale reassigns the touch size through a token.

**Acceptance Scenarios**: S4.

### Edge Cases

- A hybrid device whose primary pointer is fine (a laptop with a touch
  screen) keeps the desktop size: the primary pointer decides, as the media
  query does.
- A page that already sets a larger font size on the field keeps it: the
  touch token only replaces the component's own default.
- Compact density (spec 045) changes control height, not text size, so it
  composes without change.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Text fields large enough for a touch screen
  On a device whose primary pointer is coarse, the text a person types into a
  text field is at least 16 CSS pixels, so the browser does not zoom the page
  into the field when it gets focus. With a mouse or a trackpad, fields keep
  their standard size, and labels and help text never change size.

  # S1
  Scenario Outline: On a touch screen a text field's text is at least 16 pixels
    Given a <theme> page with a <field> labeled "Email" on a device whose primary pointer is coarse
    When the field receives focus
    Then the text in the field measures at least 16 CSS pixels

    Examples:
      | theme     | field       |
      | onmars    | ki-input    |
      | onmars    | ki-textarea |
      | material3 | ki-input    |
      | material3 | ki-textarea |

  # S2
  Scenario: With a mouse or a trackpad a text field keeps its standard text size
    Given an onmars page with a ki-input labeled "Email" on a device whose primary pointer is fine
    When the field receives focus
    Then the text in the field measures 13 CSS pixels

  # S3
  Scenario: The label and the help text keep their size on a touch screen
    Given an onmars page with a ki-input labeled "Email" with the help text "We never share it" on a device whose primary pointer is coarse
    When the field receives focus
    Then the label and the help text measure what they measure with a fine pointer

  # S4
  Scenario: Reassigning the touch text size restyles the field on a touch screen
    Given a page that sets --ki-input-font-size-touch to 20px around a ki-input labeled "Email" on a device whose primary pointer is coarse
    When the field receives focus
    Then the text in the field measures 20 CSS pixels
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenarios | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3 | |
| Keyboard path | — | N/A: no interaction changes; only the size of the typed text does |
| Assistive-tech outcome | — | N/A: name, role, value and state are unchanged |
| Form participation | — | N/A: value, validity and reset are unchanged |
| Theming | S4 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Under `@media (pointer: coarse)`, the native control of
  `ki-input` and `ki-textarea` MUST render its text at
  `--ki-input-font-size-touch` / `--ki-textarea-font-size-touch`.
- **FR-002**: Both tokens MUST resolve to at least 16px in every shipped
  theme.
- **FR-003**: With a fine primary pointer, the field text MUST keep
  `--ki-input-font-size` / `--ki-textarea-font-size`.
- **FR-004**: The label, help text, error text, field height and line height
  MUST NOT change with the pointer.
- **FR-005**: No Kimen surface may set `maximum-scale` or `user-scalable` on
  the viewport.

### Key Entities

- `--ki-input-font-size-touch`, `--ki-textarea-font-size-touch`: new public
  component tokens.

## Constitutional Surface *(mandatory)*

- **Art. IV/VI**: tokens and logical properties only; the media query is the
  standard interaction media feature.
- **Art. V**: WCAG 1.4.4 (resize text): the person's own zoom stays available.
- **Public API**: two new tokens; no prop, event, part or slot changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Under a coarse primary pointer, every `ki-input` and
  `ki-textarea` in both themes reports a computed font size of at least 16px.
- **SC-002**: Under a fine primary pointer, the visual baselines of
  `ki-input` and `ki-textarea` do not change.

## Assumptions

- Browsers report `pointer: coarse` for the primary pointer of phones and
  tablets, which is where the zoom happens.
- Only Chromium's touch emulation can be driven from the test runner; the
  coarse-pointer cases skip aloud in Firefox and WebKit, where the rule is
  plain CSS.
