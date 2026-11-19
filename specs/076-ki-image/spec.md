# Image

Issue #362 adds `ki-image` for informative and decorative images in hand-authored and generated screens. It reserves a frame, uses the catalog's image URL policy, and substitutes a labelled fallback when the source cannot be displayed.

## Scenario Family Coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5, S13, S14 | |
| Keyboard path | S6 | |
| Assistive-tech outcome | S7, S8, S9, S10 | |
| Form participation | | An image neither collects nor submits data. |
| Theming | S11, S12 | |

## Decisions pending founder confirmation

- Agent's choice, pending founder confirmation. Default `auto` reserves the reference's 16:9 frame until the native dimensions are available, then follows the intrinsic ratio. Authors choose a fixed ratio to guarantee unchanged geometry.
- Agent's choice, pending founder confirmation. Missing or blank alt on an informative image displays a generically named fallback and leaves the source unloaded. `decorative` suppresses the media semantics even if alt was supplied. An authored caption retains figure semantics.
- Agent's choice, pending founder confirmation. A localizable `fallback-label` defaults to “Image unavailable”. The element appends the nonblank alt after a colon for informative fallback states.
- Agent's choice, pending founder confirmation. `ki-error` reports load failure or policy refusal once for each source attempt. The catalog applies any host origin list before rendering. A directly authored element applies the same default scheme rules.
- Agent's choice, pending founder confirmation. The image uses native lazy loading and async decoding. It sends no referrer, matching the catalog's native image handling.
- Agent's choice, pending founder confirmation. The fallback is a centered image symbol with a solid theme surface. The caption uses the reference's caption scale and wraps with the surrounding writing direction.

- Agent's choice, pending founder confirmation. Both A2UI dialects use the accessibility label as alt and explicit accessibility hiding as decorative. An unlabeled informative image keeps the adapter's per-node fallback. Only cover and contain map to the fit prop. Other fit values and size hints use the element defaults.

S4 covers the guardrail boundary and is flagged for founder review in the PR.

## Behavior contract

```gherkin
Feature: ki-image presents an accessible image with a stable frame

  # S1
  Scenario: A fixed frame keeps its size while an image loads
    Given the hills image has a 16:9 frame and its source is still loading
    When the image arrives
    Then it covers the 16:9 frame without resizing it

  # S2
  Scenario: A caption belongs to the image figure
    Given the hills image has the caption "View from the ridge"
    When the figure is presented
    Then the figure includes that caption below the image

  # S3
  Scenario: A failed image is replaced and reported once
    Given an Office floor plan image with a 4:3 frame
    When the source fails
    Then a fallback occupies the same frame
    And a single image error is emitted

  # S4
  Scenario: A refused source never reaches the browser image
    Given an image source outside the permitted URL schemes
    When the image is presented
    Then the fallback is displayed without requesting that source
    And a single image error is emitted

  # S5
  Scenario: A replacement source can recover an image after failure
    Given an Office floor plan image showing its fallback
    When the author supplies an allowed working replacement source
    Then the replacement image appears in the frame

  # S6
  Scenario: The image adds no stop to sequential keyboard navigation
    Given two focusable controls with a hills image between them
    When the user presses Tab from the first control
    Then focus moves to the second control

  # S7
  Scenario: An informative image has a descriptive accessible name
    Given an image described as "Low green hills under a pale sky"
    When the image is presented
    Then assistive technology can find an image with that name

  # S8
  Scenario: The fallback retains the image description
    Given an informative image described as "Office floor plan"
    When the source fails
    Then assistive technology can find an image named "Image unavailable: Office floor plan"

  # S9
  Scenario: Decorative images stay out of the accessibility tree
    Given two decorative images with descriptions, one with an unusable source
    When the images are presented
    Then neither image is exposed to assistive technology

  # S10
  Scenario: An informative image needs nonblank alternative text
    Given an informative image with an allowed source and blank alternative text
    When the image is presented
    Then the source is left unloaded and the fallback has a generic accessible name

  # S11
  Scenario: A fallback follows consumer theme tokens
    Given the fallback surface and foreground tokens have custom values
    When the fallback is presented
    Then its surface and symbol paint with those values

  # S12
  Scenario: A forced palette preserves the fallback symbol
    Given the operating system uses a forced colour palette
    When the fallback is presented
    Then its symbol remains distinguishable from its surface

  # S13
  Scenario: The frame supports native image fitting and load timing
    Given a portrait image set to contain and eager loading in a square frame
    When the image is presented
    Then the image fits inside the square without cropping
    And it is requested eagerly

  # S14
  Scenario: A2UI images become catalog images
    Given an A2UI image with alternative text points at an allowed URL
    When the adapter translates the surface
    Then the surface contains a catalog image with the same source
```
