Feature: ki-slider selects one value or an interval
  A person can adjust a bounded scale by pointer or keyboard and submit the selection.

  # S1
  Scenario: Pointer movement previews a value and release commits it
    Given a Volume slider set to 20
    When the person drags the thumb to 75
    Then the slider reports 75 during the drag
    And release reports one committed value of 75

  # S2
  Scenario: The two ends of an interval cannot cross
    Given a Price slider set to 20 through 80 with its lower thumb focused
    When the person presses End
    Then the selection is 80 through 80
    And the lower thumb reports 80 as its upper limit

  # S3
  Scenario Outline: The focused thumb responds to navigation keys
    Given a focused Volume slider from 0 through 100 with step 2 and value 50
    When the person presses <key>
    Then the selected value is <value>

    Examples:
      | key        | value |
      | ArrowRight | 52    |
      | ArrowUp    | 52    |
      | ArrowLeft  | 48    |
      | ArrowDown  | 48    |
      | PageUp     | 70    |
      | PageDown   | 30    |
      | Home       | 0     |
      | End        | 100   |

  # S4
  Scenario: Each end of a formatted interval is named and described
    Given a Price slider set to 20 through 80 euros with the help "Price per night"
    When the person navigates to the interval
    Then its thumbs are named "Price minimum" and "Price maximum"
    And each thumb reports its currency value and "Price per night"

  # S5
  Scenario: The form carries both slider value shapes
    Given a form with Volume set to 60 and Price set to 20 through 80
    When the person submits the form
    Then form data contains "volume" with "60" and "price" with "20,80"

  # S6
  Scenario: Reset restores the initial selection
    Given a form with Volume initially 60 and currently 75
    When the person resets the form
    Then Volume is set to 60 again

  # S7
  Scenario: A theme supplies the rail and fill colors
    Given a theme with a navy slider rail and a gold slider fill
    When a Volume slider appears at 60
    Then it shows a navy rail behind a gold fill

  # S8
  Scenario: A centered scale fills toward its negative side in RTL
    Given a right-to-left Exposure slider from -50 through 50 set to -20
    When the centered scale appears
    Then a tick marks the midpoint
    And the fill joins the midpoint to the thumb on its right

  # S9
  Scenario: Up increases a vertical value
    Given a focused vertical Bass slider from 0 through 10 set to 4
    When the person presses ArrowUp
    Then the vertical slider reports value 5
    And the thumb moves upward

  # S10
  Scenario: Touch gives both range thumbs large targets
    Given a page with a coarse pointer
    When a Price interval appears
    Then each thumb has a target of at least 44 by 44 CSS pixels

  # S11
  Scenario: An A2UI scale becomes an interactive slider
    Given a supported A2UI surface
    When the agent sends a Volume slider from 10 through 50 with five divisions and value 34
    Then the surface shows a Volume slider with limits 10 and 50, step 8 and value 34

  # S12
  Scenario: A disabled fieldset makes the slider unavailable
    Given a form with a Volume slider in a fieldset
    When the fieldset is disabled
    Then the slider is skipped in the keyboard sequence
    And form data omits Volume

  # S13
  Scenario Outline: Boolean attributes read consistently from markup and script
    Given a slider
    When an attribute (disabled) is <write> <moment>
    Then the corresponding property reads <state>

    Examples:
      | write                    | moment                 | state        |
      | absent                   | in the initial markup  | its default  |
      | set to exactly "false"   | in the initial markup  | false        |
      | set to an empty value    | in the initial markup  | true         |
      | set to "true"            | in the initial markup  | true         |
      | set to exactly "false"   | after the first render | false        |
      | set to an empty value    | after the first render | true         |
      | set to "true"            | after the first render | true         |
