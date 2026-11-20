# Feature Specification for ki-code-block

**Branch** `feat/369-ki-code-block`

**Source** Issue #369 and the CodeBlock design-system preview.

## Scenario family coverage

| Family | Scenarios | Notes |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S12 | Code, copy, presentation and guarded action |
| Keyboard path | S5, S6 | Native scrolling and copy activation |
| Assistive-tech outcome | S7 | Named figure, highlighted lines and hidden numbers |
| Form participation | N/A | The figure displays text and its copy button is a non-submit action. There is no field value or validity. |
| Theming | S8, S9, S10, S11 | Token overrides, system preferences, direction and density |

## Interpretations

- **Grammar and source** (agent's choice, pending founder confirmation). The default slot supplies literal text and updates when that text changes. JavaScript, TypeScript and JSON have lightweight syntax coloring, including common JavaScript and TypeScript aliases. Other languages display plain text. The language label uses the supplied text. The clipboard receives the original whitespace.
- **Line highlighting** (agent's choice, pending founder confirmation). Lines are one-based. Omit malformed and reversed ranges, intersect valid ranges with the displayed lines, and combine overlaps. A visible rule and a localized accessible description identify selected lines. The code and its gutter read left to right inside either interface direction.
- **Labels and clipboard** (agent's choice, pending founder confirmation). Use a localized fallback figure name when metadata is missing and forward localizable button labels to CopyButton. Publish successful and failed copy events on the code block. Guarded surfaces can bind a declared action to successful copies.
- **Contrast** (agent's choice, pending founder confirmation). Use supporting text for comments and line numbers so the same inks remain legible in both themes, including on highlighted lines.

## Gherkin

```gherkin
Feature: ki-code-block presents a source snippet with syntax and copy controls
  A reader can inspect code, locate highlighted lines and copy the source as text.

  # S1
  Scenario: Read a highlighted TypeScript snippet
    Given a TypeScript snippet named "main.ts" with line numbers and highlights "1,3-4"
    When the reader views the snippet
    Then the header shows its language and filename
    And the syntax, line numbers and selected lines are visually distinct

  # S2
  Scenario: Read an unsupported language as plain text
    Given a snippet labelled "txt" with literal angle brackets
    When the reader views the snippet
    Then the original text is readable without syntax colors or interpreted markup

  # S3
  Scenario: Copy the current source text
    Given a numbered snippet whose source text was updated
    When the reader activates Copy code
    Then the clipboard receives the current source with its whitespace intact
    And the copy control confirms success once

  # S4
  Scenario: Wrap a long line and omit the copy control
    Given a long snippet displayed with wrap enabled and copying disabled
    When the reader views the snippet
    Then the line wraps within the code area
    And there is no copy control

  # S5
  Scenario: Scroll the code with the keyboard
    Given a snippet wider than its scroll area and focus on the preceding control
    When the reader tabs to the code area
    Then it has visible focus and can be scrolled with the arrow keys

  # S6
  Scenario: Copy using the keyboard
    Given the Copy code button has keyboard focus
    When the reader presses Enter
    Then the clipboard receives the source once
    And the Copy code button keeps focus

  # S7
  Scenario: Describe the snippet to assistive technology
    Given a numbered snippet labelled "ts · main.ts" with line 2 highlighted
    When the reader navigates to the code
    Then the figure is named "ts · main.ts" and the code area describes highlighted line 2
    And line numbers are absent from the accessibility tree

  # S8
  Scenario: Reassign syntax and highlight tokens
    Given a theme with custom syntax ink and highlight fill tokens
    When the reader views a highlighted snippet
    Then its syntax and selected lines use those tokens

  # S9
  Scenario: Keep selected lines distinct under system preferences
    Given a numbered snippet with a selected line
    When the reader enables forced colors and reduced motion
    Then the selected line retains its visible marker and keyboard focus indicator
    And reading the snippet requires no animation

  # S10
  Scenario: Read left-to-right source in a right-to-left layout
    Given an English TypeScript snippet in a right-to-left interface
    When the reader views the snippet
    Then the header follows the interface direction and the code reads left to right

  # S11
  Scenario: Copy from the touch target
    Given a snippet using touch density on a coarse pointer
    When the reader reaches for the Copy code button
    Then the copy target spans at least 44 CSS pixels in each direction

  # S12
  Scenario: Dispatch a declared surface action after copying
    Given a guarded surface renders a code snippet with a declared action
    When the reader successfully copies the snippet
    Then the surface dispatches that action once
```
