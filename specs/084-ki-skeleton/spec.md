# Feature specification for ki-skeleton

**Branch** `feat/385-ki-skeleton` · **Issue** #385

Cards, lists and assistant replies reserve space while they load. Skeletons draw neutral shapes inside those regions. The region owns its loading state and accessible name.

## Gherkin scenarios

```gherkin
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
```

## Scenario family coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4 | |
| Keyboard path | S5 | |
| Assistive-tech outcome | S6 | |
| Form participation | N/A | Skeletons are decorative and provide no control or form value. |
| Theming | S7, S8, S9, S10, S11 | |

## Requirements

- Draw text, circle and rectangle placeholders. Text is the default shape and starts with one line. Multiple lines shorten the final line.
- Accept CSS lengths through `size`, `inline-size` and `block-size`. Keep an unchanged footprint when animation, colour preferences or the primary pointer change.
- Hide the skeleton from assistive technology and keep it out of sequential focus. Document a labelled region with `aria-busy` and a cancellable 300 ms reveal that preserves layout before and after the reveal.
- Enable shimmer by default. Render statically under reduced motion, forced colours or `animated="false"`. Provide a system-colour outline in forced colours.
- Derive normal paint from semantic tokens. Support an optional background image and backdrop filter, both defaulting to `none`. Capture all shapes in onmars and Material 3, light and dark.
- Discover the component in the catalog and all three framework wrappers. The catalog exposes its six props with empty slots and actions.

## Decisions

- **Agent's choice, pending founder confirmation.** The caller owns the 300 ms delay and busy state because it knows when the request starts and ends. A runnable example reserves the project region from the start and cancels the reveal when the request settles.
- **Agent's choice, pending founder confirmation.** A single line fills the available inline size and uses a 0.75rem block size with a 0.5rem gap between lines. The final line of a multiline skeleton is 70% of the requested inline size. Circle defaults to 2.5rem and rectangle to full inline width by 6rem. A lone circle axis sets its diameter when `size` is absent. A single diameter scales down on both axes in a narrower container.
- **Agent's choice, pending founder confirmation.** Explicit dimensions override the corresponding `size` axes. Text uses the block dimension for each line. Unknown shapes fall back to text. Direct-element line counts are truncated and limited to 1–20, with non-finite inputs falling back to one. The catalog accepts numeric counts within that range and the element discards fractions.
- **Agent's choice, pending founder confirmation.** Shimmer sweeps in reading order up to three times at 1.4 seconds per sweep by default, then settles to the base fill. This bounds automatic motion alongside other content without adding a pause control to a decorative element.
- **Agent's choice, pending founder confirmation.** Expose a `shape` part for each painted surface. Preserve a default-on boolean's explicit false and reset values in the catalog's one-shot and live renderers.
- **Agent's choice, pending founder confirmation.** Declare the additive surface as major because the protected API comparator classifies the generated loader Components and JSX namespace updates as major.
