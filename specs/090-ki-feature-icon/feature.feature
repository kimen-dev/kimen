Feature: FeatureIcon decorates a heading with a tinted icon tile
  A feature, empty state or settings heading carries the meaning. The tile
  gives the accompanying glyph a consistent size, shape and visual tone.

  # Family: core behavior
  # S1
  Scenario: An unconfigured tile is neutral, medium and rounded square
    Given a heading with a FeatureIcon containing a decorative glyph
    When the section is displayed
    Then the glyph is centered on a 40 by 40 pixel neutral tile with rounded square corners
    And the glyph is 20 by 20 pixels at the default root text size

  # S2
  Scenario Outline: The selected size determines both the tile and glyph dimensions
    Given a FeatureIcon containing a decorative glyph
    When its size changes to "<size>"
    Then the tile is <tile> pixels square and the centered glyph is <glyph> pixels square at the default root text size

    Examples:
      | size | tile | glyph |
      | xs   | 24   | 12    |
      | sm   | 32   | 16    |
      | md   | 40   | 20    |
      | lg   | 48   | 24    |
      | xl   | 64   | 32    |

  # S3
  Scenario: A circular tile keeps its dimensions
    Given a medium rounded square FeatureIcon
    When its shape changes to "circle"
    Then its corners become fully rounded and its dimensions stay the same

  # S4
  Scenario: Unknown presentation values retain the default appearance
    Given a FeatureIcon with an unrecognized tone, size and shape
    When the tile is displayed beside a default tile
    Then the two tiles share the same dimensions, colours and corner radius

  # S13
  Scenario: A guarded surface keeps the tile decorative
    Given a catalog surface with a FeatureIcon containing a registered glyph and a declared action
    When the surface binds the action to the FeatureIcon
    Then validation rejects the binding

  # Family: keyboard path
  # S5
  Scenario: Tab skips the decorative tile
    Given a visible FeatureIcon with a slotted glyph between the "Previous" and "Next" controls
    When the user tabs from "Previous"
    Then focus moves to "Next" without stopping on the tile or glyph

  # Family: assistive-tech outcome
  # S6
  Scenario: The heading carries the section name
    Given a FeatureIcon with a glyph beside the heading "Security"
    When assistive technology queries the rendered section
    Then the heading is exposed as "Security" and the tile and glyph are hidden

  # Family: form participation — N/A, justified in spec.md

  # Family: theming
  # S7
  Scenario Outline: The selected tone paints a paired surface and foreground
    Given a theme with distinct FeatureIcon surface and foreground colours for "<tone>"
    When a FeatureIcon is displayed in that tone
    Then the tile paints the paired surface colour and the glyph inherits the paired foreground colour

    Examples:
      | tone          |
      | neutral       |
      | primary       |
      | primary-light |
      | info          |
      | success       |
      | warning       |
      | danger        |

  # S8
  Scenario: A theme can style the tile surface and geometry
    Given a theme overrides the tile size, radius, surface colour, foreground, background image and backdrop filter
    When a FeatureIcon is displayed
    Then the tile uses the supplied surface and geometry
    And the glyph stays centered at half the tile size and uses the supplied foreground

  # S9
  Scenario: The glyph remains visible in forced colours
    Given a tinted FeatureIcon with a decorative glyph
    When forced colours are enabled
    Then the tile and glyph use the system palette with a visible edge around the tile

  # S10
  Scenario: The tile stays still with reduced motion
    Given reduced motion is enabled and a FeatureIcon is visible
    When its tone changes
    Then the tile repaints without animating or transitioning

  # S11
  Scenario: The glyph stays centered in both writing directions
    Given a FeatureIcon before a heading in a left-to-right row
    When the row changes to right-to-left
    Then the tile sits at the inline start and the glyph stays centered inside it

  # S12
  Scenario: Touch preserves the explicit decorative size
    Given a small FeatureIcon on a wide page using a fine pointer
    When the input changes to a coarse pointer with no hover
    Then the tile stays 32 pixels square and the glyph remains half its size
