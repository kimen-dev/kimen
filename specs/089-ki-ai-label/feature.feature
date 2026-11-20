Feature: ki-ai-label identifies AI-generated content
  People can inspect the source of generated content and ask to restore their own text.

  # S1
  Scenario: A static mark identifies generated content
    Given an AI label with no explanation
    When the label appears beside a weekly summary
    Then it displays the AI mark without a disclosure control

  # S2
  Scenario: The disclosure explains where the content came from
    Given a label with an explanation, model "Standard", and generation date
    When the person opens the explanation
    Then a non-modal panel shows the explanation, model, and date

  # S3
  Scenario: The revert action asks the application to restore the original text
    Given an open explanation with the revert action enabled
    When the person activates "Revert to my text"
    Then the label emits one revert request and closes
    And the application still owns the text

  # S4
  Scenario: The keyboard can open and dismiss the explanation
    Given focus is on the explanation button
    When the person presses Enter
    Then focus moves into the explanation and the button is expanded
    And Escape closes the explanation and returns focus to the button

  # S5
  Scenario: Tab can leave the open explanation
    Given focus is on the last action in the open explanation
    When the person presses Tab
    Then focus continues to the next control and the explanation closes

  # S6
  Scenario: Assistive technology can identify the disclosure before opening it
    Given an AI label with an explanation
    When the button receives focus
    Then it exposes the name "AI-generated: about this content" and a collapsed dialog disclosure

  # S7
  Scenario: A suggested field value is announced alongside the field's help
    Given a Subject field with help and a trailing AI label
    When the Subject field receives focus
    Then its description includes "Suggested by AI" and its help
    And its name is "Subject"

  # S8
  Scenario: A suggestion label leaves form submission to the field
    Given a form with Subject set to "Incident summary" and a trailing AI label
    When the form is submitted
    Then the Subject entry contains only "Incident summary"

  # S9
  Scenario: An AI label inherits theme colors
    Given a theme with a navy AI label fill and white text
    When the label appears
    Then the mark has a navy fill and white text

  # S10
  Scenario: Right-to-left reading order places the icon at the logical start
    Given a right-to-left page with an AI label
    When the label appears
    Then the icon is to the right of its text

  # S11
  Scenario: Forced colors keep the mark and disclosure visible
    Given a page using forced colors
    When the person opens the explanation
    Then the mark and the explanation remain distinguishable

  # S12
  Scenario: Reduced motion keeps disclosure immediate
    Given a page with reduced motion enabled
    When the person opens the explanation
    Then the explanation appears without animation

  # S13
  Scenario: Touch density enlarges the disclosure target
    Given a coarse-pointer page with an interactive AI label
    When the label appears
    Then the button provides a larger target than in compact density
