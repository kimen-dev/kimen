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
