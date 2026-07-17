Feature: Video
  A video presents playable media behind a calm poster facade — one
  accessible play control before playback, the native player afterwards —
  inside a frame any brand restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: A video presents its poster behind a single play control
    Given a video labeled "Play the product tour" holding media with a poster image
    When the page renders
    Then the poster fills the themed frame and one centered play control is the only interactive element

  # S2
  Scenario: Activating the play control hands the surface to the native player
    Given a rendered video labeled "Play the product tour" showing its poster facade
    When the user activates the play control
    Then playback starts exactly once and the native player controls take over the surface

  # S3
  Scenario: The video never plays on its own
    Given a page containing a video labeled "Play the product tour"
    When the page finishes loading
    Then no playback has started and no audio is heard

  # S4
  Scenario: The frame follows its container and keeps the media's proportions
    Given a 16:9 video placed in a container narrower than the media's natural width
    When the page renders
    Then the frame fills the container's inline size and the media keeps its 16:9 proportions undistorted

  # S5
  Scenario: Unknown attribute values fall back to the default appearance
    Given a video declared with an unrecognized variant attribute copied from another design system
    When the page renders
    Then the video renders with the default appearance and its play control remains operable

  # Family: keyboard path
  # S6
  Scenario: Tab reaches the play control directly
    Given a page whose only interactive element is the video's play control
    When the user presses Tab
    Then focus lands on the play control with a visible focus indicator

  # S7
  Scenario: Enter starts playback from the keyboard
    Given the play control of the "Play the product tour" video is focused
    When the user presses Enter
    Then playback starts exactly once

  # Family: assistive-tech outcome
  # S8
  Scenario: The play control announces its purpose
    Given a video labeled "Play the product tour" showing its poster facade
    When the accessibility tree is queried
    Then it exposes exactly one button named "Play the product tour"
    And the frame contributes no role, name or state of its own

  # S9
  Scenario: Captions on the slotted media stay available
    Given a video whose slotted media carries a Spanish captions track
    When playback starts
    Then the captions track remains available to enable from the native player

  # Family: form participation — N/A for ki-video: a media playback surface
  # is not a form control, holds no value and contributes no entry to
  # submitted form data (justified in spec.md's Scenario Family Coverage
  # table).

  # Family: theming
  # S10
  Scenario: A second theme restyles the video through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the frame radius and the play control's surface and glyph resolve from material3 token values

  # S11
  Scenario: The video honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the frame and play control resolve from the dark token values

  # Family: core behavior (appended)
  # S12
  Scenario: Reduced motion dismisses the facade without animation
    Given a user whose system requests reduced motion
    And a rendered video labeled "Play the product tour" showing its poster facade
    When the user activates the play control
    Then the facade is dismissed without transitional motion
