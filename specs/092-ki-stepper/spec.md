# Stepper

**Issue** #394  
**Branch** `feat/394-ki-stepper`

Use `ki-stepper` for named progress through a setup, checkout or wizard. Authors
supply steps and update their state as the task progresses. A completed step
can link back. The [component contract](contracts/stepper.md) describes the
authoring API.

## Scenario Family Coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S12 | |
| Keyboard path | S4, S5 | |
| Assistive-tech outcome | S6 | |
| Form participation | N/A | The stepper reports progress and offers optional links. It has no form value, validity or submission behavior. |
| Theming | S7, S8, S9, S10, S11 | |

## Interpretations

- Agent's choice, pending founder confirmation. Horizontal layout compacts
  below 22rem of available inline size. The summary opens the same list
  vertically so completed links and descriptions remain available.
- Agent's choice, pending founder confirmation. Count visible direct steps in
  authored order. Use the first current step when more than one is marked
  current and present the others as upcoming. Use the total alone when no step
  is current, and omit the summary when the list is empty. Unknown state and
  orientation values use the documented defaults.
- Agent's choice, pending founder confirmation. Use four overridable state
  labels and two overridable summary templates. The error marker uses a
  decorative exclamation glyph. The Stepper lays out direct `ki-step` children
  and manages their slot assignment.
- Agent's choice, pending founder confirmation. Use the contrast-aware
  supporting foreground for upcoming steps and descriptions. It preserves the
  preview's standard palette and meets the enhanced contrast target.
- Agent's choice, pending founder confirmation. Keep links native. The catalog
  uses its existing URL policy for `href` and neither component declares an
  action event.

## Gherkin

```gherkin
Feature: Stepper shows progress through named steps
  People can check their place in an ordered task and return to completed steps.

  # S1
  Scenario: A vertical stepper describes the state of each step
    Given a vertical setup stepper with completed, current, upcoming and error steps
    When the person reads the stepper
    Then the four steps appear vertically in order with distinct markers
    And the Review step shows its description

  # S2
  Scenario: A horizontal stepper summarizes progress in a narrow space
    Given a horizontal stepper whose third of four steps is current
    When its available inline size narrows below 22rem
    Then the visible summary says "Step 3 of 4"
    And the full list is available through the summary disclosure

  # S3
  Scenario: Step changes update the displayed position
    Given a narrow stepper whose second of three steps is current
    When the author inserts a step before the current step
    Then the summary says "Step 3 of 4"

  # S4
  Scenario: Completed steps provide native keyboard navigation
    Given a completed Account step with a destination and a current Invite step with a destination
    When the person navigates using Tab and Enter
    Then Account is a focusable link that opens its destination
    And Invite stays out of the tab sequence

  # S5
  Scenario: A narrow stepper reveals its links from the keyboard
    Given a collapsed stepper with a completed Account link
    When the person activates its summary with Space
    Then the ordered list is expanded
    And the Account link can be reached with Tab

  # S6
  Scenario: Assistive technology can read the ordered states
    Given the named Setup progress stepper showing Account, Invite, Review and Publish
    When assistive technology reads the expanded steps
    Then it finds a list named "Setup progress" with the four list items in order
    And it reads a text equivalent for each state
    And only Invite is indicated as the current step

  # S7
  Scenario: Semantic theme overrides repaint the completed marker
    Given a stepper with a completed Account step
    When the theme changes the primary medium-emphasis surface
    Then the completed marker takes the new fill

  # S8
  Scenario: Horizontal steps follow the writing direction
    Given a wide horizontal stepper with Account before Invite
    When the page uses a right-to-left writing direction
    Then Account appears to the right of Invite in the same row

  # S9
  Scenario: Back links honor touch density
    Given a stepper with a completed Account link in a touch-density region
    When a person views it with a coarse pointer
    Then the link has at least a 44 by 44 CSS pixel target

  # S10
  Scenario: State differences survive forced colors
    Given a stepper with completed, current, upcoming and error steps
    When forced colors are active
    Then the completed and error glyphs remain visible
    And the current and upcoming markers retain visible and distinct outlines

  # S11
  Scenario: Progress updates stay static under reduced motion
    Given a stepper in a reduced-motion environment
    When the author changes the current step
    Then the current marker moves to the new step without animation

  # S12
  Scenario: A compact stepper can localize its summary
    Given a narrow stepper with localized summary text and no current step
    When its count is presented
    Then the summary uses the localized step count without inventing a current position
```
