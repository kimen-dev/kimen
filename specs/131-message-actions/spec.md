# Message actions

Branch `feat/400-message-actions` · Issue kimen-dev/kimen#400

Add opt-in reply actions and alternative reply navigation to the existing
`ki-message` surface. Applications supply the reply content and handle the
requests. The reference is the local MessageActions design-system card and
preview. The checked-out Conversation stack governs compatibility.

## Decisions

Each interpretation is the **agent's choice, pending founder confirmation**.

- `actions-label` opts an assistant reply into a named toolbar. ButtonGroup
  supplies the recipe layout. The message owns the toolbar's keyboard
  behavior so CopyButton, the Menu trigger and branch controls share the
  same tab stop. Earlier sibling replies reveal these controls on hover or
  focus. Controls stay visible on devices without hover.
- The recipe marks Regenerate, Good and Bad with `data-message-action`.
  `feedback` can initialize or restore the pressed rating. Selecting either
  rating replaces the other and emits its value. Activating the already
  selected rating keeps it selected. The host app can offer a feedback form.
- Branch indexes are one-based. With fewer than two branches there is no
  picker. The navigator clamps an out-of-range index to the nearest branch
  and defaults invalid indexes to the first. It emits the requested index
  and keeps the visible index controlled by the app.
- Branch boundary controls remain focusable and expose their unavailable
  state. Labels and the branch status template are localizable.

## Scenario family coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5, S6 | |
| Keyboard path | S7, S8 | |
| Assistive-tech outcome | S9, S10 | |
| Form participation | N/A | The toolbar issues reply requests and supplies no form values. |
| Theming | S11 | |

## Gherkin contract

```gherkin
Feature: Assistant reply actions and alternatives
  People can act on a reply or request another version from the transcript.

  # Family: core behavior
  # S1
  Scenario: The latest assistant reply shows its actions
    Given two assistant replies with action toolbars followed by a user message
    When the transcript is displayed
    Then the latest assistant reply shows its actions and the earlier one rests without them

  # S2
  Scenario: Hover reveals an earlier reply's actions
    Given an earlier assistant reply with an action toolbar
    When the pointer hovers over the reply
    Then its toolbar is visible

  # S3
  Scenario: Regenerate requests a new answer
    Given an assistant reply with a Regenerate action
    When the person activates Regenerate
    Then the application receives one request to regenerate that reply

  # S4
  Scenario: Branch navigation requests an available alternative
    Given response 2 of 3 is shown
    When the person activates Next response
    Then the application receives a request for response 3
    And response 2 stays displayed until the application changes it

  # S5
  Scenario: Branch navigation stops at the ends
    Given the final response in a set of 3 is shown
    When the person tries to activate Next response
    Then the current response stays displayed and no request is sent

  # S6
  Scenario: Existing actions keep their ordinary behavior
    Given an earlier reply with a custom action and no toolbar configured
    When the transcript is displayed
    Then the custom action remains visible

  # Family: keyboard path
  # S7
  Scenario: Tabbing into an earlier reply reveals one toolbar stop
    Given an earlier reply with several toolbar actions
    When the person tabs through the reply
    Then its toolbar becomes visible on entry and the next Tab leaves it

  # S8
  Scenario: Arrows move from reply actions to branch controls
    Given a toolbar with keyboard focus on its last reply action
    When the person presses the forward arrow
    Then focus moves to Previous response

  # Family: assistive-tech outcome
  # S9
  Scenario: Rating a reply exposes one selected response
    Given Good response is selected in the reply toolbar
    When the person activates Bad response
    Then assistive technology can read Bad response as pressed and Good response as unpressed
    And the application receives bad feedback without a required explanation

  # S10
  Scenario: Changing the displayed response updates its announcement
    Given response 2 of 3 is shown
    When the application displays response 3
    Then the polite status reads Response 3 of 3
    And Next response is unavailable without losing focus

  # Family: theming
  # S11
  Scenario: Branch navigation fits right-to-left reading order
    Given an assistant reply with branch controls in a right-to-left transcript
    When the branch picker is displayed
    Then Previous response is at the inline start and Next response is at the inline end
```
