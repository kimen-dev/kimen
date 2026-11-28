Feature: ki-carousel presents a sequence of slides
  People can move through slide content and keep their place.

  # S1
  Scenario: Navigation advances by the configured step
    Given five highlights showing two at a time and moving two at a time
    When the reader activates Next slide from position one
    Then position three leads the visible slides
    And a slide change reports index 3

  # S2
  Scenario: Looping wraps the sequence
    Given a looping carousel at the last of three highlights
    When the reader activates Next slide
    Then the first highlight becomes current

  # S3
  Scenario: A swipe updates the position
    Given a carousel showing the first of three highlights
    When the reader swipes toward the next slide
    Then the viewport snaps to the second highlight
    And the position indicator highlights two

  # S4
  Scenario: The public API selects a slide
    Given a carousel showing the first of three highlights
    When its consumer requests position three
    Then position three becomes current
    And a slide change reports index 3

  # S5
  Scenario: The reader navigates without a pointer
    Given the Next slide control has keyboard focus
    When the reader presses Space
    Then the second highlight becomes current
    And focus remains on Next slide

  # S6
  Scenario: Slide names and visibility follow the visible range
    Given a carousel named "Highlights" showing the first of three slides
    When assistive technology reads the carousel
    Then it exposes a region named "Highlights" described as a carousel
    And only the slide group named "1 of 3" is available

  # S7
  Scenario: A manual slide change is announced
    Given a three-slide carousel with rotation off
    When the reader moves to the second highlight
    Then a polite announcement reports "2 of 3"

  # S8
  Scenario: Focus stops automatic rotation
    Given three highlights rotating automatically without announcements
    When keyboard focus enters the carousel
    Then rotation stops until the reader activates Play
    And slide changes can be announced politely

  # S9
  Scenario: The reader pauses automatic rotation
    Given three highlights rotate automatically
    When the reader activates Pause
    Then the current slide stays in place
    And a Play control is available

  # S10
  Scenario: Hover temporarily pauses rotation
    Given a three-slide carousel rotates automatically
    When the pointer hovers over the carousel
    Then the current slide stays in place while the pointer remains there

  # S11
  Scenario Outline: The layout keeps its controls and slides readable
    Given a carousel with five highlights using the <layout> layout
    When the reader moves one position forward
    Then the second highlight is readable in full
    And navigation and the position indicator remain available

    Examples:
      | layout       |
      | multi-browse |
      | uncontained  |
      | hero         |
      | full-screen  |

  # S12
  Scenario: A narrow preview keeps its text hidden until it leads
    Given a multi-browse carousel with a small preview
    When the reader reaches the small preview
    Then its full text is visible and available to assistive technology

  # S13
  Scenario: A theme supplies the navigation surface
    Given a carousel theme with a yellow navigation surface
    When the carousel appears
    Then its navigation buttons paint yellow

  # S14
  Scenario: Forced colors preserve navigation
    Given a user-selected forced-color palette
    When the carousel appears
    Then its navigation controls retain visible outlines and glyphs

  # S15
  Scenario: Reduced motion keeps the carousel still until navigated
    Given a multi-browse carousel configured to rotate and a reader who requests reduced motion
    When the reader activates Next slide
    Then the next slide reaches its full size and position immediately
    And automatic rotation remains off

  # S16
  Scenario: Right-to-left navigation follows reading order
    Given a right-to-left carousel showing the first of three slides
    When the reader activates Next slide
    Then the next slide approaches from the left and becomes current

  # S17
  Scenario: Coarse pointers have comfortable targets
    Given a carousel with touch density on a coarse-pointer device
    When the carousel appears
    Then both navigation controls have at least 44 by 44 CSS pixel targets

  # S18
  Scenario: Navigation and pagination can be independently hidden
    Given a carousel configured with no navigation controls
    When the carousel appears
    Then its indicator remains visible
    And the slide viewport can receive keyboard focus

  # S19
  Scenario: Offscreen slide links are skipped
    Given the first two slides each contain a link and only the first slide is visible
    When the reader presses Tab from the first slide link
    Then focus moves to the carousel navigation

  # S20
  Scenario: An item projects its own slide content
    Given a carousel item with a link titled "Learn more"
    When that item is the visible slide
    Then the link is available to the reader

  # Amendment A1 (decided 2026-11-24): a floor for automatic rotation

  # S21
  Scenario Outline: An interval below the floor waits the full five seconds
    Given a looping carousel of three highlights set to rotate every <interval> milliseconds
    When 4999 milliseconds pass without interaction
    Then no slide change has been reported
    And the first highlight is still current

    Examples:
      | interval |
      | 1        |
      | 334      |
      | 4999     |

  # S22
  Scenario: Rotation below the floor moves once per five seconds
    Given a looping carousel of three highlights set to rotate every 1 millisecond
    When 6 seconds pass without interaction
    Then the second highlight is current
    And exactly one slide change has been reported

  # S23
  Scenario: An interval above the floor is kept as set
    Given a looping carousel of three highlights set to rotate every 8000 milliseconds
    When 12 seconds pass without interaction
    Then the second highlight is current
    And exactly one slide change has been reported

  # S24
  Scenario: An agent spec with a one-millisecond interval stays valid
    Given an agent spec with a looping three-slide carousel whose autoplay is 1
    When a surface renders the spec
    Then the carousel appears with no validation issue
    And its Pause control is available

  # S25
  Scenario: Removing a boolean override restores its default on state
    Given a carousel with navigation or pagination set to "false"
    When the application removes the attribute
    Then the corresponding property reads true
