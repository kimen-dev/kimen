Feature: Play a voice note or recording
  Audio playback starts on request, with controls and a transcript link for the listener.

  # Family: core behavior
  # S1
  Scenario: The listener starts playback on request
    Given a player titled "Interview" with a playable source
    When the listener activates Play
    Then playback starts and the player announces the Pause control
    And the application observes a play event

  # S2
  Scenario: The listener chooses a playback speed
    Given the "Interview" playback speed menu is open at 1×
    When the listener selects 1.5×
    Then audio plays at 1.5× and the menu closes

  # S3
  Scenario: The listener mutes the recording
    Given the "Interview" recording is audible
    When the listener activates Mute
    Then audio is muted and the control is named "Unmute"

  # S8
  Scenario: A2UI renders an audio recording from its URL and description
    Given an A2UI AudioPlayer for "/ep4.mp3" described as "Interview"
    When the application adapts the document
    Then the adapted player uses "/ep4.mp3" and the title "Interview"

  # S9
  Scenario: The listener can read the recording's transcript
    Given "Interview" has the transcript URL "/ep4/transcript"
    When the player appears
    Then it offers a "Read the transcript" link to that URL

  # S10
  Scenario: Playback reports time and stops at the end
    Given "Interview" is playing near the end
    When the recording ends
    Then the elapsed time matches the duration and Play is available again
    And the application observes playback time updates and one ended event

  # S11
  Scenario: An unsafe audio or transcript URL is rejected
    Given "Interview" supplies URLs with a non-HTTP scheme
    When the player appears
    Then it offers neither playback nor a transcript link to those URLs

  # Family: keyboard path
  # S4
  Scenario: Space pauses playback while the seek control has focus
    Given "Interview" is playing and its seek control has focus
    When the listener presses Space
    Then playback pauses and the seek control keeps focus
    And the application observes a pause event

  # S5
  Scenario: A horizontal arrow seeks five seconds along the timeline
    Given the "Interview" seek control has focus at 1 minute 24 seconds in a left-to-right layout
    When the listener presses Right Arrow
    Then playback moves to 1 minute 29 seconds

  # Family: assistive-tech outcome
  # S6
  Scenario: The player exposes its title and seek position
    Given "Interview" is at 1 minute 24 seconds of a 12 minute 5 second recording
    When the listener focuses Seek
    Then the "Interview" group contains a slider named "Seek"
    And the slider announces "1:24 of 12:05"

  # Family: theming
  # S7
  Scenario: A semantic token changes the painted card
    Given "Interview" uses the theme's raised surface
    When the page changes the raised-surface token
    Then the card repaints in that color
