Feature: ki-skeleton reserves space for loading content
  Decorative shapes preview the layout while a labelled region loads.

  # S1
  Scenario: Draw text placeholders with a shorter final line
    Given a full-width single text placeholder
    When the author requests three lines
    Then three equally tall lines fill the reserved text area
    And the final line is shorter

  # S2
  Scenario: Size circles and rectangles on the logical axes
    Given a card with fixed space for an avatar and a cover
    When the card shows a 40-pixel circle and a 160 by 96-pixel rectangle
    Then the avatar has a round placeholder 40 pixels across
    And the cover has a rectangular placeholder 160 pixels inline by 96 pixels block

  # S3
  Scenario: Reveal a slow load without moving the next content
    Given a project region reserves its content space from the start of loading
    When the request is still pending after 300 milliseconds
    Then the project placeholders become visible
    And adjacent content keeps its position

  # S4
  Scenario: Skip placeholders for a fast load
    Given a project region is waiting to show placeholders after 300 milliseconds
    When the project loads after 150 milliseconds
    Then the project content replaces the reserved space without showing placeholders
    And the region reports that loading has ended

  # S5
  Scenario: Keep decorative shapes out of sequential focus
    Given a skeleton between two controls
    When the user tabs from the first control
    Then focus moves to the second control

  # S6
  Scenario: Expose the loading region without exposing its shapes
    Given a region named "Loading project" is busy
    When the region displays decorative skeletons
    Then assistive technology exposes the busy region with its name
    And the skeletons are hidden from assistive technology

  # S7
  Scenario: Restyle the placeholder with theme tokens
    Given a theme supplies a custom skeleton fill and radius
    When the theme displays a static rectangular placeholder
    Then the rectangle uses the custom fill and radius

  # S8
  Scenario: Keep the placeholder static when motion is disabled
    Given a skeleton shimmers by default
    When the user requests reduced motion or the author disables animation
    Then the skeleton keeps its shape and fill without motion

  # S9
  Scenario: Keep the placeholder visible in a forced palette
    Given a skeleton on the page canvas
    When the user activates a forced-colour palette
    Then a static outline distinguishes the placeholder from the canvas

  # S10
  Scenario: Align the shorter line to the reading start
    Given a three-line text placeholder
    When the reading direction is right to left
    Then the shorter line starts at the right edge of the full lines

  # S11
  Scenario: Keep reserved dimensions with a coarse pointer
    Given a placeholder with explicit dimensions in automatic density
    When the primary pointer is coarse
    Then the placeholder keeps the same dimensions
