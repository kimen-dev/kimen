# Feature specification · AudioPlayer

**Branch** `feat/414-ki-audio`  
**Issue** #414  
**Sources** Issue #414 and the Kimen AudioPlayer reference preview.

The player gives voice notes, generated speech, and other recordings a titled playback surface, a seek control, a speed menu, mute, and a transcript link when supplied.

## Gherkin scenarios

```gherkin
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
```

## Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S8, S9, S10, S11 | |
| Keyboard path | S4, S5 | |
| Assistive-tech outcome | S6 | |
| Form participation | | Transport state is local to playback and contributes no form value. |
| Theming | S7 | |

## Interpretations

Each interpretation below is the agent's choice, pending founder confirmation.

- A missing or whitespace-only title displays and names the group “Audio player”. The published A2UI 0.9/0.9.1 and 1.0 schemas supply `url` and optional `description`, mapped to `src` and `title`. The component exposes local controls and media notifications with `ended` as the sole catalog action trigger.
- The seek control uses a native range input with digital clock values for assistive technology. The speed picker uses the platform select menu. The first composed build with `ki-slider`, `ki-menu`, and icon buttons measured 15.52 kB marginal and 34.35 kB worst case against the 9 kB and 25 kB limits. Horizontal arrows seek five seconds in the timeline direction. Space on Seek toggles playback. Buttons and the speed picker retain their standard activation.
- Seek is available once a finite positive duration is known. At the beginning or end, seeks stay within the recording. Rates use unique numeric entries from 0.25× to 4×. The default rates apply if all entries are invalid, and 1× is always available for returning to normal speed.
- The default URL scheme policy applies to both URLs. The catalog also honors configured origins. Playback failures have a localizable status and source changes reset the timeline.
- The transcript link sits inside the themed panel. The panel follows the 32 rem surface size and wraps the controls at narrow widths. The generated wrapper property for the title is `audioTitle`, and HTML uses the native `title` attribute.

## Size measurements

The AudioPlayer direct entry measures 4.78 kB marginal and 23.85 kB with the Stencil runtime. For shared bundles, the metadata records the measured increase from `f84525f`. Both builds used Node 26.5.0 and the same pinned dependencies.

| Artifact and metric | Baseline bytes | AudioPlayer bytes | Increase |
| --- | ---: | ---: | ---: |
| MCP Apps HTML, raw | 889347 | 906653 | 17306 |
| MCP Apps HTML, gzip | 210671 | 215642 | 4971 |
| MCP Apps HTML, Brotli | 164976 | 168656 | 3680 |
| MCP server bundle, raw | 2932114 | 2962584 | 30470 |
| MCP server bundle, gzip | 562696 | 569796 | 7100 |
| MCP server bundle, Brotli | 405374 | 409588 | 4214 |
| Onmars stylesheet, minified Brotli | 15188 | 15263 | 75 |
| Material 3 stylesheet, minified Brotli | 5345 | 5349 | 4 |
