Feature: ki-prompt-input composes an assistant message
  People can write a message, attach local files, send the draft and stop a response.

  # S1
  Scenario: Send delivers the draft and returns focus to the composer
    Given a composer with the draft "Summarise the incidents" and an accepted CSV file
    When the person activates Send
    Then the send event reports the original text and file
    And the draft is cleared and focus is in the text field

  # S2
  Scenario: The multiline draft grows and scrolls at its height limit
    Given a composer showing one line of text
    When the person enters enough lines to reach the height limit
    Then the text field grows to the limit and scrolls to reveal the rest

  # S3
  Scenario Outline: The same file is accepted from each attachment source
    Given a composer accepting CSV files up to 10 bytes
    When the person adds incidents.csv using <source>
    Then incidents.csv is listed as an attachment

    Examples:
      | source   |
      | picker   |
      | drop     |
      | paste    |

  # S4
  Scenario Outline: Rejected files explain why they were skipped
    Given a composer accepting up to two CSV files of at most 10 bytes each with one file already attached
    When the person drops a batch containing <file>
    Then the rejected file is absent from the attachment list
    And the composer identifies <reason> beside the draft

    Examples:
      | file                   | reason          |
      | photo.png              | unsupported type |
      | oversized.csv          | excessive size   |
      | a third valid CSV file | file count limit |

  # S5
  Scenario: Streaming offers Stop and emits the stop request
    Given the assistant is streaming a response
    When the person activates Stop
    Then a stop event is emitted and the text draft is preserved

  # S6
  Scenario: A submitted request prevents a repeated send
    Given the composer has draft text and a request is submitted
    When the person presses Enter
    Then no send event is emitted and the draft is preserved

  # S7
  Scenario: Attachments are unavailable without accepted types
    Given a composer with no accepted file types
    When the person drops a CSV file
    Then the Attach files control and attachment list are absent

  # S8
  Scenario: Enter sends a ready draft by default
    Given an idle composer focused with the draft "Hello"
    When the person presses Enter
    Then a send event reports "Hello" without a trailing newline

  # S9
  Scenario Outline: Newline shortcuts preserve a multiline draft
    Given a focused composer configured for <mode> with draft "Hello"
    When the person presses <keys>
    Then a newline is inserted and no send event is emitted

    Examples:
      | mode      | keys          |
      | enter     | Shift+Enter   |
      | mod-enter | Enter         |
      | mod-enter | Shift+Enter   |

  # S10
  Scenario Outline: Modifier Enter sends in modifier mode
    Given a focused composer configured for mod-enter with a ready draft
    When the person presses <keys>
    Then the draft is sent

    Examples:
      | keys          |
      | Control+Enter |
      | Meta+Enter    |

  # S11
  Scenario: The keyboard removes an attachment and returns to the draft
    Given focus is on the button named "Remove incidents.csv"
    When the person presses Space
    Then the attachment is removed and focus returns to the text field

  # S12
  Scenario: Composer controls expose names and live feedback
    Given a composer named "Message Kimen Assistant" with incidents.csv attached
    When the assistant starts streaming
    Then assistive technology can identify the text field, the Attachments list, and the Remove and Stop controls
    And "Writing…" is exposed as a polite status update

  # S13
  Scenario: A named composer contributes its text to the enclosing form
    Given a form containing an enabled composer named "message" with an edited text draft and one attachment
    When the form data is collected
    Then "message" contains the current text draft

  # S14
  Scenario: Reset restores the initial text and clears attachments
    Given the form's composer had initial text "Hello" and now has edited text and a file
    When the enclosing form is reset
    Then the composer contains "Hello" and no attachments

  # S15
  Scenario: A disabled fieldset disables the composer
    Given the composer is inside an enabled fieldset with a ready draft
    When the fieldset is disabled
    Then the composer cannot be edited or sent and contributes no form value

  # S16
  Scenario: A semantic surface override repaints the composer
    Given a composer under a Kimen theme
    When the raised surface token is changed
    Then the composer surface uses the new colour

  # S17
  Scenario: Right-to-left direction mirrors the composer controls
    Given a composer with an attach control before its send control
    When the region uses right-to-left direction
    Then the attach control is at inline-start and the send control at inline-end

  # S18
  Scenario: Touch density enlarges control targets
    Given a composer on a coarse pointer with standard density
    When the region requests touch density
    Then attachment and send controls activate within the enlarged targets

  # S19
  Scenario: Forced colours retain a visible focus indicator
    Given a composer displayed in forced colours
    When the text field receives keyboard focus
    Then the field retains a visible border and focus indicator

  # S20
  Scenario: Reduced motion changes the writing state without animation
    Given a composer under a reduced-motion preference
    When the assistant starts streaming
    Then the Stop control and writing status appear without animation
