# Conversation and Message

Branch `feat/371-ki-conversation` · Issue kimen-dev/kimen#371

A conversation displays a chronological transcript of user messages, assistant
replies and events. In a bounded transcript, an opt-in follow mode keeps the
latest message in view until the person scrolls back. The app supplies the
messages, streaming state and any composer or message actions.

## Sources

The issue defines the public contract. The Conversation design-system
reference is the founder's local `components/Conversation/README.md` and `preview.html`. The checked-in
tokens and discovery conventions govern integration.

## Decisions

Each interpretation below is the **agent's choice, pending founder confirmation**.

- Following is off by default. Set `stick-to-bottom` on a block-size-constrained
  conversation to enable it. The jump control sits below the scrollport, and
  keyboard activation returns focus to the log. It uses the large secondary
  button so a coarse pointer has a touch-sized target at default density.
- `label` defaults to “Conversation” and `jump-label` defaults to “Jump to
  latest”. For messages, `author` sets the complete accessible article name.
  Override it to localize the fallback “You said”, “Assistant said” or “System
  event”. Missing or unknown roles use the assistant layout.
- `messageRole` / `message-role` is the public message kind. The proposed
  `role="user|assistant|event"` markup is consumed as an alias so native
  HTML role values remain valid after upgrade. `icon-name` displays a
  decorative registry icon for events.
- Following scrolls instantly, avoids page scrolling and does not move focus
  as messages arrive. Scrollback resumes at the end or on jump activation.
- The message uses a decorative default assistant avatar and supports any
  supplied avatar as slot content. The issue's event presentation uses
  article semantics like the other two message roles.
- Event text uses the mode-aware supporting ink. The caret uses the shared
  1,200 ms activity pulse and stays still under reduced motion.
- Conversation and Message use sibling tag folders and share the Conversation
  token sources and a composite bundle budget, following Kimen discovery.
  Conversation's metadata records the MCP server bundle's measured increase
  over the branch base. The jump control is internal. Catalog entries declare no emitted actions,
  and authored actions can be supplied through the message's `actions` slot.

## Scenario Family Coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5, S6, S7 | |
| Keyboard path | S8 | |
| Assistive-tech outcome | S9, S10 | |
| Form participation | N/A | The transcript and messages do not supply a form value. |
| Theming | S11, S12, S13, S14, S15 | |

## Gherkin contract

```gherkin
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
```
