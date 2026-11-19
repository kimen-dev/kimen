# Feature Specification: Optional background images on floating surfaces

**Feature Branch** `feat/343-solid-surface-bg`

**Issue** [#343](https://github.com/kimen-dev/kimen/issues/343)

## Decisions

- Agent's choice, pending founder confirmation. The select listbox already paints a single color at `bb7dd94` and has no legacy gradient stops. Its onmars v1 default stays a single color. Its image token lets a theme opt into an image.
- Agent's choice, pending founder confirmation. Keep a transparent backing for the onmars v1 dialog and tooltip so their translucent images composite as before. Material 3 uses the same opaque colors that its equal-stop gradients painted.
- Agent's choice, pending founder confirmation. Deprecate the four existing stops in 0.1.0 with removal scheduled for 1.0.0, following spec 041. The onmars v1 default images use stop overrides on the scope that declares the theme.
- Agent's choice, pending founder confirmation. Preserve the onmars v1 tooltip arrow's placement-specific fills through semantic color tokens whose theme defaults still follow the legacy stops. A theme can use the bubble fill for the arrow by leaving those overrides absent.
- After #341, onmars supplies its new opaque fills and drops the v1 glass images and arrow color overrides.

## Scenario family coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S3 | |
| Keyboard path | N/A | The existing component contracts cover opening and focus. |
| Assistive-tech outcome | S5 | |
| Form participation | N/A | The existing select contract covers submission. Dialog and tooltip contribute no form value. |
| Theming | S1, S2, S4, S5 | |

## Gherkin scenarios

```gherkin
Feature: Optional background images on floating surfaces
  Themes can paint the dialog, tooltip and select listbox with a solid fill
  or layer a background image over the fill.

  # S1
  Scenario Outline: A theme can paint a solid floating surface
    Given the theme supplies an opaque fill and no background image for the <surface>
    When the <surface> is shown
    Then the surface paints the supplied fill without a background image

    Examples:
      | surface        |
      | dialog         |
      | tooltip        |
      | select listbox |

  # S2
  Scenario Outline: A theme can layer an image over the floating surface fill
    Given the theme supplies a fill and a background image for the <surface>
    When the <surface> is shown
    Then the surface paints the supplied image over the fill

    Examples:
      | surface        |
      | dialog         |
      | tooltip        |
      | select listbox |

  # S3
  Scenario Outline: The shipped themes preserve their existing floating surface appearance
    Given the page uses the <theme> theme
    When the <surface> is shown
    Then the surface keeps its existing appearance

    Examples:
      | theme       | surface        |
      | onmars v1   | dialog         |
      | onmars v1   | tooltip        |
      | onmars v1   | select listbox |
      | Material 3 | dialog         |
      | Material 3 | tooltip        |
      | Material 3 | select listbox |

  # S4
  Scenario Outline: The onmars v1 glass image still uses the legacy stop colors
    Given the onmars v1 theme supplies legacy start and end colors for the <surface>
    When the <surface> is shown
    Then its default background image uses those colors

    Examples:
      | surface |
      | dialog  |
      | tooltip |

  # S5
  Scenario Outline: A forced palette gives a floating surface a Canvas fill
    Given the person uses a forced palette
    And the theme supplies a background image for the <surface>
    When the <surface> is shown
    Then it paints an opaque Canvas fill without the image

    Examples:
      | surface        |
      | dialog         |
      | tooltip        |
      | select listbox |
```
