Feature: ki-copy-button copies text and confirms the result in place
  A person can copy a link, token or code with a compact or labelled button.

  # S1
  Scenario: Copy an explicit value
    Given a copy button with the value "https://kimen.dev/i/4f9a"
    When the person activates the button
    Then the clipboard receives "https://kimen.dev/i/4f9a"
    And a ki-copy event reports that exact value

  # S2
  Scenario: Copy the current value of a referenced field
    Given a copy button with a fallback value and a reference to the "Invite token" field
    And the field now contains "fresh-token"
    When the person activates the button
    Then the clipboard receives "fresh-token" instead of the fallback

  # S3
  Scenario: Copy formatted text from a referenced element
    Given a copy button references a code sample without a string value
    When the person activates the button
    Then the clipboard receives the sample text with its whitespace intact

  # S4
  Scenario: Report a failed copy
    Given the clipboard refuses writes or the button cannot resolve its source
    When the person activates the button
    Then the polite status says "Couldn't copy"
    And a ki-copy-error event reports the failure

  # S5
  Scenario Outline: Copy using the keyboard
    Given the "Copy token" button is focused
    When the person presses <key>
    Then the clipboard receives the token once
    And the button retains focus

    Examples:
      | key   |
      | Enter |
      | Space |

  # S6
  Scenario Outline: Confirm copying without changing the button name or position
    Given a <presentation> copy button named "Copy token"
    When copying succeeds
    Then the polite status says "Copied"
    And the check glyph appears in the same space as the copy glyph
    And the button keeps its accessible name and position

    Examples:
      | presentation |
      | icon-only    |
      | labelled     |

  # S7
  Scenario: Clear the transient confirmation
    Given the copy button shows its check with a feedback duration of 1500 milliseconds
    When 1500 milliseconds pass after the copy succeeds
    Then the copy glyph returns
    And the polite status clears

  # S8
  Scenario: Copy inside a form
    Given a form with a copy button and an invitation field
    When the person activates the copy button
    Then the invitation is copied and the form remains unsubmitted
    And the copy button contributes no form data

  # S9
  Scenario: Recolor the confirmation with semantic tokens
    Given the theme reassigns its high-emphasis success text token
    When copying succeeds
    Then the check glyph uses the reassigned color

  # S10
  Scenario: Dispatch a declared catalog action after a successful copy
    Given a guarded surface renders a copy button with a declared action
    When the person successfully copies its value
    Then the surface dispatches that action once
