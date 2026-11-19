Feature: ki-spinner shows indeterminate inline activity
  A compact ring indicates ongoing work and typing dots indicate that an
  assistant is thinking.

  # S1
  Scenario Outline: A ring shows ongoing work at the chosen size
    Given a spinner labeled "Saving changes" with <size> size
    When the spinner appears
    Then a <diameter> pixel ring appears
    And the label occupies no visible space

    Examples:
      | size       | diameter |
      | small      | 16       |
      | default    | 20       |
      | large      | 32       |

  # S2
  Scenario: Typing dots can show a visible activity label
    Given a spinner with typing dots and the label "Assistant is thinking"
    When it appears with its label shown
    Then three dots appear beside "Assistant is thinking"

  # S3
  Scenario: Unrecognized presentation values resolve to the default ring
    Given a spinner labeled "Saving changes" with an unrecognized size and variant
    When the spinner appears
    Then a 20 pixel ring appears

  # S4
  Scenario: A spinner leaves the keyboard tab sequence intact
    Given a spinner between the "Edit" and "Cancel" buttons
    And focus is on "Edit"
    When the user presses Tab
    Then focus moves to "Cancel"

  # S5
  Scenario: Inserting a spinner provides one polite activity update
    Given an already rendered page
    When a spinner labeled "Saving changes" is inserted
    Then it exposes a single status named "Saving changes"
    And its polite status region receives the message once

  # S6
  Scenario: Showing the label does not repeat the activity update
    Given a spinner that has already announced "Saving changes"
    When its label is made visible
    Then the same status shows "Saving changes"
    And the polite status region receives no new message

  # S7
  Scenario: A theme can recolor both parts of the ring
    Given a theme whose ring track is navy and whose ring indicator is gold
    When a spinner appears
    Then the ring shows a navy track and a gold indicator

  # S8
  Scenario: Reduced motion slows the ring and stops the dots
    Given a rotating ring and pulsing typing dots
    When the user requests reduced motion
    Then the ring rotates more slowly
    And all three dots remain visible and still

  # S9
  Scenario: The status label follows the dots in right-to-left reading order
    Given a right-to-left page
    When a typing spinner appears with the visible label "جارٍ التفكير"
    Then its graphic appears to the right of its label

  # S10
  Scenario: A coarse pointer preserves inline ring dimensions
    Given a coarse-pointer page
    When a small spinner appears
    Then the ring measures 16 pixels across

  # S11
  Scenario: A forced-colors palette keeps both variants distinguishable
    Given a page with forced colors active
    When a ring spinner and a typing spinner appear
    Then the ring track and moving segment remain distinguishable
    And all three dots remain visible
