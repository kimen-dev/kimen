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

  # Family: theming
  # S13
  Scenario: A suggestion card themes its description as the action is pressed
    Given a suggestion card with custom rest, hover and pressed description backgrounds
    When the user holds down the suggestion action
    Then the description shows its pressed background
