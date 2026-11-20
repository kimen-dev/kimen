Feature: A conversation displays and follows a chat transcript
  People exchange messages with an assistant and can read earlier replies
  while new messages or streaming text arrive.

  # Family: core behavior
  # S1
  Scenario: A transcript distinguishes people, assistant replies and events
    Given a transcript with a user question, a search event and an assistant reply
    When the transcript is displayed
    Then the question is in a bubble at the inline end, the event is centered and the reply leads with an avatar

  # S2
  Scenario: A reply displays supplied content, avatar and actions
    Given an assistant reply with formatted text, a custom avatar and a Copy action
    When the reply is displayed
    Then the custom avatar, formatted text and Copy action are available in reading order

  # S3
  Scenario: New messages stay in view while the person follows the conversation
    Given a bounded conversation following its latest message
    When a new message arrives below the visible area
    Then the conversation scrolls to the new message

  # S4
  Scenario: A streaming reply stays in view as it grows
    Given a bounded conversation following a streaming reply
    When the reply grows beyond the visible area
    Then the conversation follows the end of the reply

  # S5
  Scenario: Scrollback stays in place when a new message arrives
    Given a person reading earlier messages in a conversation that follows new content
    When a new message arrives
    Then the reading position stays in place and a Jump to latest button is available

  # S6
  Scenario: A conversation without following preserves its reading position
    Given a bounded conversation with following disabled
    When a new message arrives
    Then the reading position stays in place and no Jump to latest button is shown

  # S7
  Scenario: Scrolling back to the latest message resumes following
    Given a conversation paused while the person reads earlier messages
    When the person scrolls to the end
    Then Jump to latest disappears and following resumes

  # Family: keyboard path
  # S8
  Scenario: A keyboard user can return to the latest message
    Given a scrollback position and keyboard focus on the conversation log
    When the person tabs to Jump to latest and activates it with Enter
    Then the latest message is in view and focus returns to the log

  # Family: assistive-tech outcome
  # S9
  Scenario: A transcript exposes a named polite log and named articles
    Given a transcript named "Project chat" with a question, a search event and a reply by "Ava said"
    When assistive technology reads the transcript
    Then it finds a polite log named "Project chat" with articles named "You said", "System event" and "Ava said"
    And the composer stays outside the log

  # S10
  Scenario: Streaming holds updates until the completed reply is available
    Given a person receiving a streaming assistant reply with a visible caret
    When the reply finishes streaming
    Then the caret disappears and the complete reply is available as one polite update
    And focus stays where it was

  # Family: form participation is N/A. See spec.md.

  # Family: theming
  # S11
  Scenario: Theme overrides repaint the user bubble
    Given a theme assigning a distinctive background color, image and backdrop filter to the user bubble
    When a user message is displayed
    Then its bubble paints the configured background color, image and backdrop filter

  # S12
  Scenario: The transcript follows right-to-left reading direction
    Given a right-to-left transcript with a user message and an assistant reply
    When the transcript is displayed
    Then the user bubble is at the left and the assistant avatar leads at the right

  # S13
  Scenario: The streaming caret stays static under reduced motion
    Given the person prefers reduced motion
    When an assistant reply streams
    Then the caret is visible and does not blink

  # S14
  Scenario: Forced colors preserve the user bubble and streaming caret
    Given the person uses a forced colors palette
    When a user bubble and streaming reply are displayed
    Then the bubble retains an outline and the streaming caret remains visible

  # S15
  Scenario: The jump control offers a touch-sized target
    Given a person reads earlier messages on a coarse-pointer device
    When Jump to latest becomes available
    Then it has a hit target of at least 44 by 44 CSS pixels
