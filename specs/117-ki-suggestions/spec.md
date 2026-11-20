# Feature specification for ki-suggestions

**Branch** `feat/399-ki-suggestions` · **Created** 2026-11-20 · **Issue** #399

Offer recommended prompts to start a conversation or continue one after an answer. Each suggestion is an independent button. The application decides how to send the chosen prompt.

## Gherkin scenarios

```gherkin
Feature: Conversation suggestions offer a prompt to send or edit

  # S1
  Scenario: Choose a follow-up to send
    Given Follow-up suggestions offers "Which ones recur?" in send mode with an attached composer
    When the user clicks that suggestion
    Then one selection reports "Which ones recur?" to the application
    And focus returns to the composer with its draft intact

  # S2
  Scenario: Fill the composer with a starter
    Given Start a conversation offers a card titled "Draft release notes" in fill mode with an attached composer
    When the user clicks the card
    Then the composer contains "Draft release notes" and receives focus
    And one selection reports "Draft release notes"

  # S3
  Scenario: Reach and activate suggestions from the keyboard
    Given two suggestions between focusable controls and an attached composer in fill mode
    When the user chooses a suggestion with the keyboard
    Then both buttons are reachable in reading order
    And activation fills and focuses the composer

  # S4
  Scenario: Expose the group name, button title and description
    Given Start a conversation contains a card titled "Draft release notes" described by "For the merged pull requests"
    When the card is displayed
    Then assistive technology exposes a group named "Start a conversation"
    And the group contains a button named "Draft release notes" with description "For the merged pull requests"

  # S5
  Scenario: Keep suggestions out of form submission
    Given a form with a draft field and a suggestion in send mode
    When the user chooses the suggestion
    Then the form remains unsubmitted and the draft is its only form value

  # S6
  Scenario: Paint a card with the overridden surface
    Given the card background theme token has a custom colour
    When a card is displayed
    Then the card uses the custom colour

  # S7
  Scenario: Keep the focused suggestion visible in forced colours
    Given the display uses forced colours
    When the suggestion button receives keyboard focus
    Then its control border and focus indicator remain visible

  # S8
  Scenario: Choose a suggestion with reduced motion
    Given the display requests reduced motion
    When the user activates a suggestion
    Then the button uses no animation or transition

  # S9
  Scenario: Follow the right-to-left reading order
    Given a right-to-left group with two follow-up suggestions
    When the buttons are displayed
    Then the first suggestion appears at the inline start

  # S10
  Scenario: Provide touch targets in a region with touch density
    Given a coarse pointer and a region that opts into touch density
    When suggestions are displayed
    Then each button has a target at least 44 by 44 CSS pixels

  # S11
  Scenario: Use the current title when the application edits a suggestion
    Given a suggestion originally titled "Draft release notes"
    And the application replaces its title with "Review the changes"
    When the user chooses the renamed suggestion
    Then one selection reports "Review the changes"

  # S12
  Scenario: Allow the application to own the composer workflow
    Given a fill-mode group with an attached composer and a listener that cancels selection
    When the user chooses a suggestion
    Then the composer keeps its draft
    And focus stays under the application's control
```

| Family | Scenarios |
| --- | --- |
| Core behavior | S1, S2, S11, S12 |
| Keyboard path | S3 |
| Assistive-tech outcome | S4 |
| Form participation | S5 |
| Theming | S6, S7, S8, S9, S10 |

## Requirements

- Provide a group label and direct `ki-suggestion` children. Each child supplies a prompt title as plain text. Cards can show an optional description beneath the title.
- The group emits one bubbling, composed `ki-select` with `detail.text` for a button activation. The prompt is the button's accessible name. A supplied description is a separate accessible description.
- Ship both tags in the neutral catalog and generated React, Vue and Angular wrappers. The group declares the selection action. Sending and any async conversation state belong to the host application.
- Validate the theme pairs in both themes and schemes with standard, contrast-more and reduced-transparency tokens. Capture the available layouts in the onmars and Material 3 light and dark galleries.

## Decisions

- **Agent's choice, pending founder confirmation.** The optional script-only `composer` property accepts a writable `value` and a `focus()` method. Each activation first emits the cancelable event. In `fill` mode its default action replaces the assigned composer's draft. Both modes focus the assigned composer after dispatch. Sending uses the application handler. PromptInput is absent from this branch, so the contract is exercised with a native textarea and permits a PromptInput adapter.
- **Agent's choice, pending founder confirmation.** Options take the regular Tab order and use native Enter and Space. Titles are plain text with incidental HTML whitespace collapsed. A blank title supplies no button.
- **Agent's choice, pending founder confirmation.** Chips wrap and cards use up to two columns that shrink on narrow containers. Descriptions display in cards and serve as accessible descriptions in either variant when supplied. Chips use text without the reference preview's decorative glyph. Touch density expands chip hit areas while retaining the 32px paint. Cards paint the base surface for a reliable title and description contrast pair. State changes are immediate.
- **Agent's choice, pending founder confirmation.** Register the group and companion as separate component folders, the registry's unit of discovery. An application using the guarded renderer binds the declared group event and follows the renderer's existing action payload contract. Distinct child action identifiers can identify each prompt when rendering through that API.
- **Agent's choice, pending founder confirmation.** The loader namespace additions classify as major under the API comparator. The composite allowance covers the measured MCP server increase of 20,067 raw bytes and 4,422 gzip bytes. The other size ceilings already cover the new artifacts.
