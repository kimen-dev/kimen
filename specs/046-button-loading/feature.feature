Feature: A loading state for ki-button and ki-icon-button
  While the action a button started is in progress, the button keeps its
  place, its focus and its name, blocks every activation, draws a spinner in
  place of its content and tells assistive technology the action is in
  progress through a polite status message whose text the application can
  translate.

  Rule: A loading button holds its place

    # S1
    Scenario Outline: A loading button keeps its size and draws a spinner in place of its content
      Given a <component> "<name>" at rest
      When the application sets the button loading
      Then the button keeps the width and height it had at rest
      And a spinner is drawn at the center of the button in place of its <content>

      Examples:
        | component      | name         | content |
        | ki-button      | Save changes | label   |
        | ki-icon-button | Refresh      | icon    |

    # S2
    Scenario Outline: The spinner is sized for the button size
      Given a <size> ki-button "Save changes" and a <size> ki-icon-button "Refresh"
      When the application sets both buttons loading
      Then the spinner of the ki-button measures <button>px
      And the spinner of the ki-icon-button measures <icon>px

      Examples:
        | size | button | icon |
        | xs   | 14     | 16   |
        | sm   | 16     | 18   |
        | md   | 18     | 20   |
        | lg   | 20     | 24   |
        | xl   | 24     | 28   |

    # S3
    Scenario Outline: A loading button keeps its place in a right-to-left or compact region
      Given a ki-button "Save changes" inside a region with <context>
      When the application sets the button loading
      Then the button keeps the width and height it had at rest
      And the spinner is drawn at the center of the button

      Examples:
        | context                   |
        | a right-to-left direction |
        | the compact density       |

    # S4
    Scenario: Clearing the loading state brings the label back and makes the button usable
      Given a ki-button "Save changes" that is loading
      When the application clears the loading state
      Then the label "Save changes" is shown and no spinner is drawn
      And no loading status message remains
      And a click on the button reaches the application

    # S5
    Scenario: A disabled button stays disabled when it is also set loading
      Given a disabled ki-button "Save changes"
      When the application sets the button loading
      Then the button keeps its disabled appearance with its label and no spinner
      And the button is out of the Tab order
      And no loading status message is announced

  Rule: A loading button blocks activation

    # S6
    Scenario Outline: A click on a loading button reaches no application listener
      Given a <component> "<name>" that is loading
      When the user clicks the button
      Then the application observes no activation

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

    # S7
    Scenario Outline: Enter and Space on a focused loading button do nothing
      Given a <component> "<name>" that is loading and has focus
      When the user presses <key>
      Then the application observes no activation

      Examples:
        | component      | name         | key   |
        | ki-button      | Save changes | Enter |
        | ki-button      | Save changes | Space |
        | ki-icon-button | Refresh      | Enter |
        | ki-icon-button | Refresh      | Space |

    # S8
    Scenario Outline: A loading button stays in the Tab order with a visible focus indicator
      Given a text field followed by a <component> "<name>" that is loading
      And the text field has focus
      When the user presses Tab
      Then focus is on the button "<name>"
      And the button shows a visible focus indicator

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

  Rule: A loading button does not touch its form

    # S9
    Scenario: A loading submit button does not submit its form
      Given a form with the field "title" holding "Mars" and a loading ki-button "Publish" of type submit
      When the user clicks the button
      Then the form is not submitted

    # S10
    Scenario: A loading reset button does not reset its form
      Given a form whose field "title" was changed from "Mars" to "Venus"
      And a loading ki-button "Reset" of type reset in the form
      When the user clicks the button
      Then the field "title" still holds "Venus"

  Rule: Assistive technology learns the action is in progress

    # S11
    Scenario Outline: A loading button keeps its name and is exposed as unavailable
      Given a <component> "<name>"
      When the application sets the button loading
      Then the accessibility tree exposes a focusable button named "<name>" that is unavailable

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

    # S12
    Scenario Outline: A polite status message says the action is in progress
      Given a <component> "<name>" that has focus
      When the application sets the button loading
      Then "Loading" is announced as a polite status message
      And the button keeps focus

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

    # S13
    Scenario Outline: The status message speaks the page's language
      Given a <component> "<name>" with the loading label "<status>"
      When the application sets the button loading
      Then "<status>" is announced as a polite status message

      Examples:
        | component      | name       | status       |
        | ki-button      | Guardar    | Guardando    |
        | ki-icon-button | Actualizar | Actualizando |

  Rule: The spinner follows the user's motion preference

    # S14
    Scenario: The spinner turns while motion is allowed
      Given a ki-button "Save changes" on a page without a reduced-motion preference
      When the application sets the button loading
      Then the spinner turns continuously

    # S15
    Scenario Outline: Under reduced motion the spinner holds still
      Given the user prefers reduced motion
      And a <component> "<name>"
      When the application sets the button loading
      Then the spinner is drawn and does not turn

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

  Rule: The loading state restyles through tokens

    # S16
    Scenario Outline: Every variant, tone and size shows a legible loading state in every theme and scheme
      Given every variant, tone and size of ki-button and ki-icon-button on a <theme> page in the <scheme> scheme
      When the application sets every button loading
      Then every button keeps the size it had at rest
      And every spinner contrasts with its button's fill at least 3 to 1
      And the accessibility audit reports no violation

      Examples:
        | theme     | scheme |
        | onmars    | light  |
        | onmars    | dark   |
        | material3 | light  |
        | material3 | dark   |

    # S17
    Scenario: The spinner takes the button's foreground ink
      Given a page themed with --ki-button-primary-neutral-rest-fg set to "#7a1fa2"
      And a primary ki-button "Save changes"
      When the application sets the button loading
      Then the spinner renders in "#7a1fa2"

    # S18
    Scenario Outline: Reassigning the spinner size token resizes the spinner
      Given a page whose stylesheet sets <token> to "32px"
      And a medium <component> "<name>"
      When the application sets the button loading
      Then the spinner measures 32px

      Examples:
        | token                            | component      | name         |
        | --ki-button-md-spinner-size      | ki-button      | Save changes |
        | --ki-icon-button-md-spinner-size | ki-icon-button | Refresh      |

    # S19
    Scenario: Under forced colors the spinner is painted in the forced text color
      Given forced colors are active
      And a primary ki-button "Save changes"
      When the application sets the button loading
      Then the spinner is painted in the button's forced text color
